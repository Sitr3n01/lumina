"""
Router de API para gerenciamento de conflitos entre reservas.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.conflict_detector import ConflictDetector
from app.database.session import get_db
from app.middleware.auth import get_current_active_user
from app.models.user import User
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/conflicts", tags=["Conflicts"])


class ConflictResponse(BaseModel):
    """Schema de resposta de conflito"""

    id: int
    booking_id_1: int
    booking_id_2: int
    conflict_type: str
    overlap_start: str
    overlap_end: str
    overlap_nights: int
    severity: str
    resolved: bool
    detected_at: str

    # Dados das reservas
    booking_1_guest: str
    booking_1_platform: str
    booking_1_dates: str
    booking_2_guest: str
    booking_2_platform: str
    booking_2_dates: str

    class Config:
        from_attributes = True


class ConflictResolveRequest(BaseModel):
    """Schema para resolver conflito"""

    resolution_notes: str


@router.get("/", response_model=list[ConflictResponse])
def list_conflicts(
    property_id: int = Query(..., description="ID do imóvel"),
    active_only: bool = Query(True, description="Apenas conflitos ativos"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Lista todos os conflitos.
    """
    conflict_detector = ConflictDetector(db)

    if active_only:
        conflicts = conflict_detector.get_active_conflicts(property_id)
    else:
        # TODO: Implementar busca de todos os conflitos
        conflicts = conflict_detector.get_active_conflicts(property_id)

    # Formatar resposta
    result = []
    for conflict in conflicts:
        b1 = conflict.booking_1
        b2 = conflict.booking_2

        result.append(
            {
                "id": conflict.id,
                "booking_id_1": conflict.booking_id_1,
                "booking_id_2": conflict.booking_id_2,
                "conflict_type": conflict.conflict_type.value,
                "overlap_start": conflict.overlap_start.isoformat() if conflict.overlap_start else None,
                "overlap_end": conflict.overlap_end.isoformat() if conflict.overlap_end else None,
                "overlap_nights": conflict.overlap_nights,
                "severity": conflict.severity,
                "resolved": conflict.resolved,
                "detected_at": conflict.detected_at.isoformat(),
                "booking_1_guest": b1.guest_name,
                "booking_1_platform": b1.platform,
                "booking_1_dates": f"{b1.check_in_date} - {b1.check_out_date}",
                "booking_2_guest": b2.guest_name,
                "booking_2_platform": b2.platform,
                "booking_2_dates": f"{b2.check_in_date} - {b2.check_out_date}",
            }
        )

    return result


@router.get("/summary")
def get_conflict_summary(
    property_id: int = Query(..., description="ID do imóvel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retorna resumo de conflitos.
    """
    conflict_detector = ConflictDetector(db)
    summary = conflict_detector.get_conflict_summary(property_id)

    return summary


@router.post("/{conflict_id}/resolve", status_code=200)
def resolve_conflict(
    conflict_id: int,
    request: ConflictResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Marca um conflito como resolvido.
    """
    conflict_detector = ConflictDetector(db)

    conflict = conflict_detector.resolve_conflict(conflict_id, request.resolution_notes)

    if not conflict:
        raise HTTPException(status_code=404, detail="Conflito não encontrado")

    logger.info(f"Conflict {conflict_id} resolved via API")

    return {"message": "Conflito marcado como resolvido", "conflict_id": conflict_id}


@router.post("/detect")
def detect_conflicts(
    property_id: int = Query(..., description="ID do imóvel"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Força detecção de conflitos para um imóvel.
    """
    conflict_detector = ConflictDetector(db)

    # Detectar conflitos
    conflicts = conflict_detector.detect_all_conflicts(property_id)

    # Auto-resolver conflitos de reservas canceladas
    auto_resolved = conflict_detector.auto_resolve_cancelled_conflicts(property_id)

    logger.info(f"Manual conflict detection: {len(conflicts)} found, {auto_resolved} auto-resolved")

    return {
        "conflicts_detected": len(conflicts),
        "auto_resolved": auto_resolved,
        "active_conflicts": len([c for c in conflicts if not c.resolved]),
    }
