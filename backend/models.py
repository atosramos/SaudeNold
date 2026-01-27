from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Text, Float
from sqlalchemy.sql import func
from database import Base


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, index=True)
    name = Column(String, nullable=False)
    dosage = Column(String)
    schedules = Column(JSON)  # Array de strings com horários
    image_base64 = Column(Text)
    notes = Column(Text)
    active = Column(Boolean, default=True)
    encrypted_data = Column(JSON)  # Dados criptografados (zero-knowledge)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    family_id = Column(Integer, index=True)
    account_type = Column(String(50), default="family_admin", index=True)
    created_by = Column(Integer, index=True)
    permissions = Column(JSON)
    role = Column(String(50), default="family_admin", index=True)
    is_active = Column(Boolean, default=True, index=True)
    email_verified = Column(Boolean, default=False, index=True)
    email_verification_token_hash = Column(String(128))
    email_verification_sent_at = Column(DateTime(timezone=True))
    password_reset_token_hash = Column(String(128))
    password_reset_expires_at = Column(DateTime(timezone=True))
    last_login_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class BiometricDevice(Base):
    __tablename__ = "biometric_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    device_id = Column(String(255), nullable=False, index=True)
    device_name = Column(String(255))
    public_key = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    revoked_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, index=True)
    medication_id = Column(Integer, index=True)
    medication_name = Column(String, nullable=False)
    scheduled_time = Column(DateTime(timezone=True))
    taken_time = Column(DateTime(timezone=True))
    status = Column(String, nullable=False)  # taken, skipped, postponed
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DoctorVisit(Base):
    __tablename__ = "doctor_visits"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, index=True)
    doctor_name = Column(String, nullable=False)
    specialty = Column(String)
    date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text)
    encrypted_data = Column(JSON)  # Dados criptografados (zero-knowledge)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MedicalExam(Base):
    __tablename__ = "medical_exams"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, index=True)
    exam_type = Column(String, nullable=False)
    exam_date = Column(DateTime(timezone=True), nullable=False)
    image_base64 = Column(Text)
    notes = Column(Text)
    encrypted_data = Column(JSON)  # Dados criptografados (zero-knowledge)
    ocr_processed = Column(Boolean, default=False)
    ocr_text = Column(Text)
    data_extracted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ExamDataPoint(Base):
    __tablename__ = "exam_data_points"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, nullable=False, index=True)
    parameter_name = Column(String, nullable=False, index=True)
    value = Column(String, nullable=False)
    unit = Column(String)
    reference_range_min = Column(String)  # Valor mínimo de referência
    reference_range_max = Column(String)  # Valor máximo de referência
    exam_date = Column(DateTime(timezone=True), nullable=False, index=True)  # Data do exame (para queries temporais)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class License(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True)
    license_key = Column(String(45), unique=True, nullable=False, index=True)
    license_type = Column(String(20), nullable=False)  # 1_month, 6_months, 1_year
    user_id = Column(String(255), index=True)  # ID do usuário (opcional)
    device_id = Column(String(255), index=True)  # ID do dispositivo
    purchase_id = Column(String(255), index=True)  # ID da compra (Google Pay)
    activated_at = Column(DateTime(timezone=True), nullable=False)
    expiration_date = Column(DateTime(timezone=True), nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(String(255), unique=True, nullable=False, index=True)  # ID da compra do Google Pay
    user_id = Column(String(255), index=True)
    license_type = Column(String(20), nullable=False)  # 1_month, 6_months, 1_year
    amount = Column(String, nullable=False)  # Valor pago
    currency = Column(String(3), default="BRL")
    status = Column(String(20), nullable=False, index=True)  # pending, completed, failed, refunded
    google_pay_transaction_id = Column(String(255))
    license_key = Column(String(45))  # Chave gerada após confirmação
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LicenseValidationLog(Base):
    __tablename__ = "license_validation_logs"

    id = Column(Integer, primary_key=True, index=True)
    license_key = Column(String(45), index=True)  # Chave validada (pode ser parcial para privacidade)
    device_id = Column(String(255), index=True)  # ID do dispositivo
    ip_address = Column(String(45), index=True)  # IP de origem
    user_agent = Column(String(500))  # User agent do cliente
    validation_result = Column(String(20), nullable=False)  # valid, invalid, expired, revoked
    error_message = Column(Text)  # Mensagem de erro se houver
    is_suspicious = Column(Boolean, default=False, index=True)  # Flag para tentativas suspeitas
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class Family(Base):
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    admin_user_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class FamilyProfile(Base):
    __tablename__ = "family_profiles"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=False, index=True)
    birth_date = Column(DateTime(timezone=True))
    gender = Column(String(50))
    blood_type = Column(String(10))
    created_by = Column(Integer, index=True)
    permissions = Column(JSON)
    allow_quick_access = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class FamilyCaregiver(Base):
    __tablename__ = "family_caregivers"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, nullable=False, index=True)
    caregiver_user_id = Column(Integer, nullable=False, index=True)
    access_level = Column(String(50), default="full")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FamilyProfileLink(Base):
    __tablename__ = "family_profile_links"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, nullable=False, index=True)
    source_profile_id = Column(Integer, nullable=False, index=True)
    target_profile_id = Column(Integer, nullable=False, index=True)
    status = Column(String(20), default="pending", index=True)  # pending, accepted, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True))


