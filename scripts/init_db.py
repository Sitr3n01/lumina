"""
Script de inicialização do banco de dados.
Cria todas as tabelas e insere dados iniciais.
"""

import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.database.session import create_all_tables, get_db_context
from app.models.calendar_source import CalendarSource, PlatformType
from app.models.property import Property
from app.utils.logger import get_logger, setup_logger

# Configura logging
setup_logger(log_level=settings.LOG_LEVEL, app_name=settings.APP_NAME)
logger = get_logger(__name__)


def init_database():
    """Inicializa o banco de dados com estrutura e dados iniciais"""

    logger.info("=" * 60)
    logger.info("SENTINEL - Inicialização do Banco de Dados")
    logger.info("=" * 60)

    try:
        # Criar todas as tabelas
        logger.info("Criando estrutura do banco de dados...")
        create_all_tables()
        logger.info("✅ Estrutura do banco criada com sucesso!")

        # Inserir dados iniciais
        logger.info("\nInserindo dados iniciais...")

        with get_db_context() as db:
            # Verificar se já existe uma propriedade
            existing_property = db.query(Property).first()

            if existing_property:
                logger.info(f"⚠️  Propriedade já existe: {existing_property.name}")
                logger.info("Pulando inserção de dados iniciais.")
            else:
                # Criar a propriedade principal
                property_data = Property(
                    name=settings.PROPERTY_NAME,
                    address=settings.PROPERTY_ADDRESS,
                    max_guests=4,
                    condo_name=settings.CONDO_NAME,
                    condo_admin_name=settings.CONDO_ADMIN_NAME,
                )
                db.add(property_data)
                db.flush()  # Garante que o ID está disponível

                logger.info(f"✅ Propriedade criada: {property_data.name}")

                # Criar fonte de calendário Airbnb
                airbnb_source = CalendarSource(
                    property_id=property_data.id,
                    platform=PlatformType.AIRBNB,
                    ical_url=settings.AIRBNB_ICAL_URL,
                    sync_enabled=True,
                    sync_frequency_minutes=settings.CALENDAR_SYNC_INTERVAL_MINUTES,
                )
                db.add(airbnb_source)
                logger.info("✅ Fonte de calendário criada: Airbnb")

                # Criar fonte de calendário Booking
                booking_source = CalendarSource(
                    property_id=property_data.id,
                    platform=PlatformType.BOOKING,
                    ical_url=settings.BOOKING_ICAL_URL,
                    sync_enabled=True,
                    sync_frequency_minutes=settings.CALENDAR_SYNC_INTERVAL_MINUTES,
                )
                db.add(booking_source)
                logger.info("✅ Fonte de calendário criada: Booking.com")

                db.commit()
                logger.info("\n✅ Dados iniciais inseridos com sucesso!")

        # Resumo
        logger.info("\n" + "=" * 60)
        logger.info("RESUMO DA INICIALIZAÇÃO")
        logger.info("=" * 60)

        with get_db_context() as db:
            properties_count = db.query(Property).count()
            sources_count = db.query(CalendarSource).count()

            logger.info(f"Propriedades cadastradas: {properties_count}")
            logger.info(f"Fontes de calendário: {sources_count}")

        logger.info("\n" + "=" * 60)
        logger.info("✅ BANCO DE DADOS INICIALIZADO COM SUCESSO!")
        logger.info("=" * 60)
        logger.info("\nPróximos passos:")
        logger.info("  1. Verifique as configurações no arquivo .env")
        logger.info("  2. Inicie o servidor: scripts\\start_server.bat")
        logger.info("  3. Teste o bot Telegram enviando /start")
        logger.info("\n")

    except Exception as e:
        logger.error(f"❌ Erro ao inicializar banco de dados: {e}")
        logger.exception(e)
        sys.exit(1)


if __name__ == "__main__":
    init_database()
