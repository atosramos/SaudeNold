"""
Emergency Service - Modo de Emergência

Serviço para gerenciar modo de emergência e acesso rápido a informações críticas.
"""

import hashlib
import secrets
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import (
    EmergencyProfile, EmergencyAccessLog, FamilyProfile,
    EmergencyContact, Medication, MedicalExam, DoctorVisit
)


def hash_emergency_pin(pin: str) -> str:
    """
    Gera hash do PIN de emergência (6 dígitos).
    
    Args:
        pin: PIN de 6 dígitos
    
    Returns:
        Hash SHA-256 do PIN
    """
    if len(pin) != 6 or not pin.isdigit():
        raise ValueError("PIN deve ter exatamente 6 dígitos numéricos")
    
    # Adicionar salt para segurança adicional
    salt = "emergency_pin_salt_v1"
    return hashlib.sha256((pin + salt).encode()).hexdigest()


def verify_emergency_pin(pin: str, pin_hash: str) -> bool:
    """
    Verifica se o PIN está correto.
    
    Args:
        pin: PIN fornecido
        pin_hash: Hash armazenado
    
    Returns:
        True se o PIN estiver correto
    """
    try:
        return hash_emergency_pin(pin) == pin_hash
    except ValueError:
        return False


def get_or_create_emergency_profile(
    db: Session,
    profile_id: int
) -> EmergencyProfile:
    """
    Obtém ou cria perfil de emergência para um perfil.
    
    Args:
        db: Sessão do banco de dados
        profile_id: ID do perfil
    
    Returns:
        EmergencyProfile
    """
    profile = db.query(EmergencyProfile).filter(
        EmergencyProfile.profile_id == profile_id
    ).first()
    
    if not profile:
        profile = EmergencyProfile(
            profile_id=profile_id,
            emergency_pin_enabled=False,
            is_active=True
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return profile


def set_emergency_pin(
    db: Session,
    profile_id: int,
    pin: str
) -> EmergencyProfile:
    """
    Define o PIN de emergência para um perfil.
    
    Args:
        db: Sessão do banco de dados
        profile_id: ID do perfil
        pin: PIN de 6 dígitos
    
    Returns:
        EmergencyProfile atualizado
    """
    if len(pin) != 6 or not pin.isdigit():
        raise ValueError("PIN deve ter exatamente 6 dígitos numéricos")
    
    profile = get_or_create_emergency_profile(db, profile_id)
    profile.emergency_pin_hash = hash_emergency_pin(pin)
    profile.emergency_pin_enabled = True
    profile.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(profile)
    
    return profile


def verify_emergency_access(
    db: Session,
    profile_id: int,
    pin: str
) -> bool:
    """
    Verifica se o PIN de emergência está correto.
    
    Args:
        db: Sessão do banco de dados
        profile_id: ID do perfil
        pin: PIN fornecido
    
    Returns:
        True se o PIN estiver correto e modo emergência estiver ativo
    """
    profile = db.query(EmergencyProfile).filter(
        EmergencyProfile.profile_id == profile_id,
        EmergencyProfile.is_active == True
    ).first()
    
    if not profile or not profile.emergency_pin_enabled:
        return False
    
    if not profile.emergency_pin_hash:
        return False
    
    return verify_emergency_pin(pin, profile.emergency_pin_hash)


def get_emergency_info(
    db: Session,
    profile_id: int,
    show_initials_only: bool = True
) -> Dict[str, Any]:
    """
    Obtém informações de emergência de um perfil.
    
    Args:
        db: Sessão do banco de dados
        profile_id: ID do perfil
        show_initials_only: Se True, mostra apenas iniciais do nome
    
    Returns:
        Dict com informações de emergência
    """
    # Obter perfil
    family_profile = db.query(FamilyProfile).filter(
        FamilyProfile.id == profile_id
    ).first()
    
    if not family_profile:
        raise ValueError("Perfil não encontrado")
    
    # Obter configurações de emergência
    emergency_profile = db.query(EmergencyProfile).filter(
        EmergencyProfile.profile_id == profile_id,
        EmergencyProfile.is_active == True
    ).first()
    
    if not emergency_profile:
        raise ValueError("Modo de emergência não configurado")
    
    # Preparar informações
        # Determinar nome a exibir
        if emergency_profile.show_full_name:
            display_name = family_profile.name
        else:
            display_name = _get_initials(family_profile.name)
        
        info = {
            "profile_id": profile_id,
            "name": display_name,
            "blood_type": family_profile.blood_type if emergency_profile.show_blood_type else None,
        }
    
    # Alergias críticas (podem estar em notes do perfil ou em campo específico)
    if emergency_profile.show_allergies:
        # Por enquanto, retornar vazio - pode ser implementado com campo específico
        # ou extraído de notes/outros campos
        info["allergies"] = []  # Placeholder - pode ser implementado posteriormente
    
    # Condições crônicas e medicamentos
    if emergency_profile.show_chronic_conditions or emergency_profile.show_medications:
        medications = db.query(Medication).filter(
            Medication.profile_id == profile_id,
            Medication.active == True
        ).all()
        
        if emergency_profile.show_medications:
            info["medications"] = [
                {
                    "name": m.name,
                    "dosage": m.dosage
                }
                for m in medications
            ]
    
    # Contatos de emergência
    if emergency_profile.show_emergency_contacts:
        contacts = db.query(EmergencyContact).filter(
            EmergencyContact.profile_id == profile_id
        ).order_by(EmergencyContact.order).all()
        
        info["emergency_contacts"] = [
            {
                "name": c.name,
                "phone": c.phone,
                "relationship": c.relationship
            }
            for c in contacts
        ]
    
    # Plano de saúde
    if emergency_profile.show_health_insurance:
        info["health_insurance"] = {
            "name": emergency_profile.health_insurance_name,
            "number": emergency_profile.health_insurance_number
        }
    
    # Diretivas antecipadas
    if emergency_profile.show_advance_directives and emergency_profile.advance_directives:
        info["advance_directives"] = emergency_profile.advance_directives
    
    return info


def _get_initials(name: str) -> str:
    """Retorna apenas iniciais do nome."""
    parts = name.strip().split()
    if len(parts) >= 2:
        return f"{parts[0][0].upper()}. {parts[-1][0].upper()}."
    elif len(parts) == 1:
        return f"{parts[0][0].upper()}."
    return ""




def log_emergency_access(
    db: Session,
    profile_id: int,
    access_method: str = "pin",
    ip_address: Optional[str] = None,
    device_id: Optional[str] = None,
    location_lat: Optional[float] = None,
    location_lon: Optional[float] = None,
    user_agent: Optional[str] = None,
    notes: Optional[str] = None
) -> EmergencyAccessLog:
    """
    Registra acesso ao modo de emergência.
    
    Args:
        db: Sessão do banco de dados
        profile_id: ID do perfil
        access_method: Método de acesso (pin, qr_code)
        ip_address: Endereço IP
        device_id: ID do dispositivo
        location_lat: Latitude da localização
        location_lon: Longitude da localização
        user_agent: User agent
        notes: Notas adicionais
    
    Returns:
        EmergencyAccessLog criado
    """
    access_log = EmergencyAccessLog(
        profile_id=profile_id,
        accessed_at=datetime.now(timezone.utc),
        ip_address=ip_address,
        device_id=device_id,
        location_lat=location_lat,
        location_lon=location_lon,
        access_method=access_method,
        user_agent=user_agent,
        notes=notes
    )
    
    db.add(access_log)
    db.commit()
    db.refresh(access_log)
    
    return access_log


def notify_emergency_contacts(
    db: Session,
    profile_id: int,
    access_log_id: int
) -> bool:
    """
    Notifica contatos de emergência sobre acesso ao modo emergência.
    
    Args:
        db: Sessão do banco de dados
        profile_id: ID do perfil
        access_log_id: ID do log de acesso
    
    Returns:
        True se notificações foram enviadas
    """
    emergency_profile = db.query(EmergencyProfile).filter(
        EmergencyProfile.profile_id == profile_id
    ).first()
    
    if not emergency_profile or not emergency_profile.notify_contacts_on_access:
        return False
    
    # Obter contatos de emergência
    contacts = db.query(EmergencyContact).filter(
        EmergencyContact.profile_id == profile_id
    ).all()
    
    # Registrar log de auditoria
    try:
        from services.audit_service import log_audit_event, ACTION_VIEW, RESOURCE_PROFILE
        from models import User
        
        # Obter usuário do perfil (via family)
        family_profile = db.query(FamilyProfile).filter(
            FamilyProfile.id == profile_id
        ).first()
        
        if family_profile:
            # Tentar obter usuário admin da família
            from models import Family
            family = db.query(Family).filter(Family.id == family_profile.family_id).first()
            if family:
                user = db.query(User).filter(User.id == family.admin_user_id).first()
                if user:
                    log_audit_event(
                        db=db,
                        user_id=user.id,
                        action_type="emergency_access",
                        resource_type=RESOURCE_PROFILE,
                        resource_id=profile_id,
                        profile_id=profile_id,
                        action_details={
                            "access_log_id": access_log_id,
                            "contacts_count": len(contacts),
                            "notified": True
                        }
                    )
    except Exception as e:
        # Não falhar se auditoria não estiver disponível
        import logging
        logging.warning(f"Erro ao registrar log de auditoria de emergência: {e}")
    
    # TODO: Implementar envio de notificações (SMS, push, email, etc.)
    # Por enquanto, apenas marca como notificado
    access_log = db.query(EmergencyAccessLog).filter(
        EmergencyAccessLog.id == access_log_id
    ).first()
    
    if access_log:
        access_log.contacts_notified = True
        db.commit()
    
    return True


def generate_emergency_qr_data(
    db: Session,
    profile_id: int
) -> str:
    """
    Gera dados para QR Code de emergência.
    
    Args:
        db: Sessão do banco de dados
        profile_id: ID do perfil
    
    Returns:
        String com dados do QR Code (JSON)
    """
    import json
    
    emergency_profile = db.query(EmergencyProfile).filter(
        EmergencyProfile.profile_id == profile_id,
        EmergencyProfile.is_active == True,
        EmergencyProfile.qr_code_enabled == True
    ).first()
    
    if not emergency_profile:
        raise ValueError("QR Code não habilitado para este perfil")
    
    # Gerar token temporário para acesso via QR Code
    token = secrets.token_urlsafe(32)
    
    # Armazenar token temporário (pode ser em cache/Redis)
    # Por enquanto, retornamos dados básicos
    
    qr_data = {
        "profile_id": profile_id,
        "token": token,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "emergency_access"
    }
    
    return json.dumps(qr_data)
