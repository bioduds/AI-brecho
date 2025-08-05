import requests
import base64
import io
import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Optional
from PIL import Image
from config import settings
import qrcode
import logging

logger = logging.getLogger(__name__)


class AIGatewayService:
    """Service to interact with the AI Gateway"""
    
    def __init__(self):
        self.base_url = settings.AI_GATEWAY_URL
        
    async def search_by_image(self, image_b64: str, top_k: int = 5) -> Dict:
        """Search for similar items using image"""
        try:
            # Convert base64 to image file
            image_data = base64.b64decode(image_b64)
            
            files = {
                'image': ('image.jpg', io.BytesIO(image_data), 'image/jpeg')
            }
            data = {'top_k': top_k}
            
            response = requests.post(
                f"{self.base_url}/search_by_image",
                files=files,
                data=data,
                timeout=30
            )
            response.raise_for_status()
            
            return {
                "success": True,
                "results": response.json().get("results", [])
            }
            
        except Exception as e:
            logger.error(f"AI search error: {str(e)}")
            return {
                "success": False,
                "results": [],
                "error": str(e)
            }
    
    async def intake_autoregister(self, images_b64: List[str], audio_b64: Optional[str] = None) -> Dict:
        """Auto-register items using AI"""
        try:
            # Debug: verificar se áudio está presente
            print(f"DEBUG AI_SERVICE: Áudio presente: {bool(audio_b64)}")
            if audio_b64:
                print(f"DEBUG AI_SERVICE: Tamanho do áudio: {len(audio_b64)} chars")
            
            files = []
            for i, img_b64 in enumerate(images_b64):
                image_data = base64.b64decode(img_b64)
                files.append(
                    ('images', (f'image_{i}.jpg', io.BytesIO(image_data), 'image/jpeg'))
                )
            
            # Add audio if provided
            if audio_b64:
                audio_data = base64.b64decode(audio_b64)
                files.append(
                    ('audio', ('audio.wav', io.BytesIO(audio_data), 'audio/wav'))
                )
            
            response = requests.post(
                f"{self.base_url}/intake/autoregister",
                files=files,
                timeout=600  # 10 minutos para análise multimodal
            )
            response.raise_for_status()
            
            result = response.json()
            return {
                "success": True,
                "consignor_id": result.get("consignor_id"),
                "proposal": result.get("proposal", {}),
                "similar_items": result.get("similar_topk", [])
            }
            
        except Exception as e:
            logger.error(f"AI intake error: {str(e)}")
            return {
                "success": False,
                "consignor_id": None,
                "proposal": {},
                "similar_items": [],
                "error": str(e)
            }
    
    async def index_item(self, sku: str, images_b64: List[str], metadata: Dict) -> Dict:
        """Index an item in the vector database"""
        try:
            files = []
            for i, img_b64 in enumerate(images_b64):
                image_data = base64.b64decode(img_b64)
                files.append(
                    ('images', (f'image_{i}.jpg', io.BytesIO(image_data), 'image/jpeg'))
                )
            
            data = {
                'sku': sku,
                **metadata
            }
            
            response = requests.post(
                f"{self.base_url}/index/upsert",
                files=files,
                data=data,
                timeout=300  # 5 minutos
            )
            response.raise_for_status()
            
            return {
                "success": True,
                "result": response.json()
            }
            
        except Exception as e:
            logger.error(f"AI indexing error: {str(e)}")
    
    async def generate_dynamic_fields(self, category: str, subcategory: Optional[str] = None, 
                                    brand: Optional[str] = None, images_b64: Optional[List[str]] = None) -> List[Dict]:
        """
        A IA agora gera campos dinamicos de forma inteligente!
        Esta funcao apenas retorna uma lista vazia pois os campos
        sao gerados dinamicamente pela IA no processo de analise.
        """
        return []

    async def enhance_proposal_with_similarity(self, proposal: Dict, images_b64: List[str]) -> Dict:
        """Enhance proposal with similarity search results"""
        try:
            if not images_b64:
                return proposal
                
            # Search for similar items using the first image
            similar_result = await self.search_by_image(images_b64[0], top_k=5)
            
            if similar_result.get("success") and similar_result.get("results"):
                # Extract insights from similar items
                similar_items = similar_result["results"]
                
                # Analyze similar items for better pricing
                prices = []
                brands = []
                conditions = []
                
                for item in similar_items:
                    if item.get("price"):
                        prices.append(item["price"])
                    if item.get("brand"):
                        brands.append(item["brand"])
                    if item.get("condition"):
                        conditions.append(item["condition"])
                
                # Update proposal with insights
                if prices:
                    avg_price = sum(prices) / len(prices)
                    proposal.setdefault("price_insights", {})
                    proposal["price_insights"]["similar_avg"] = avg_price
                    proposal["price_insights"]["similar_range"] = f"R${min(prices):.0f}–R${max(prices):.0f}"
                
                # Add similar items for reference
                proposal["similar_items"] = similar_items[:3]  # Top 3 most similar
                
            return proposal
            
        except Exception as e:
            logger.error(f"Similarity enhancement error: {str(e)}")
            return proposal


def save_item_images(sku: str, images_b64: List[str]) -> List[str]:
    """Save base64 images to disk and return URLs"""
    try:
        logger.info(f"Saving {len(images_b64)} images for SKU {sku}")
        
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join(settings.UPLOAD_DIR, "items", sku)
        os.makedirs(upload_dir, exist_ok=True)
        logger.info(f"Created upload directory: {upload_dir}")
        
        image_urls = []
        for i, img_b64 in enumerate(images_b64):
            logger.info(f"Processing image {i+1}, base64 length: {len(img_b64)}")
            
            # Remove data URL prefix if present
            if img_b64.startswith('data:image'):
                img_b64 = img_b64.split(',')[1]
            
            # Decode base64 image
            image_data = base64.b64decode(img_b64)
            logger.info(f"Decoded image {i+1}, size: {len(image_data)} bytes")
            
            # Generate filename
            filename = f"image_{i+1}_{uuid.uuid4().hex[:8]}.jpg"
            filepath = os.path.join(upload_dir, filename)
            
            # Save image
            with open(filepath, 'wb') as f:
                f.write(image_data)
            
            logger.info(f"Saved image to: {filepath}")
            
            # Create URL (relative to static serving)
            image_url = f"/static/items/{sku}/{filename}"
            image_urls.append(image_url)
        
        logger.info(f"Successfully saved {len(image_urls)} images, URLs: {image_urls}")
        return image_urls
        
    except Exception as e:
        logger.error(f"Error saving images for SKU {sku}: {str(e)}")
        return []


class QRCodeService:
    """Service for QR code generation"""
    
    @staticmethod
    def generate_consignor_qr(consignor_id: str, size: int = 200) -> str:
        """Generate QR code for consignor"""
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(consignor_id)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            img = img.resize((size, size))
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return img_str
            
        except Exception as e:
            logger.error(f"QR generation error: {str(e)}")
            raise e


# Initialize services
ai_service = AIGatewayService()
qr_service = QRCodeService()
