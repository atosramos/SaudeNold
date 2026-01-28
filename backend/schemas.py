from pydantic import BaseModel, validator, Field, AliasChoices
from typing import List, Optional, Dict, Any
from datetime import datetime


# ========== CRIPTOGRAFIA ==========
class EncryptedData(BaseModel):
    """
    Schema para dados criptografados (zero-knowledge).
    Backend armazena sem descriptografar.
    """
    encrypted: str  # Dados criptografados (base64 ou string)
    iv: str  # Initialization Vector (hex)


# ========== USUARIOS E AUTENTICACAO ==========
class DeviceInfo(BaseModel):
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    device_model: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    push_token: Optional[str] = None
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None
    location_accuracy_km: Optional[float] = None

    @validator('device_id', 'device_name', 'device_model', 'os_name', 'os_version', 'app_version', 'push_token')
    def validate_device_fields(cls, v):
        if v is None:
            return v
        if len(v) > 255:
            raise ValueError('Informacao de dispositivo muito longa')
        return v.strip()


class UserCreate(BaseModel):
    email: str
    password: str
    device: Optional[DeviceInfo] = None
    terms_accepted: bool = False
    consent_version: Optional[str] = None

    @validator('email')
    def validate_email(cls, v):
        email = v.strip().lower()
        if '@' not in email or len(email) < 5:
            raise ValueError('Email invalido')
        if len(email) > 255:
            raise ValueError('Email muito longo')
        return email

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Senha deve ter pelo menos 8 caracteres')
        if len(v) > 255:
            raise ValueError('Senha muito longa')
        if not any(c.islower() for c in v):
            raise ValueError('Senha deve conter letra minuscula')
        if not any(c.isupper() for c in v):
            raise ValueError('Senha deve conter letra maiuscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('Senha deve conter numero')
        if not any(c in "!@#$%^&*" for c in v):
            raise ValueError('Senha deve conter caractere especial (!@#$%^&*)')
        return v

    @validator('terms_accepted')
    def validate_terms_accepted(cls, v):
        if not v:
            raise ValueError('Aceite dos termos e politica de privacidade e obrigatorio')
        return v


class UserLogin(BaseModel):
    email: str
    password: str
    device: Optional[DeviceInfo] = None

    @validator('email')
    def normalize_login_email(cls, v):
        return v.strip().lower()


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    family_id: Optional[int] = None
    account_type: Optional[str] = None
    is_active: bool
    email_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuthTokenResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserResponse
    verification_required: bool = False
    verification_token: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class SessionResponse(BaseModel):
    id: int
    device_id: str
    device_name: Optional[str] = None
    device_model: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    trusted: bool
    trust_expires_at: Optional[datetime] = None
    blocked: bool = False
    blocked_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SessionRevokeRequest(BaseModel):
    session_id: Optional[int] = None
    device_id: Optional[str] = None


class SessionTrustRequest(BaseModel):
    session_id: Optional[int] = None
    device_id: Optional[str] = None
    trusted: bool = True


class SessionBlockRequest(BaseModel):
    session_id: Optional[int] = None
    device_id: Optional[str] = None
    blocked: bool = True


class LoginEventResponse(BaseModel):
    id: int
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class VerifyEmailRequest(BaseModel):
    email: str
    token: str


class ResendVerificationRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class RequestPinResetRequest(BaseModel):
    profile_id: int  # ID do perfil (backend) para o qual redefinir o PIN


class VerifyPinResetTokenRequest(BaseModel):
    token: str


class VerifyPinResetTokenResponse(BaseModel):
    profile_id: int
    profile_name: Optional[str] = None


class RequestPinResetRequest(BaseModel):
    profile_id: int  # ID do perfil (backend) para o qual redefinir o PIN


class VerifyPinResetTokenRequest(BaseModel):
    token: str


class VerifyPinResetTokenResponse(BaseModel):
    profile_id: int
    profile_name: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    new_password: str

    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Senha deve ter pelo menos 8 caracteres')
        if len(v) > 255:
            raise ValueError('Senha muito longa')
        if not any(c.islower() for c in v):
            raise ValueError('Senha deve conter letra minuscula')
        if not any(c.isupper() for c in v):
            raise ValueError('Senha deve conter letra maiuscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('Senha deve conter numero')
        if not any(c in "!@#$%^&*" for c in v):
            raise ValueError('Senha deve conter caractere especial (!@#$%^&*)')
        return v


# ========== FAMILIA E PERFIS ==========
class FamilyProfileBase(BaseModel):
    name: str
    account_type: str
    birth_date: Optional[datetime] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    allow_quick_access: bool = False

    @validator('name')
    def validate_profile_name(cls, v):
        name = v.strip()
        if len(name) < 2:
            raise ValueError('Nome muito curto')
        if len(name) > 255:
            raise ValueError('Nome muito longo')
        return name

    @validator('gender')
    def validate_gender(cls, v):
        if v is None:
            return v
        if len(v) > 50:
            raise ValueError('Genero muito longo')
        return v.strip()

    @validator('blood_type')
    def validate_blood_type(cls, v):
        if v is None:
            return v
        if len(v) > 10:
            raise ValueError('Tipo sanguineo muito longo')
        return v.strip().upper()


class FamilyProfileResponse(FamilyProfileBase):
    id: int
    family_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FamilyMemberCreate(BaseModel):
    name: str
    birth_date: datetime
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    email: Optional[str] = None

    @validator('name')
    def validate_member_name(cls, v):
        name = v.strip()
        if len(name) < 2:
            raise ValueError('Nome muito curto')
        if len(name) > 255:
            raise ValueError('Nome muito longo')
        return name

    @validator('email')
    def validate_member_email(cls, v):
        if v is None:
            return v
        email = v.strip().lower()
        if len(email) > 255:
            raise ValueError('Email muito longo')
        if '@' not in email:
            raise ValueError('Email invalido')
        return email


class FamilyLinkCreate(BaseModel):
    target_profile_id: int


class FamilyLinkResponse(BaseModel):
    id: int
    family_id: int
    source_profile_id: int
    target_profile_id: int
    status: str
    created_at: datetime
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FamilyCaregiverCreate(BaseModel):
    profile_id: int
    caregiver_user_id: Optional[int] = None  # ID do usuário cuidador
    caregiver_email: Optional[str] = None  # Email do cuidador (alternativa)
    access_level: str = "full"  # read_only, read_write, full

    @validator('access_level')
    def validate_access_level(cls, v):
        from utils.rbac import is_valid_access_level
        if not is_valid_access_level(v):
            raise ValueError('Nível de acesso inválido. Use: read_only, read_write ou full')
        return v

    @validator('caregiver_email')
    def validate_email(cls, v):
        if v is None:
            return v
        email = v.strip().lower()
        if '@' not in email:
            raise ValueError('Email inválido')
        return email


class FamilyCaregiverUpdate(BaseModel):
    access_level: str

    @validator('access_level')
    def validate_access_level(cls, v):
        from utils.rbac import is_valid_access_level
        if not is_valid_access_level(v):
            raise ValueError('Nível de acesso inválido. Use: read_only, read_write ou full')
        return v


class FamilyCaregiverResponse(BaseModel):
    id: int
    profile_id: int
    caregiver_user_id: int
    access_level: str
    created_at: datetime
    caregiver_name: Optional[str] = None
    caregiver_email: Optional[str] = None

    class Config:
        from_attributes = True


class FamilyDataShareCreate(BaseModel):
    from_profile_id: int
    to_profile_id: int
    scope: str = "all"  # all, basic, emergency_only, custom
    custom_fields: Optional[List[str]] = None  # Para scope="custom"
    expires_at: Optional[datetime] = None

    @validator('scope')
    def validate_scope(cls, v):
        from utils.rbac import is_valid_scope
        if not is_valid_scope(v):
            raise ValueError('Escopo inválido. Use: all, basic, emergency_only ou custom')
        return v


class FamilyDataShareResponse(BaseModel):
    id: int
    family_id: int
    from_profile_id: int
    to_profile_id: int
    permissions: Optional[dict] = None
    scope: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    revoked_at: Optional[datetime] = None
    from_profile_name: Optional[str] = None
    to_profile_name: Optional[str] = None

    class Config:
        from_attributes = True


class FamilyInviteCreate(BaseModel):
    invitee_email: Optional[str] = None
    permissions: Optional[dict] = None  # Permissões: {"can_view": True, "can_edit": True, "can_delete": False}

    @validator('invitee_email')
    def validate_invite_email(cls, v):
        if v is None:
            return v
        # Tratar string vazia como None
        if isinstance(v, str) and not v.strip():
            return None
        email = v.strip().lower()
        if len(email) > 255:
            raise ValueError('Email muito longo')
        if '@' not in email:
            raise ValueError('Email invalido')
        return email


class FamilyInviteAccept(BaseModel):
    code: str

    @validator('code')
    def validate_code(cls, v):
        code = v.strip()
        if len(code) < 4:
            raise ValueError('Codigo invalido')
        return code


class FamilyInviteResponse(BaseModel):
    id: int
    family_id: int
    inviter_user_id: int
    invitee_email: Optional[str] = None
    invite_code: Optional[str] = None
    status: str
    expires_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    accepted_by_user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ========== BIOMETRIA ==========
class BiometricRegisterRequest(BaseModel):
    device_id: str
    public_key: str
    device_name: Optional[str] = None

    @validator('device_id')
    def validate_biometric_device_id(cls, v):
        if not v or len(v.strip()) < 4:
            raise ValueError('ID do dispositivo invalido')
        if len(v) > 255:
            raise ValueError('ID do dispositivo muito longo')
        return v.strip()

    @validator('public_key')
    def validate_public_key(cls, v):
        if not v or len(v.strip()) < 32:
            raise ValueError('Public key invalida')
        return v.strip()

    @validator('device_name')
    def validate_device_name(cls, v):
        if v is None:
            return v
        if len(v) > 255:
            raise ValueError('Nome do dispositivo muito longo')
        return v.strip()


class BiometricDeviceResponse(BaseModel):
    id: int
    device_id: str
    device_name: Optional[str] = None
    created_at: datetime
    revoked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BiometricChallengeResponse(BaseModel):
    device_id: str
    challenge: str
    expires_in_minutes: int


class BiometricChallengeRequest(BaseModel):
    device_id: str

    @validator('device_id')
    def validate_challenge_device_id(cls, v):
        if not v or len(v.strip()) < 4:
            raise ValueError('ID do dispositivo invalido')
        if len(v) > 255:
            raise ValueError('ID do dispositivo muito longo')
        return v.strip()


class BiometricAuthRequest(BaseModel):
    device_id: str
    challenge: str
    signature: str

    @validator('device_id')
    def validate_auth_device_id(cls, v):
        if not v or len(v.strip()) < 4:
            raise ValueError('ID do dispositivo invalido')
        if len(v) > 255:
            raise ValueError('ID do dispositivo muito longo')
        return v.strip()

    @validator('challenge', 'signature')
    def validate_auth_fields(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError('Valor invalido')
        return v.strip()


# ========== MEDICAMENTOS ==========
class MedicationBase(BaseModel):
    name: str
    dosage: Optional[str] = None
    schedules: List[str]
    image_base64: Optional[str] = None
    notes: Optional[str] = None
    active: bool = True
    encrypted_data: Optional[EncryptedData] = None  # Dados criptografados (zero-knowledge)


class MedicationCreate(MedicationBase):
    pass


class MedicationResponse(MedicationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# ========== MEDICATION LOGS ==========
class MedicationLogBase(BaseModel):
    medication_id: Optional[int] = None
    medication_name: str
    scheduled_time: datetime
    taken_at: Optional[datetime] = None
    status: str  # taken, skipped, postponed


class MedicationLogCreate(MedicationLogBase):
    pass


class MedicationLogResponse(MedicationLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========== CONTATOS DE EMERGÊNCIA ==========
class EmergencyContactBase(BaseModel):
    name: str
    phone: str
    photo_base64: Optional[str] = None
    relation: Optional[str] = None
    order: int = 0
    encrypted_data: Optional[EncryptedData] = None  # Dados criptografados (zero-knowledge)


class EmergencyContactCreate(EmergencyContactBase):
    pass


class EmergencyContactResponse(EmergencyContactBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========== VISITAS AO MÉDICO ==========
class DoctorVisitBase(BaseModel):
    doctor_name: str
    specialty: str
    # No modelo SQLAlchemy o campo é `date`
    visit_date: datetime = Field(validation_alias=AliasChoices("visit_date", "date"))
    notes: Optional[str] = None
    prescription_image: Optional[str] = None
    encrypted_data: Optional[EncryptedData] = None  # Dados criptografados (zero-knowledge)


class DoctorVisitCreate(DoctorVisitBase):
    pass


class DoctorVisitResponse(DoctorVisitBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========== EXAMES MÉDICOS ==========
class MedicalExamBase(BaseModel):
    exam_date: Optional[datetime] = None
    exam_type: Optional[str] = None
    encrypted_data: Optional[EncryptedData] = None  # Dados criptografados (zero-knowledge)


class MedicalExamCreate(MedicalExamBase):
    image_base64: str  # Imagem ou PDF em base64
    file_type: Optional[str] = 'image'  # 'image' ou 'pdf'


class MedicalExamResponse(MedicalExamBase):
    id: int
    image_base64: Optional[str] = None
    file_type: str = 'image'
    raw_ocr_text: Optional[str] = None
    extracted_data: Optional[dict] = None
    processing_status: str
    processing_error: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MedicalExamUpdate(BaseModel):
    exam_date: Optional[datetime] = None
    exam_type: Optional[str] = None


# ========== DADOS DE EXAMES (PARA ANÁLISE TEMPORAL) ==========
class ExamDataPointResponse(BaseModel):
    id: int
    exam_id: int
    parameter_name: str
    value: str
    numeric_value: Optional[str] = None
    unit: Optional[str] = None
    reference_range_min: Optional[str] = None
    reference_range_max: Optional[str] = None
    exam_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class ExamTimelineData(BaseModel):
    """Dados para gráfico de linha do tempo"""
    parameter_name: str
    unit: Optional[str] = None
    data_points: List[dict]  # Lista de {exam_date, value, exam_id}
    reference_range_min: Optional[str] = None
    reference_range_max: Optional[str] = None


# ========== LICENÇAS PRO ==========
class LicenseValidateRequest(BaseModel):
    key: str
    device_id: Optional[str] = None
    
    class Config:
        # Validação adicional (Pydantic V2)
        str_min_length = 1
        str_max_length = 255
    
    @validator('key')
    def validate_key_format(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Chave de licença não pode estar vazia')
        if len(v) > 100:  # Permitir chaves com espaços/hífens que serão normalizadas
            raise ValueError('Chave de licença muito longa')
        return v.strip().upper()
    
    @validator('device_id')
    def validate_device_id(cls, v):
        if v and len(v) > 255:
            raise ValueError('ID do dispositivo muito longo')
        return v.strip() if v else None


class LicenseValidateResponse(BaseModel):
    valid: bool
    license_type: Optional[str] = None
    expiration_date: Optional[str] = None
    activated_at: Optional[str] = None
    error: Optional[str] = None


class LicenseGenerateRequest(BaseModel):
    license_type: str  # 1_month, 6_months, 1_year
    user_id: Optional[str] = None
    purchase_id: Optional[str] = None
    
    @validator('license_type')
    def validate_license_type(cls, v):
        allowed_types = ['1_month', '6_months', '1_year']
        if v not in allowed_types:
            raise ValueError(f'Tipo de licença deve ser um de: {", ".join(allowed_types)}')
        return v
    
    @validator('user_id', 'purchase_id')
    def validate_ids(cls, v):
        if v and len(v) > 255:
            raise ValueError('ID muito longo (máximo 255 caracteres)')
        return v.strip() if v else None


class LicenseGenerateResponse(BaseModel):
    success: bool
    license_key: Optional[str] = None
    expiration_date: Optional[str] = None
    error: Optional[str] = None


class PurchaseStatusResponse(BaseModel):
    status: str  # pending, completed, failed, refunded
    license_key: Optional[str] = None
    purchase_date: Optional[str] = None
    error: Optional[str] = None


class GooglePayWebhookRequest(BaseModel):
    purchase_id: str
    transaction_id: str
    status: str  # completed, failed, refunded
    license_type: str
    user_id: Optional[str] = None
    amount: str
    currency: str = "BRL"


class LicenseRevokeRequest(BaseModel):
    license_key: str
    reason: Optional[str] = None


class LicenseRevokeResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None


# ========== ANALYTICS ==========
class LicenseStatsResponse(BaseModel):
    total_licenses: int
    active_licenses: int
    expired_licenses: int
    revoked_licenses: int
    licenses_by_type: Dict[str, int]  # { "1_month": count, "6_months": count, "1_year": count }
    licenses_by_status: Dict[str, int]  # { "active": count, "expired": count, "revoked": count }


class ActivationStatsResponse(BaseModel):
    total_activations: int
    activations_today: int
    activations_this_week: int
    activations_this_month: int
    activations_by_type: Dict[str, int]  # { "1_month": count, "6_months": count, "1_year": count }
    activation_trend: List[Dict[str, Any]]  # [{ "date": "YYYY-MM-DD", "count": int }]


class ValidationStatsResponse(BaseModel):
    total_validations: int
    successful_validations: int
    failed_validations: int
    suspicious_attempts: int
    validations_today: int
    validations_this_week: int
    validation_results: Dict[str, int]  # { "valid": count, "invalid": count, "expired": count, "revoked": count }
    top_error_messages: List[Dict[str, Any]]  # [{ "error": str, "count": int }]


class PurchaseStatsResponse(BaseModel):
    total_purchases: int
    completed_purchases: int
    pending_purchases: int
    failed_purchases: int
    total_revenue: float
    revenue_by_type: Dict[str, float]  # { "1_month": amount, "6_months": amount, "1_year": amount }
    purchases_today: int
    purchases_this_week: int
    purchases_this_month: int


class DashboardResponse(BaseModel):
    license_stats: LicenseStatsResponse
    activation_stats: ActivationStatsResponse
    validation_stats: ValidationStatsResponse
    purchase_stats: PurchaseStatsResponse
    last_updated: datetime


# ========== AUDITORIA E CONFORMIDADE (LGPD/HIPAA) ==========
class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    profile_id: Optional[int] = None
    action_type: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_id: Optional[str] = None
    action_details: Optional[Dict[str, Any]] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    success: bool
    error_message: Optional[str] = None
    created_at: datetime
    log_hash: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogFilter(BaseModel):
    profile_id: Optional[int] = None
    action_type: Optional[str] = None
    resource_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = 100
    offset: int = 0


class AccessReportResponse(BaseModel):
    user_id: int
    period_months: int
    start_date: str
    end_date: str
    total_accesses: int
    by_action: Dict[str, int]
    by_resource: Dict[str, int]
    by_ip: Dict[str, int]
    by_device: Dict[str, int]
    logs: List[Dict[str, Any]]


class DataExportRequest(BaseModel):
    export_type: str = "full"  # full, partial, access_report
    format: str = "json"  # json, csv, pdf
    include_audit_logs: bool = True


class DataExportResponse(BaseModel):
    id: int
    export_type: str
    format: str
    file_path: Optional[str] = None
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DataDeletionRequestCreate(BaseModel):
    request_type: str = "full"  # full, partial, account_only
    reason: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class DataDeletionRequestResponse(BaseModel):
    id: int
    user_id: int
    request_type: str
    reason: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ========== PRIVACIDADE E CONSENTIMENTO ==========
class UserConsentCreate(BaseModel):
    """Schema para criar/atualizar consentimento"""
    consent_type: str  # terms_accepted, data_sharing, emergency_access, analytics, etc.
    profile_id: Optional[int] = None
    granted: bool = True
    consent_version: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    @validator('consent_type')
    def validate_consent_type(cls, v):
        allowed_types = ['terms_accepted', 'data_sharing', 'emergency_access', 'analytics', 'marketing', 'third_party_sharing']
        if v not in allowed_types:
            raise ValueError(f'Tipo de consentimento invalido. Permitidos: {", ".join(allowed_types)}')
        return v


class UserConsentUpdate(BaseModel):
    """Schema para atualizar consentimento"""
    granted: bool
    metadata: Optional[Dict[str, Any]] = None


class UserConsentResponse(BaseModel):
    """Schema de resposta para consentimento"""
    id: int
    user_id: int
    profile_id: Optional[int] = None
    consent_type: str
    consent_version: Optional[str] = None
    granted: bool
    granted_at: datetime
    revoked_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TermsVersionResponse(BaseModel):
    """Schema de resposta para versão dos termos"""
    id: int
    version: str
    terms_type: str  # privacy_policy, terms_of_service
    content: str
    effective_date: datetime
    requires_acceptance: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TermsAcceptRequest(BaseModel):
    """Schema para aceitar termos"""
    version: str
    terms_type: str = "terms_of_service"  # privacy_policy, terms_of_service


class TermsUpdateCheckResponse(BaseModel):
    """Schema de resposta para verificação de atualização de termos"""
    update_required: bool
    current_version: Optional[str] = None
    latest_version: Optional[str] = None
    terms_type: Optional[str] = None


class ChildDataAccessLogResponse(BaseModel):
    """Schema de resposta para log de acesso a dados de criança"""
    id: int
    profile_id: int
    accessed_by_user_id: int
    accessed_by_profile_id: Optional[int] = None
    access_type: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    reason: Optional[str] = None
    parent_consent_id: Optional[int] = None
    accessed_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    class Config:
        from_attributes = True


class ChildConsentCreate(BaseModel):
    """Schema para criar consentimento de responsável para dados de criança"""
    child_profile_id: int
    consent_type: str
    granted: bool = True
    metadata: Optional[Dict[str, Any]] = None


# ========== MODO DE EMERGÊNCIA ==========
class EmergencyProfileBase(BaseModel):
    show_blood_type: bool = True
    show_allergies: bool = True
    show_chronic_conditions: bool = True
    show_medications: bool = True
    show_emergency_contacts: bool = True
    show_health_insurance: bool = True
    show_advance_directives: bool = False
    show_full_name: bool = False
    health_insurance_name: Optional[str] = None
    health_insurance_number: Optional[str] = None
    advance_directives: Optional[str] = None
    qr_code_enabled: bool = True
    share_location_enabled: bool = False
    notify_contacts_on_access: bool = True


class EmergencyProfileResponse(EmergencyProfileBase):
    id: int
    profile_id: int
    emergency_pin_enabled: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmergencyPinSetRequest(BaseModel):
    pin: str  # PIN de 6 dígitos

    @validator('pin')
    def validate_pin(cls, v):
        if len(v) != 6 or not v.isdigit():
            raise ValueError('PIN deve ter exatamente 6 dígitos numéricos')
        return v


class EmergencyPinVerifyRequest(BaseModel):
    pin: str  # PIN de 6 dígitos

    @validator('pin')
    def validate_pin(cls, v):
        if len(v) != 6 or not v.isdigit():
            raise ValueError('PIN deve ter exatamente 6 dígitos numéricos')
        return v


class EmergencyInfoResponse(BaseModel):
    profile_id: int
    name: str
    blood_type: Optional[str] = None
    allergies: Optional[List[str]] = None
    medications: Optional[List[Dict[str, Any]]] = None
    emergency_contacts: Optional[List[Dict[str, Any]]] = None
    health_insurance: Optional[Dict[str, Any]] = None
    advance_directives: Optional[str] = None


class EmergencyAccessLogResponse(BaseModel):
    id: int
    profile_id: int
    accessed_at: datetime
    access_method: str
    ip_address: Optional[str] = None
    device_id: Optional[str] = None
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None
    contacts_notified: bool
    location_shared: bool

    class Config:
        from_attributes = True


class EmergencyQRCodeResponse(BaseModel):
    qr_data: str
    expires_at: datetime


# ========== DASHBOARD FAMILIAR ==========
class FamilyAlert(BaseModel):
    """Schema para alertas do dashboard familiar"""
    type: str  # 'medication' | 'vaccine' | 'exam' | 'appointment'
    id: str
    profile_id: int
    title: str
    description: str
    priority: int  # 0-3 (baixa, média, alta, crítica)
    data: Dict[str, Any]
    timestamp: str


class UpcomingEvent(BaseModel):
    """Schema para eventos próximos (medicação ou consulta)"""
    id: int
    profile_id: int
    type: str  # 'medication' | 'appointment'
    name: str
    time: Optional[str] = None
    date: Optional[str] = None
    minutes_from_now: Optional[int] = None
    days_until: Optional[int] = None
    data: Dict[str, Any]


class DashboardSummary(BaseModel):
    """Resumo do dashboard familiar"""
    total_medications: int
    upcoming_medications: int
    total_appointments: int
    upcoming_appointments: int
    total_exams: int
    pending_exams: int
    total_alerts: int
    critical_alerts: int


class FamilyDashboardResponse(BaseModel):
    """Resposta completa do dashboard familiar"""
    medications: List[Dict[str, Any]]
    appointments: List[Dict[str, Any]]
    exams: List[Dict[str, Any]]
    alerts: List[FamilyAlert]
    summary: DashboardSummary

