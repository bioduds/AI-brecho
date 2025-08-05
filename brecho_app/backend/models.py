from sqlalchemy import (
    Column, String, Float, Integer, Text, DateTime, Boolean, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Consignor(Base):
    __tablename__ = "consignors"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    whatsapp = Column(String)
    email = Column(String)
    pix_key = Column(String)
    percent = Column(Float, default=0.5)  # Commission percentage
    notes = Column(Text)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    items = relationship("Item", back_populates="consignor")


class Item(Base):
    __tablename__ = "items"
    
    sku = Column(String, primary_key=True, index=True)
    consignor_id = Column(String, ForeignKey("consignors.id"))
    
    # AI-suggested fields
    acquisition_type = Column(String)  # consignação | doação | compra
    category = Column(String)
    subcategory = Column(String)
    brand = Column(String)
    gender = Column(String)
    size = Column(String)
    fit = Column(String)  # modelagem
    color = Column(String)
    fabric = Column(String)  # tecido
    condition = Column(String)  # A, A-, B, C
    flaws = Column(Text)  # defeitos
    title_ig = Column(String)  # AI-generated Instagram title
    tags = Column(Text)  # JSON array of tags
    summary_title = Column(String)  # AI-generated summary title
    
    # Measurements
    bust = Column(Float)
    waist = Column(Float)
    length = Column(Float)
    
    # Pricing
    cost = Column(Float, default=0)
    list_price = Column(Float)
    markdown_stage = Column(Integer, default=0)
    
    # Lifecycle
    acquired_at = Column(DateTime, server_default=func.now())
    listed_at = Column(DateTime)
    sold_at = Column(DateTime)
    sale_price = Column(Float)
    
    # Channels
    channel_listed = Column(String)
    channel_sold = Column(String)
    
    # Analytics
    days_on_hand = Column(Integer)
    
    # Media
    photos = Column(Text)  # JSON array of photo URLs
    
    # Meta
    notes = Column(Text)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # AI fields
    ai_confidence = Column(Float)  # Confidence in AI categorization
    ai_similar_items = Column(Text)  # JSON of similar items found
    
    # Relationships
    consignor = relationship("Consignor", back_populates="items")
    sales = relationship("Sale", back_populates="item")


class ItemDynamicField(Base):
    """Dynamic fields for items to support various product types"""
    __tablename__ = "item_dynamic_fields"
    
    id = Column(Integer, primary_key=True, index=True)
    item_sku = Column(String, ForeignKey("items.sku"), nullable=False)
    field_name = Column(String, nullable=False)
    field_value = Column(Text)
    field_type = Column(String, default="text")  # text, select, number, etc.
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationship
    item = relationship("Item", back_populates="dynamic_fields")


# Add dynamic fields relationship to Item
Item.dynamic_fields = relationship("ItemDynamicField", back_populates="item", cascade="all, delete-orphan")


class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(String, primary_key=True, index=True)
    sku = Column(String, ForeignKey("items.sku"), nullable=False)
    consignor_id = Column(String, ForeignKey("consignors.id"))
    
    # Sale details
    date = Column(DateTime, nullable=False)
    sale_price = Column(Float, nullable=False)
    discount_value = Column(Float, default=0)
    
    # Channel and customer
    channel = Column(String)  # online | loja | instagram
    customer_name = Column(String)
    customer_whatsapp = Column(String)
    
    # Payment
    payment_method = Column(String)
    
    # Meta
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    item = relationship("Item", back_populates="sales")


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="staff")  # admin | manager | staff
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    last_login = Column(DateTime)
