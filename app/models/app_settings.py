"""
Modelo para configurações persistentes do aplicativo.
Armazena configurações editáveis pelo frontend em formato key-value.
"""

from sqlalchemy import Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class AppSetting(BaseModel):
    """
    Configuração persistente do aplicativo.
    Usa formato key-value para flexibilidade (sem necessidade de migrations).

    Os valores são armazenados como texto. Para tipos complexos,
    usar JSON serializado.
    """

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="Chave da configuração (ex: condo_email, sync_interval)",
    )

    value: Mapped[str] = mapped_column(
        Text, nullable=False, default="", comment="Valor da configuração (texto ou JSON serializado)"
    )

    __table_args__ = (Index("idx_app_settings_key", "key"),)

    def __repr__(self) -> str:
        return f"<AppSetting(key='{self.key}', value='{self.value[:50]}')>"
