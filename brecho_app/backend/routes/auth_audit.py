from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from services.access_audit import AccessAuditService

router = APIRouter()


def get_access_audit_service(db: Session = Depends(get_db)) -> AccessAuditService:
    return AccessAuditService(db)


@router.post("/auth/audit/login")
async def log_login(
    request: Request,
    user_data: dict,
    db: Session = Depends(get_db),
    audit_service: AccessAuditService = Depends(get_access_audit_service),
):
    """Registra um novo login de usuário com dados completos de auditoria"""
    try:
        log_id = await audit_service.log_user_login(request, user_data)
        return {"status": "success", "log_id": log_id}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao registrar login: {str(e)}"
        )


@router.post("/auth/audit/logout")
async def log_logout(
    request: Request,
    user_data: dict,
    db: Session = Depends(get_db),
    audit_service: AccessAuditService = Depends(get_access_audit_service),
):
    """Registra um logout de usuário"""
    try:
        await audit_service.log_user_logout(request, user_data)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao registrar logout: {str(e)}"
        )


@router.post("/auth/audit/activity")
async def log_activity(
    request: Request,
    activity_data: dict,
    db: Session = Depends(get_db),
    audit_service: AccessAuditService = Depends(get_access_audit_service),
):
    """Registra uma atividade do usuário"""
    try:
        activity_id = await audit_service.log_user_activity(request, activity_data)
        return {"status": "success", "activity_id": activity_id}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao registrar atividade: {str(e)}"
        )


@router.get("/auth/audit/stats/{user_id}")
async def get_user_stats(
    user_id: str,
    db: Session = Depends(get_db),
    audit_service: AccessAuditService = Depends(get_access_audit_service),
):
    """Obtém estatísticas de acesso de um usuário"""
    try:
        stats = await audit_service.get_user_access_stats(user_id)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}"
        )


@router.get("/auth/audit/history/{user_id}")
async def get_user_history(
    user_id: str,
    limit: Optional[int] = 50,
    db: Session = Depends(get_db),
    audit_service: AccessAuditService = Depends(get_access_audit_service),
):
    """Obtém histórico de acessos de um usuário"""
    try:
        history = await audit_service.get_user_access_history(user_id, limit)
        return history
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao obter histórico: {str(e)}"
        )
