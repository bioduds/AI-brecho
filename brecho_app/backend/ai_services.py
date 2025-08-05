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
                                    brand: Optional[str] = None, images_b64: Optional[List[str]] = None) -> Dict:
        """Generate truly intelligent dynamic fields based on item category and analysis"""
        try:
            # Smart field templates based on actual item types
            field_templates = {
                # ROUPAS
                "Blusa": [
                    {"name": "neckline", "label": "Decote", "type": "select", 
                     "options": ["Redondo", "V", "Canoa", "Ombro a ombro", "Gola alta", "Outro"]},
                    {"name": "sleeve_length", "label": "Comprimento da manga", "type": "select",
                     "options": ["Sem manga", "Manga curta", "Manga 3/4", "Manga longa"]},
                    {"name": "fit_style", "label": "Modelagem", "type": "select",
                     "options": ["Justa", "Regular", "Oversized", "Cropped", "Bodycon"]},
                    {"name": "season", "label": "Estação", "type": "select",
                     "options": ["Verão", "Inverno", "Meia-estação", "Atemporal"]},
                ],
                "Vestido": [
                    {"name": "dress_length", "label": "Comprimento", "type": "select",
                     "options": ["Mini", "Curto", "Midi", "Longo", "Maxi"]},
                    {"name": "dress_style", "label": "Estilo", "type": "select",
                     "options": ["Casual", "Social", "Festa", "Esportivo", "Boho"]},
                    {"name": "neckline", "label": "Decote", "type": "select", 
                     "options": ["Redondo", "V", "Tomara que caia", "Ombro a ombro", "Halter"]},
                    {"name": "season", "label": "Estação", "type": "select",
                     "options": ["Verão", "Inverno", "Meia-estação", "Atemporal"]},
                ],
                "Calça": [
                    {"name": "pants_style", "label": "Estilo", "type": "select",
                     "options": ["Jeans", "Social", "Legging", "Cargo", "Pantalona", "Skinny", "Flare"]},
                    {"name": "waist_height", "label": "Altura da cintura", "type": "select",
                     "options": ["Cintura baixa", "Cintura média", "Cintura alta"]},
                    {"name": "leg_opening", "label": "Abertura da perna", "type": "select",
                     "options": ["Skinny", "Straight", "Bootcut", "Flare", "Wide leg"]},
                    {"name": "season", "label": "Estação", "type": "select",
                     "options": ["Verão", "Inverno", "Meia-estação", "Atemporal"]},
                ],
                
                # ILUMINAÇÃO / DECORAÇÃO
                "Iluminação": [
                    {"name": "light_type", "label": "Tipo de luz", "type": "select",
                     "options": ["LED", "Incandescente", "Halógena", "Fluorescente", "Desconhecido"]},
                    {"name": "power_source", "label": "Alimentação", "type": "select",
                     "options": ["Tomada 110V", "Tomada 220V", "Bateria", "USB", "Pilha"]},
                    {"name": "light_color", "label": "Cor da luz", "type": "select",
                     "options": ["Branca fria", "Branca quente", "Amarela", "RGB/Colorida", "Não testado"]},
                    {"name": "dimmer", "label": "Regulagem de intensidade", "type": "select",
                     "options": ["Sim", "Não", "Não testado"]},
                    {"name": "switch_type", "label": "Tipo de interruptor", "type": "select",
                     "options": ["Botão", "Toque (touch)", "Controle remoto", "Sensor", "Sem interruptor"]},
                ],
                "Luminária": [
                    {"name": "light_type", "label": "Tipo de luz", "type": "select",
                     "options": ["LED", "Incandescente", "Halógena", "Fluorescente", "Desconhecido"]},
                    {"name": "power_source", "label": "Alimentação", "type": "select",
                     "options": ["Tomada 110V", "Tomada 220V", "Bateria", "USB", "Pilha"]},
                    {"name": "light_color", "label": "Cor da luz", "type": "select",
                     "options": ["Branca fria", "Branca quente", "Amarela", "RGB/Colorida", "Não testado"]},
                    {"name": "dimmer", "label": "Regulagem de intensidade", "type": "select",
                     "options": ["Sim", "Não", "Não testado"]},
                    {"name": "switch_type", "label": "Tipo de interruptor", "type": "select",
                     "options": ["Botão", "Toque (touch)", "Controle remoto", "Sensor", "Sem interruptor"]},
                ],
                "Abajur": [
                    {"name": "light_type", "label": "Tipo de luz", "type": "select",
                     "options": ["LED", "Incandescente", "Halógena", "Fluorescente", "Desconhecido"]},
                    {"name": "power_source", "label": "Alimentação", "type": "select",
                     "options": ["Tomada 110V", "Tomada 220V", "Bateria", "USB", "Pilha"]},
                    {"name": "light_color", "label": "Cor da luz", "type": "select",
                     "options": ["Branca fria", "Branca quente", "Amarela", "RGB/Colorida", "Não testado"]},
                    {"name": "dimmer", "label": "Regulagem de intensidade", "type": "select",
                     "options": ["Sim", "Não", "Não testado"]},
                    {"name": "switch_type", "label": "Tipo de interruptor", "type": "select",
                     "options": ["Botão", "Toque (touch)", "Controle remoto", "Sensor", "Sem interruptor"]},
                ],
                
                # CASA E DECORAÇÃO
                "Decoração": [
                    {"name": "room_use", "label": "Ambiente de uso", "type": "select",
                     "options": ["Sala", "Quarto", "Cozinha", "Banheiro", "Escritório", "Qualquer ambiente"]},
                    {"name": "decoration_style", "label": "Estilo decorativo", "type": "select",
                     "options": ["Moderno", "Clássico", "Vintage", "Minimalista", "Rústico", "Industrial"]},
                    {"name": "wall_hanging", "label": "Fixação", "type": "select",
                     "options": ["Apoio (mesa/chão)", "Parede", "Teto", "Livre"]},
                ],
                
                # ELETRÔNICOS
                "Eletrônicos": [
                    {"name": "power_consumption", "label": "Consumo", "type": "text",
                     "placeholder": "Ex: 12W, 60W"},
                    {"name": "voltage", "label": "Voltagem", "type": "select",
                     "options": ["110V", "220V", "Bivolt", "Bateria", "USB", "Desconhecido"]},
                    {"name": "working_condition", "label": "Funcionamento", "type": "select",
                     "options": ["Funcionando perfeitamente", "Funcionando com defeitos", "Não testado", "Não funciona"]},
                    {"name": "includes_accessories", "label": "Acessórios inclusos", "type": "text",
                     "placeholder": "Ex: Cabo, controle remoto, manual"},
                ],
                
                # GENÉRICO PARA OUTROS ITENS
                "Outros": [
                    {"name": "primary_use", "label": "Uso principal", "type": "text",
                     "placeholder": "Para que serve este item"},
                    {"name": "special_features", "label": "Características especiais", "type": "text",
                     "placeholder": "Funcionalidades únicas do item"},
                ]
            }
            
            # Get base fields for category (try exact match first, then partial matches)
            base_fields = field_templates.get(category, [])
            
            # If no exact match, try to find similar categories
            if not base_fields:
                category_lower = category.lower()
                for template_category, fields in field_templates.items():
                    if (template_category.lower() in category_lower or 
                        category_lower in template_category.lower()):
                        base_fields = fields
                        break
                
                # If still no match, use generic fields
                if not base_fields:
                    base_fields = field_templates["Outros"]
            
            # Add luxury brand authentication for high-end items
            luxury_brands = ["Gucci", "Prada", "Louis Vuitton", "Chanel", "Hermès", "Dior", 
                           "Versace", "Armani", "Dolce & Gabbana", "Fendi"]
            if brand and any(luxury.lower() in brand.lower() for luxury in luxury_brands):
                base_fields.append({
                    "name": "authenticity", "label": "Autenticidade", "type": "select",
                    "options": ["Autêntico", "Verificar autenticidade", "Réplica declarada"],
                    "required": True
                })
                base_fields.append({
                    "name": "serial_number", "label": "Número de série/certificado", "type": "text",
                    "placeholder": "Código ou certificado de autenticidade"
                })
            
            # Add vintage/age fields for older items
            if subcategory and any(word in subcategory.lower() for word in ["vintage", "retro", "antigo"]):
                base_fields.append({
                    "name": "era", "label": "Época/Período", "type": "select",
                    "options": ["Anos 70", "Anos 80", "Anos 90", "Anos 2000", "Anos 2010", "Contemporâneo"]
                })
            
            # Add care instructions for most items
            if category not in ["Eletrônicos"]:  # Electronics don't need washing instructions
                base_fields.append({
                    "name": "care_instructions", "label": "Instruções de cuidado", "type": "text",
                    "placeholder": "Ex: Lavar à mão, Dry clean only, Limpar com pano seco"
                })
            
            return {
                "success": True,
                "fields": base_fields
            }
            
        except Exception as e:
            logger.error(f"Dynamic fields generation error: {str(e)}")
            return {
                "success": False,
                "fields": [],
                "error": str(e)
            }

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
