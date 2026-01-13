from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime


# ========== MEDICAMENTOS ==========
class MedicationBase(BaseModel):
    name: str
    dosage: Optional[str] = None
    schedules: List[str]
    image_base64: Optional[str] = None
    notes: Optional[str] = None
    active: bool = True


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
        # Validação adicional
        min_anystr_length = 1
        max_anystr_length = 255
    
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

