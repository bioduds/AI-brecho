#!/bin/bash

# Simplified startup script (AI Gateway already running)
echo "🏪 Starting Backend and Frontend..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ Port $1 is in use (AI Gateway already running)"
        return 0
    else
        echo "❌ Port $1 is not in use"
        return 1
    fi
}

# Check AI Gateway is running
echo "🔍 Checking AI Gateway..."
check_port 8808 || {
    echo "❌ AI Gateway is not running on port 8808"
    exit 1
}

# Start Backend API
echo "🚀 Starting Backend API..."
cd brecho_app/backend

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating Python virtual environment for Backend..."
    python3 -m venv .venv
fi

# Activate virtual environment and install dependencies
source .venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1

echo "🔧 Backend API starting on port 8000..."
uvicorn main:app --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Start Frontend
echo "🚀 Starting Frontend..."
cd brecho_app/frontend

# Install node modules if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install > /dev/null 2>&1
fi

echo "🎨 Frontend starting on port 3000..."
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check Backend API
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "❌ Backend API is not responding"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend is not responding"
fi

echo ""
echo "🎉 Brechó Management System is ready!"
echo ""
echo "📱 Access the application:"
echo "   Frontend:    http://localhost:3000"
echo "   Backend API: http://localhost:8000/docs"
echo "   AI Gateway:  http://localhost:8808/docs"
echo ""
echo "📋 Process IDs:"
echo "   Backend:    $BACKEND_PID"  
echo "   Frontend:   $FRONTEND_PID"
echo ""
echo "🛑 To stop services, run:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Keep script running and handle Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

trap cleanup INT

# Wait for user to stop
echo "Press Ctrl+C to stop services..."
wait
