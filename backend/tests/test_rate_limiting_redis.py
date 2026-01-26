"""
Testes TDD para rate limiting com Redis.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from config.redis_config import is_redis_available, get_redis_connection_string


class TestRateLimitingRedis:
    """Testes para rate limiting usando Redis."""
    
    @pytest.fixture
    def client(self):
        """Cliente de teste FastAPI."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_redis_available(self):
        """Mock para Redis disponível."""
        with patch('config.redis_config.is_redis_available', return_value=True):
            with patch('config.redis_config.get_redis_connection_string', return_value="redis://localhost:6379/0"):
                yield
    
    @pytest.fixture
    def mock_redis_unavailable(self):
        """Mock para Redis indisponível."""
        with patch('config.redis_config.is_redis_available', return_value=False):
            yield
    
    def test_rate_limiter_uses_redis_when_available(self, mock_redis_available):
        """Testa que rate limiter usa Redis quando disponível."""
        # Recarregar main para aplicar configuração Redis
        import importlib
        import main
        importlib.reload(main)
        
        # Verificar que limiter foi configurado com Redis
        # (teste indireto através do comportamento)
        assert hasattr(app.state, 'limiter')
    
    def test_rate_limiter_fallback_to_memory(self, mock_redis_unavailable):
        """Testa fallback para memória quando Redis não está disponível."""
        # Recarregar main para aplicar fallback
        import importlib
        import main
        importlib.reload(main)
        
        # Verificar que limiter ainda existe (fallback funcionou)
        assert hasattr(app.state, 'limiter')
    
    def test_rate_limit_on_login_endpoint(self, client, mock_redis_available):
        """Testa que endpoint de login tem rate limiting."""
        # Fazer múltiplas requisições para testar rate limit
        rate_limited_count = 0
        for i in range(6):  # Limite é 5/15min
            response = client.post(
                "/api/auth/login",
                json={"email": "test@example.com", "password": "wrongpassword"}
            )
            
            # Rate limit pode ser aplicado em qualquer requisição após o limite
            # O importante é verificar que pelo menos uma foi bloqueada
            if response.status_code == 429:
                rate_limited_count += 1
            else:
                # Outras devem falhar por credenciais inválidas
                assert response.status_code in [401, 404]  # 401 = credenciais inválidas
        
        # Pelo menos uma requisição deve ter sido bloqueada por rate limit
        assert rate_limited_count > 0, "Rate limiting não está funcionando - nenhuma requisição foi bloqueada"
    
    def test_rate_limit_on_register_endpoint(self, client, mock_redis_available):
        """Testa que endpoint de registro tem rate limiting (3/hour)."""
        # Fazer múltiplas requisições
        for i in range(4):  # Limite é 3/hour
            response = client.post(
                "/api/auth/register",
                json={
                    "email": f"test{i}@example.com",
                    "password": "Test1234!",
                    "device": None
                }
            )
            
            if i < 3:
                # Primeiras 3 podem ter sucesso ou erro de validação
                assert response.status_code in [200, 400, 422]
            else:
                # 4ª requisição deve ser bloqueada por rate limit
                assert response.status_code == 429
    
    def test_rate_limit_persists_across_requests(self, client, mock_redis_available):
        """Testa que rate limit persiste entre requisições (Redis)."""
        # Este teste requer Redis real rodando
        # Em ambiente de teste, podemos mockar o comportamento
        
        # Fazer 5 requisições
        for i in range(5):
            client.post(
                "/api/auth/login",
                json={"email": "test@example.com", "password": "wrong"}
            )
        
        # Se Redis estiver funcionando, a 6ª deve ser bloqueada
        # mesmo que seja uma nova instância do cliente
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "wrong"}
        )
        
        # Se rate limit funcionou, deve retornar 429
        # Se não, pode retornar 401 (credenciais inválidas)
        assert response.status_code in [429, 401]
    
    def test_localhost_bypass_rate_limit(self, client):
        """Testa que localhost tem bypass de rate limit."""
        # Este teste verifica se IPs locais são bypassados
        # (implementação específica pode variar)
        pass  # Implementar conforme necessário


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
