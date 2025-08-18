#!/bin/bash

# Script para rodar o sistema Brechó completo
# Este script inicia todos os serviços necessários

echo "🚀 Iniciando sistema Brechó..."

# Função para verificar se uma porta está em uso
check_port() {
    lsof -ti:$1 >/dev/null 2>&1
}

# Matar processos nas portas se estiverem rodando
echo "🧹 Limpando portas..."
if check_port 8000; then
    echo "Matando processo na porta 8000..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null
fi

if check_port 8808; then
    echo "Matando processo na porta 8808..."
    lsof -ti:8808 | xargs kill -9 2>/dev/null
fi

if check_port 3000; then
    echo "Matando processo na porta 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
fi

# Matar tunnel anterior
pkill -f "cloudflared tunnel run" 2>/dev/null

sleep 2

echo "🤖 Iniciando AI Gateway (porta 8808)..."
cd /Users/capanema/Projects/brecho/ai_gateway
source .venv/bin/activate
python -m uvicorn server:app --host 0.0.0.0 --port 8808 &
AI_PID=$!

sleep 3

echo "🌐 Iniciando Cloudflare Tunnel..."
cloudflared tunnel run brecho-ai &
TUNNEL_PID=$!

sleep 2

echo "🔧 Iniciando Backend (porta 8000)..."
cd /Users/capanema/Projects/brecho/brecho_app/backend
source .venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

sleep 2

echo "⚛️  Iniciando React Frontend (porta 3000)..."
cd /Users/capanema/Projects/brecho/brecho_app/frontend
# Rebuild para usar o basename correto
npm run build 2>/dev/null || true
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Sistema iniciado com sucesso!"
echo ""
echo "🔗 URLs disponíveis:"
echo "   • React Dashboard Local: http://localhost:3000"
echo "   • React Dashboard Online: https://dashboard.celflow.com/brecho"
echo "   • Backend API: http://localhost:8000"
echo "   • AI Gateway Local: http://localhost:8808"
echo "   • AI Gateway Online: https://ai.celflow.com"
echo ""
echo "📱 Para conectar o iPhone:"
echo "   • Use o IP da rede local para backend: http://192.168.18.21:8000"
echo "   • AI Gateway via internet: https://ai.celflow.com"
echo ""
echo "🛑 Para parar tudo, execute: ./stop.sh"

# Salvar PIDs para poder parar depois
echo "$AI_PID" > /tmp/brecho_ai.pid
echo "$TUNNEL_PID" > /tmp/brecho_tunnel.pid  
echo "$BACKEND_PID" > /tmp/brecho_backend.pid
echo "$FRONTEND_PID" > /tmp/brecho_frontend.pid

# Aguardar interrupção
wait
