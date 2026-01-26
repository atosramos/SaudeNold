"""
Serviço de criptografia zero-knowledge para dados médicos.
Este serviço NUNCA descriptografa dados - apenas armazena e retorna dados criptografados.
A descriptografia é feita apenas no frontend.
"""
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class EncryptionService:
    """
    Serviço para gerenciar dados criptografados no backend.
    Implementa zero-knowledge: backend nunca descriptografa dados.
    """
    
    @staticmethod
    def validate_encrypted_format(encrypted_data: Dict[str, Any]) -> bool:
        """
        Valida que dados criptografados têm formato esperado.
        
        Args:
            encrypted_data: Dados criptografados a serem validados
        
        Returns:
            True se formato é válido, False caso contrário
        """
        if not isinstance(encrypted_data, dict):
            return False
        
        # Formato esperado: {encrypted: str, iv: str}
        if "encrypted" not in encrypted_data or "iv" not in encrypted_data:
            return False
        
        if not isinstance(encrypted_data["encrypted"], str) or not isinstance(encrypted_data["iv"], str):
            return False
        
        # Verificar que não estão vazios
        if not encrypted_data["encrypted"] or not encrypted_data["iv"]:
            return False
        
        return True
    
    @staticmethod
    def store_encrypted_data(
        db: Session,
        model_class,
        profile_id: int,
        data_type: str,
        encrypted_data: Dict[str, Any],
        **kwargs
    ) -> Any:
        """
        Armazena dados criptografados no banco de dados.
        
        Args:
            db: Sessão do banco de dados
            model_class: Classe do modelo SQLAlchemy
            profile_id: ID do perfil
            data_type: Tipo de dado (para logging)
            encrypted_data: Dados criptografados no formato {encrypted: str, iv: str}
            **kwargs: Campos adicionais do modelo
        
        Returns:
            Instância do modelo criada
        """
        # Validar formato
        if not EncryptionService.validate_encrypted_format(encrypted_data):
            raise ValueError(f"Formato de dados criptografados inválido para {data_type}")
        
        # Criar instância do modelo com dados criptografados
        model_data = {
            "profile_id": profile_id,
            "encrypted_data": encrypted_data,  # Armazenar como JSONB
            **kwargs
        }
        
        db_instance = model_class(**model_data)
        db.add(db_instance)
        
        logger.info(f"Dados criptografados armazenados: {data_type} para perfil {profile_id}")
        return db_instance
    
    @staticmethod
    def get_encrypted_data(
        db: Session,
        model_class,
        record_id: int,
        profile_id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Obtém dados criptografados do banco de dados.
        
        Args:
            db: Sessão do banco de dados
            model_class: Classe do modelo SQLAlchemy
            record_id: ID do registro
            profile_id: ID do perfil (opcional, para validação)
        
        Returns:
            Dados criptografados no formato {encrypted: str, iv: str} ou None
        """
        query = db.query(model_class).filter(model_class.id == record_id)
        
        if profile_id:
            query = query.filter(model_class.profile_id == profile_id)
        
        instance = query.first()
        
        if not instance:
            return None
        
        # Retornar dados criptografados diretamente
        if hasattr(instance, 'encrypted_data') and instance.encrypted_data:
            return instance.encrypted_data
        
        return None
    
    @staticmethod
    def update_encrypted_data(
        db: Session,
        model_class,
        record_id: int,
        encrypted_data: Dict[str, Any],
        profile_id: Optional[int] = None
    ) -> bool:
        """
        Atualiza dados criptografados no banco de dados.
        
        Args:
            db: Sessão do banco de dados
            model_class: Classe do modelo SQLAlchemy
            record_id: ID do registro
            encrypted_data: Novos dados criptografados
            profile_id: ID do perfil (opcional, para validação)
        
        Returns:
            True se atualizado com sucesso, False caso contrário
        """
        # Validar formato
        if not EncryptionService.validate_encrypted_format(encrypted_data):
            raise ValueError("Formato de dados criptografados inválido")
        
        query = db.query(model_class).filter(model_class.id == record_id)
        
        if profile_id:
            query = query.filter(model_class.profile_id == profile_id)
        
        instance = query.first()
        
        if not instance:
            return False
        
        # Atualizar dados criptografados
        instance.encrypted_data = encrypted_data
        if hasattr(instance, 'updated_at'):
            instance.updated_at = datetime.now(timezone.utc)
        
        logger.info(f"Dados criptografados atualizados: registro {record_id}")
        return True
    
    @staticmethod
    def list_encrypted_data(
        db: Session,
        model_class,
        profile_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> list[Dict[str, Any]]:
        """
        Lista dados criptografados de um perfil.
        
        Args:
            db: Sessão do banco de dados
            model_class: Classe do modelo SQLAlchemy
            profile_id: ID do perfil
            limit: Limite de resultados
            offset: Offset para paginação
        
        Returns:
            Lista de dados criptografados (apenas encrypted_data, sem outros campos sensíveis)
        """
        query = db.query(model_class).filter(model_class.profile_id == profile_id)
        
        instances = query.limit(limit).offset(offset).all()
        
        result = []
        for instance in instances:
            if hasattr(instance, 'encrypted_data') and instance.encrypted_data:
                result.append({
                    "id": instance.id,
                    "encrypted_data": instance.encrypted_data,
                    "created_at": instance.created_at.isoformat() if hasattr(instance, 'created_at') and instance.created_at else None,
                    "updated_at": instance.updated_at.isoformat() if hasattr(instance, 'updated_at') and instance.updated_at else None,
                })
        
        return result
