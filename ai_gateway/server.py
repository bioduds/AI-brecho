from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from typing import List, Optional
from PIL import Image
import io, uuid, numpy as np, cv2
import asyncio

from embedder import ImageEmbedder
from vstore import upsert_item_embedding, query_by_vector
from llm import intake_normalize, price_suggest, multimodal_intake_analyze

app = FastAPI(title="AI Gateway — Brechó", version="0.1.0")
EMB = ImageEmbedder()

# Configurar timeout para requests longos
@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    try:
        # Timeout de 10 minutos para requests
        return await asyncio.wait_for(call_next(request), timeout=600.0)
    except asyncio.TimeoutError:
        return JSONResponse(
            {"error": "Request timeout - análise demorou mais que 10 minutos"}, 
            status_code=408
        )

def read_images(files: List[UploadFile]):
    imgs = []
    for f in files:
        b = f.file.read()
        imgs.append(Image.open(io.BytesIO(b)).convert("RGB"))
        f.file.seek(0)
    return imgs

def detect_qr_in_images(files: List[UploadFile]):
    detector = cv2.QRCodeDetector()
    for f in files:
        arr = np.frombuffer(f.file.read(), dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        f.file.seek(0)
        if img is None:
            continue
        val, pts, _ = detector.detectAndDecode(img)
        if val:
            return val.strip()
    return None

@app.post("/search_by_image")
async def search_by_image(image: UploadFile = File(...), top_k: int = Form(5)):
    pil = read_images([image])[0]
    vec = EMB.embed_images([pil])[0]
    results = query_by_vector(vec, top_k=top_k)
    return JSONResponse({"results": results})

@app.post("/index/upsert")
async def index_upsert(
    images: List[UploadFile] = File(...),
    sku: Optional[str] = Form(None),
    consignor_id: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    size: Optional[str] = Form(None),
    condition: Optional[str] = Form(None),
    list_price: Optional[float] = Form(None),
    extras_json: Optional[str] = Form(None)
):
    pil = read_images(images)
    vecs = EMB.embed_images(pil)
    pooled = EMB.pool_views(vecs)
    item_id = sku or str(uuid.uuid4())
    metadata = {
        "sku": item_id,
        "consignor_id": consignor_id,
        "category": category, "brand": brand, "size": size, "condition": condition,
        "list_price": list_price,
        "extras": extras_json
    }
    upsert_item_embedding(item_id, pooled, metadata)
    return JSONResponse({"ok": True, "sku": item_id, "metadata": metadata})

def extract_image_features(images):
    """Extrai características básicas das imagens para análise"""
    features = []
    for i, img in enumerate(images):
        # Análise básica de cores dominantes
        img_array = np.array(img.resize((100, 100)))
        
        # Cores dominantes (RGB médio)
        avg_color = img_array.mean(axis=(0, 1)).astype(int)
        
        # Brilho médio
        brightness = int(np.mean(avg_color))
        
        # Características básicas
        width, height = img.size
        aspect_ratio = round(width / height, 2)
        
        color_desc = "claro" if brightness > 127 else "escuro"
        
        # Tentativa de identificar cor dominante
        r, g, b = avg_color
        if r > g and r > b:
            dominant_color = "avermelhado"
        elif g > r and g > b:
            dominant_color = "esverdeado"
        elif b > r and b > g:
            dominant_color = "azulado"
        elif r + g > b * 1.5:
            dominant_color = "amarelado"
        else:
            dominant_color = "neutro"
            
        features.append({
            "image": f"foto_{i+1}",
            "dimensoes": f"{width}x{height}",
            "aspecto": aspect_ratio,
            "brilho": color_desc,
            "cor_dominante": dominant_color,
            "rgb_medio": f"RGB({r},{g},{b})"
        })
    
    return features

@app.post("/intake/autoregister")
async def intake_autoregister(
    images: List[UploadFile] = File(...),
    audio: Optional[UploadFile] = File(None)
):
    import time
    import base64
    start_time = time.time()
    
    if len(images) < 1:
        return JSONResponse(
            {"error": "Envie pelo menos 1 foto"},
            status_code=400
        )

    print(f"[{time.time()-start_time:.1f}s] Iniciando processamento de {len(images)} imagens")
    
    # Processar áudio se fornecido
    audio_base64 = None
    if audio:
        try:
            audio_bytes = await audio.read()
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            print(f"[{time.time()-start_time:.1f}s] Áudio processado ({len(audio_bytes)} bytes)")
        except Exception as e:
            print(f"Erro ao processar áudio: {e}")
    
    # QR detection removida - sistema inteligente não precisa
    consignor_id = None
    
    pil = read_images(images)
    print(f"[{time.time()-start_time:.1f}s] Imagens carregadas")
    
    vecs = EMB.embed_images(pil)
    pooled = EMB.pool_views(vecs)
    similar = query_by_vector(pooled, top_k=5)
    print(f"[{time.time()-start_time:.1f}s] Embeddings e busca de similaridade concluídos")

    # Extrair características visuais das imagens
    visual_features = extract_image_features(pil)
    
    # Análise multimodal completa usando Gemma 3:4b com áudio opcional
    print(f"[{time.time()-start_time:.1f}s] Iniciando análise multimodal de {len(pil)} imagens..." + 
          (f" com áudio" if audio_base64 else ""))
    multimodal_result = multimodal_intake_analyze(pil, audio_base64)
    print(f"[{time.time()-start_time:.1f}s] Análise multimodal concluída: {bool(multimodal_result)}")
    
    # Se a análise multimodal falhou, use o método tradicional
    if not multimodal_result:
        print(f"[{time.time()-start_time:.1f}s] Fallback para análise tradicional")
        context = {
            "instrucao": "Analise características básicas para classificar a peça",
            "total_fotos": len(images),
            "caracteristicas_visuais": visual_features,
            "consignor_id": consignor_id,
            "produtos_similares": similar[:3] if similar else []
        }
        normalized = intake_normalize(context)
    else:
        normalized = multimodal_result
        
    print(f"[{time.time()-start_time:.1f}s] Análise normalizada concluída")
    
    price_info = price_suggest({
        "categoria": normalized.get("Categoria"),
        "marca": normalized.get("Marca"),
        "condicao": normalized.get("Condição"),
        "estagio": 0
    })
    sku = str(uuid.uuid4())[:8].upper()
    
    print(f"[{time.time()-start_time:.1f}s] Processamento completo")

    return JSONResponse({
        "consignor_id": consignor_id,
        "proposal": {
            "sku": sku, 
            "cadastro": normalized, 
            "price": price_info,
            "descricao_completa": normalized.get("DescricaoCompleta", ""),
            "relatorio_detalhado": normalized.get("RelatorioDetalhado", ""),
            "valor_estimado": normalized.get("ValorEstimado", "")
        },
        "similar_topk": similar
    })
