"""
Router de API para gerenciamento de ações de sincronização.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_active_user
from app.models.user import User
from app.services.sync_action_service import SyncActionService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/sync-actions", tags=["Sync Actions"])


class SyncActionResponse(BaseModel):
    """Schema de resposta de ação"""

    id: int
    action_type: str
    status: str
    target_platform: str
    priority: str
    priority_emoji: str
    description: str
    reason: str
    action_url: str | None
    start_date: str | None
    end_date: str | None
    created_at: str
    auto_dismiss_after_hours: int | None

    class Config:
        from_attributes = True


class ActionCompleteRequest(BaseModel):
    """Schema para completar ação"""

    notes: str | None = None


class ActionDismissRequest(BaseModel):
    """Schema para descartar ação"""

    notes: str | None = None


@router.get("/", response_model=list[SyncActionResponse])
def list_sync_actions(
    property_id: int = Query(..., description="ID do imóvel"),
    status: str = Query("pending", description="Status (pending/completed/dismissed)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Lista ações de sincronização.
    """
    sync_action_service = SyncActionService(db)

    if status == "pending":
        actions = sync_action_service.get_pending_actions(property_id)
    else:
        # TODO: Implementar filtro por outros status
        actions = sync_action_service.get_pending_actions(property_id)

    # Formatar resposta
    result = []
    for action in actions:
        result.append(
            {
                "id": action.id,
                "action_type": action.action_type.value,
                "status": action.status.value,
                "target_platform": action.target_platform.value,
                "priority": action.priority,
                "priority_emoji": action.priority_emoji,
                "description": action.get_action_description(),
                "reason": action.reason,
                "action_url": action.action_url,
                "start_date": action.start_date.isoformat() if action.start_date else None,
                "end_date": action.end_date.isoformat() if action.end_date else None,
                "created_at": action.created_at.isoformat(),
                "auto_dismiss_after_hours": action.auto_dismiss_after_hours,
            }
        )

    return result


@router.get("/summary")
def get_actions_summary(
    property_id: int = Query(..., description="ID do imóvel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna resumo de ações.
    """
    sync_action_service = SyncActionService(db)
    summary = sync_action_service.get_action_summary(property_id)

    return summary


@router.post("/{action_id}/complete", status_code=200)
def complete_action(
    action_id: int,
    request: ActionCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Marca uma ação como completada.
    """
    sync_action_service = SyncActionService(db)

    action = sync_action_service.mark_action_completed(action_id, request.notes)

    if not action:
        raise HTTPException(status_code=404, detail="Ação não encontrada")

    logger.info(f"Action {action_id} completed via API")

    return {"message": "Ação marcada como completada", "action_id": action_id}


@router.post("/{action_id}/dismiss", status_code=200)
def dismiss_action(
    action_id: int,
    request: ActionDismissRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Descarta uma ação.
    """
    sync_action_service = SyncActionService(db)

    action = sync_action_service.mark_action_dismissed(action_id, request.notes)

    if not action:
        raise HTTPException(status_code=404, detail="Ação não encontrada")

    logger.info(f"Action {action_id} dismissed via API")

    return {"message": "Ação descartada", "action_id": action_id}


@router.post("/auto-dismiss")
def auto_dismiss_expired(
    property_id: int = Query(..., description="ID do imóvel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Auto-descarta ações expiradas.
    """
    sync_action_service = SyncActionService(db)

    dismissed_count = sync_action_service.auto_dismiss_expired_actions(property_id)

    return {"dismissed_count": dismissed_count, "message": f"{dismissed_count} ações expiradas foram descartadas"}
