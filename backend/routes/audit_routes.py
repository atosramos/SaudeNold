"""
Audit Routes - LGPD/HIPAA Compliance

Rotas para auditoria e conformidade regulatória.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Security
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
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
from models import AuditLog, DataExport, DataDeletionRequest
from schemas import (
    AuditLogResponse, AuditLogFilter, AccessReportResponse,
    DataExportRequest, DataExportResponse, DataDeletionRequestCreate,
    DataDeletionRequestResponse
)
from services.audit_service import (
    get_user_audit_logs, get_access_report,
    log_export_action, ACTION_EXPORT
)
from services.compliance_service import (
    export_user_data, request_data_deletion, execute_data_deletion
)
from config.compliance_policy import (
    get_privacy_policy, get_consent_term, get_iso_27001_status
)

router = APIRouter(prefix="/api/compliance", tags=["Compliance"])


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


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def get_audit_logs(
    filter_data: AuditLogFilter = Depends(),
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtém logs de auditoria do usuário atual.
    LGPD: Direito de acesso ao histórico de acessos.
    """
    logs = get_user_audit_logs(
        db=db,
        user_id=user.id,
        profile_id=filter_data.profile_id,
        action_type=filter_data.action_type,
        resource_type=filter_data.resource_type,
        start_date=filter_data.start_date,
        end_date=filter_data.end_date,
        limit=filter_data.limit,
        offset=filter_data.offset
    )
    
    return [AuditLogResponse.model_validate(log) for log in logs]


@router.get("/access-report", response_model=AccessReportResponse)
def get_access_report_endpoint(
    months: int = 12,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gera relatório de acessos dos últimos N meses.
    LGPD: Relatório de acessos nos últimos 12 meses.
    """
    report = get_access_report(db, user.id, months)
    return AccessReportResponse(**report)


@router.post("/export-data", response_model=DataExportResponse)
def export_data(
    request: Request,
    export_request: DataExportRequest,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exporta todos os dados do usuário.
    LGPD: Direito à Portabilidade dos Dados.
    """
    try:
        data_export = export_user_data(
            db=db,
            user_id=user.id,
            export_type=export_request.export_type,
            format=export_request.format,
            include_audit_logs=export_request.include_audit_logs
        )
        
        # Log da exportação
        log_export_action(
            db=db,
            user=user,
            export_type=export_request.export_type,
            request=request,
            file_path=data_export.file_path
        )
        
        # Gerar URL de download
        download_url = f"/api/compliance/download-export/{data_export.id}"
        
        return DataExportResponse(
            id=data_export.id,
            export_type=data_export.export_type,
            format=data_export.format,
            file_path=data_export.file_path,
            download_url=download_url,
            expires_at=data_export.expires_at,
            created_at=data_export.created_at
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao exportar dados: {str(e)}")


@router.get("/download-export/{export_id}")
def download_export(
    export_id: int,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download do arquivo de exportação.
    """
    data_export = db.query(DataExport).filter(
        DataExport.id == export_id,
        DataExport.user_id == user.id
    ).first()
    
    if not data_export:
        raise HTTPException(status_code=404, detail="Exportação não encontrada")
    
    if data_export.expires_at and data_export.expires_at < datetime.now(data_export.expires_at.tzinfo):
        raise HTTPException(status_code=410, detail="Link de download expirado")
    
    if not data_export.file_path or not os.path.exists(data_export.file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    # Marcar como baixado
    data_export.downloaded = True
    data_export.downloaded_at = datetime.now()
    db.commit()
    
    return FileResponse(
        path=data_export.file_path,
        filename=os.path.basename(data_export.file_path),
        media_type="application/zip" if data_export.format == "zip" else "application/json"
    )


@router.post("/request-deletion", response_model=DataDeletionRequestResponse)
def request_deletion(
    deletion_request: DataDeletionRequestCreate,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Solicita exclusão de dados.
    LGPD: Direito ao Esquecimento.
    """
    try:
        request = request_data_deletion(
            db=db,
            user_id=user.id,
            request_type=deletion_request.request_type,
            reason=deletion_request.reason,
            scheduled_at=deletion_request.scheduled_at
        )
        
        # Executar imediatamente se não houver agendamento
        if not deletion_request.scheduled_at:
            execute_data_deletion(db, request.id)
        
        return DataDeletionRequestResponse.model_validate(request)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao solicitar exclusão: {str(e)}")


@router.get("/deletion-requests", response_model=list[DataDeletionRequestResponse])
def get_deletion_requests(
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista solicitações de exclusão do usuário."""
    requests = db.query(DataDeletionRequest).filter(
        DataDeletionRequest.user_id == user.id
    ).order_by(DataDeletionRequest.created_at.desc()).all()
    
    return [DataDeletionRequestResponse.model_validate(r) for r in requests]


@router.get("/privacy-policy")
def get_privacy_policy_endpoint():
    """Retorna política de privacidade."""
    return {"policy": get_privacy_policy()}


@router.get("/consent-term")
def get_consent_term_endpoint():
    """Retorna termo de consentimento."""
    return {"term": get_consent_term()}


@router.get("/iso-27001-status")
def get_iso_27001_status_endpoint():
    """Retorna status do checklist ISO 27001."""
    return get_iso_27001_status()
