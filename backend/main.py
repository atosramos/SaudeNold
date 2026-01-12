from fastapi import FastAPI, HTTPException, Depends, Security, status, Request, BackgroundTasks
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
from ocr_service import perform_ocr
from data_extraction import extract_data_from_ocr_text
from license_generator import generate_license_key, validate_license_key, LICENSE_DURATIONS
from datetime import datetime as dt, timedelta

# Configurar logging de segurança
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
security_logger = logging.getLogger("security")

# Criar tabelas (apenas se não estiver em modo de teste)
# Em testes, as tabelas são criadas pelo conftest.py
if not os.getenv("TESTING"):
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


# ========== EXAMES MÉDICOS ==========
def process_exam_ocr(exam_id: int):
    """Função para processar OCR em background"""
    db = SessionLocal()
    try:
        exam = db.query(models.MedicalExam).filter(models.MedicalExam.id == exam_id).first()
        if not exam:
            return
        
        # Atualizar status para processing
        exam.processing_status = "processing"
        db.commit()
        
        try:
            # Realizar OCR (suporta imagem e PDF)
            file_type = exam.file_type or 'image'
            ocr_text = perform_ocr(exam.image_base64, file_type=file_type)
            exam.raw_ocr_text = ocr_text[:50000]  # Limitar tamanho do texto
            
            # Extrair dados
            extracted_data = extract_data_from_ocr_text(ocr_text)
            exam.extracted_data = extracted_data
            
            # Se encontrou data, usar ela
            if extracted_data.get('exam_date'):
                try:
                    exam.exam_date = dt.fromisoformat(extracted_data['exam_date'])
                except:
                    pass
            
            # Se encontrou tipo, usar ele
            if extracted_data.get('exam_type'):
                exam.exam_type = extracted_data['exam_type']
            
            # Salvar data points no banco
            exam_date = exam.exam_date or exam.created_at
            for param in extracted_data.get('parameters', []):
                data_point = models.ExamDataPoint(
                    exam_id=exam.id,
                    parameter_name=param['name'],
                    value=param['value'],
                    numeric_value=param.get('numeric_value'),
                    unit=param.get('unit'),
                    reference_range_min=param.get('reference_range_min'),
                    reference_range_max=param.get('reference_range_max'),
                    exam_date=exam_date
                )
                db.add(data_point)
            
            exam.processing_status = "completed"
            db.commit()
        except Exception as e:
            exam.processing_status = "error"
            exam.processing_error = str(e)[:500]  # Limitar tamanho do erro
            db.commit()
            security_logger.error(f"Erro ao processar OCR do exame {exam_id}: {str(e)}")
    finally:
        db.close()


@app.post("/api/medical-exams")
@limiter.limit("10/minute")
def create_medical_exam(
    request: Request,
    background_tasks: BackgroundTasks,
    exam: schemas.MedicalExamCreate,
    api_key: str = Depends(verify_api_key)
):
    security_logger.info(f"Acesso POST /api/medical-exams de {get_remote_address(request)}")
    
    # Validar tamanho da imagem
    if not validate_base64_image_size(exam.image_base64, max_size_mb=10):
        raise HTTPException(status_code=400, detail="Image size exceeds maximum allowed (10MB)")
    
    db = next(get_db())
    try:
        # Criar exame com status pending
        db_exam = models.MedicalExam(
            exam_date=exam.exam_date,
            exam_type=exam.exam_type,
            image_base64=exam.image_base64,
            file_type=exam.file_type or 'image',
            processing_status="pending"
        )
        db.add(db_exam)
        safe_db_commit(db)
        db.refresh(db_exam)
        
        # Adicionar tarefa de processamento em background
        background_tasks.add_task(process_exam_ocr, db_exam.id)
        
        return schemas.MedicalExamResponse.model_validate(db_exam).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error creating medical exam: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/medical-exams")
