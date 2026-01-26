"""
Testes TDD para serviço de criptografia zero-knowledge.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
from services.encryption_service import EncryptionService
from database import SessionLocal
import models


class TestEncryptionService:
    """Testes para serviço de criptografia zero-knowledge."""
    
    @pytest.fixture
    def db(self, db_session):
        """Sessão de banco de dados para testes."""
        return db_session
    
    @pytest.fixture
    def sample_encrypted_data(self):
        """Dados criptografados de exemplo no formato esperado."""
        return {
            "encrypted": "U2FsdGVkX1+example_encrypted_data_base64",
            "iv": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
        }
    
    @pytest.fixture
    def invalid_encrypted_data(self):
        """Dados criptografados inválidos."""
        return {
            "encrypted": "missing_iv"
        }
    
    def test_validate_encrypted_format_valid(self, sample_encrypted_data):
        """Testa validação de formato válido."""
        result = EncryptionService.validate_encrypted_format(sample_encrypted_data)
        assert result is True
    
    def test_validate_encrypted_format_missing_encrypted(self, invalid_encrypted_data):
        """Testa validação com campo encrypted ausente."""
        result = EncryptionService.validate_encrypted_format(invalid_encrypted_data)
        assert result is False
    
    def test_validate_encrypted_format_missing_iv(self):
        """Testa validação com campo iv ausente."""
        data = {"encrypted": "some_data"}
        result = EncryptionService.validate_encrypted_format(data)
        assert result is False
    
    def test_validate_encrypted_format_empty_strings(self):
        """Testa validação com strings vazias."""
        data = {"encrypted": "", "iv": ""}
        result = EncryptionService.validate_encrypted_format(data)
        assert result is False
    
    def test_validate_encrypted_format_not_dict(self):
        """Testa validação com tipo incorreto."""
        result = EncryptionService.validate_encrypted_format("not_a_dict")
        assert result is False
    
    def test_validate_encrypted_format_wrong_types(self):
        """Testa validação com tipos incorretos."""
        data = {"encrypted": 123, "iv": 456}
        result = EncryptionService.validate_encrypted_format(data)
        assert result is False
    
    def test_store_encrypted_data_valid(self, db_session, sample_encrypted_data):
        """Testa armazenamento de dados criptografados válidos."""
        profile_id = 1
        
        # Criar instância do modelo (usando Medication como exemplo)
        instance = EncryptionService.store_encrypted_data(
            db=db_session,
            model_class=models.Medication,
            profile_id=profile_id,
            data_type="medication",
            encrypted_data=sample_encrypted_data,
            name="Test Medication",
            dosage="10mg",
            schedules=[],
            active=True
        )
        
        assert instance is not None
        assert instance.profile_id == profile_id
        assert instance.encrypted_data == sample_encrypted_data
        assert instance.name == "Test Medication"
    
    def test_store_encrypted_data_invalid_format(self, db, invalid_encrypted_data):
        """Testa que armazenamento rejeita formato inválido."""
        with pytest.raises(ValueError, match="Formato de dados criptografados inválido"):
            EncryptionService.store_encrypted_data(
                db=db,
                model_class=models.Medication,
                profile_id=1,
                data_type="medication",
                encrypted_data=invalid_encrypted_data,
                name="Test",
                schedules=[]
            )
    
    def test_get_encrypted_data_existing(self, db, sample_encrypted_data):
        """Testa obtenção de dados criptografados existentes."""
        # Criar registro com dados criptografados
        medication = models.Medication(
            profile_id=1,
            name="Test",
            dosage="10mg",
            schedules=[],
            encrypted_data=sample_encrypted_data
        )
        db.add(medication)
        db.commit()
        db.refresh(medication)
        
        # Obter dados criptografados
        result = EncryptionService.get_encrypted_data(
            db=db,
            model_class=models.Medication,
            record_id=medication.id,
            profile_id=1
        )
        
        assert result is not None
        assert result == sample_encrypted_data
    
    def test_get_encrypted_data_not_found(self, db_session):
        """Testa obtenção de dados inexistentes."""
        result = EncryptionService.get_encrypted_data(
            db=db_session,
            model_class=models.Medication,
            record_id=99999,
            profile_id=1
        )
        
        assert result is None
    
    def test_get_encrypted_data_wrong_profile(self, db, sample_encrypted_data):
        """Testa que não retorna dados de outro perfil."""
        # Criar registro para perfil 1
        medication = models.Medication(
            profile_id=1,
            name="Test",
            schedules=[],
            encrypted_data=sample_encrypted_data
        )
        db.add(medication)
        db.commit()
        db.refresh(medication)
        
        # Tentar obter com perfil diferente
        result = EncryptionService.get_encrypted_data(
            db=db,
            model_class=models.Medication,
            record_id=medication.id,
            profile_id=2  # Perfil diferente
        )
        
        assert result is None
    
    def test_update_encrypted_data(self, db, sample_encrypted_data):
        """Testa atualização de dados criptografados."""
        # Criar registro
        medication = models.Medication(
            profile_id=1,
            name="Test",
            schedules=[],
            encrypted_data=sample_encrypted_data
        )
        db.add(medication)
        db.commit()
        db.refresh(medication)
        
        # Atualizar com novos dados criptografados
        new_encrypted_data = {
            "encrypted": "new_encrypted_data",
            "iv": "new_iv_value"
        }
        
        result = EncryptionService.update_encrypted_data(
            db=db,
            model_class=models.Medication,
            record_id=medication.id,
            encrypted_data=new_encrypted_data,
            profile_id=1
        )
        
        assert result is True
        db.commit()
        db.refresh(medication)
        assert medication.encrypted_data == new_encrypted_data
    
    def test_update_encrypted_data_invalid_format(self, db, sample_encrypted_data):
        """Testa que atualização rejeita formato inválido."""
        medication = models.Medication(
            profile_id=1,
            name="Test",
            schedules=[],
            encrypted_data=sample_encrypted_data
        )
        db.add(medication)
        db.commit()
        db.refresh(medication)
        
        invalid_data = {"encrypted": "missing_iv"}
        
        with pytest.raises(ValueError, match="Formato de dados criptografados inválido"):
            EncryptionService.update_encrypted_data(
                db=db,
                model_class=models.Medication,
                record_id=medication.id,
                encrypted_data=invalid_data,
                profile_id=1
            )
    
    def test_list_encrypted_data(self, db, sample_encrypted_data):
        """Testa listagem de dados criptografados."""
        profile_id = 1
        
        # Criar múltiplos registros
        for i in range(3):
            medication = models.Medication(
                profile_id=profile_id,
                name=f"Medication {i}",
                schedules=[],
                encrypted_data=sample_encrypted_data
            )
            db.add(medication)
        db.commit()
        
        # Listar dados
        result = EncryptionService.list_encrypted_data(
            db=db,
            model_class=models.Medication,
            profile_id=profile_id,
            limit=10,
            offset=0
        )
        
        assert len(result) == 3
        for item in result:
            assert "id" in item
            assert "encrypted_data" in item
            assert item["encrypted_data"] == sample_encrypted_data
    
    def test_list_encrypted_data_only_encrypted(self, db, sample_encrypted_data):
        """Testa que listagem retorna apenas registros com encrypted_data."""
        profile_id = 1
        
        # Criar registro com encrypted_data
        med1 = models.Medication(
            profile_id=profile_id,
            name="With Encryption",
            schedules=[],
            encrypted_data=sample_encrypted_data
        )
        db.add(med1)
        
        # Criar registro sem encrypted_data
        med2 = models.Medication(
            profile_id=profile_id,
            name="Without Encryption",
            schedules=[]
        )
        db.add(med2)
        db.commit()
        
        # Listar
        result = EncryptionService.list_encrypted_data(
            db=db,
            model_class=models.Medication,
            profile_id=profile_id
        )
        
        # Deve retornar apenas o registro com encrypted_data
        assert len(result) == 1
        assert result[0]["encrypted_data"] == sample_encrypted_data


class TestEncryptionServiceZeroKnowledge:
    """Testes para garantir zero-knowledge (backend nunca descriptografa)."""
    
    def test_service_never_decrypts(self):
        """Testa que serviço nunca tenta descriptografar dados."""
        # Verificar que não há métodos de descriptografia no serviço
        service_methods = dir(EncryptionService)
        
        # Não deve haver métodos como decrypt, decrypt_data, etc.
        decrypt_methods = [m for m in service_methods if 'decrypt' in m.lower()]
        assert len(decrypt_methods) == 0, "Serviço não deve ter métodos de descriptografia"
    
    def test_service_only_stores_and_retrieves(self, db_session):
        """Testa que serviço apenas armazena e retorna dados sem processar."""
        encrypted_data = {
            "encrypted": "encrypted_payload",
            "iv": "initialization_vector"
        }
        
        # Armazenar
        instance = EncryptionService.store_encrypted_data(
            db=db_session,
            model_class=models.Medication,
            profile_id=1,
            data_type="medication",
            encrypted_data=encrypted_data,
            name="Test",
            schedules=[]
        )
        db_session.commit()
        db_session.refresh(instance)
        
        # Verificar que dados foram armazenados exatamente como recebidos
        assert instance.encrypted_data == encrypted_data
        
        # Obter
        retrieved = EncryptionService.get_encrypted_data(
            db=db_session,
            model_class=models.Medication,
            record_id=instance.id,
            profile_id=1
        )
        
        # Verificar que dados retornados são idênticos (sem processamento)
        assert retrieved == encrypted_data
        assert retrieved["encrypted"] == "encrypted_payload"
        assert retrieved["iv"] == "initialization_vector"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
