"""
Testes TDD para endpoints com suporte a dados criptografados.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from services.encryption_service import EncryptionService


class TestMedicationEndpointsEncryption:
    """Testes para endpoints de medications com dados criptografados."""
    
    @pytest.fixture
    def client(self, db_session, monkeypatch):
        """Cliente de teste FastAPI."""
        from main import app, get_db
        
        def override_get_db():
            yield db_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        test_api_key = "test-api-key-123"
        import main
        monkeypatch.setattr(main, "API_KEY", test_api_key)
        
        with TestClient(app) as test_client:
            yield test_client
        
        app.dependency_overrides.clear()
    
    @pytest.fixture
    def api_key(self):
        """API key para testes."""
        return "test-api-key-123"
    
    @pytest.fixture
    def sample_encrypted_data(self):
        """Dados criptografados de exemplo."""
        return {
            "encrypted": "U2FsdGVkX1+example_encrypted_data_base64",
            "iv": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
        }
    
    @pytest.fixture
    def user_token(self, client, db_session, api_key):
        """Criar usuário e obter token."""
        # Criar usuário
        from auth import hash_password
        from models import User
        user = User(
            email="test@example.com",
            password_hash=hash_password("Test1234!"),
            is_active=True,
            email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        # Obter token
        from auth import create_access_token
        token = create_access_token({"sub": str(user.id), "email": user.email})
        return token
    
    def test_create_medication_with_encrypted_data(self, client, api_key, csrf_token, user_token, sample_encrypted_data, db_session):
        """Testa criação de medication com dados criptografados."""
        # Criar perfil
        from models import FamilyProfile
        profile = FamilyProfile(
            family_id=1,
            name="Test Profile",
            account_type="adult_member"
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        response = client.post(
            "/api/medications",
            json={
                "name": "Test Medication",
                "dosage": "10mg",
                "schedules": ["08:00", "20:00"],
                "encrypted_data": sample_encrypted_data
            },
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(profile.id),
                "X-CSRF-Token": csrf_token
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "encrypted_data" in data
        assert data["encrypted_data"] == sample_encrypted_data
    
    def test_create_medication_with_invalid_encrypted_data(self, client, api_key, csrf_token, user_token, db_session):
        """Testa criação com dados criptografados inválidos."""
        from models import FamilyProfile
        profile = FamilyProfile(
            family_id=1,
            name="Test Profile",
            account_type="adult_member"
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        invalid_data = {"encrypted": "missing_iv"}
        
        response = client.post(
            "/api/medications",
            json={
                "name": "Test",
                "schedules": [],
                "encrypted_data": invalid_data
            },
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(profile.id),
                "X-CSRF-Token": csrf_token
            }
        )
        
        # Pode retornar 400 (validação do serviço) ou 422 (validação do Pydantic)
        assert response.status_code in [400, 422]
        error_data = response.json()
        # Pydantic retorna lista de erros em 422, endpoint retorna dict com "detail" em 400
        if isinstance(error_data, list):
            # Validação do Pydantic - verificar se há erro sobre "iv"
            # error_data é uma lista de dicionários com erros
            error_str = str(error_data).lower()
            assert "iv" in error_str
        elif isinstance(error_data, dict):
            # Validação do endpoint - pode ter "detail" como string ou lista
            detail = error_data.get("detail", "")
            if isinstance(detail, list):
                detail_str = str(detail).lower()
            else:
                detail_str = str(detail).lower()
            assert "criptografados" in detail_str or "encrypted" in detail_str or "iv" in detail_str
        else:
            # Fallback - verificar em qualquer formato
            error_str = str(error_data).lower()
            assert "iv" in error_str or "encrypted" in error_str or "criptografados" in error_str
    
    def test_get_medication_returns_encrypted_data(self, client, api_key, user_token, sample_encrypted_data, db_session):
        """Testa que GET retorna dados criptografados se presentes."""
        from models import Medication, FamilyProfile
        
        profile = FamilyProfile(
            family_id=1,
            name="Test Profile",
            account_type="adult_member"
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        medication = Medication(
            profile_id=profile.id,
            name="Test Medication",
            dosage="10mg",
            schedules=[],
            encrypted_data=sample_encrypted_data
        )
        db_session.add(medication)
        db_session.commit()
        db_session.refresh(medication)
        
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(profile.id)
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert "encrypted_data" in data[0]
        assert data[0]["encrypted_data"] == sample_encrypted_data
    
    def test_update_medication_with_encrypted_data(self, client, api_key, csrf_token, user_token, sample_encrypted_data, db_session):
        """Testa atualização de medication com novos dados criptografados."""
        from models import Medication, FamilyProfile
        
        profile = FamilyProfile(
            family_id=1,
            name="Test Profile",
            account_type="adult_member"
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        medication = Medication(
            profile_id=profile.id,
            name="Original",
            schedules=[]
        )
        db_session.add(medication)
        db_session.commit()
        db_session.refresh(medication)
        
        new_encrypted_data = {
            "encrypted": "new_encrypted_data",
            "iv": "new_iv_value"
        }
        
        response = client.put(
            f"/api/medications/{medication.id}",
            json={
                "name": "Updated",
                "schedules": [],
                "encrypted_data": new_encrypted_data
            },
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(profile.id),
                "X-CSRF-Token": csrf_token
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "encrypted_data" in data
        assert data["encrypted_data"] == new_encrypted_data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
