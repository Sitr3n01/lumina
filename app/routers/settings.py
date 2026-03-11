"""
Router para configurações do sistema.
GET /api/v1/settings - Retorna todas as configurações (merge .env + DB)
PUT /api/v1/settings - Salva configurações editáveis no banco de dados
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.middleware.auth import get_current_active_user
from app.services.settings_service import SettingsService
from app.schemas.settings import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])


@router.get("/", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retorna todas as configurações (merge .env + DB). Requer autenticação."""
    service = SettingsService(db)
    data = service.get_all_settings()
    return SettingsResponse(**data)


@router.put("/")
def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Salva configurações editáveis no banco de dados"""
    service = SettingsService(db)

    # Filtrar apenas campos não-None
    update_data = data.model_dump(exclude_none=True)
    saved = service.update_settings(update_data)

    return {
        "success": True,
        "message": "Configurações salvas com sucesso",
        "saved": saved,
    }


@router.post("/reset")
def reset_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Hard reset: remove todas as configurações do banco de dados,
    revertendo para os valores originais do wizard (.env).
    Requer autenticação.
    """
    service = SettingsService(db)
    count = service.reset_all_settings()
    return {
        "success": True,
        "message": f"Hard reset concluído. {count} configurações revertidas para os valores originais.",
        "cleared": count,
    }
