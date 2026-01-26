"""
Serviço de rate limiting específico por email/usuário.
Complementa o rate limiting por IP do slowapi.
"""
from typing import Optional
from datetime import datetime, timedelta, timezone
import logging

from config.redis_config import get_redis_client, is_redis_available

logger = logging.getLogger(__name__)

# Prefixos para chaves Redis
EMAIL_RATE_LIMIT_PREFIX = "rate_limit:email:"
USER_EMAIL_DAILY_PREFIX = "rate_limit:user_email_daily:"


def get_email_rate_limit_key(email: str, endpoint: str) -> str:
    """Gera chave Redis para rate limiting por email."""
    return f"{EMAIL_RATE_LIMIT_PREFIX}{endpoint}:{email.lower()}"


def get_user_email_daily_key(user_id: int) -> str:
    """Gera chave Redis para limite diário de emails por usuário."""
    return f"{USER_EMAIL_DAILY_PREFIX}{user_id}"


def check_email_rate_limit(
    email: str,
    endpoint: str,
    max_attempts: int,
    window_minutes: int
) -> tuple[bool, Optional[int]]:
    """
    Verifica rate limit por email para um endpoint específico.
    
    Args:
        email: Email do usuário
        endpoint: Nome do endpoint (ex: 'forgot-password')
        max_attempts: Número máximo de tentativas
        window_minutes: Janela de tempo em minutos
    
    Returns:
        Tuple (is_allowed, remaining_seconds)
        - is_allowed: True se permitido, False se bloqueado
        - remaining_seconds: Segundos restantes até poder tentar novamente (None se permitido)
    """
    if not is_redis_available():
        # Se Redis não estiver disponível, permitir (fallback)
        logger.warning(f"Redis não disponível para rate limiting por email, permitindo requisição")
        return True, None
    
    redis_client = get_redis_client()
    if redis_client is None:
        return True, None
    
    key = get_email_rate_limit_key(email, endpoint)
    
    try:
        # Obter contador atual
        count = redis_client.get(key)
        if count is None:
            # Primeira tentativa, criar chave com TTL
            redis_client.setex(key, window_minutes * 60, "1")
            return True, None
        
        count_int = int(count)
        if count_int >= max_attempts:
            # Limite excedido, verificar TTL restante
            ttl = redis_client.ttl(key)
            if ttl > 0:
                return False, ttl
        
        # Incrementar contador
        redis_client.incr(key)
        # Garantir TTL (caso não tenha sido definido)
        redis_client.expire(key, window_minutes * 60)
        
        return True, None
    except Exception as e:
        logger.error(f"Erro ao verificar rate limit por email: {e}")
        # Em caso de erro, permitir (fail-open)
        return True, None


def reset_email_rate_limit(email: str, endpoint: str) -> None:
    """Reseta rate limit por email (útil após sucesso)."""
    if not is_redis_available():
        return
    
    redis_client = get_redis_client()
    if redis_client is None:
        return
    
    key = get_email_rate_limit_key(email, endpoint)
    try:
        redis_client.delete(key)
    except Exception as e:
        logger.warning(f"Erro ao resetar rate limit por email: {e}")


def check_user_email_daily_limit(user_id: int, max_emails: int = 10) -> tuple[bool, Optional[int]]:
    """
    Verifica limite diário de envio de emails por usuário.
    
    Args:
        user_id: ID do usuário
        max_emails: Número máximo de emails por dia (padrão: 10)
    
    Returns:
        Tuple (is_allowed, remaining_seconds)
        - is_allowed: True se permitido, False se bloqueado
        - remaining_seconds: Segundos restantes até resetar (None se permitido)
    """
    if not is_redis_available():
        # Se Redis não estiver disponível, permitir (fallback)
        logger.warning(f"Redis não disponível para limite diário de emails, permitindo envio")
        return True, None
    
    redis_client = get_redis_client()
    if redis_client is None:
        return True, None
    
    key = get_user_email_daily_key(user_id)
    
    try:
        # Obter contador atual
        count = redis_client.get(key)
        if count is None:
            # Primeiro email do dia, criar chave com TTL de 24 horas
            redis_client.setex(key, 24 * 60 * 60, "1")
            return True, None
        
        count_int = int(count)
        if count_int >= max_emails:
            # Limite excedido, verificar TTL restante
            ttl = redis_client.ttl(key)
            if ttl > 0:
                return False, ttl
        
        # Incrementar contador
        redis_client.incr(key)
        # Garantir TTL de 24 horas
        redis_client.expire(key, 24 * 60 * 60)
        
        return True, None
    except Exception as e:
        logger.error(f"Erro ao verificar limite diário de emails: {e}")
        # Em caso de erro, permitir (fail-open)
        return True, None


def reset_user_email_daily_limit(user_id: int) -> None:
    """Reseta limite diário de emails (útil para testes ou admin)."""
    if not is_redis_available():
        return
    
    redis_client = get_redis_client()
    if redis_client is None:
        return
    
    key = get_user_email_daily_key(user_id)
    try:
        redis_client.delete(key)
    except Exception as e:
        logger.warning(f"Erro ao resetar limite diário de emails: {e}")
