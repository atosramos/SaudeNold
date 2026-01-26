"""
Serviço para gerenciar blacklist de tokens JWT em Redis.
Permite logout imediato invalidando tokens antes da expiração.
"""
import logging
import hashlib
from typing import Optional
from datetime import datetime, timezone, timedelta
from config.redis_config import get_redis_client, is_redis_available

logger = logging.getLogger(__name__)

# Prefixo para chaves Redis
BLACKLIST_PREFIX = "blacklist:token:"


def _hash_token(token: str) -> str:
    """Gera hash SHA-256 do token para usar como chave Redis."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def add_to_blacklist(token: str, expires_in_seconds: int) -> bool:
    """
    Adiciona token à blacklist no Redis.
    
    Args:
        token: Token JWT a ser adicionado à blacklist
        expires_in_seconds: Tempo de expiração em segundos (TTL no Redis)
    
    Returns:
        True se adicionado com sucesso, False caso contrário
    """
    if not is_redis_available():
        logger.warning("Redis não disponível, não é possível adicionar token à blacklist")
        return False
    
    try:
        redis_client = get_redis_client()
        if redis_client is None:
            return False
        
        token_hash = _hash_token(token)
        key = f"{BLACKLIST_PREFIX}{token_hash}"
        
        # Armazenar com TTL igual ao tempo de expiração do token
        redis_client.setex(key, expires_in_seconds, "1")
        
        logger.info(f"Token adicionado à blacklist (expira em {expires_in_seconds}s)")
        return True
        
    except Exception as e:
        logger.error(f"Erro ao adicionar token à blacklist: {e}")
        return False


def is_blacklisted(token: str) -> bool:
    """
    Verifica se token está na blacklist.
    
    Args:
        token: Token JWT a ser verificado
    
    Returns:
        True se token está na blacklist, False caso contrário
    """
    if not is_redis_available():
        # Se Redis não estiver disponível, não podemos verificar blacklist
        # Retornar False para não bloquear requisições legítimas
        return False
    
    try:
        redis_client = get_redis_client()
        if redis_client is None:
            return False
        
        token_hash = _hash_token(token)
        key = f"{BLACKLIST_PREFIX}{token_hash}"
        
        # Verificar se chave existe
        exists = redis_client.exists(key)
        return bool(exists)
        
    except Exception as e:
        logger.error(f"Erro ao verificar blacklist: {e}")
        # Em caso de erro, retornar False para não bloquear requisições
        return False


def remove_from_blacklist(token: str) -> bool:
    """
    Remove token da blacklist (útil para testes ou casos especiais).
    
    Args:
        token: Token JWT a ser removido da blacklist
    
    Returns:
        True se removido com sucesso, False caso contrário
    """
    if not is_redis_available():
        return False
    
    try:
        redis_client = get_redis_client()
        if redis_client is None:
            return False
        
        token_hash = _hash_token(token)
        key = f"{BLACKLIST_PREFIX}{token_hash}"
        
        deleted = redis_client.delete(key)
        return bool(deleted)
        
    except Exception as e:
        logger.error(f"Erro ao remover token da blacklist: {e}")
        return False


def clear_all_blacklist() -> int:
    """
    Remove todos os tokens da blacklist (útil para testes ou manutenção).
    
    Returns:
        Número de tokens removidos
    """
    if not is_redis_available():
        return 0
    
    try:
        redis_client = get_redis_client()
        if redis_client is None:
            return 0
        
        # Buscar todas as chaves com prefixo blacklist
        pattern = f"{BLACKLIST_PREFIX}*"
        keys = redis_client.keys(pattern)
        
        if not keys:
            return 0
        
        # Deletar todas as chaves
        deleted = redis_client.delete(*keys)
        logger.info(f"Removidos {deleted} tokens da blacklist")
        return deleted
        
    except Exception as e:
        logger.error(f"Erro ao limpar blacklist: {e}")
        return 0
