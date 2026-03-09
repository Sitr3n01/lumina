# app/api/v1/health.py
"""
Endpoints de health check e monitoramento do sistema.
Usado por load balancers e ferramentas de monitoramento.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from typing import Dict, Any
import psutil
import os

from app.database.session import get_db
from app.config import settings
from app.version import __version__
from app.models.user import User
from app.middleware.auth import get_current_admin_user

router = APIRouter(prefix="/health", tags=["Health Check"])


@router.get("/", status_code=status.HTTP_200_OK)
def health_check_basic() -> Dict[str, Any]:
    """
    Health check básico - retorna apenas status OK.
    Usado por load balancers para verificar se a aplicação está rodando.

    Returns:
        Dict com status da aplicação
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
def readiness_check(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Readiness check - verifica se a aplicação está pronta para receber tráfego.
    Valida conexão com banco de dados e outros recursos críticos.

    Args:
        db: Sessão do banco de dados

    Returns:
        Dict com status detalhado de prontidão

    Raises:
        HTTPException 503: Se algum serviço crítico estiver indisponível
    """
    checks = {}

    # Verificar banco de dados
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy", "message": "Database connection OK"}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "message": "Database connection failed"}

    # Verificar se diretórios críticos existem
    critical_dirs = ["data", "data/logs", "data/generated_docs"]
    dirs_ok = all(os.path.exists(d) for d in critical_dirs)
    checks["filesystem"] = {
        "status": "healthy" if dirs_ok else "unhealthy",
        "message": "All critical directories exist" if dirs_ok else "Missing critical directories"
    }

    # Status geral
    all_healthy = all(check["status"] == "healthy" for check in checks.values())

    return {
        "status": "ready" if all_healthy else "not_ready",
        "timestamp": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
        "checks": checks,
    }


@router.get("/live", status_code=status.HTTP_200_OK)
def liveness_check() -> Dict[str, str]:
    """
    Liveness check - verifica se a aplicação está viva (não travada).
    Usado por orquestradores como Kubernetes para restart automático.

    Returns:
        Dict com status básico
    """
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
    }


@router.get("/metrics", status_code=status.HTTP_200_OK)
def system_metrics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Métricas detalhadas do sistema (CPU, memória, disco, etc).
    Requer autenticação de administrador.

    Args:
        db: Sessão do banco de dados
        admin: Usuário admin autenticado

    Returns:
        Dict com métricas do sistema
    """
    # Métricas de CPU
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count()

    # Métricas de memória
    memory = psutil.virtual_memory()
    memory_info = {
        "total_mb": round(memory.total / (1024 ** 2), 2),
        "available_mb": round(memory.available / (1024 ** 2), 2),
        "used_mb": round(memory.used / (1024 ** 2), 2),
        "percent": memory.percent,
    }

    # Métricas de disco
    disk = psutil.disk_usage('.')
    disk_info = {
        "total_gb": round(disk.total / (1024 ** 3), 2),
        "used_gb": round(disk.used / (1024 ** 3), 2),
        "free_gb": round(disk.free / (1024 ** 3), 2),
        "percent": disk.percent,
    }

    # Contagem de usuários
    try:
        user_count = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
    except Exception:
        user_count = 0
        active_users = 0

    # Tamanho do banco de dados
    db_size_bytes = 0
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if db_path and os.path.exists(db_path):
        db_size_bytes = os.path.getsize(db_path)

    return {
        "timestamp": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
        "system": {
            "cpu": {
                "count": cpu_count,
                "usage_percent": cpu_percent,
            },
            "memory": memory_info,
            "disk": disk_info,
        },
        "application": {
            "database_size_mb": round(db_size_bytes / (1024 ** 2), 2),
            "total_users": user_count,
            "active_users": active_users,
        },
        "environment": settings.APP_ENV,
    }


@router.get("/version", status_code=status.HTTP_200_OK)
def application_version() -> Dict[str, str]:
    """
    Retorna informações de versão da aplicação.

    Returns:
        Dict com versão e informações do build
    """
    return {
        "service": settings.APP_NAME,
        "version": __version__,
        "environment": settings.APP_ENV,
        "python_version": os.sys.version.split()[0],
    }
