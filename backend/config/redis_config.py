"""
Configuração e cliente Redis reutilizável para rate limiting, blacklist e cache.
"""
import os
import logging
from typing import Optional
import redis
from redis.exceptions import ConnectionError, TimeoutError

logger = logging.getLogger(__name__)

# Configurações do Redis
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD") or None
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_SOCKET_TIMEOUT = int(os.getenv("REDIS_SOCKET_TIMEOUT", "5"))
REDIS_SOCKET_CONNECT_TIMEOUT = int(os.getenv("REDIS_SOCKET_CONNECT_TIMEOUT", "5"))

# Cliente Redis global (singleton)
_redis_client: Optional[redis.Redis] = None
_redis_available: bool = False


def get_redis_client() -> Optional[redis.Redis]:
    """
    Retorna o cliente Redis reutilizável.
    Retorna None se Redis não estiver disponível.
    Tenta múltiplas opções de conexão (localhost, IP do WSL, etc).
    """
    global _redis_client, _redis_available
    
    # Se já temos um cliente e está disponível, retornar
    if _redis_client is not None and _redis_available:
        try:
            # Verificar se ainda está funcionando
            _redis_client.ping()
            return _redis_client
        except Exception:
            # Se ping falhar, resetar e tentar novamente
            _redis_client = None
            _redis_available = False
    
    # Se cliente não existe ou não está disponível, tentar conectar
    
    # Lista de hosts para tentar (útil quando Redis está no WSL)
    hosts_to_try = [REDIS_HOST]
    if REDIS_HOST == "localhost":
        # Se configurado como localhost, tentar também 127.0.0.1
        hosts_to_try.append("127.0.0.1")
    
    for host in hosts_to_try:
        try:
            _redis_client = redis.Redis(
                host=host,
                port=REDIS_PORT,
                password=REDIS_PASSWORD,
                db=REDIS_DB,
                socket_timeout=REDIS_SOCKET_TIMEOUT,
                socket_connect_timeout=REDIS_SOCKET_CONNECT_TIMEOUT,
                decode_responses=True,  # Decodificar strings automaticamente
                health_check_interval=30,  # Verificar saúde da conexão a cada 30s
            )
            
            # Testar conexão
            _redis_client.ping()
            _redis_available = True
            logger.info(f"Redis conectado com sucesso em {host}:{REDIS_PORT}")
            return _redis_client
            
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis não disponível em {host}:{REDIS_PORT}: {e}")
            _redis_client = None
            continue
        except Exception as e:
            logger.warning(f"Erro ao conectar ao Redis em {host}:{REDIS_PORT}: {e}")
            _redis_client = None
            continue
    
    # Se nenhum host funcionou
    logger.warning(f"Redis não disponível em nenhum host tentado ({', '.join(hosts_to_try)}). Usando fallback para memória.")
    logger.warning(f"Verifique se Redis está rodando e se REDIS_HOST está correto no .env (atual: {REDIS_HOST})")
    _redis_available = False
    return None


def is_redis_available() -> bool:
    """
    Verifica se Redis está disponível e funcionando.
    """
    global _redis_available
    
    # Sempre tentar obter cliente (não confiar apenas no cache)
    client = get_redis_client()
    if client is None:
        logger.debug("Redis client is None, Redis não disponível")
        return False
    
    try:
        result = client.ping()
        if result:
            _redis_available = True
            logger.debug(f"Redis ping successful, Redis disponível")
            return True
        else:
            _redis_available = False
            logger.warning("Redis ping retornou False")
            return False
    except Exception as e:
        _redis_available = False
        logger.warning(f"Redis ping falhou: {str(e)}")
        return False


def get_redis_connection_string() -> str:
    """
    Retorna string de conexão Redis no formato URI.
    Usado pelo slowapi para conectar.
    """
    if REDIS_PASSWORD:
        return f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
    return f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"


def reset_redis_connection():
    """
    Reseta a conexão Redis (útil para testes ou reconexão).
    """
    global _redis_client, _redis_available
    _redis_client = None
    _redis_available = False
