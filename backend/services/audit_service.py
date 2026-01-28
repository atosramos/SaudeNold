"""
Audit Service - LGPD/HIPAA Compliance

Serviço centralizado para registro de logs de auditoria.
Garante rastreabilidade completa de todas as ações no sistema.
"""

import hashlib
import json
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import AuditLog, User
from fastapi import Request


# Tipos de ação
ACTION_VIEW = "view"
ACTION_EDIT = "edit"
ACTION_DELETE = "delete"
ACTION_CREATE = "create"
ACTION_SHARE = "share"
ACTION_EXPORT = "export"
ACTION_IMPORT = "import"
ACTION_LOGIN = "login"
ACTION_LOGOUT = "logout"
ACTION_ACCESS_DENIED = "access_denied"
ACTION_DATA_DELETION = "data_deletion"
ACTION_CONSENT_GIVEN = "consent_given"
ACTION_CONSENT_REVOKED = "consent_revoked"

# Tipos de recurso
RESOURCE_MEDICATION = "medication"
RESOURCE_EXAM = "exam"
RESOURCE_PROFILE = "profile"
RESOURCE_VISIT = "visit"
RESOURCE_CONTACT = "contact"
RESOURCE_TRACKING = "tracking"
RESOURCE_USER = "user"
RESOURCE_FAMILY = "family"


def get_request_metadata(request: Request) -> Dict[str, Any]:
    """
    Extrai metadados da requisição para auditoria.
    
    Returns:
        Dict com ip_address, user_agent, device_id
    """
    ip_address = None
    if request.client:
        ip_address = request.client.host
    
    user_agent = request.headers.get("user-agent", "")
    device_id = request.headers.get("x-device-id", "")
    
    return {
        "ip_address": ip_address,
        "user_agent": user_agent,
        "device_id": device_id
    }


def calculate_log_hash(log_data: Dict[str, Any]) -> str:
    """
    Calcula hash SHA-256 do log para garantir imutabilidade.
    
    Args:
        log_data: Dados do log em formato dict
    
    Returns:
        Hash hexadecimal SHA-256
    """
    # Criar string JSON ordenada para garantir consistência
    json_str = json.dumps(log_data, sort_keys=True, default=str)
    return hashlib.sha256(json_str.encode()).hexdigest()


