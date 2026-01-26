from pydantic import BaseModel, validator
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


class FamilyDataShareCreate(BaseModel):
    to_profile_id: int
    permissions: Optional[dict] = None


class FamilyDataShareResponse(BaseModel):
    id: int
    family_id: int
    from_profile_id: int
    to_profile_id: int
    permissions: Optional[dict] = None
    created_at: datetime
    revoked_at: Optional[datetime] = None

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
    visit_date: datetime
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

