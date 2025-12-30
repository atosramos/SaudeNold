from fastapi import FastAPI, HTTPException, Depends, Security, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
import hashlib
import secrets
from typing import Optional
from database import SessionLocal, engine, Base
import models
import schemas

# Configurar logging de segurança
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
security_logger = logging.getLogger("security")

# Criar tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SaudeNold API", version="1.0.0")

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - Restringir origins permitidas
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:8082,exp://*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["X-Request-ID"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response

# Autenticação simples baseada em API Key
security = HTTPBearer()
API_KEY = os.getenv("API_KEY", secrets.token_urlsafe(32))

def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verifica a API key fornecida"""
    if credentials.credentials != API_KEY:
        security_logger.warning(f"Tentativa de acesso com API key inválida")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def safe_db_commit(db: Session):
    """Helper function para fazer commit seguro com tratamento de exceções"""
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        security_logger.error(f"Database integrity error: {str(e)}")
        raise HTTPException(status_code=400, detail="Database integrity error. Check your data.")
    except SQLAlchemyError as e:
        db.rollback()
        security_logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error occurred")


# Funções de validação e sanitização
def validate_base64_image_size(base64_string: Optional[str], max_size_mb: int = 5) -> bool:
    """Valida o tamanho de uma imagem base64"""
    if not base64_string:
        return True
    
    # Remover prefixo data:image se existir
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    # Calcular tamanho aproximado (base64 é ~33% maior que o original)
    size_bytes = len(base64_string) * 3 / 4
    size_mb = size_bytes / (1024 * 1024)
    
    if size_mb > max_size_mb:
        security_logger.warning(f"Tentativa de upload de imagem muito grande: {size_mb:.2f}MB")
        return False
    return True


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitiza strings removendo caracteres perigosos e limitando tamanho"""
    if not value:
        return value
    # Remover caracteres de controle e limitar tamanho
    sanitized = ''.join(char for char in value if ord(char) >= 32 or char in '\n\r\t')
    # Aplicar limite de tamanho após sanitização
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    return sanitized.strip()


