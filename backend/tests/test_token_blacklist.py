"""
Testes TDD para blacklist de tokens JWT.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from services.token_blacklist import (
    add_to_blacklist,
    is_blacklisted,
    remove_from_blacklist,
    clear_all_blacklist,
    _hash_token
)
from auth import create_access_token, get_user_from_token
from database import SessionLocal
import models


class TestTokenBlacklist:
    """Testes para blacklist de tokens."""
    
    @pytest.fixture
    def mock_redis_client(self):
        """Mock do cliente Redis."""
        mock_client = MagicMock()
        mock_client.setex.return_value = True
        mock_client.exists.return_value = True
        mock_client.delete.return_value = 1
        mock_client.keys.return_value = []
        return mock_client
    
    @pytest.fixture
    def sample_token(self):
        """Token JWT de exemplo."""
        payload = {
            "sub": "123",
            "email": "test@example.com",
            "exp": (datetime.now(timezone.utc) + timedelta(minutes=30)).timestamp()
        }
        from auth import create_access_token
        return create_access_token(payload)
    
    @patch('services.token_blacklist.get_redis_client')
    @patch('services.token_blacklist.is_redis_available', return_value=True)
    def test_add_to_blacklist_success(self, mock_available, mock_get_client, mock_redis_client, sample_token):
        """Testa adicionar token à blacklist com sucesso."""
        mock_get_client.return_value = mock_redis_client
        
        result = add_to_blacklist(sample_token, 1800)  # 30 minutos
        
        assert result is True
        mock_redis_client.setex.assert_called_once()
        call_args = mock_redis_client.setex.call_args
        assert "blacklist:token:" in call_args[0][0]  # Chave contém prefixo
        assert call_args[0][1] == 1800  # TTL correto
        assert call_args[0][2] == "1"  # Valor
    
    @patch('services.token_blacklist.is_redis_available', return_value=False)
    def test_add_to_blacklist_redis_unavailable(self, mock_available, sample_token):
        """Testa fallback quando Redis não está disponível."""
        result = add_to_blacklist(sample_token, 1800)
        
        assert result is False
    
    @patch('services.token_blacklist.get_redis_client')
    @patch('services.token_blacklist.is_redis_available', return_value=True)
    def test_is_blacklisted_true(self, mock_available, mock_get_client, mock_redis_client, sample_token):
        """Testa verificação de token na blacklist (encontrado)."""
        mock_get_client.return_value = mock_redis_client
        mock_redis_client.exists.return_value = True
        
        result = is_blacklisted(sample_token)
        
        assert result is True
        mock_redis_client.exists.assert_called_once()
    
    @patch('services.token_blacklist.get_redis_client')
    @patch('services.token_blacklist.is_redis_available', return_value=True)
    def test_is_blacklisted_false(self, mock_available, mock_get_client, mock_redis_client, sample_token):
        """Testa verificação de token na blacklist (não encontrado)."""
        mock_get_client.return_value = mock_redis_client
        mock_redis_client.exists.return_value = False
        
        result = is_blacklisted(sample_token)
        
        assert result is False
    
    @patch('services.token_blacklist.is_redis_available', return_value=False)
    def test_is_blacklisted_redis_unavailable(self, mock_available, sample_token):
        """Testa que retorna False quando Redis não está disponível."""
        result = is_blacklisted(sample_token)
        
        # Deve retornar False para não bloquear requisições legítimas
        assert result is False
    
    @patch('services.token_blacklist.get_redis_client')
    @patch('services.token_blacklist.is_redis_available', return_value=True)
    def test_remove_from_blacklist(self, mock_available, mock_get_client, mock_redis_client, sample_token):
        """Testa remoção de token da blacklist."""
        mock_get_client.return_value = mock_redis_client
        
        result = remove_from_blacklist(sample_token)
        
        assert result is True
        mock_redis_client.delete.assert_called_once()
    
    @patch('services.token_blacklist.get_redis_client')
    @patch('services.token_blacklist.is_redis_available', return_value=True)
    def test_clear_all_blacklist(self, mock_available, mock_get_client, mock_redis_client):
        """Testa limpeza de toda a blacklist."""
        mock_get_client.return_value = mock_redis_client
        mock_redis_client.keys.return_value = [
            "blacklist:token:hash1",
            "blacklist:token:hash2",
            "blacklist:token:hash3"
        ]
        mock_redis_client.delete.return_value = 3
        
        result = clear_all_blacklist()
        
        assert result == 3
        mock_redis_client.keys.assert_called_once()
        mock_redis_client.delete.assert_called_once()
    
    def test_hash_token_consistency(self, sample_token):
        """Testa que hash de token é consistente."""
        hash1 = _hash_token(sample_token)
        hash2 = _hash_token(sample_token)
        
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 produz 64 caracteres hex
    
    def test_hash_token_different_tokens(self):
        """Testa que tokens diferentes produzem hashes diferentes."""
        token1 = "token1"
        token2 = "token2"
        
        hash1 = _hash_token(token1)
        hash2 = _hash_token(token2)
        
        assert hash1 != hash2


class TestTokenBlacklistIntegration:
    """Testes de integração para blacklist com autenticação."""
    
    @pytest.fixture
    def db(self):
        """Sessão de banco de dados para testes."""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @patch('auth.is_blacklisted', return_value=True)
    def test_get_user_from_token_rejects_blacklisted_token(self, mock_blacklisted, db):
        """Testa que get_user_from_token rejeita tokens na blacklist."""
        from auth import get_user_from_token
        token = "blacklisted_token"
        
        with pytest.raises(Exception):  # Deve lançar HTTPException
            get_user_from_token(db, token)
        
        mock_blacklisted.assert_called_once_with(token)
    
    @patch('auth.is_blacklisted', return_value=False)
    @patch('auth.jwt.decode')
    def test_get_user_from_token_accepts_valid_token(self, mock_decode, mock_blacklisted, db):
        """Testa que get_user_from_token aceita tokens válidos não blacklisted."""
        from auth import get_user_from_token
        from models import User
        
        # Limpar usuários existentes para evitar UNIQUE constraint
        db.query(User).filter(User.email == "test@example.com").delete()
        db.commit()
        
        token = "valid_token"
        mock_decode.return_value = {"sub": "123", "email": "test@example.com"}
        
        # Criar usuário real no banco de teste
        user = User(
            id=123,
            email="test@example.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db.add(user)
        db.commit()
        
        # Deve passar pela verificação de blacklist e retornar usuário
        result = get_user_from_token(db, token)
        assert result is not None
        assert result.id == 123
        mock_blacklisted.assert_called_once_with(token)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
