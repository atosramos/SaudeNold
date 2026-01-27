"""
Emergency Routes - Modo de Emergência

Rotas para modo de emergência e acesso rápido a informações críticas.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Security
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from auth import get_user_from_token
from models import EmergencyProfile, EmergencyAccessLog, FamilyProfile
from schemas import (
    EmergencyProfileResponse, EmergencyProfileBase,
    EmergencyPinSetRequest, EmergencyPinVerifyRequest,
    EmergencyInfoResponse, EmergencyAccessLogResponse,
    EmergencyQRCodeResponse
)
from services.emergency_service import (
    get_or_create_emergency_profile,
    set_emergency_pin,
    verify_emergency_access,
    get_emergency_info,
    log_emergency_access,
    notify_emergency_contacts,
    generate_emergency_qr_data
)
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/emergency", tags=["Emergency"])


# Import security from main
from fastapi.security import HTTPBearer
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    """Dependency para obter usuário atual."""
    token = credentials.credentials
    user = get_user_from_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


@router.get("/profile/{profile_id}", response_model=EmergencyProfileResponse)
def get_emergency_profile(
    profile_id: int,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém configurações de emergência de um perfil."""
    # Verificar se usuário tem acesso ao perfil
    profile = db.query(FamilyProfile).filter(FamilyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    
    # TODO: Verificar permissões de acesso ao perfil
    
    emergency_profile = get_or_create_emergency_profile(db, profile_id)
    return EmergencyProfileResponse.model_validate(emergency_profile)


@router.put("/profile/{profile_id}", response_model=EmergencyProfileResponse)
def update_emergency_profile(
    profile_id: int,
    profile_data: EmergencyProfileBase,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualiza configurações de emergência de um perfil."""
    # Verificar se usuário tem acesso ao perfil
    profile = db.query(FamilyProfile).filter(FamilyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    
    emergency_profile = get_or_create_emergency_profile(db, profile_id)
    
    # Atualizar campos
    for key, value in profile_data.model_dump().items():
        setattr(emergency_profile, key, value)
    
    emergency_profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(emergency_profile)
    
    return EmergencyProfileResponse.model_validate(emergency_profile)


@router.post("/profile/{profile_id}/pin", response_model=EmergencyProfileResponse)
def set_pin(
    profile_id: int,
    pin_request: EmergencyPinSetRequest,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Define o PIN de emergência para um perfil."""
    # Verificar se usuário tem acesso ao perfil
    profile = db.query(FamilyProfile).filter(FamilyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    
    try:
        emergency_profile = set_emergency_pin(db, profile_id, pin_request.pin)
        return EmergencyProfileResponse.model_validate(emergency_profile)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/profile/{profile_id}/verify-pin")
def verify_pin(
    profile_id: int,
    pin_request: EmergencyPinVerifyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verifica PIN de emergência e retorna informações de emergência.
    Endpoint público (não requer autenticação JWT).
    """
    try:
        # Verificar PIN
        if not verify_emergency_access(db, profile_id, pin_request.pin):
            raise HTTPException(status_code=403, detail="PIN incorreto ou modo emergência desabilitado")
        
        # Obter informações de emergência
        emergency_profile = db.query(EmergencyProfile).filter(
            EmergencyProfile.profile_id == profile_id
        ).first()
        
        show_initials = not emergency_profile.show_full_name if emergency_profile else True
        info = get_emergency_info(db, profile_id, show_initials_only=show_initials)
        
        # Registrar acesso
        device_id = request.headers.get("x-device-id")
        user_agent = request.headers.get("user-agent")
        ip_address = get_remote_address(request)
        
        access_log = log_emergency_access(
            db=db,
            profile_id=profile_id,
            access_method="pin",
            ip_address=ip_address,
            device_id=device_id,
            user_agent=user_agent
        )
        
        # Notificar contatos de emergência
        notify_emergency_contacts(db, profile_id, access_log.id)
        
        return EmergencyInfoResponse(**info)
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao acessar modo emergência: {str(e)}")


@router.get("/profile/{profile_id}/info", response_model=EmergencyInfoResponse)
def get_info(
    profile_id: int,
    show_initials: bool = True,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém informações de emergência (requer autenticação)."""
    try:
        info = get_emergency_info(db, profile_id, show_initials_only=show_initials)
        return EmergencyInfoResponse(**info)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/profile/{profile_id}/qr-code", response_model=EmergencyQRCodeResponse)
def get_qr_code(
    profile_id: int,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gera QR Code para acesso rápido ao modo emergência."""
    try:
        qr_data = generate_emergency_qr_data(db, profile_id)
        
        # Token expira em 1 hora
        expires_at = datetime.now(timezone.utc).replace(
            hour=datetime.now(timezone.utc).hour + 1
        )
        
        return EmergencyQRCodeResponse(
            qr_data=qr_data,
            expires_at=expires_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/profile/{profile_id}/access-logs", response_model=list[EmergencyAccessLogResponse])
def get_access_logs(
    profile_id: int,
    limit: int = 50,
    offset: int = 0,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém histórico de acessos ao modo emergência."""
    # Verificar se usuário tem acesso ao perfil
    profile = db.query(FamilyProfile).filter(FamilyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    
    logs = db.query(EmergencyAccessLog).filter(
        EmergencyAccessLog.profile_id == profile_id
    ).order_by(EmergencyAccessLog.accessed_at.desc()).offset(offset).limit(limit).all()
    
    return [EmergencyAccessLogResponse.model_validate(log) for log in logs]


@router.post("/profile/{profile_id}/disable")
def disable_emergency_mode(
    profile_id: int,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Desabilita modo de emergência para um perfil."""
    # Verificar se usuário tem acesso ao perfil
    profile = db.query(FamilyProfile).filter(FamilyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    
    emergency_profile = get_or_create_emergency_profile(db, profile_id)
    emergency_profile.is_active = False
    emergency_profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"success": True, "message": "Modo de emergência desabilitado"}


@router.post("/profile/{profile_id}/enable")
def enable_emergency_mode(
    profile_id: int,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Habilita modo de emergência para um perfil."""
    # Verificar se usuário tem acesso ao perfil
    profile = db.query(FamilyProfile).filter(FamilyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    
    emergency_profile = get_or_create_emergency_profile(db, profile_id)
    emergency_profile.is_active = True
    emergency_profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"success": True, "message": "Modo de emergência habilitado"}
