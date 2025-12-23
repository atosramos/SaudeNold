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

