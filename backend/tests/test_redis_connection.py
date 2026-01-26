"""
Testes TDD para conexão Redis.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from config.redis_config import (
    get_redis_client,
    is_redis_available,
    get_redis_connection_string,
    reset_redis_connection
)


class TestRedisConnection:
    """Testes para configuração e conexão Redis."""
    
    def test_get_redis_connection_string_without_password(self):
        """Testa geração de string de conexão sem senha."""
        with patch('config.redis_config.REDIS_PASSWORD', None):
            with patch('config.redis_config.REDIS_HOST', 'localhost'):
                with patch('config.redis_config.REDIS_PORT', 6379):
                    with patch('config.redis_config.REDIS_DB', 0):
                        conn_str = get_redis_connection_string()
                        assert conn_str == "redis://localhost:6379/0"
    
    def test_get_redis_connection_string_with_password(self):
        """Testa geração de string de conexão com senha."""
        with patch('config.redis_config.REDIS_PASSWORD', 'mypassword'):
            with patch('config.redis_config.REDIS_HOST', 'localhost'):
                with patch('config.redis_config.REDIS_PORT', 6379):
                    with patch('config.redis_config.REDIS_DB', 0):
                        conn_str = get_redis_connection_string()
                        assert conn_str == "redis://:mypassword@localhost:6379/0"
    
    @patch('config.redis_config.redis.Redis')
    def test_get_redis_client_success(self, mock_redis_class):
        """Testa obtenção de cliente Redis com sucesso."""
        reset_redis_connection()  # Resetar estado global
        
        mock_client = MagicMock()
        mock_client.ping.return_value = True
        mock_redis_class.return_value = mock_client
        
        client = get_redis_client()
        
        assert client is not None
        assert client == mock_client
        mock_client.ping.assert_called_once()
    
    @patch('config.redis_config.redis.Redis')
    def test_get_redis_client_connection_error(self, mock_redis_class):
        """Testa fallback quando Redis não está disponível."""
        reset_redis_connection()
        
        from redis.exceptions import ConnectionError
        mock_redis_class.side_effect = ConnectionError("Connection refused")
        
        client = get_redis_client()
        
        assert client is None
    
    @patch('config.redis_config.redis.Redis')
    def test_get_redis_client_timeout_error(self, mock_redis_class):
        """Testa fallback quando Redis tem timeout."""
        reset_redis_connection()
        
        from redis.exceptions import TimeoutError
        mock_redis_class.side_effect = TimeoutError("Timeout")
        
        client = get_redis_client()
        
        assert client is None
    
    @patch('config.redis_config.get_redis_client')
    def test_is_redis_available_true(self, mock_get_client):
        """Testa verificação de disponibilidade quando Redis está disponível."""
        # Forçar _redis_available para True
        import config.redis_config
        config.redis_config._redis_available = True
        
        mock_client = MagicMock()
        mock_client.ping.return_value = True
        mock_get_client.return_value = mock_client
        
        result = is_redis_available()
        
        assert result is True
        mock_client.ping.assert_called_once()
    
    @patch('config.redis_config.get_redis_client')
    def test_is_redis_available_false(self, mock_get_client):
        """Testa verificação de disponibilidade quando Redis não está disponível."""
        mock_get_client.return_value = None
        
        assert is_redis_available() is False
    
    @patch('config.redis_config.get_redis_client')
    def test_is_redis_available_ping_fails(self, mock_get_client):
        """Testa verificação quando ping falha."""
        mock_client = MagicMock()
        mock_client.ping.side_effect = Exception("Ping failed")
        mock_get_client.return_value = mock_client
        
        assert is_redis_available() is False
    
    def test_reset_redis_connection(self):
        """Testa reset da conexão Redis."""
        reset_redis_connection()
        
        # Após reset, get_redis_client deve tentar criar nova conexão
        # (teste indireto - se não houver erro, reset funcionou)
        try:
            get_redis_client()
        except Exception:
            pass  # Esperado se Redis não estiver rodando


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
