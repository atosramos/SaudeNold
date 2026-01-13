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















