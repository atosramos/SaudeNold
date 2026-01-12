from pydantic import BaseModel
from typing import List, Optional
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

