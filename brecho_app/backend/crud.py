from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from models import Consignor, Item, Sale
from schemas import ConsignorCreate, ItemCreate, SaleCreate
import json


def get_consignor(db: Session, consignor_id: str):
    return db.query(Consignor).filter(Consignor.id == consignor_id).first()


def get_consignors(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Consignor).filter(Consignor.active == True).offset(skip).limit(limit).all()


def create_consignor(db: Session, consignor: ConsignorCreate):
    db_consignor = Consignor(**consignor.dict())
    db.add(db_consignor)
    db.commit()
    db.refresh(db_consignor)
    return db_consignor


def get_item(db: Session, sku: str):
    return db.query(Item).filter(Item.sku == sku).first()


def get_items(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    consignor_id: Optional[str] = None,
    category: Optional[str] = None,
    active: bool = True
):
    query = db.query(Item).filter(Item.active == active)
    
    if consignor_id:
        query = query.filter(Item.consignor_id == consignor_id)
    
    if category:
        query = query.filter(Item.category == category)
    
    return query.offset(skip).limit(limit).all()


def create_item(db: Session, item: ItemCreate):
    db_item = Item(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def create_item_from_ai_proposal(db: Session, sku: str, proposal: dict, ai_result: dict):
    """Create item from AI intake proposal"""
    cadastro = proposal.get("cadastro", {})
    price_info = proposal.get("price", {})
    
    # Parse price range if available
    list_price = None
    price_range = price_info.get("Faixa", "")
    if price_range and "R$" in price_range:
        # Extract first price from range like "R$25–R$35"
        try:
            price_str = price_range.split("–")[0].replace("R$", "").strip()
            list_price = float(price_str)
        except:
            pass
    
    item_data = {
        "sku": sku,
        "consignor_id": proposal.get("consignor_id"),
        "category": cadastro.get("Categoria"),
        "subcategory": cadastro.get("Subcategoria"),
        "brand": cadastro.get("Marca"),
        "gender": cadastro.get("Gênero"),
        "size": cadastro.get("Tamanho"),
        "fit": cadastro.get("Modelagem"),
        "color": cadastro.get("Cor"),
        "fabric": cadastro.get("Tecido"),
        "condition": cadastro.get("Condição"),
        "flaws": cadastro.get("Defeitos"),
        "title_ig": cadastro.get("TituloIG"),
        "tags": json.dumps(cadastro.get("Tags", [])) if cadastro.get("Tags") else None,
        "list_price": list_price,
        "ai_confidence": 0.8,  # Default confidence
        "ai_similar_items": json.dumps(ai_result.get("similar_items", [])),
        "notes": f"AI Auto-intake: {price_info.get('Motivo', '')}"
    }
    
    db_item = Item(**item_data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def get_sale(db: Session, sale_id: str):
    return db.query(Sale).filter(Sale.id == sale_id).first()


def get_sales(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Sale).offset(skip).limit(limit).all()


def create_sale(db: Session, sale: SaleCreate):
    db_sale = Sale(**sale.dict())
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    
    # Update item as sold
    item = get_item(db, sale.sku)
    if item:
        item.sold_at = sale.date
        item.sale_price = sale.sale_price
        item.channel_sold = sale.channel
        # Calculate days on hand
        if item.acquired_at:
            days_diff = (sale.date - item.acquired_at).days
            item.days_on_hand = days_diff
        db.commit()
    
    return db_sale


def get_dashboard_stats(db: Session):
    """Get dashboard statistics"""
    total_items = db.query(Item).filter(Item.active == True).count()
    total_sold = db.query(Item).filter(Item.sold_at.isnot(None)).count()
    total_available = total_items - total_sold
    
    total_sales_value = db.query(Sale).with_entities(
        db.func.sum(Sale.sale_price)
    ).scalar() or 0
    
    recent_sales = db.query(Sale).order_by(Sale.date.desc()).limit(10).all()
    
    return {
        "total_items": total_items,
        "total_sold": total_sold,
        "total_available": total_available,
        "total_sales_value": float(total_sales_value),
        "recent_sales": recent_sales
    }
