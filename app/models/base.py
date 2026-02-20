"""
Modelo base para todos os modelos SQLAlchemy.
Inclui campos comuns e configurações padrão.
"""
from datetime import datetime, timezone
from sqlalchemy import DateTime, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Classe base para todos os modelos do banco de dados"""
    pass


class TimestampMixin:
    """Mixin para adicionar timestamps automáticos"""

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
        comment="Data de criação do registro"
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
        comment="Data da última atualização"
    )


class BaseModel(Base, TimestampMixin):
    """
    Modelo base com ID e timestamps.
    Todas as tabelas principais devem herdar desta classe.
    """
    __abstract__ = True

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
        comment="ID único do registro"
    )

    def __repr__(self) -> str:
        """Representação string do modelo"""
        return f"<{self.__class__.__name__}(id={self.id})>"
