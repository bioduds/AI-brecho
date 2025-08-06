#!/usr/bin/env python3
"""
Script para testar a resposta da IA diretamente
"""
import requests
import base64
import json
from pathlib import Path

def test_ai_gateway():
    # URL do AI Gateway
    ai_gateway_url = "http://localhost:8808"
    
    # Carregar uma imagem de teste
    test_image_path = Path("tests/ab1.webp")
    if not test_image_path.exists():
        print("❌ Imagem de teste não encontrada")
        return
    
    with open(test_image_path, "rb") as f:
        image_data = f.read()
    
    print("🔍 Testando AI Gateway diretamente...")
    
    try:
        # Fazer request direto para o AI Gateway
        files = {
            'images': ('test.jpg', image_data, 'image/jpeg')
        }
        
        response = requests.post(
            f"{ai_gateway_url}/intake/autoregister",
            files=files,
            timeout=120
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Resposta da IA recebida!")
            print("\n📋 RESPOSTA COMPLETA:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
            # Verificar estrutura específica
            if 'proposal' in result:
                print("\n🎯 PROPOSTA ESTRUTURADA:")
                proposal = result['proposal']
                if 'cadastro' in proposal:
                    print("📝 Campos de cadastro:")
                    for key, value in proposal['cadastro'].items():
                        print(f"  {key}: {value}")
                
                if 'price' in proposal:
                    print(f"💰 Preço: {proposal['price']}")
        else:
            print(f"❌ Erro: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

if __name__ == "__main__":
    test_ai_gateway()
