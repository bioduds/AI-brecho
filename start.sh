#!/bin/bash

# Brechó App Startup Script
echo "🏪 Starting Brechó Management System..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Check required ports
echo "🔍 Checking ports..."
check_port 8808 || exit 1  # AI Gateway
check_port 8000 || exit 1  # Backend API  
check_port 3000 || exit 1  # Frontend

# Check if Ollama is running
echo "🤖 Checking Ollama..."
if ! pgrep -x "ollama" > /dev/null; then
    echo "❌ Ollama is not running. Please start it with: ollama serve"
    exit 1
else
    echo "✅ Ollama is running"
fi

# Check if Gemma model is available
echo "🔍 Checking Gemma model..."
if ! ollama list | grep -q "gemma2:2b"; then
    echo "⚠️  Gemma model not found. Installing..."
    ollama pull gemma2:2b
fi

# Start AI Gateway
echo "🚀 Starting AI Gateway..."
cd ai_gateway
if [ ! -d ".venv" ]; then
    echo "📦 Creating Python virtual environment for AI Gateway..."
    python -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
echo "🤖 AI Gateway starting on port 8808..."
uvicorn server:app --port 8808 > ai_gateway.log 2>&1 &
AI_GATEWAY_PID=$!
cd ..

# Wait for AI Gateway to start
sleep 5

# Start Backend API
echo "🚀 Starting Backend API..."
cd brecho_app/backend
if [ ! -d ".venv" ]; then
    echo "📦 Creating Python virtual environment for Backend..."
    python -m venv .venv
fi

source .venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
echo "🔧 Backend API starting on port 8000..."
uvicorn main:app --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait for Backend to start
sleep 5

# Start Frontend
echo "🚀 Starting Frontend..."
cd brecho_app/frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install > /dev/null 2>&1
fi

echo "🎨 Frontend starting on port 3000..."
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

# Wait for everything to start
echo "⏳ Waiting for all services to start..."
sleep 10

# Check if all services are running
echo "🔍 Checking service health..."

# Check AI Gateway
if curl -s http://localhost:8808/health > /dev/null 2>&1; then
    echo "✅ AI Gateway is healthy"
else
    echo "❌ AI Gateway is not responding"
fi

# Check Backend API
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend API is healthy"
else
    echo "❌ Backend API is not responding"
fi

# Check Frontend (just check if port is open)
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
echo "   AI Gateway: $AI_GATEWAY_PID"
echo "   Backend:    $BACKEND_PID"  
echo "   Frontend:   $FRONTEND_PID"
echo ""
echo "🛑 To stop all services, run:"
echo "   kill $AI_GATEWAY_PID $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📄 Logs are available in:"
echo "   AI Gateway: ai_gateway.log"
echo "   Backend:    brecho_app/backend/backend.log"  
echo "   Frontend:   brecho_app/frontend/frontend.log"
echo ""
echo "🔥 Ready to revolutionize your brechó with AI!"
echo ""

# Keep script running and handle Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $AI_GATEWAY_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

trap cleanup INT

# Wait for user to stop
echo "Press Ctrl+C to stop all services..."
wait