@limiter.limit("100/minute")
def get_medical_exams(request: Request, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/medical-exams de {get_remote_address(request)}")
    db = next(get_db())
    exams = db.query(models.MedicalExam).order_by(models.MedicalExam.created_at.desc()).all()
    
    # Não retornar image_base64 na lista (muito grande)
    result = []
    for exam in exams:
        exam_dict = schemas.MedicalExamResponse.model_validate(exam).model_dump()
        exam_dict['image_base64'] = None  # Remover imagem para economizar banda
        result.append(exam_dict)
    
    return result


@app.get("/api/medical-exams/{exam_id}")
@limiter.limit("100/minute")
def get_medical_exam(request: Request, exam_id: int, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso GET /api/medical-exams/{exam_id} de {get_remote_address(request)}")
    db = next(get_db())
    exam = db.query(models.MedicalExam).filter(models.MedicalExam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    return schemas.MedicalExamResponse.model_validate(exam).model_dump()


@app.put("/api/medical-exams/{exam_id}")
@limiter.limit("20/minute")
def update_medical_exam(
    request: Request,
    exam_id: int,
    exam_update: schemas.MedicalExamUpdate,
    api_key: str = Depends(verify_api_key)
):
    security_logger.info(f"Acesso PUT /api/medical-exams/{exam_id} de {get_remote_address(request)}")
    
    db = next(get_db())
    db_exam = db.query(models.MedicalExam).filter(models.MedicalExam.id == exam_id).first()
    if not db_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    try:
        if exam_update.exam_date:
            db_exam.exam_date = exam_update.exam_date
        if exam_update.exam_type:
            db_exam.exam_type = sanitize_string(exam_update.exam_type, 200)
        
        safe_db_commit(db)
        db.refresh(db_exam)
        return schemas.MedicalExamResponse.model_validate(db_exam).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error updating medical exam: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/api/medical-exams/{exam_id}")
@limiter.limit("20/minute")
def delete_medical_exam(request: Request, exam_id: int, api_key: str = Depends(verify_api_key)):
    security_logger.info(f"Acesso DELETE /api/medical-exams/{exam_id} de {get_remote_address(request)}")
    db = next(get_db())
    db_exam = db.query(models.MedicalExam).filter(models.MedicalExam.id == exam_id).first()
    if not db_exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    try:
        # Deletar data points associados
        db.query(models.ExamDataPoint).filter(models.ExamDataPoint.exam_id == exam_id).delete()
        db.delete(db_exam)
        safe_db_commit(db)
        return {"message": "Exam deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(f"Error deleting medical exam: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/medical-exams/{exam_id}/timeline/{parameter_name}")
@limiter.limit("100/minute")
def get_parameter_timeline(
    request: Request,
    exam_id: int,
    parameter_name: str,
    api_key: str = Depends(verify_api_key)
):
    """Retorna dados temporais de um parâmetro específico para gráfico"""
    security_logger.info(f"Acesso GET /api/medical-exams/{exam_id}/timeline/{parameter_name} de {get_remote_address(request)}")
    
    db = next(get_db())
    
    # Buscar todos os data points deste parâmetro (não apenas do exame atual)
    data_points = db.query(models.ExamDataPoint).filter(
        models.ExamDataPoint.parameter_name.ilike(f"%{parameter_name}%")
    ).order_by(models.ExamDataPoint.exam_date.asc()).all()
    
    if not data_points:
        raise HTTPException(status_code=404, detail="Parameter data not found")
    
    # Preparar dados para gráfico
    timeline_data = {
        "parameter_name": parameter_name,
        "unit": data_points[0].unit if data_points else None,
        "reference_range_min": data_points[0].reference_range_min if data_points else None,
        "reference_range_max": data_points[0].reference_range_max if data_points else None,
        "data_points": [
            {
                "exam_date": point.exam_date.isoformat(),
                "value": point.value,
                "numeric_value": point.numeric_value,
                "exam_id": point.exam_id
            }
            for point in data_points
        ]
    }
    
    return timeline_data


# ========== LICENÇAS PRO ==========

@app.post("/api/validate-license", response_model=schemas.LicenseValidateResponse)
@limiter.limit("10/minute")
def validate_license(
    request: Request,
    license_data: schemas.LicenseValidateRequest,
    api_key: str = Depends(verify_api_key)
):
    """Valida uma chave de licença PRO"""
    security_logger.info(f"Validação de licença solicitada de {get_remote_address(request)}")
    
    db = next(get_db())
    
    try:
        # Validar chave usando o gerador
        validation_result = validate_license_key(license_data.key)
        
        if not validation_result.get('valid'):
            return schemas.LicenseValidateResponse(
                valid=False,
                error=validation_result.get('error', 'Chave inválida')
            )
        
        # Verificar se a chave já foi usada
        existing_license = db.query(models.License).filter(
            models.License.license_key == license_data.key.upper().replace(' ', '').replace('-', '')
        ).first()
        
        if existing_license:
            # Verificar se ainda está ativa
            expiration = existing_license.expiration_date
            if expiration < dt.now():
                return schemas.LicenseValidateResponse(
                    valid=False,
                    error='Licença expirada'
                )
            
            return schemas.LicenseValidateResponse(
                valid=True,
                license_type=existing_license.license_type,
                expiration_date=existing_license.expiration_date.isoformat(),
                activated_at=existing_license.activated_at.isoformat()
            )
        
        # Chave válida mas ainda não registrada
        return schemas.LicenseValidateResponse(
            valid=True,
            license_type=validation_result['license_type'],
            expiration_date=validation_result['expiration_date'],
            activated_at=validation_result['activated_at']
        )
        
    except Exception as e:
        security_logger.error(f"Erro ao validar licença: {str(e)}")
        return schemas.LicenseValidateResponse(
            valid=False,
            error=f'Erro ao validar licença: {str(e)}'
        )


@app.post("/api/generate-license", response_model=schemas.LicenseGenerateResponse)
@limiter.limit("5/minute")
def generate_license(
    request: Request,
    license_data: schemas.LicenseGenerateRequest,
    api_key: str = Depends(verify_api_key)
):
    """Gera uma nova chave de licença PRO (apenas para administradores)"""
    security_logger.info(f"Geração de licença solicitada de {get_remote_address(request)}")
    
    db = next(get_db())
    
    try:
        # Gerar chave
        license_key = generate_license_key(
            license_type=license_data.license_type,
            user_id=license_data.user_id
        )
        
        # Calcular data de expiração
        duration = LICENSE_DURATIONS.get(license_data.license_type, timedelta(days=30))
        expiration_date = dt.now() + duration
        
        # Salvar no banco
        new_license = models.License(
            license_key=license_key,
            license_type=license_data.license_type,
            user_id=license_data.user_id,
            purchase_id=license_data.purchase_id,
            activated_at=dt.now(),
            expiration_date=expiration_date,
            is_active=True
        )
        
        db.add(new_license)
        safe_db_commit(db)
        
        return schemas.LicenseGenerateResponse(
            success=True,
            license_key=license_key,
            expiration_date=expiration_date.isoformat()
        )
        
    except Exception as e:
        security_logger.error(f"Erro ao gerar licença: {str(e)}")
        return schemas.LicenseGenerateResponse(
            success=False,
            error=f'Erro ao gerar licença: {str(e)}'
        )


@app.get("/api/purchase-status/{purchase_id}", response_model=schemas.PurchaseStatusResponse)
@limiter.limit("20/minute")
def get_purchase_status(
    request: Request,
    purchase_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Verifica o status de uma compra"""
    security_logger.info(f"Status de compra {purchase_id} solicitado de {get_remote_address(request)}")
    
    db = next(get_db())
    
    purchase = db.query(models.Purchase).filter(
        models.Purchase.purchase_id == purchase_id
    ).first()
    
    if not purchase:
        return schemas.PurchaseStatusResponse(
            status="not_found",
            error="Compra não encontrada"
        )
    
    return schemas.PurchaseStatusResponse(
        status=purchase.status,
        license_key=purchase.license_key,
        purchase_date=purchase.created_at.isoformat() if purchase.created_at else None
    )


@app.post("/api/webhook/google-pay")
@limiter.limit("100/minute")
async def google_pay_webhook(
    request: Request,
    webhook_data: schemas.GooglePayWebhookRequest
):
    """Webhook para receber confirmações do Google Pay"""
    security_logger.info(f"Webhook Google Pay recebido: {webhook_data.purchase_id}")
    
    db = next(get_db())
    
    try:
        # Verificar se a compra já existe
        existing_purchase = db.query(models.Purchase).filter(
            models.Purchase.purchase_id == webhook_data.purchase_id
        ).first()
        
        if existing_purchase:
            # Atualizar status
            existing_purchase.status = webhook_data.status
            existing_purchase.google_pay_transaction_id = webhook_data.transaction_id
            existing_purchase.updated_at = dt.now()
            
            # Se completada e ainda não tem licença, gerar
            if webhook_data.status == 'completed' and not existing_purchase.license_key:
                license_key = generate_license_key(
                    license_type=webhook_data.license_type,
                    user_id=webhook_data.user_id
                )
                
                duration = LICENSE_DURATIONS.get(webhook_data.license_type, timedelta(days=30))
                expiration_date = dt.now() + duration
                
                # Criar licença
                new_license = models.License(
                    license_key=license_key,
                    license_type=webhook_data.license_type,
                    user_id=webhook_data.user_id,
                    purchase_id=webhook_data.purchase_id,
                    activated_at=dt.now(),
                    expiration_date=expiration_date,
                    is_active=True
                )
                
                db.add(new_license)
                existing_purchase.license_key = license_key
        else:
            # Criar nova compra
            new_purchase = models.Purchase(
                purchase_id=webhook_data.purchase_id,
                user_id=webhook_data.user_id,
                license_type=webhook_data.license_type,
                amount=webhook_data.amount,
                currency=webhook_data.currency,
                status=webhook_data.status,
                google_pay_transaction_id=webhook_data.transaction_id
            )
            
            db.add(new_purchase)
            
            # Se completada, gerar licença imediatamente
            if webhook_data.status == 'completed':
                license_key = generate_license_key(
                    license_type=webhook_data.license_type,
                    user_id=webhook_data.user_id
                )
                
                duration = LICENSE_DURATIONS.get(webhook_data.license_type, timedelta(days=30))
                expiration_date = dt.now() + duration
                
                new_license = models.License(
                    license_key=license_key,
                    license_type=webhook_data.license_type,
                    user_id=webhook_data.user_id,
                    purchase_id=webhook_data.purchase_id,
                    activated_at=dt.now(),
                    expiration_date=expiration_date,
                    is_active=True
                )
                
                db.add(new_license)
                new_purchase.license_key = license_key
        
        safe_db_commit(db)
        
        return {"status": "ok", "message": "Webhook processado com sucesso"}
        
    except Exception as e:
        security_logger.error(f"Erro ao processar webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar webhook: {str(e)}")


@app.get("/health")
def health_check():
    return {"status": "ok"}