# ========== MEDICAMENTOS ==========
@app.get("/api/medications")
@limiter.limit("100/minute")
def get_medications(request: Request, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/medications de {get_remote_address(request)}")
    db = next(get_db())
    medications = db.query(models.Medication).all()
    return [schemas.MedicationResponse.model_validate(m).model_dump() for m in medications]


@app.post("/api/medications")
@limiter.limit("20/minute")
def create_medication(request: Request, medication: schemas.MedicationCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso POST /api/medications de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if medication.image_base64 and not validate_base64_image_size(medication.image_base64):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    medication.name = sanitize_string(medication.name, 200)
    if medication.dosage:
        medication.dosage = sanitize_string(medication.dosage, 100)
    if medication.notes:
        medication.notes = sanitize_string(medication.notes, 5000)
    
    db = next(get_db())
    try:
        db_medication = models.Medication(**medication.model_dump())
        db.add(db_medication)
        safe_db_commit(db)
        db.refresh(db_medication)
        return schemas.MedicationResponse.model_validate(db_medication).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error creating medication: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/api/medications/{medication_id}")
@limiter.limit("20/minute")
def update_medication(request: Request, medication_id: int, medication: schemas.MedicationCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso PUT /api/medications/{medication_id} de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if medication.image_base64 and not validate_base64_image_size(medication.image_base64):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    medication.name = sanitize_string(medication.name, 200)
    if medication.dosage:
        medication.dosage = sanitize_string(medication.dosage, 100)
    if medication.notes:
        medication.notes = sanitize_string(medication.notes, 5000)
    
    db = next(get_db())
    db_medication = db.query(models.Medication).filter(models.Medication.id == medication_id).first()
    if not db_medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    try:
        for key, value in medication.model_dump().items():
            setattr(db_medication, key, value)
        
        safe_db_commit(db)
        db.refresh(db_medication)
        return schemas.MedicationResponse.model_validate(db_medication).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error updating medication: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/api/medications/{medication_id}")
@limiter.limit("20/minute")
def delete_medication(request: Request, medication_id: int, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso DELETE /api/medications/{medication_id} de {get_remote_address(request)}")
    db = next(get_db())
    db_medication = db.query(models.Medication).filter(models.Medication.id == medication_id).first()
    if not db_medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    try:
        db.delete(db_medication)
        safe_db_commit(db)
        return {"message": "Medication deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error deleting medication: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========== MEDICATION LOGS ==========
@app.get("/api/medication-logs")
@limiter.limit("100/minute")
def get_medication_logs(request: Request, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/medication-logs de {get_remote_address(request)}")
    db = next(get_db())
    logs = db.query(models.MedicationLog).all()
    return [schemas.MedicationLogResponse.model_validate(l).model_dump() for l in logs]


@app.post("/api/medication-logs")
@limiter.limit("30/minute")
def create_medication_log(request: Request, log: schemas.MedicationLogCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso POST /api/medication-logs de {get_remote_address(request)}")
    
    # Sanitizar dados
    log.medication_name = sanitize_string(log.medication_name, 200)
    if log.status not in ["taken", "skipped", "postponed"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be: taken, skipped, or postponed")
    
    db = next(get_db())
    try:
        db_log = models.MedicationLog(**log.model_dump())
        db.add(db_log)
        safe_db_commit(db)
        db.refresh(db_log)
        return schemas.MedicationLogResponse.model_validate(db_log).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error creating medication log: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========== CONTATOS DE EMERGÊNCIA ==========
@app.get("/api/emergency-contacts")
@limiter.limit("100/minute")
def get_emergency_contacts(request: Request, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/emergency-contacts de {get_remote_address(request)}")
    db = next(get_db())
    contacts = db.query(models.EmergencyContact).order_by(models.EmergencyContact.order).all()
    return [schemas.EmergencyContactResponse.model_validate(c).model_dump() for c in contacts]


@app.post("/api/emergency-contacts")
@limiter.limit("20/minute")
def create_emergency_contact(request: Request, contact: schemas.EmergencyContactCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso POST /api/emergency-contacts de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if contact.photo_base64 and not validate_base64_image_size(contact.photo_base64):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    contact.name = sanitize_string(contact.name, 200)
    contact.phone = sanitize_string(contact.phone, 20)
    if contact.relation:
        contact.relation = sanitize_string(contact.relation, 100)
    
    db = next(get_db())
    
    # Verificar limite de 5 contatos
    count = db.query(models.EmergencyContact).count()
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum of 5 emergency contacts allowed")
    
    try:
        db_contact = models.EmergencyContact(**contact.model_dump())
        db.add(db_contact)
        safe_db_commit(db)
        db.refresh(db_contact)
        return schemas.EmergencyContactResponse.model_validate(db_contact).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error creating emergency contact: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/api/emergency-contacts/{contact_id}")
@limiter.limit("20/minute")
def update_emergency_contact(request: Request, contact_id: int, contact: schemas.EmergencyContactCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso PUT /api/emergency-contacts/{contact_id} de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if contact.photo_base64 and not validate_base64_image_size(contact.photo_base64):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    contact.name = sanitize_string(contact.name, 200)
    contact.phone = sanitize_string(contact.phone, 20)
    if contact.relation:
        contact.relation = sanitize_string(contact.relation, 100)
    
    db = next(get_db())
    db_contact = db.query(models.EmergencyContact).filter(models.EmergencyContact.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    try:
        for key, value in contact.model_dump().items():
            setattr(db_contact, key, value)
        
        safe_db_commit(db)
        db.refresh(db_contact)
        return schemas.EmergencyContactResponse.model_validate(db_contact).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error updating emergency contact: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/api/emergency-contacts/{contact_id}")
@limiter.limit("20/minute")
def delete_emergency_contact(request: Request, contact_id: int, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso DELETE /api/emergency-contacts/{contact_id} de {get_remote_address(request)}")
    db = next(get_db())
    db_contact = db.query(models.EmergencyContact).filter(models.EmergencyContact.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    try:
        db.delete(db_contact)
        safe_db_commit(db)
        return {"message": "Contact deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error deleting emergency contact: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========== VISITAS AO MÉDICO ==========
@app.get("/api/doctor-visits")
@limiter.limit("100/minute")
def get_doctor_visits(request: Request, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/doctor-visits de {get_remote_address(request)}")
    db = next(get_db())
    visits = db.query(models.DoctorVisit).order_by(models.DoctorVisit.visit_date.desc()).all()
    return [schemas.DoctorVisitResponse.model_validate(v).model_dump() for v in visits]


@app.post("/api/doctor-visits")
@limiter.limit("20/minute")
def create_doctor_visit(request: Request, visit: schemas.DoctorVisitCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso POST /api/doctor-visits de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if visit.prescription_image and not validate_base64_image_size(visit.prescription_image):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    visit.doctor_name = sanitize_string(visit.doctor_name, 200)
    visit.specialty = sanitize_string(visit.specialty, 200)
    if visit.notes:
        visit.notes = sanitize_string(visit.notes, 5000)
    
    db = next(get_db())
    try:
        db_visit = models.DoctorVisit(**visit.model_dump())
        db.add(db_visit)
        safe_db_commit(db)
        db.refresh(db_visit)
        return schemas.DoctorVisitResponse.model_validate(db_visit).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error creating doctor visit: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/api/doctor-visits/{visit_id}")
@limiter.limit("20/minute")
def update_doctor_visit(request: Request, visit_id: int, visit: schemas.DoctorVisitCreate, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso PUT /api/doctor-visits/{visit_id} de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if visit.prescription_image and not validate_base64_image_size(visit.prescription_image):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (5MB)")
    
    # Sanitizar dados
    visit.doctor_name = sanitize_string(visit.doctor_name, 200)
    visit.specialty = sanitize_string(visit.specialty, 200)
    if visit.notes:
        visit.notes = sanitize_string(visit.notes, 5000)
    
    db = next(get_db())
    db_visit = db.query(models.DoctorVisit).filter(models.DoctorVisit.id == visit_id).first()
    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    try:
        for key, value in visit.model_dump().items():
            setattr(db_visit, key, value)
        
        safe_db_commit(db)
        db.refresh(db_visit)
        return schemas.DoctorVisitResponse.model_validate(db_visit).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error updating doctor visit: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/api/doctor-visits/{visit_id}")
@limiter.limit("20/minute")
def delete_doctor_visit(request: Request, visit_id: int, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso DELETE /api/doctor-visits/{visit_id} de {get_remote_address(request)}")
    db = next(get_db())
    db_visit = db.query(models.DoctorVisit).filter(models.DoctorVisit.id == visit_id).first()
    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    try:
        db.delete(db_visit)
        safe_db_commit(db)
        return {"message": "Visit deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error deleting doctor visit: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/health")
def health_check():
    return {"status": "ok"}

