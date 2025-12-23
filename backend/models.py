from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Text
from sqlalchemy.sql import func
from database import Base


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dosage = Column(String)
    schedules = Column(JSON)  # Array de strings com horários
    image_base64 = Column(Text)
    notes = Column(Text)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id = Column(Integer, primary_key=True, index=True)
    medication_id = Column(Integer)
    medication_name = Column(String, nullable=False)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    taken_at = Column(DateTime(timezone=True))
    status = Column(String, nullable=False)  # taken, skipped, postponed
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    photo_base64 = Column(Text)
    relation = Column(String)
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class DoctorVisit(Base):
    __tablename__ = "doctor_visits"

    id = Column(Integer, primary_key=True, index=True)
    doctor_name = Column(String, nullable=False)
    specialty = Column(String, nullable=False)
    visit_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text)
    prescription_image = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())





