"""
Serviço para persistência de notificações no banco de dados.
Permite criar, listar, marcar como lida e obter resumos.
"""
from datetime import datetime, date, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationType
from app.utils.logger import get_logger

logger = get_logger(__name__)


class NotificationDBService:
    """Serviço para operações CRUD de notificações no banco de dados"""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        type: str,
        title: str,
        message: str = "",
        booking_id: Optional[int] = None
    ) -> Notification:
        """
        Cria uma nova notificação.

        Args:
            type: Tipo da notificação (new_booking, conflict, sync, etc.)
            title: Título curto
            message: Descrição detalhada
            booking_id: ID da reserva relacionada (opcional)

        Returns:
            Notification criada
        """
        notification = Notification(
            type=type,
            title=title,
            message=message,
            booking_id=booking_id,
            is_read=False,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        logger.info(f"Notification created: [{type}] {title}")
        return notification

    def get_list(
        self,
        limit: int = 20,
        offset: int = 0,
        type_filter: Optional[str] = None,
        unread_only: bool = False,
    ) -> Dict[str, Any]:
        """
        Lista notificações com filtros e paginação.

        Args:
            limit: Máximo de itens
            offset: Offset para paginação
            type_filter: Filtrar por tipo
            unread_only: Apenas não lidas

        Returns:
            Dict com items, total e unread_count
        """
        query = self.db.query(Notification)

        # Filtros
        if type_filter:
            # Suporta múltiplos tipos: "new_booking,booking_update,booking_cancel"
            types = [t.strip() for t in type_filter.split(",")]
            query = query.filter(Notification.type.in_(types))

        if unread_only:
            query = query.filter(Notification.is_read == False)

        # Total (com filtros aplicados)
        total = query.count()

        # Buscar itens ordenados por data (mais recentes primeiro)
        items = query.order_by(
            Notification.created_at.desc()
        ).offset(offset).limit(limit).all()

        # Contagem de não lidas GLOBAL (para badge no menu/sidebar)
        unread_count = self.db.query(Notification).filter(
            Notification.is_read == False
        ).count()

        # Contagem de não lidas COM os mesmos filtros (para display contextual)
        filtered_unread_count = unread_count
        if type_filter:
            types = [t.strip() for t in type_filter.split(",")]
            filtered_unread_count = self.db.query(Notification).filter(
                Notification.is_read == False,
                Notification.type.in_(types)
            ).count()

        return {
            "items": items,
            "total": total,
            "unread_count": unread_count,
            "filtered_unread_count": filtered_unread_count,
        }

    def mark_as_read(self, notification_id: int) -> Optional[Notification]:
        """Marca uma notificação como lida"""
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id
        ).first()

        if notification and not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc).replace(tzinfo=None)
            self.db.commit()
            logger.info(f"Notification {notification_id} marked as read")

        return notification

    def mark_all_as_read(self) -> int:
        """Marca todas as notificações como lidas. Retorna quantidade atualizada."""
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        count = self.db.query(Notification).filter(
            Notification.is_read == False
        ).update({
            Notification.is_read: True,
            Notification.read_at: now,
        })
        self.db.commit()
        logger.info(f"Marked {count} notifications as read")
        return count

    def get_summary(self) -> Dict[str, Any]:
        """
        Retorna resumo de notificações para os cards bento.

        Returns:
            Dict com total, unread, today, by_type
        """
        total = self.db.query(Notification).count()

        unread = self.db.query(Notification).filter(
            Notification.is_read == False
        ).count()

        # Notificações de hoje
        today_start = datetime.combine(date.today(), datetime.min.time())
        today = self.db.query(Notification).filter(
            Notification.created_at >= today_start
        ).count()

        # Contagem por tipo
        type_counts = self.db.query(
            Notification.type,
            func.count(Notification.id)
        ).group_by(Notification.type).all()

        by_type = {type_name: count for type_name, count in type_counts}

        return {
            "total": total,
            "unread": unread,
            "today": today,
            "by_type": by_type,
        }

    def get_unread_count(self) -> int:
        """Retorna contagem de notificações não lidas"""
        return self.db.query(Notification).filter(
            Notification.is_read == False
        ).count()
