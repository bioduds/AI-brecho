from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

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
async def create_consignor(
    consignor: ConsignorCreate,
    db: Session = Depends(get_db)
):
    from crud import create_consignor
    return create_consignor(db=db, consignor=consignor)


@app.get(f"{settings.API_V1_STR}/consignors/", response_model=List[Consignor])
async def read_consignors(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    from crud import get_consignors
    return get_consignors(db, skip=skip, limit=limit)


@app.get(f"{settings.API_V1_STR}/consignors/{{consignor_id}}", response_model=Consignor)
async def read_consignor(
    consignor_id: str,
    db: Session = Depends(get_db)
):
    from crud import get_consignor
    consignor = get_consignor(db, consignor_id=consignor_id)
    if consignor is None:
        raise HTTPException(status_code=404, detail="Consignor not found")
    return consignor


# Items endpoints
@app.post(f"{settings.API_V1_STR}/items/", response_model=Item)
async def create_item(
    item: ItemCreate,
    db: Session = Depends(get_db)
):
    from crud import create_item
    return create_item(db=db, item=item)


@app.get(f"{settings.API_V1_STR}/items/", response_model=List[Item])
async def read_items(
    skip: int = 0,
    limit: int = 100,
    consignor_id: str = None,
    category: str = None,
    active: bool = True,
    db: Session = Depends(get_db)
):
    from crud import get_items
    return get_items(
        db, 
        skip=skip, 
        limit=limit, 
        consignor_id=consignor_id,
        category=category,
        active=active
    )


@app.get(f"{settings.API_V1_STR}/items/{{sku}}", response_model=Item)
async def read_item(
    sku: str,
    db: Session = Depends(get_db)
):
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
        message=result.get("error")
    )


@app.post(f"{settings.API_V1_STR}/ai/intake", response_model=AIIntakeResponse)
async def ai_intake_autoregister(request: AIIntakeRequest):
    """Auto-register items using AI analysis of photos"""
    if len(request.images) < 2:
        raise HTTPException(
            status_code=400, 
            detail="At least 2 images required"
        )
    
    result = await ai_service.intake_autoregister(request.images)
    return AIIntakeResponse(
        consignor_id=result.get("consignor_id"),
        proposal=result.get("proposal", {}),
        similar_items=result.get("similar_items", []),
        success=result.get("success", False),
        message=result.get("error")
    )


@app.post(f"{settings.API_V1_STR}/ai/confirm-intake")
async def confirm_ai_intake(
    sku: str,
    proposal: dict,
    images: List[str],
    db: Session = Depends(get_db)
):
    """Confirm and create item from AI intake proposal"""
    from crud import create_item_from_ai_proposal
    
    # Index item in AI vector database
    ai_result = await ai_service.index_item(sku, images, proposal.get("cadastro", {}))
    
    # Create item in main database
    item = create_item_from_ai_proposal(db, sku, proposal, ai_result)
    
    return {"success": True, "item": item, "ai_indexed": ai_result.get("success", False)}


# QR Code endpoints
@app.post(f"{settings.API_V1_STR}/qr/consignor", response_model=QRCodeResponse)
async def generate_consignor_qr(request: QRCodeRequest):
    """Generate QR code for consignor identification"""
    try:
        qr_code = qr_service.generate_consignor_qr(request.consignor_id, request.size)
        return QRCodeResponse(
            qr_code=qr_code,
            success=True
        )
    except Exception as e:
        return QRCodeResponse(
            qr_code="",
            success=False,
            message=str(e)
        )


# Mobile API endpoints
@app.post(f"{settings.API_V1_STR}/mobile/quick-intake", response_model=QuickIntakeResponse)
async def mobile_quick_intake(
    request: QuickIntakeRequest,
    db: Session = Depends(get_db)
):
    """Quick intake for mobile app - simplified workflow"""
    
    # Run AI analysis
    ai_result = await ai_service.intake_autoregister(request.images)
    
    if not ai_result.get("success"):
        raise HTTPException(
            status_code=500,
            detail="AI analysis failed"
        )
    
    # Generate SKU
    item_sku = str(uuid.uuid4())[:8].upper()
    
    # Determine if needs review (low confidence or similar items found)
    proposal = ai_result.get("proposal", {})
    similar_items = ai_result.get("similar_items", [])
    
    needs_review = (
        len(similar_items) > 0 or  # Similar items found
        not ai_result.get("consignor_id")  # No QR detected
    )
    
    if not needs_review:
        # Auto-create item
        from crud import create_item_from_ai_proposal
        create_item_from_ai_proposal(db, item_sku, proposal, ai_result)
        
        # Index in AI database
        await ai_service.index_item(item_sku, request.images, proposal.get("cadastro", {}))
    
    return QuickIntakeResponse(
        item_sku=item_sku,
        ai_suggestions=proposal,
        needs_review=needs_review,
        success=True
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
