# app/core/token_blacklist.py
"""
Token Blacklist Service

Gerencia invalidação de tokens JWT (logout, password change, etc).
Suporta Redis (produção) com fallback para in-memory (desenvolvimento).
"""

import time
from datetime import UTC, datetime

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class TokenBlacklist:
    """
    Gerenciador de tokens inválidos (blacklist).

    Prioridade:
    1. Redis (se disponível) - persistente, distribuído
    2. In-memory (fallback) - volátil, apenas single-server

    Uso:
        blacklist = TokenBlacklist()
        blacklist.revoke_token("token_jwt", expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=30))
        if blacklist.is_revoked("token_jwt"):
            raise HTTPException(401, "Token revogado")
    """

    def __init__(self):
        self._redis_client: object | None = None
        self._memory_blacklist: set[str] = set()
        self._memory_expiry: dict[str, float] = {}  # FIX: Track expiration times
        # Valor associado a uma chave, quando ela tem um. Só `user_revoked:*` usa:
        # guarda QUANDO a revogação aconteceu, que é o que permite distinguir um token
        # emitido antes dela de um emitido depois. O ramo Redis já guardava isso via
        # SETEX; o ramo in-memory só tinha o set, e por isso respondia "revogado" para
        # qualquer token do usuário — inclusive o novo, emitido após a troca de senha.
        self._memory_values: dict[str, int] = {}
        self._setup_redis()
        self._start_cleanup_task()  # FIX: Iniciar limpeza automática

    def reset(self) -> None:
        """
        Descarta todo o estado in-memory.

        Existe para os testes: a blacklist é um singleton de módulo, então sem isto o
        estado vaza de um teste para o próximo. O `conftest` chamava `.clear()` em dois
        atributos que nunca existiram (`blacklisted_tokens`, `_tokens`) protegidos por
        `hasattr`, o que fazia a limpeza ser um no-op SILENCIOSO — a suíte falhava de
        forma intermitente e nada indicava a causa. Um método nomeado quebra alto se
        sumir, em vez de não fazer nada.
        """
        self._memory_blacklist.clear()
        self._memory_expiry.clear()
        self._memory_values.clear()

    def _setup_redis(self):
        """Tenta conectar ao Redis, usa in-memory como fallback"""
        # Verificar se Redis está configurado
        redis_url = getattr(settings, "REDIS_URL", None)

        if not redis_url:
            logger.warning(
                "REDIS_URL not configured. Using in-memory token blacklist. "
                "This is NOT recommended for production with multiple servers!"
            )
            return

        try:
            import redis

            # Tentar conectar ao Redis
            self._redis_client = redis.from_url(
                redis_url, decode_responses=True, socket_connect_timeout=2, socket_timeout=2
            )

            # Testar conexão
            self._redis_client.ping()
            logger.info(f"Redis connected successfully: {redis_url}")

        except ImportError:
            logger.error("redis package not installed. Install with: pip install redis")
            self._redis_client = None

        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Using in-memory blacklist (not suitable for production)")
            self._redis_client = None

    def revoke_token(self, token: str, expires_at: datetime) -> bool:
        """
        Adiciona token à blacklist até sua expiração natural.

        Args:
            token: Token JWT completo
            expires_at: Quando o token expira naturalmente

        Returns:
            True se adicionado com sucesso
        """
        # Calcular TTL (tempo até expiração)
        ttl_seconds = int((expires_at - datetime.now(UTC).replace(tzinfo=None)).total_seconds())

        if ttl_seconds <= 0:
            # Token já expirou naturalmente, não precisa blacklist
            return True

        # Chave no Redis/memory
        key = f"blacklist:{token}"

        if self._redis_client:
            try:
                # Redis: armazena com TTL automático
                self._redis_client.setex(key, ttl_seconds, "1")
                logger.info(f"Token revoked in Redis (TTL: {ttl_seconds}s)")
                return True

            except Exception as e:
                logger.error(f"Failed to revoke token in Redis: {e}")
                # Fallback para memory
                self._memory_blacklist.add(key)
                return True

        else:
            # In-memory: adiciona à blacklist
            self._memory_blacklist.add(key)
            logger.debug(f"Token revoked in memory (TTL: {ttl_seconds}s)")

            # Agendar limpeza (simples, sem threading)
            # Em produção, use Redis ou background task
            self._schedule_cleanup(key, ttl_seconds)
            return True

    def is_revoked(self, token: str) -> bool:
        """
        Verifica se token está na blacklist.

        Args:
            token: Token JWT completo

        Returns:
            True se token foi revogado
        """
        key = f"blacklist:{token}"

        if self._redis_client:
            try:
                # Redis: verificar se chave existe
                return bool(self._redis_client.exists(key))

            except Exception as e:
                logger.error(f"Failed to check Redis blacklist: {e}")
                # Fallback para memory
                return key in self._memory_blacklist

        else:
            # In-memory: verificar set
            return key in self._memory_blacklist

    def revoke_all_user_tokens(self, user_id: int, current_token_exp: datetime) -> bool:
        """
        Revoga TODOS os tokens de um usuário (ex: ao mudar senha).

        Nota: Implementação simplificada. Em produção real, use:
        - Redis SET para armazenar "user:{user_id}:token_version"
        - Incrementar versão ao mudar senha
        - Verificar versão no token vs Redis

        Args:
            user_id: ID do usuário
            current_token_exp: Expiração do token atual (para TTL)

        Returns:
            True se marcado para revogação
        """
        key = f"user_revoked:{user_id}"
        ttl_seconds = int((current_token_exp - datetime.now(UTC).replace(tzinfo=None)).total_seconds())

        if ttl_seconds <= 0:
            return True

        if self._redis_client:
            try:
                # Armazena timestamp de revogação
                self._redis_client.setex(key, ttl_seconds, str(int(time.time())))
                logger.info(f"All tokens revoked for user {user_id}")
                return True

            except Exception as e:
                logger.error(f"Failed to revoke user tokens: {e}")
                return False

        else:
            # In-memory: guardar QUANDO revogou, espelhando o valor que o Redis grava.
            # Só a presença da chave não basta — ver `is_user_revoked`.
            self._memory_blacklist.add(key)
            self._memory_values[key] = int(time.time())
            self._schedule_cleanup(key, ttl_seconds)
            return True

    def is_user_revoked(self, user_id: int, token_issued_at: datetime) -> bool:
        """
        Verifica se todos os tokens do usuário foram revogados.

        Args:
            user_id: ID do usuário
            token_issued_at: Quando o token foi emitido (claim 'iat')

        Returns:
            True se tokens do usuário foram revogados após emissão deste token
        """
        key = f"user_revoked:{user_id}"

        if self._redis_client:
            try:
                revoked_at_str = self._redis_client.get(key)
                if not revoked_at_str:
                    return False

                revoked_at = int(revoked_at_str)
                token_issued_ts = int(token_issued_at.timestamp())

                # Se revogação foi DEPOIS da emissão do token, token é inválido
                return revoked_at > token_issued_ts

            except Exception as e:
                logger.error(f"Failed to check user revocation: {e}")
                return False

        else:
            # Mesma semântica do ramo Redis acima, e por um motivo concreto: "a chave
            # existe, logo está revogado" derrubaria também o token NOVO, emitido logo
            # após a troca de senha — o usuário trocaria a senha e ficaria trancado
            # para fora até o TTL expirar. Só é inválido o token emitido ANTES da
            # revogação. Em produção não há Redis configurado, então este é o ramo que
            # de fato roda.
            revoked_at = self._memory_values.get(key)
            if revoked_at is None:
                return False

            return revoked_at > int(token_issued_at.timestamp())

    def _schedule_cleanup(self, key: str, delay_seconds: int):
        """
        Agenda remoção da blacklist in-memory após TTL.
        FIX: Armazena timestamp de expiração para limpeza posterior.
        """
        if not self._redis_client:
            # Armazenar tempo de expiração
            expiration_time = time.time() + delay_seconds
            self._memory_expiry[key] = expiration_time

    def clear_expired(self):
        """
        Remove tokens expirados da blacklist in-memory.
        FIX: Implementação real de limpeza.
        """
        if self._redis_client:
            # Redis já limpa automaticamente
            return

        # FIX: Limpar tokens expirados baseado em timestamp
        current_time = time.time()
        expired_keys = [k for k, exp_time in self._memory_expiry.items() if exp_time <= current_time]

        for key in expired_keys:
            self._memory_blacklist.discard(key)
            self._memory_values.pop(key, None)
            del self._memory_expiry[key]

        if expired_keys:
            logger.info(f"Cleaned {len(expired_keys)} expired tokens from memory blacklist")
        else:
            logger.debug(f"In-memory blacklist size: {len(self._memory_blacklist)} active tokens")

    def _start_cleanup_task(self):
        """FIX: Inicia task de limpeza periódica para in-memory blacklist"""
        if self._redis_client:
            return  # Redis não precisa de limpeza manual

        import asyncio

        try:
            # Tentar criar task se loop está disponível
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
            logger.info("Started periodic cleanup task for in-memory token blacklist")
        except RuntimeError:
            # Loop não disponível (startup), será chamado manualmente
            logger.warning("Could not start cleanup task (no event loop). Call clear_expired() manually.")

    async def _periodic_cleanup(self):
        """FIX: Task assíncrona que limpa tokens expirados a cada 5 minutos"""
        import asyncio

        while True:
            try:
                await asyncio.sleep(300)  # 5 minutos
                self.clear_expired()
            except Exception as e:
                logger.error(f"Error in periodic cleanup task: {e}")
                await asyncio.sleep(60)  # Wait 1 min on error

    def get_stats(self) -> dict:
        """Retorna estatísticas da blacklist"""
        if self._redis_client:
            try:
                # Contar chaves blacklist:* no Redis
                keys = self._redis_client.keys("blacklist:*")
                user_keys = self._redis_client.keys("user_revoked:*")

                return {
                    "backend": "redis",
                    "tokens_revoked": len(keys),
                    "users_revoked": len(user_keys),
                    "redis_connected": True,
                }

            except Exception as e:
                logger.error(f"Failed to get Redis stats: {e}")
                return {"backend": "redis", "error": str(e), "redis_connected": False}

        else:
            return {
                "backend": "memory",
                "tokens_revoked": len(self._memory_blacklist),
                "warning": "In-memory blacklist not suitable for production!",
            }


# Singleton global
_blacklist_instance: TokenBlacklist | None = None


def get_token_blacklist() -> TokenBlacklist:
    """
    Retorna instância singleton do TokenBlacklist.

    Usage:
        from app.core.token_blacklist import get_token_blacklist

        blacklist = get_token_blacklist()
        blacklist.revoke_token(token, expires_at)
    """
    global _blacklist_instance

    if _blacklist_instance is None:
        _blacklist_instance = TokenBlacklist()

    return _blacklist_instance
