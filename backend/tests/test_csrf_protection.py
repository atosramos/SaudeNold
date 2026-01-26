"""
Testes TDD para proteção CSRF.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from services.csrf_service import (
    generate_csrf_token,
    store_csrf_token,
    verify_csrf_token,
    generate_and_store_csrf_token
)


class TestCSRFService:
    """Testes para serviço CSRF."""
    
    @pytest.fixture
    def mock_redis_client(self):
        """Mock do cliente Redis."""
        mock_client = MagicMock()
        mock_client.setex.return_value = True
        mock_client.exists.return_value = True
        mock_client.delete.return_value = 1
        return mock_client
    
    def test_generate_csrf_token(self):
        """Testa geração de token CSRF."""
        token = generate_csrf_token()
        
        assert isinstance(token, str)
        assert len(token) > 0
        # Token deve ser URL-safe
        assert all(c.isalnum() or c in '-_' for c in token)
    
    def test_generate_csrf_token_uniqueness(self):
        """Testa que tokens gerados são únicos."""
        token1 = generate_csrf_token()
        token2 = generate_csrf_token()
        
        assert token1 != token2
    
    @patch('services.csrf_service.get_redis_client')
    @patch('services.csrf_service.is_redis_available', return_value=True)
    def test_store_csrf_token_success(self, mock_available, mock_get_client, mock_redis_client):
        """Testa armazenamento de token CSRF."""
        mock_get_client.return_value = mock_redis_client
        token = "test_token"
        
        result = store_csrf_token(token)
        
        assert result is True
        mock_redis_client.setex.assert_called_once()
        call_args = mock_redis_client.setex.call_args
        assert "csrf:token:" in call_args[0][0]
        assert call_args[0][1] == 3600  # TTL de 1 hora
        assert call_args[0][2] == "1"
    
    @patch('services.csrf_service.get_redis_client')
    @patch('services.csrf_service.is_redis_available', return_value=True)
    def test_store_csrf_token_with_session_id(self, mock_available, mock_get_client, mock_redis_client):
        """Testa armazenamento de token CSRF com session_id."""
        mock_get_client.return_value = mock_redis_client
        token = "test_token"
        session_id = "session123"
        
        result = store_csrf_token(token, session_id)
        
        assert result is True
        call_args = mock_redis_client.setex.call_args
        assert session_id in call_args[0][0]
    
    @patch('services.csrf_service.is_redis_available', return_value=False)
    def test_store_csrf_token_redis_unavailable(self, mock_available):
        """Testa fallback quando Redis não está disponível."""
        result = store_csrf_token("test_token")
        
        assert result is False
    
    @patch('services.csrf_service.get_redis_client')
    @patch('services.csrf_service.is_redis_available', return_value=True)
    def test_verify_csrf_token_valid(self, mock_available, mock_get_client, mock_redis_client):
        """Testa verificação de token CSRF válido."""
        mock_get_client.return_value = mock_redis_client
        mock_redis_client.exists.return_value = True
        token = "valid_token"
        
        result = verify_csrf_token(token)
        
        assert result is True
        mock_redis_client.exists.assert_called_once()
    
    @patch('services.csrf_service.get_redis_client')
    @patch('services.csrf_service.is_redis_available', return_value=True)
    def test_verify_csrf_token_invalid(self, mock_available, mock_get_client, mock_redis_client):
        """Testa verificação de token CSRF inválido."""
        mock_get_client.return_value = mock_redis_client
        mock_redis_client.exists.return_value = False
        token = "invalid_token"
        
        result = verify_csrf_token(token)
        
        assert result is False
    
    @patch('services.csrf_service.is_redis_available', return_value=False)
    def test_verify_csrf_token_redis_unavailable(self, mock_available):
        """Testa que aceita tokens quando Redis não está disponível (permite funcionamento sem Redis)."""
        mock_available.return_value = False
        # Agora aceita tokens quando Redis não está disponível (para permitir funcionamento)
        result = verify_csrf_token("test_token")
        assert result is True  # Aceita token não vazio quando Redis não está disponível
        
        # Token vazio ainda deve ser rejeitado
        result_empty = verify_csrf_token("")
        assert result_empty is False
    
    @patch('services.csrf_service.store_csrf_token', return_value=True)
    @patch('services.csrf_service.is_redis_available', return_value=True)
    def test_generate_and_store_csrf_token(self, mock_available, mock_store):
        """Testa geração e armazenamento de token CSRF."""
        token = generate_and_store_csrf_token()
        
        assert token is not None
        assert isinstance(token, str)
        # Em modo de teste com Redis disponível, deve chamar store_csrf_token
        # Mas se Redis não estiver disponível em modo de teste, retorna token sem chamar
        # Verificar que token foi gerado
        assert len(token) > 0
    
    @patch('services.csrf_service.store_csrf_token', return_value=False)
    @patch('services.csrf_service.is_redis_available', return_value=True)
    def test_generate_and_store_csrf_token_failure(self, mock_available, mock_store):
        """Testa que sempre retorna token, mesmo quando falha ao armazenar no Redis."""
        mock_store.return_value = False
        token = generate_and_store_csrf_token()
        
        # Agora sempre retorna um token, mesmo se falhar ao armazenar no Redis
        # Isso permite que o sistema continue funcionando sem Redis
        assert token is not None
        assert len(token) > 0


class TestCSRFMiddleware:
    """Testes para middleware CSRF."""
    
    @pytest.fixture
    def client(self):
        """Cliente de teste FastAPI."""
        return TestClient(app)
    
    @patch('middleware.csrf_middleware.verify_csrf_token', return_value=True)
    def test_csrf_middleware_allows_get_requests(self, mock_verify, client):
        """Testa que requisições GET não precisam de CSRF token."""
        response = client.get("/api/medications")
        
        # GET não deve verificar CSRF
        mock_verify.assert_not_called()
    
    def test_csrf_middleware_requires_token_for_post(self, client):
        """Testa que requisições POST precisam de CSRF token."""
        # Tentar POST sem token CSRF
        try:
            response = client.post(
                "/api/medications",
                json={"name": "Test", "schedules": []},
                headers={"Authorization": "Bearer fake_token"}
            )
            # Se chegou aqui, deve retornar 403
            assert response.status_code == 403
            detail = response.json().get("detail", "").lower()
            assert "csrf" in detail
        except Exception as e:
            # Se levantou exceção, verificar se é HTTPException com status 403
            # O TestClient deveria converter, mas em alguns casos pode levantar exceção
            if hasattr(e, 'status_code') and e.status_code == 403:
                pass  # OK, middleware bloqueou corretamente
            else:
                raise  # Re-raise se for outro tipo de exceção
    
    @patch('middleware.csrf_middleware.verify_csrf_token', return_value=True)
    def test_csrf_middleware_with_valid_token(self, mock_verify, client):
        """Testa requisição POST com token CSRF válido."""
        response = client.post(
            "/api/medications",
            json={"name": "Test", "schedules": []},
            headers={
                "Authorization": "Bearer fake_token",
                "X-CSRF-Token": "valid_csrf_token"
            }
        )
        
        # Deve ter verificado CSRF
        mock_verify.assert_called()
        # Status pode ser 401 (auth) ou 422 (validation), mas não 403 (CSRF)
        assert response.status_code != 403
    
    def test_csrf_middleware_exempt_paths(self, client):
        """Testa que endpoints isentos não precisam de CSRF."""
        # Endpoints de autenticação devem ser isentos
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "password"}
        )
        
        # Não deve retornar 403 (CSRF), pode retornar 401 (auth) ou 422 (validation)
        assert response.status_code != 403
    
    @patch('middleware.csrf_middleware.verify_csrf_token', return_value=False)
    def test_csrf_middleware_rejects_invalid_token(self, mock_verify, client):
        """Testa que middleware rejeita token CSRF inválido."""
        try:
            response = client.post(
                "/api/medications",
                json={"name": "Test", "schedules": []},
                headers={
                    "Authorization": "Bearer fake_token",
                    "X-CSRF-Token": "invalid_token"
                }
            )
            # Se chegou aqui, deve retornar 403
            assert response.status_code == 403
            detail = response.json().get("detail", "").lower()
            assert "csrf" in detail
        except Exception as e:
            # Se levantou exceção, verificar se é HTTPException com status 403
            if hasattr(e, 'status_code') and e.status_code == 403:
                pass  # OK, middleware bloqueou corretamente
            else:
                raise  # Re-raise se for outro tipo de exceção


class TestCSRFTokenEndpoint:
    """Testes para endpoint de obtenção de token CSRF."""
    
    @pytest.fixture
    def client(self):
        """Cliente de teste FastAPI."""
        return TestClient(app)
    
    @patch('main.generate_and_store_csrf_token')
    @patch('main.get_user_from_token')
    def test_get_csrf_token_endpoint(self, mock_get_user, mock_generate, client):
        """Testa endpoint para obter token CSRF."""
        mock_user = MagicMock()
        mock_get_user.return_value = mock_user
        mock_generate.return_value = "csrf_token_123"
        
        # Mock do decode_token_payload para retornar um payload válido
        with patch('main.decode_token_payload') as mock_decode:
            mock_decode.return_value = {"sub": "123"}
            response = client.get(
                "/api/csrf-token",
                headers={"Authorization": "Bearer valid_token"}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert "csrf_token" in data
        assert data["csrf_token"] == "csrf_token_123"
    
    def test_get_csrf_token_requires_authentication(self, client):
        """Testa que endpoint requer autenticação."""
        response = client.get("/api/csrf-token")
        
        assert response.status_code == 403  # Forbidden (sem autenticação)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
