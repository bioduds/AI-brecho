from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Base schemas
class ConsignorBase(BaseModel):
    name: str
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    pix_key: Optional[str] = None
    percent: float = 0.5
    notes: Optional[str] = None
    active: bool = True


class ConsignorCreate(ConsignorBase):
    id: str


class ConsignorUpdate(BaseModel):
    name: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    pix_key: Optional[str] = None
    percent: Optional[float] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


class Consignor(ConsignorBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Item schemas
class ItemBase(BaseModel):
    consignor_id: Optional[str] = None
    acquisition_type: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    gender: Optional[str] = None
    size: Optional[str] = None
    fit: Optional[str] = None
    color: Optional[str] = None
    fabric: Optional[str] = None
    condition: Optional[str] = None
    flaws: Optional[str] = None
    title_ig: Optional[str] = None
    tags: Optional[str] = None
    summary_title: Optional[str] = None
    bust: Optional[float] = None
    waist: Optional[float] = None
    length: Optional[float] = None
    cost: float = 0
    list_price: Optional[float] = None
    markdown_stage: int = 0
    channel_listed: Optional[str] = None
    photos: Optional[str] = None
    notes: Optional[str] = None
    active: bool = True


class ItemCreate(ItemBase):
    sku: str


class ItemUpdate(BaseModel):
    consignor_id: Optional[str] = None
    acquisition_type: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    gender: Optional[str] = None
    size: Optional[str] = None
    fit: Optional[str] = None
    color: Optional[str] = None
    fabric: Optional[str] = None
    condition: Optional[str] = None
    flaws: Optional[str] = None
    title_ig: Optional[str] = None
    tags: Optional[str] = None
    bust: Optional[float] = None
    waist: Optional[float] = None
    length: Optional[float] = None
    cost: Optional[float] = None
    list_price: Optional[float] = None
    markdown_stage: Optional[int] = None
    channel_listed: Optional[str] = None
    photos: Optional[str] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


class Item(ItemBase):
    sku: str
    acquired_at: datetime
    listed_at: Optional[datetime] = None
    sold_at: Optional[datetime] = None
    sale_price: Optional[float] = None
    channel_sold: Optional[str] = None
    days_on_hand: Optional[int] = None
    ai_confidence: Optional[float] = None
    ai_similar_items: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Sale schemas
class SaleBase(BaseModel):
    sku: str
    consignor_id: Optional[str] = None
    date: datetime
    sale_price: float
    discount_value: float = 0
    channel: Optional[str] = None
    customer_name: Optional[str] = None
    customer_whatsapp: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class SaleCreate(SaleBase):
    id: str


class Sale(SaleBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# AI Integration schemas
class AIIntakeRequest(BaseModel):
    images: List[str] = Field(..., description="Base64 encoded images")
    audio: Optional[str] = Field(None, description="Base64 encoded audio")
    session_id: Optional[str] = None


class AIIntakeResponse(BaseModel):
    consignor_id: Optional[str] = None
    proposal: dict
    similar_items: List[dict]
    success: bool
    message: Optional[str] = None
    dynamic_fields: Optional[dict] = None  # New field for dynamic fields


class DynamicFieldsRequest(BaseModel):
    category: str
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    images: Optional[List[str]] = None  # Base64 images for analysis


class DynamicFieldsResponse(BaseModel):
    fields: List[dict]  # Dynamic field definitions
    success: bool = True
    message: Optional[str] = None


class ImageSearchRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image")
    top_k: int = 5


class ImageSearchResponse(BaseModel):
    results: List[dict]
    success: bool
    message: Optional[str] = None


# QR Code generation
class QRCodeRequest(BaseModel):
    consignor_id: str
    size: int = 200


class QRCodeResponse(BaseModel):
    qr_code: str = Field(..., description="Base64 encoded QR code image")
    success: bool
    message: Optional[str] = None


# Mobile API schemas
class MobileAuthRequest(BaseModel):
    username: str
    password: str


class MobileAuthResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: str


class QuickIntakeRequest(BaseModel):
    images: List[str] = Field(..., description="Base64 encoded images")
    consignor_id: Optional[str] = None
    notes: Optional[str] = None


class QuickIntakeResponse(BaseModel):
    item_sku: str
    ai_suggestions: dict
    needs_review: bool
    success: bool
    message: Optional[str] = None
