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


class MedicalExam(Base):
    __tablename__ = "medical_exams"

    id = Column(Integer, primary_key=True, index=True)
    exam_date = Column(DateTime(timezone=True))  # Data do exame (extraída ou informada)
    exam_type = Column(String)  # Tipo de exame (ex: "Hemograma", "Glicemia", etc.)
    image_base64 = Column(Text)  # Imagem ou PDF em base64
    file_type = Column(String, default="image")  # "image" ou "pdf"
    raw_ocr_text = Column(Text)  # Texto bruto extraído pelo OCR
    extracted_data = Column(JSON)  # Dados estruturados extraídos (dict com parâmetros)
    processing_status = Column(String, default="pending")  # pending, processing, completed, error
    processing_error = Column(Text)  # Mensagem de erro se houver
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ExamDataPoint(Base):
    __tablename__ = "exam_data_points"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, nullable=False, index=True)  # FK para medical_exams
    parameter_name = Column(String, nullable=False, index=True)  # Nome do parâmetro (ex: "hemoglobina")
    value = Column(String, nullable=False)  # Valor (pode ser número ou texto)
    numeric_value = Column(String)  # Valor numérico extraído (para ordenação)
    unit = Column(String)  # Unidade de medida (ex: "g/dL", "mg/dL")
    reference_range_min = Column(String)  # Valor mínimo de referência
    reference_range_max = Column(String)  # Valor máximo de referência
    exam_date = Column(DateTime(timezone=True), nullable=False, index=True)  # Data do exame (para queries temporais)
    created_at = Column(DateTime(timezone=True), server_default=func.now())















