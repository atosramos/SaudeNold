"""
Compliance Service - LGPD/HIPAA

Serviço para gerenciar conformidade regulatória:
- Exportação de dados (LGPD - Direito à Portabilidade)
- Exclusão de dados (LGPD - Direito ao Esquecimento)
- Retificação de dados
- Relatórios de acesso
"""

import json
import zipfile
import hashlib
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from pathlib import Path
from sqlalchemy.orm import Session
from models import (
    User, FamilyProfile, Medication, MedicalExam, DoctorVisit,
    EmergencyContact, DailyTracking, MedicationLog, ExamDataPoint,
    DataExport, DataDeletionRequest, AuditLog, FamilyInvite,
    FamilyCaregiver, FamilyDataShare
)
from services.audit_service import get_access_report, ACTION_EXPORT, ACTION_DATA_DELETION


EXPORT_DIR = Path("exports")
EXPORT_DIR.mkdir(exist_ok=True)

# Retenção de logs: 7 anos (requisitos legais de saúde)
AUDIT_LOG_RETENTION_YEARS = 7


def export_user_data(
    db: Session,
    user_id: int,
    export_type: str = "full",
    format: str = "json",
    include_audit_logs: bool = True
) -> DataExport:
    """
    Exporta todos os dados de um usuário (LGPD - Direito à Portabilidade).
    
    Args:
        db: Sessão do banco de dados
        user_id: ID do usuário
        export_type: Tipo de exportação (full, partial, access_report)
        format: Formato (json, csv, pdf)
        include_audit_logs: Incluir logs de auditoria
    
    Returns:
        DataExport criado
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("Usuário não encontrado")
    
    # Coletar dados do usuário
    export_data = {
        "user": {
            "id": user.id,
            "email": user.email,
            "account_type": user.account_type,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
        },
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "export_type": export_type
    }
    
    # Perfis da família
    if user.family_id:
        profiles = db.query(FamilyProfile).filter(
            FamilyProfile.family_id == user.family_id
        ).all()
        
        export_data["profiles"] = []
        for profile in profiles:
            profile_data = {
                "id": profile.id,
                "name": profile.name,
                "account_type": profile.account_type,
                "birth_date": profile.birth_date.isoformat() if profile.birth_date else None,
                "gender": profile.gender,
                "blood_type": profile.blood_type,
                "created_at": profile.created_at.isoformat() if profile.created_at else None
            }
            
            # Dados médicos do perfil
            if export_type == "full":
                profile_data["medications"] = [
                    {
                        "id": m.id,
                        "name": m.name,
                        "dosage": m.dosage,
                        "schedules": m.schedules,
                        "active": m.active,
                        "created_at": m.created_at.isoformat() if m.created_at else None
                    }
                    for m in db.query(Medication).filter(Medication.profile_id == profile.id).all()
                ]
                
                profile_data["exams"] = [
                    {
                        "id": e.id,
                        "exam_type": e.exam_type,
                        "exam_date": e.exam_date.isoformat() if e.exam_date else None,
                        "created_at": e.created_at.isoformat() if e.created_at else None
                    }
                    for e in db.query(MedicalExam).filter(MedicalExam.profile_id == profile.id).all()
                ]
                
                profile_data["visits"] = [
                    {
                        "id": v.id,
                        "doctor_name": v.doctor_name,
                        "specialty": v.specialty,
                        "date": v.date.isoformat() if v.date else None,
                        "created_at": v.created_at.isoformat() if v.created_at else None
                    }
                    for v in db.query(DoctorVisit).filter(DoctorVisit.profile_id == profile.id).all()
                ]
                
                profile_data["emergency_contacts"] = [
                    {
                        "id": c.id,
                        "name": c.name,
                        "phone": c.phone,
                        "relationship": c.relationship,
                        "created_at": c.created_at.isoformat() if c.created_at else None
                    }
                    for c in db.query(EmergencyContact).filter(EmergencyContact.profile_id == profile.id).all()
                ]
            
            export_data["profiles"].append(profile_data)
    
    # Logs de auditoria
    if include_audit_logs:
        access_report = get_access_report(db, user_id, months=12)
        export_data["access_report"] = access_report
    
    # Gerar arquivo
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"export_{user_id}_{timestamp}.json"
    filepath = EXPORT_DIR / filename
    
    # Salvar JSON
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
    
    # Calcular hash
    with open(filepath, 'rb') as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    
    # Criar ZIP se solicitado
    if format == "zip":
        zip_filename = filename.replace('.json', '.zip')
        zip_filepath = EXPORT_DIR / zip_filename
        
        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(filepath, filename)
        
        # Remover JSON original
        os.remove(filepath)
        filepath = zip_filepath
        filename = zip_filename
    
    # Criar registro de exportação
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)  # Link expira em 7 dias
    
    data_export = DataExport(
        user_id=user_id,
        export_type=export_type,
        format=format,
        file_path=str(filepath),
        file_hash=file_hash,
        expires_at=expires_at
    )
    
    db.add(data_export)
    db.commit()
    db.refresh(data_export)
    
    return data_export


def request_data_deletion(
    db: Session,
    user_id: int,
    request_type: str = "full",
    reason: Optional[str] = None,
    scheduled_at: Optional[datetime] = None
) -> DataDeletionRequest:
    """
    Cria solicitação de exclusão de dados (LGPD - Direito ao Esquecimento).
    
    Args:
        db: Sessão do banco de dados
        user_id: ID do usuário
        request_type: Tipo (full, partial, account_only)
        reason: Motivo da solicitação
        scheduled_at: Quando executar (padrão: imediatamente)
    
    Returns:
        DataDeletionRequest criado
    """
    if not scheduled_at:
        scheduled_at = datetime.now(timezone.utc)
    
    deletion_request = DataDeletionRequest(
        user_id=user_id,
        request_type=request_type,
        reason=reason,
        status="pending",
        scheduled_at=scheduled_at,
        created_by=user_id
    )
    
    db.add(deletion_request)
    db.commit()
    db.refresh(deletion_request)
    
    return deletion_request


def execute_data_deletion(
    db: Session,
    deletion_request_id: int
) -> bool:
    """
    Executa exclusão de dados conforme solicitação.
    
    Args:
        db: Sessão do banco de dados
        deletion_request_id: ID da solicitação
    
    Returns:
        True se executado com sucesso
    """
    deletion_request = db.query(DataDeletionRequest).filter(
        DataDeletionRequest.id == deletion_request_id
    ).first()
    
    if not deletion_request:
        return False
    
    if deletion_request.status != "pending":
        return False
    
    user_id = deletion_request.user_id
    
    try:
        deletion_request.status = "processing"
        db.commit()
        
        if deletion_request.request_type == "full":
            # Excluir todos os dados do usuário
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.family_id:
                # Excluir perfis e dados médicos
                profiles = db.query(FamilyProfile).filter(
                    FamilyProfile.family_id == user.family_id
                ).all()
                
                for profile in profiles:
                    # Excluir dados médicos
                    db.query(Medication).filter(Medication.profile_id == profile.id).delete()
                    db.query(MedicalExam).filter(MedicalExam.profile_id == profile.id).delete()
                    db.query(DoctorVisit).filter(DoctorVisit.profile_id == profile.id).delete()
                    db.query(EmergencyContact).filter(EmergencyContact.profile_id == profile.id).delete()
                    db.query(DailyTracking).filter(DailyTracking.profile_id == profile.id).delete()
                    db.query(MedicationLog).filter(MedicationLog.profile_id == profile.id).delete()
                
                # Excluir perfis
                db.query(FamilyProfile).filter(FamilyProfile.family_id == user.family_id).delete()
            
            # Excluir convites e compartilhamentos
            db.query(FamilyInvite).filter(FamilyInvite.inviter_user_id == user_id).delete()
            db.query(FamilyCaregiver).filter(FamilyCaregiver.caregiver_user_id == user_id).delete()
            db.query(FamilyDataShare).filter(
                db.or_(
                    FamilyDataShare.from_profile_id.in_(
                        [p.id for p in profiles] if user.family_id else []
                    ),
                    FamilyDataShare.to_profile_id.in_(
                        [p.id for p in profiles] if user.family_id else []
                    )
                )
            ).delete()
            
            # Excluir conta do usuário (soft delete)
            user.is_active = False
            user.email = f"deleted_{user_id}_{datetime.now(timezone.utc).timestamp()}@deleted.local"
        
        elif deletion_request.request_type == "partial":
            # Excluir apenas dados médicos, manter conta
            if user.family_id:
                profiles = db.query(FamilyProfile).filter(
                    FamilyProfile.family_id == user.family_id
                ).all()
                
                for profile in profiles:
                    db.query(Medication).filter(Medication.profile_id == profile.id).delete()
                    db.query(MedicalExam).filter(MedicalExam.profile_id == profile.id).delete()
                    db.query(DoctorVisit).filter(DoctorVisit.profile_id == profile.id).delete()
                    db.query(EmergencyContact).filter(EmergencyContact.profile_id == profile.id).delete()
                    db.query(DailyTracking).filter(DailyTracking.profile_id == profile.id).delete()
        
        deletion_request.status = "completed"
        deletion_request.completed_at = datetime.now(timezone.utc)
        db.commit()
        
        return True
    
    except Exception as e:
        db.rollback()
        deletion_request.status = "pending"  # Reverter status
        deletion_request.cancellation_reason = f"Erro: {str(e)}"
        db.commit()
        return False


def cleanup_old_audit_logs(db: Session) -> int:
    """
    Remove logs de auditoria com mais de 7 anos (conforme retenção legal).
    
    Args:
        db: Sessão do banco de dados
    
    Returns:
        Número de logs removidos
    """
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=AUDIT_LOG_RETENTION_YEARS * 365)
    
    deleted_count = db.query(AuditLog).filter(
        AuditLog.created_at < cutoff_date
    ).delete()
    
    db.commit()
    return deleted_count