class FamilyInvite(Base):
    __tablename__ = "family_invites"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, nullable=False, index=True)
    inviter_user_id = Column(Integer, nullable=False, index=True)
    invitee_email = Column(String(255), index=True)
    invite_code = Column(String(64), unique=True, index=True)
    status = Column(String(20), default="pending", index=True)  # pending, accepted, cancelled, expired
    expires_at = Column(DateTime(timezone=True), index=True)
    accepted_at = Column(DateTime(timezone=True))
    accepted_by_user_id = Column(Integer, index=True)
    permissions = Column(JSON)  # Permissões: {"can_view": True, "can_edit": True, "can_delete": False}
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FamilyDataShare(Base):
    __tablename__ = "family_data_shares"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, nullable=False, index=True)
    from_profile_id = Column(Integer, nullable=False, index=True)
    to_profile_id = Column(Integer, nullable=False, index=True)
    permissions = Column(JSON)
    expires_at = Column(DateTime(timezone=True), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True))


class AuditLog(Base):
    """
    Modelo de Auditoria - LGPD/HIPAA Compliance
    
    Armazena logs imutáveis de todas as ações importantes no sistema.
    Retenção de 7 anos conforme requisitos legais de saúde.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Identificação do usuário
    user_id = Column(Integer, nullable=False, index=True)
    profile_id = Column(Integer, index=True)  # Perfil afetado pela ação
    
    # Tipo de ação
    action_type = Column(String(50), nullable=False, index=True)  # view, edit, delete, share, export, etc.
    resource_type = Column(String(50), index=True)  # medication, exam, profile, etc.
    resource_id = Column(Integer, index=True)  # ID do recurso afetado
    
    # Rastreabilidade
    ip_address = Column(String(45), index=True)
    user_agent = Column(String(500))
    device_id = Column(String(255), index=True)
    
    # Detalhes da ação
    action_details = Column(JSON)  # Dados adicionais sobre a ação
    old_values = Column(JSON)  # Valores anteriores (para edições)
    new_values = Column(JSON)  # Valores novos (para edições)
    
    # Resultado
    success = Column(Boolean, default=True, index=True)
    error_message = Column(Text)  # Mensagem de erro se houver
    
    # Metadados
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Hash para garantir imutabilidade (opcional, para auditoria avançada)
    log_hash = Column(String(64), index=True)  # SHA-256 hash do log


class DataExport(Base):
    """
    Registro de exportações de dados (LGPD - Direito à Portabilidade)
    """
    __tablename__ = "data_exports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    export_type = Column(String(50), default="full")  # full, partial, access_report
    format = Column(String(20), default="json")  # json, csv, pdf
    file_path = Column(String(500))  # Caminho do arquivo gerado
    file_hash = Column(String(64))  # Hash do arquivo para verificação
    expires_at = Column(DateTime(timezone=True), index=True)  # Expiração do link de download
    downloaded = Column(Boolean, default=False, index=True)
    downloaded_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class DataDeletionRequest(Base):
    """
    Solicitações de exclusão de dados (LGPD - Direito ao Esquecimento)
    """
    __tablename__ = "data_deletion_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    request_type = Column(String(50), default="full")  # full, partial, account_only
    reason = Column(Text)  # Motivo da solicitação
    status = Column(String(20), default="pending", index=True)  # pending, processing, completed, cancelled
    scheduled_at = Column(DateTime(timezone=True))  # Quando será executada
    completed_at = Column(DateTime(timezone=True))
    cancelled_at = Column(DateTime(timezone=True))
    cancellation_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_by = Column(Integer)  # Quem criou a solicitação (pode ser o próprio usuário ou admin)


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, index=True)
    name = Column(String, nullable=False)
    phone = Column(String)
    relationship = Column(String)
    notes = Column(Text)
    encrypted_data = Column(JSON)  # Dados criptografados (zero-knowledge)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class EmergencyProfile(Base):
    """
    Configurações do Modo de Emergência para um perfil.
    Permite acesso rápido a informações críticas sem desbloquear o aparelho.
    """
    __tablename__ = "emergency_profiles"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, nullable=False, index=True, unique=True)
    
    # Emergency PIN (hash do PIN de 6 dígitos)
    emergency_pin_hash = Column(String(255))  # Hash do PIN de 6 dígitos
    emergency_pin_enabled = Column(Boolean, default=False, index=True)
    
    # Configurações de privacidade - quais dados exibir
    show_blood_type = Column(Boolean, default=True)
    show_allergies = Column(Boolean, default=True)
    show_chronic_conditions = Column(Boolean, default=True)
    show_medications = Column(Boolean, default=True)
    show_emergency_contacts = Column(Boolean, default=True)
    show_health_insurance = Column(Boolean, default=True)
    show_advance_directives = Column(Boolean, default=False)
    show_full_name = Column(Boolean, default=False)  # Se False, mostra apenas iniciais
    
    # Informações adicionais
    health_insurance_name = Column(String(255))
    health_insurance_number = Column(String(100))
    advance_directives = Column(Text)  # Diretivas antecipadas
    
    # Recursos especiais
    qr_code_enabled = Column(Boolean, default=True)
    share_location_enabled = Column(Boolean, default=False)
    notify_contacts_on_access = Column(Boolean, default=True)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class EmergencyAccessLog(Base):
    """
    Log de acessos ao modo de emergência.
    Registra quando o modo emergência foi ativado.
    """
    __tablename__ = "emergency_access_logs"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, nullable=False, index=True)
    
    # Rastreabilidade
    accessed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    ip_address = Column(String(45), index=True)
    device_id = Column(String(255), index=True)
    location_lat = Column(Float)
    location_lon = Column(Float)
    
    # Detalhes do acesso
    access_method = Column(String(20), default="pin")  # pin, qr_code
    contacts_notified = Column(Boolean, default=False)
    location_shared = Column(Boolean, default=False)
    
    # Metadados
    user_agent = Column(String(500))
    notes = Column(Text)  # Notas adicionais sobre o acesso


class DailyTracking(Base):
    __tablename__ = "daily_tracking"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    metrics = Column(JSON)  # {"weight": 70, "blood_pressure": "120/80", ...}
    notes = Column(Text)
    encrypted_data = Column(JSON)  # Dados criptografados (zero-knowledge)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    device_id = Column(String(255), nullable=False, index=True)
    device_name = Column(String(255))
    ip_address = Column(String(45), index=True)
    user_agent = Column(String(500))
    is_trusted = Column(Boolean, default=False, index=True)
    blocked = Column(Boolean, default=False, index=True)
    last_activity_at = Column(DateTime(timezone=True), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True))


class UserLoginAttempt(Base):
    __tablename__ = "user_login_attempts"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    ip_address = Column(String(45), index=True)
    user_agent = Column(String(500))
    success = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class UserLoginEvent(Base):
    __tablename__ = "user_login_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    device_id = Column(String(255), index=True)
    ip_address = Column(String(45), index=True)
    user_agent = Column(String(500))
    login_type = Column(String(20), default="password")  # password, biometric
    success = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    last_login_at = Column(DateTime(timezone=True))