def log_audit_event(
    db: Session,
    user_id: int,
    action_type: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    profile_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    device_id: Optional[str] = None,
    action_details: Optional[Dict[str, Any]] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    success: bool = True,
    error_message: Optional[str] = None
) -> AuditLog:
    """
    Registra um evento de auditoria.
    
    Args:
        db: Sessão do banco de dados
        user_id: ID do usuário que realizou a ação
        action_type: Tipo de ação (view, edit, delete, etc.)
        resource_type: Tipo de recurso (medication, exam, etc.)
        resource_id: ID do recurso afetado
        profile_id: ID do perfil afetado
        ip_address: Endereço IP
        user_agent: User agent do cliente
        device_id: ID do dispositivo
        action_details: Detalhes adicionais da ação
        old_values: Valores anteriores (para edições)
        new_values: Valores novos (para edições)
        success: Se a ação foi bem-sucedida
        error_message: Mensagem de erro se houver
    
    Returns:
        AuditLog criado
    """
    # Preparar dados do log
    log_data = {
        "user_id": user_id,
        "action_type": action_type,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "profile_id": profile_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "device_id": device_id,
        "action_details": action_details,
        "old_values": old_values,
        "new_values": new_values,
        "success": success,
        "error_message": error_message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Calcular hash
    log_hash = calculate_log_hash(log_data)
    
    # Criar log
    audit_log = AuditLog(
        user_id=user_id,
        profile_id=profile_id,
        action_type=action_type,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        device_id=device_id,
        action_details=action_details,
        old_values=old_values,
        new_values=new_values,
        success=success,
        error_message=error_message,
        log_hash=log_hash
    )
    
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    
    return audit_log


def log_view_action(
    db: Session,
    user: User,
    resource_type: str,
    resource_id: int,
    profile_id: Optional[int],
    request: Request
) -> AuditLog:
    """Conveniência para registrar visualização."""
    metadata = get_request_metadata(request)
    return log_audit_event(
        db=db,
        user_id=user.id,
        action_type=ACTION_VIEW,
        resource_type=resource_type,
        resource_id=resource_id,
        profile_id=profile_id,
        **metadata
    )


def log_edit_action(
    db: Session,
    user: User,
    resource_type: str,
    resource_id: int,
    profile_id: Optional[int],
    request: Request,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """Conveniência para registrar edição."""
    metadata = get_request_metadata(request)
    return log_audit_event(
        db=db,
        user_id=user.id,
        action_type=ACTION_EDIT,
        resource_type=resource_type,
        resource_id=resource_id,
        profile_id=profile_id,
        old_values=old_values,
        new_values=new_values,
        **metadata
    )


def log_delete_action(
    db: Session,
    user: User,
    resource_type: str,
    resource_id: int,
    profile_id: Optional[int],
    request: Request
) -> AuditLog:
    """Conveniência para registrar exclusão."""
    metadata = get_request_metadata(request)
    return log_audit_event(
        db=db,
        user_id=user.id,
        action_type=ACTION_DELETE,
        resource_type=resource_type,
        resource_id=resource_id,
        profile_id=profile_id,
        **metadata
    )


def log_share_action(
    db: Session,
    user: User,
    resource_type: str,
    resource_id: int,
    profile_id: Optional[int],
    request: Request,
    shared_with: Optional[int] = None,
    permissions: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """Conveniência para registrar compartilhamento."""
    metadata = get_request_metadata(request)
    return log_audit_event(
        db=db,
        user_id=user.id,
        action_type=ACTION_SHARE,
        resource_type=resource_type,
        resource_id=resource_id,
        profile_id=profile_id,
        action_details={
            "shared_with": shared_with,
            "permissions": permissions
        },
        **metadata
    )


def log_export_action(
    db: Session,
    user: User,
    export_type: str,
    request: Request,
    file_path: Optional[str] = None
) -> AuditLog:
    """Conveniência para registrar exportação."""
    metadata = get_request_metadata(request)
    return log_audit_event(
        db=db,
        user_id=user.id,
        action_type=ACTION_EXPORT,
        resource_type="data",
        action_details={
            "export_type": export_type,
            "file_path": file_path
        },
        **metadata
    )


def get_user_audit_logs(
    db: Session,
    user_id: int,
    profile_id: Optional[int] = None,
    action_type: Optional[str] = None,
    resource_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0
) -> list[AuditLog]:
    """
    Busca logs de auditoria de um usuário.
    
    Args:
        db: Sessão do banco de dados
        user_id: ID do usuário
        profile_id: Filtrar por perfil (opcional)
        action_type: Filtrar por tipo de ação (opcional)
        resource_type: Filtrar por tipo de recurso (opcional)
        start_date: Data inicial (opcional)
        end_date: Data final (opcional)
        limit: Limite de resultados
        offset: Offset para paginação
    
    Returns:
        Lista de AuditLog
    """
    query = db.query(AuditLog).filter(AuditLog.user_id == user_id)
    
    if profile_id:
        query = query.filter(AuditLog.profile_id == profile_id)
    
    if action_type:
        query = query.filter(AuditLog.action_type == action_type)
    
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)
    
    return query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()


def get_access_report(
    db: Session,
    user_id: int,
    months: int = 12
) -> Dict[str, Any]:
    """
    Gera relatório de acessos dos últimos N meses (LGPD).
    
    Args:
        db: Sessão do banco de dados
        user_id: ID do usuário
        months: Número de meses para o relatório (padrão: 12)
    
    Returns:
        Dict com estatísticas de acesso
    """
    from datetime import timedelta
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=months * 30)
    
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == user_id,
        AuditLog.created_at >= cutoff_date
    ).all()
    
    # Estatísticas
    total_accesses = len(logs)
    by_action = {}
    by_resource = {}
    by_ip = {}
    by_device = {}
    
    for log in logs:
        # Por ação
        by_action[log.action_type] = by_action.get(log.action_type, 0) + 1
        
        # Por recurso
        if log.resource_type:
            by_resource[log.resource_type] = by_resource.get(log.resource_type, 0) + 1
        
        # Por IP
        if log.ip_address:
            by_ip[log.ip_address] = by_ip.get(log.ip_address, 0) + 1
        
        # Por dispositivo
        if log.device_id:
            by_device[log.device_id] = by_device.get(log.device_id, 0) + 1
    
    return {
        "user_id": user_id,
        "period_months": months,
        "start_date": cutoff_date.isoformat(),
        "end_date": datetime.now(timezone.utc).isoformat(),
        "total_accesses": total_accesses,
        "by_action": by_action,
        "by_resource": by_resource,
        "by_ip": by_ip,
        "by_device": by_device,
        "logs": [
            {
                "id": log.id,
                "action_type": log.action_type,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "profile_id": log.profile_id,
                "ip_address": log.ip_address,
                "device_id": log.device_id,
                "created_at": log.created_at.isoformat(),
                "success": log.success
            }
            for log in logs[:1000]  # Limitar a 1000 logs no relatório
        ]
    }
