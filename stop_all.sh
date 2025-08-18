#!/bin/bash

# Script para parar todos os serviços do Brechó

echo "🛑 Parando sistema Brechó..."

# Parar processos usando PIDs salvos
if [ -f /tmp/brecho_ai.pid ]; then
    PID=$(cat /tmp/brecho_ai.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Parando AI Gateway (PID: $PID)..."
        kill $PID
    fi
    rm -f /tmp/brecho_ai.pid
fi

if [ -f /tmp/brecho_tunnel.pid ]; then
    PID=$(cat /tmp/brecho_tunnel.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Parando Cloudflare Tunnel (PID: $PID)..."
        kill $PID
    fi
    rm -f /tmp/brecho_tunnel.pid
fi

if [ -f /tmp/brecho_backend.pid ]; then
    PID=$(cat /tmp/brecho_backend.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Parando Backend (PID: $PID)..."
        kill $PID
    fi
    rm -f /tmp/brecho_backend.pid
fi

if [ -f /tmp/brecho_frontend.pid ]; then
    PID=$(cat /tmp/brecho_frontend.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "Parando React Frontend (PID: $PID)..."
        kill $PID
    fi
    rm -f /tmp/brecho_frontend.pid
fi

# Garantir que as portas estejam livres
echo "🧹 Limpando portas..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8808 | xargs kill -9 2>/dev/null  
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Parar tunnel por nome
pkill -f "cloudflared tunnel run" 2>/dev/null

echo "✅ Todos os serviços foram parados!"
