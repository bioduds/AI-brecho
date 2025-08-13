from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import uuid
from typing import List

from config import settings
from database import get_db, engine
from models import Base
from schemas import *
from ai_services import ai_service, qr_service

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Mount static files for image serving
app.mount("/static", StaticFiles(directory=settings.UPLOAD_DIR), name="static")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "brecho-api"}


# Dashboard endpoint
@app.get(f"{settings.API_V1_STR}/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    from crud import get_dashboard_stats

    return get_dashboard_stats(db)


# Consignors endpoints
@app.post(f"{settings.API_V1_STR}/consignors/", response_model=Consignor)
async def create_consignor(consignor: ConsignorCreate, db: Session = Depends(get_db)):
    from crud import create_consignor

    return create_consignor(db=db, consignor=consignor)


@app.get(f"{settings.API_V1_STR}/consignors/", response_model=List[Consignor])
async def read_consignors(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    from crud import get_consignors

    return get_consignors(db, skip=skip, limit=limit)


@app.get(f"{settings.API_V1_STR}/consignors/{{consignor_id}}", response_model=Consignor)
async def read_consignor(consignor_id: str, db: Session = Depends(get_db)):
    from crud import get_consignor

    consignor = get_consignor(db, consignor_id=consignor_id)
    if consignor is None:
        raise HTTPException(status_code=404, detail="Consignor not found")
    return consignor


# Items endpoints
@app.post(f"{settings.API_V1_STR}/items/", response_model=Item)
async def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    from crud import create_item

    return create_item(db=db, item=item)


@app.get(f"{settings.API_V1_STR}/items/", response_model=List[Item])
async def read_items(
    skip: int = 0,
    limit: int = 100,
    consignor_id: str = None,
    category: str = None,
    active: bool = True,
    db: Session = Depends(get_db),
):
    from crud import get_items

    return get_items(
        db,
        skip=skip,
        limit=limit,
        consignor_id=consignor_id,
        category=category,
        active=active,
    )


@app.get(f"{settings.API_V1_STR}/items/{{sku}}", response_model=Item)
async def read_item(sku: str, db: Session = Depends(get_db)):
    from crud import get_item

    item = get_item(db, sku=sku)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


# AI Integration endpoints
@app.post(f"{settings.API_V1_STR}/ai/search", response_model=ImageSearchResponse)
async def ai_search_by_image(request: ImageSearchRequest):
    """Search for similar items using AI image analysis"""
    result = await ai_service.search_by_image(request.image, request.top_k)
    return ImageSearchResponse(
        results=result.get("results", []),
        success=result.get("success", False),
        message=result.get("error"),
    )


@app.post(f"{settings.API_V1_STR}/ai/intake", response_model=AIIntakeResponse)
async def ai_intake_autoregister(request: AIIntakeRequest):
    """Auto-register items using AI analysis of photos"""
    if len(request.images) < 1:
        raise HTTPException(status_code=400, detail="At least 1 image required")

    if len(request.images) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed")

    result = await ai_service.intake_autoregister(request.images, request.audio)
    return AIIntakeResponse(
        consignor_id=result.get("consignor_id"),
        proposal=result.get("proposal", {}),
        similar_items=result.get("similar_items", []),
        success=result.get("success", False),
        message=result.get("error"),
    )


@app.post(f"{settings.API_V1_STR}/ai/confirm-intake")
async def confirm_ai_intake(request_data: dict, db: Session = Depends(get_db)):
    """Confirm and create item from AI intake proposal"""
    from crud import create_item_from_ai_proposal

    sku = request_data.get("sku")
    proposal = request_data.get("proposal")
    images = request_data.get("images", [])

    if not sku or not proposal:
        raise HTTPException(status_code=400, detail="SKU and proposal required")

    # Index item in AI vector database
    ai_result = await ai_service.index_item(sku, images, proposal.get("cadastro", {}))

    # Create item in main database (pass images for saving)
    item = create_item_from_ai_proposal(db, sku, proposal, ai_result, images)

    return {
        "success": True,
        "item": item,
        "ai_indexed": ai_result.get("success", False) if ai_result else False,
    }


@app.post(
    f"{settings.API_V1_STR}/ai/dynamic-fields", response_model=DynamicFieldsResponse
)
async def get_dynamic_fields(request: DynamicFieldsRequest):
    """Generate dynamic fields for item registration based on category"""
    from schemas import DynamicFieldsResponse

    try:
        result = await ai_service.generate_dynamic_fields(
            category=request.category,
            subcategory=request.subcategory,
            brand=request.brand,
            images_b64=request.images,
        )

        return DynamicFieldsResponse(
            fields=result.get("fields", []),
            success=result.get("success", True),
            message=result.get("error"),
        )

    except Exception as e:
        return DynamicFieldsResponse(fields=[], success=False, message=str(e))


# QR Code endpoints
@app.post(f"{settings.API_V1_STR}/qr/consignor", response_model=QRCodeResponse)
async def generate_consignor_qr(request: QRCodeRequest):
    """Generate QR code for consignor identification"""
    try:
        qr_code = qr_service.generate_consignor_qr(request.consignor_id, request.size)
        return QRCodeResponse(qr_code=qr_code, success=True)
    except Exception as e:
        return QRCodeResponse(qr_code="", success=False, message=str(e))


# Mobile API endpoints
@app.post(
    f"{settings.API_V1_STR}/mobile/quick-intake", response_model=QuickIntakeResponse
)
async def mobile_quick_intake(
    request: QuickIntakeRequest, db: Session = Depends(get_db)
):
    """Quick intake for mobile app - simplified workflow"""

    # Run AI analysis
    ai_result = await ai_service.intake_autoregister(request.images)

    if not ai_result.get("success"):
        raise HTTPException(status_code=500, detail="AI analysis failed")

    # Generate SKU
    item_sku = str(uuid.uuid4())[:8].upper()

    # Determine if needs review (low confidence or similar items found)
    proposal = ai_result.get("proposal", {})
    similar_items = ai_result.get("similar_items", [])

    needs_review = len(similar_items) > 0 or not ai_result.get(  # Similar items found
        "consignor_id"
    )  # No QR detected

    if not needs_review:
        # Auto-create item
        from crud import create_item_from_ai_proposal

        create_item_from_ai_proposal(db, item_sku, proposal, ai_result)

        # Index in AI database
        await ai_service.index_item(
            item_sku, request.images, proposal.get("cadastro", {})
        )

    return QuickIntakeResponse(
        item_sku=item_sku,
        ai_suggestions=proposal,
        needs_review=needs_review,
        success=True,
    )


@app.patch(f"{settings.API_V1_STR}/items/{{sku}}", response_model=Item)
async def update_item(sku: str, item_update: ItemUpdate, db: Session = Depends(get_db)):
    """Update an item (partial update)"""
    from crud import get_item_by_sku, update_item

    # Check if item exists
    db_item = get_item_by_sku(db, sku=sku)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    # Update item
    return update_item(db=db, sku=sku, item_update=item_update)


# Sales endpoints
@app.get(f"{settings.API_V1_STR}/sales/", response_model=List[Sale])
async def read_sales(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all sales"""
    from crud import get_sales

    return get_sales(db, skip=skip, limit=limit)


@app.get(f"{settings.API_V1_STR}/sales/{{sale_id}}", response_model=Sale)
async def read_sale(sale_id: str, db: Session = Depends(get_db)):
    """Get a specific sale by ID"""
    from crud import get_sale

    db_sale = get_sale(db, sale_id=sale_id)
    if db_sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")
    return db_sale


@app.post(f"{settings.API_V1_STR}/sales/", response_model=Sale)
async def create_sale(sale: SaleCreate, db: Session = Depends(get_db)):
    """Create a new sale"""
    from crud import create_sale

    return create_sale(db=db, sale=sale)


@app.put(f"{settings.API_V1_STR}/sales/{{sale_id}}", response_model=Sale)
async def update_sale(sale_id: str, sale: SaleCreate, db: Session = Depends(get_db)):
    """Update a sale"""
    from crud import get_sale, update_sale

    # Check if sale exists
    db_sale = get_sale(db, sale_id=sale_id)
    if db_sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")

    # Update sale
    for field, value in sale.dict(exclude_unset=True).items():
        setattr(db_sale, field, value)

    db.commit()
    db.refresh(db_sale)
    return db_sale


@app.delete(f"{settings.API_V1_STR}/sales/{{sale_id}}")
async def delete_sale(sale_id: str, db: Session = Depends(get_db)):
    """Delete a sale"""
    from crud import get_sale

    # Check if sale exists
    db_sale = get_sale(db, sale_id=sale_id)
    if db_sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")

    # Delete sale
    db.delete(db_sale)
    db.commit()
    return {"message": "Sale deleted successfully"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
