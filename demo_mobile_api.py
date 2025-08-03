#!/usr/bin/env python3
"""
Demo script for Brechó Mobile API
Shows how to integrate with the AI-powered intake system
"""

import requests
import base64
import json
from pathlib import Path

# API Configuration
API_BASE = "http://localhost:8000/api/v1"
AI_GATEWAY = "http://localhost:8808"

def encode_image(image_path):
    """Convert image to base64 for API"""
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode('utf-8')

def mobile_quick_intake_demo():
    """Demo the mobile quick intake API"""
    
    print("🤖 Brechó Mobile API Demo")
    print("=" * 40)
    
    # For demo purposes, we'll create a dummy base64 image
    # In a real app, this would come from the camera
    dummy_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    # Quick intake request
    quick_intake_data = {
        "images": [dummy_image, dummy_image],  # 2 dummy images
        "consignor_id": "C0001",
        "notes": "Blusa azul, boa condição"
    }
    
    try:
        print("📤 Sending quick intake request...")
        response = requests.post(
            f"{API_BASE}/mobile/quick-intake",
            json=quick_intake_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Quick intake successful!")
            print(f"📦 Item SKU: {result['item_sku']}")
            print(f"🔍 Needs Review: {result['needs_review']}")
            print(f"🤖 AI Suggestions: {json.dumps(result['ai_suggestions'], indent=2)}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            
    except requests.RequestException as e:
        print(f"❌ Connection error: {e}")
        print("Make sure the backend is running on http://localhost:8000")

def consignor_qr_demo():
    """Demo QR code generation for consignors"""
    
    print("\n🔲 QR Code Generation Demo")
    print("=" * 40)
    
    qr_data = {
        "consignor_id": "C0001",
        "size": 200
    }
    
    try:
        print("📤 Generating QR code...")
        response = requests.post(
            f"{API_BASE}/qr/consignor",
            json=qr_data
        )
        
        if response.status_code == 200:
            result = response.json()
            if result['success']:
                print("✅ QR code generated!")
                print(f"📄 Base64 QR Code: {result['qr_code'][:50]}...")
                
                # Save QR code to file for demo
                qr_data = base64.b64decode(result['qr_code'])
                with open("consignor_C0001_qr.png", "wb") as f:
                    f.write(qr_data)
                print("💾 QR code saved as: consignor_C0001_qr.png")
            else:
                print(f"❌ QR generation failed: {result['message']}")
        else:
            print(f"❌ Error: {response.status_code}")
            
    except requests.RequestException as e:
        print(f"❌ Connection error: {e}")

def ai_search_demo():
    """Demo AI image search"""
    
    print("\n🔍 AI Image Search Demo")
    print("=" * 40)
    
    dummy_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    search_data = {
        "image": dummy_image,
        "top_k": 5
    }
    
    try:
        print("📤 Searching for similar items...")
        response = requests.post(
            f"{API_BASE}/ai/search",
            json=search_data
        )
        
        if response.status_code == 200:
            result = response.json()
            if result['success']:
                print("✅ Search completed!")
                print(f"📊 Found {len(result['results'])} similar items")
                for i, item in enumerate(result['results'][:3]):
                    print(f"  {i+1}. {item['id']} (distance: {item['distance']:.3f})")
            else:
                print(f"❌ Search failed: {result['message']}")
        else:
            print(f"❌ Error: {response.status_code}")
            
    except requests.RequestException as e:
        print(f"❌ Connection error: {e}")

def health_check():
    """Check if all services are healthy"""
    
    print("\n🏥 Health Check")
    print("=" * 40)
    
    services = [
        ("Backend API", f"{API_BASE.replace('/api/v1', '')}/health"),
        ("AI Gateway", f"{AI_GATEWAY}/health")
    ]
    
    for name, url in services:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ {name}: Healthy")
            else:
                print(f"❌ {name}: Error {response.status_code}")
        except requests.RequestException:
            print(f"❌ {name}: Not responding")

if __name__ == "__main__":
    print("🏪 Brechó AI Management System - Mobile API Demo")
    print("=" * 50)
    
    # Run health check first
    health_check()
    
    # Run demos
    mobile_quick_intake_demo()
    consignor_qr_demo()
    ai_search_demo()
    
    print("\n🎉 Demo completed!")
    print("\n📱 This shows how to integrate with the Brechó API from:")
    print("   • Mobile apps (React Native, Flutter)")
    print("   • Web apps (React, Vue, Angular)")  
    print("   • Other Python scripts")
    print("   • Any HTTP client")
    
    print("\n🔧 Next steps:")
    print("   • Build a React Native app")
    print("   • Add user authentication")
    print("   • Implement offline capabilities")
    print("   • Add push notifications")
