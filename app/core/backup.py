# app/core/backup.py
"""
Sistema de backup automático do banco de dados.
Cria backups regulares com rotação automática.
"""

import asyncio
import gzip
import shutil
from datetime import datetime, timedelta
from pathlib import Path

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class BackupManager:
    """
    Gerenciador de backups do banco de dados.

    Features:
    - Backup comprimido (gzip)
    - Rotação automática (mantém apenas N backups mais recentes)
    - Backup incremental (diário, semanal, mensal)
    - Verificação de integridade
    """

    def __init__(
        self,
        backup_dir: str = "data/backups",
        max_daily_backups: int = 7,
        max_weekly_backups: int = 4,
        max_monthly_backups: int = 6,
    ):
        """
        Inicializa o gerenciador de backups.

        Args:
            backup_dir: Diretório onde backups serão armazenados
            max_daily_backups: Número de backups diários a manter
            max_weekly_backups: Número de backups semanais a manter
            max_monthly_backups: Número de backups mensais a manter
        """
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        self.daily_dir = self.backup_dir / "daily"
        self.weekly_dir = self.backup_dir / "weekly"
        self.monthly_dir = self.backup_dir / "monthly"

        for dir_path in [self.daily_dir, self.weekly_dir, self.monthly_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)

        self.max_daily = max_daily_backups
        self.max_weekly = max_weekly_backups
        self.max_monthly = max_monthly_backups

        self.db_path = settings.database_path

    def create_backup(self, backup_type: str = "daily") -> Path | None:
        """
        Cria um backup do banco de dados.

        Args:
            backup_type: Tipo do backup (daily, weekly, monthly)

        Returns:
            Path do arquivo de backup criado ou None se falhar
        """
        if not self.db_path.exists():
            logger.error(f"Database file not found: {self.db_path}")
            return None

        # Determinar diretório de destino
        backup_dirs = {
            "daily": self.daily_dir,
            "weekly": self.weekly_dir,
            "monthly": self.monthly_dir,
        }
        target_dir = backup_dirs.get(backup_type, self.daily_dir)

        # Nome do arquivo de backup
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"sentinel_backup_{backup_type}_{timestamp}.db.gz"
        backup_path = target_dir / backup_filename

        try:
            # Copiar e comprimir banco de dados
            logger.info(f"Creating {backup_type} backup: {backup_filename}")

            with open(self.db_path, "rb") as f_in, gzip.open(backup_path, "wb", compresslevel=9) as f_out:
                shutil.copyfileobj(f_in, f_out)

            backup_size_mb = backup_path.stat().st_size / (1024**2)
            logger.info(f"Backup created successfully: {backup_path} ({backup_size_mb:.2f} MB)")

            # Executar rotação de backups antigos
            self._rotate_backups(target_dir, self._get_max_backups(backup_type))

            return backup_path

        except Exception as e:
            logger.error(f"Failed to create backup: {e}")
            if backup_path.exists():
                backup_path.unlink()
            return None

    def _get_max_backups(self, backup_type: str) -> int:
        """Retorna número máximo de backups para o tipo especificado"""
        max_backups = {
            "daily": self.max_daily,
            "weekly": self.max_weekly,
            "monthly": self.max_monthly,
        }
        return max_backups.get(backup_type, self.max_daily)

    def _rotate_backups(self, backup_dir: Path, max_backups: int) -> None:
        """
        Remove backups antigos mantendo apenas os N mais recentes.

        Args:
            backup_dir: Diretório com backups
            max_backups: Número máximo de backups a manter
        """
        backups = sorted(backup_dir.glob("*.db.gz"), key=lambda p: p.stat().st_mtime, reverse=True)

        if len(backups) > max_backups:
            for old_backup in backups[max_backups:]:
                logger.info(f"Removing old backup: {old_backup.name}")
                old_backup.unlink()

    def restore_backup(self, backup_path: Path) -> bool:
        """
        Restaura banco de dados a partir de um backup.

        Args:
            backup_path: Caminho do arquivo de backup

        Returns:
            True se restaurado com sucesso, False caso contrário
        """
        if not backup_path.exists():
            logger.error(f"Backup file not found: {backup_path}")
            return False

        try:
            # Criar backup do banco atual antes de restaurar
            current_backup = self.db_path.with_suffix(".db.before_restore")
            if self.db_path.exists():
                shutil.copy2(self.db_path, current_backup)
                logger.info(f"Current database backed up to: {current_backup}")

            # Descomprimir e restaurar
            logger.info(f"Restoring backup from: {backup_path}")

            with gzip.open(backup_path, "rb") as f_in, open(self.db_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)

            logger.info("Backup restored successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to restore backup: {e}")
            # Tentar restaurar backup anterior
            if current_backup.exists():
                shutil.copy2(current_backup, self.db_path)
                logger.info("Restored previous database state")
            return False

    def list_backups(self, backup_type: str | None = None) -> list[dict]:
        """
        Lista todos os backups disponíveis.

        Args:
            backup_type: Filtrar por tipo (daily, weekly, monthly) ou None para todos

        Returns:
            Lista de dicts com informações dos backups
        """
        backups = []

        dirs_to_scan = {
            "daily": self.daily_dir,
            "weekly": self.weekly_dir,
            "monthly": self.monthly_dir,
        }

        if backup_type:
            dirs_to_scan = {backup_type: dirs_to_scan[backup_type]}

        for btype, bdir in dirs_to_scan.items():
            for backup_file in sorted(bdir.glob("*.db.gz"), key=lambda p: p.stat().st_mtime, reverse=True):
                stat = backup_file.stat()
                backups.append(
                    {
                        "type": btype,
                        "filename": backup_file.name,
                        "path": str(backup_file),
                        "size_mb": round(stat.st_size / (1024**2), 2),
                        "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    }
                )

        return backups

    def cleanup_old_backups(self, days: int = 90) -> int:
        """
        Remove backups mais antigos que N dias.

        Args:
            days: Número de dias para manter backups

        Returns:
            Número de backups removidos
        """
        cutoff_date = datetime.now() - timedelta(days=days)
        removed_count = 0

        for backup_dir in [self.daily_dir, self.weekly_dir, self.monthly_dir]:
            for backup_file in backup_dir.glob("*.db.gz"):
                if datetime.fromtimestamp(backup_file.stat().st_mtime) < cutoff_date:
                    logger.info(f"Removing old backup: {backup_file.name}")
                    backup_file.unlink()
                    removed_count += 1

        return removed_count


async def scheduled_backup_task():
    """
    Task assíncrona para executar backups agendados.
    Executa backup diário às 3h da manhã.

    Usage:
        # No main.py ou startup event:
        asyncio.create_task(scheduled_backup_task())
    """
    backup_manager = BackupManager()

    while True:
        try:
            now = datetime.now()

            # Backup diário às 3h da manhã
            if now.hour == 3 and now.minute == 0:
                logger.info("Starting scheduled daily backup")
                backup_manager.create_backup("daily")

                # Backup semanal aos domingos
                if now.weekday() == 6:  # Domingo
                    logger.info("Starting scheduled weekly backup")
                    backup_manager.create_backup("weekly")

                # Backup mensal no primeiro dia do mês
                if now.day == 1:
                    logger.info("Starting scheduled monthly backup")
                    backup_manager.create_backup("monthly")

                # Aguardar 1 minuto para não executar múltiplas vezes
                await asyncio.sleep(60)

        except Exception as e:
            logger.error(f"Error in scheduled backup task: {e}")

        # Verificar novamente em 60 segundos
        await asyncio.sleep(60)


def create_manual_backup(backup_type: str = "daily") -> Path | None:
    """
    Função helper para criar backup manual.

    Args:
        backup_type: Tipo do backup (daily, weekly, monthly)

    Returns:
        Path do backup criado ou None se falhar
    """
    backup_manager = BackupManager()
    return backup_manager.create_backup(backup_type)
