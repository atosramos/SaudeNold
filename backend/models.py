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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True))


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(String(64), unique=True, nullable=False, index=True)
    token_hash = Column(String(128), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    device_id = Column(String(255), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revoked = Column(Boolean, default=False, index=True)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    device_id = Column(String(255), nullable=False, index=True)
    device_name = Column(String(255))
    device_model = Column(String(255))
    os_name = Column(String(100))
    os_version = Column(String(100))
    app_version = Column(String(50))
    push_token = Column(String(255))
    location_lat = Column(Float)
    location_lon = Column(Float)
    location_accuracy_km = Column(Float)
    user_agent = Column(String(500))
    ip_address = Column(String(45))
    trusted = Column(Boolean, default=False, index=True)
    trust_expires_at = Column(DateTime(timezone=True))
    blocked = Column(Boolean, default=False, index=True)
    blocked_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    revoked_at = Column(DateTime(timezone=True))


class UserLoginEvent(Base):
    __tablename__ = "user_login_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    device_id = Column(String(255), index=True)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class UserLoginAttempt(Base):
    __tablename__ = "user_login_attempts"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    ip_address = Column(String(45), index=True)
    user_agent = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class UserDownloadEvent(Base):
    __tablename__ = "user_download_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id = Column(String(100))
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, index=True)
    medication_id = Column(Integer)
    medication_name = Column(String, nullable=False)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    taken_at = Column(DateTime(timezone=True))
    status = Column(String, nullable=False)  # taken, skipped, postponed
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    photo_base64 = Column(Text)
    relation = Column(String)
    order = Column(Integer, default=0)
    encrypted_data = Column(JSON)  # Dados criptografados (zero-knowledge)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class DoctorVisit(Base):
    __tablename__ = "doctor_visits"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, index=True)
    doctor_name = Column(String, nullable=False)
    specialty = Column(String, nullable=False)
    visit_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text)
    prescription_image = Column(Text)
    encrypted_data = Column(JSON)  # Dados criptografados (zero-knowledge)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MedicalExam(Base):
    __tablename__ = "medical_exams"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, index=True)
    exam_date = Column(DateTime(timezone=True))  # Data do exame (extraída ou informada)
    exam_type = Column(String)  # Tipo de exame (ex: "Hemograma", "Glicemia", etc.)
    image_base64 = Column(Text)  # Imagem ou PDF em base64
    file_type = Column(String, default="image")  # "image" ou "pdf"
    raw_ocr_text = Column(Text)  # Texto bruto extraído pelo OCR
    extracted_data = Column(JSON)  # Dados estruturados extraídos (dict com parâmetros)
    processing_status = Column(String, default="pending")  # pending, processing, completed, error
    processing_error = Column(Text)  # Mensagem de erro se houver
    encrypted_data = Column(JSON)  # Dados criptografados (zero-knowledge)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ExamDataPoint(Base):
    __tablename__ = "exam_data_points"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, nullable=False, index=True)  # FK para medical_exams
    profile_id = Column(Integer, index=True)
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True))















