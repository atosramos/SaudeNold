from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
import schemas

# Criar tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SaudeNold API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ========== MEDICAMENTOS ==========
@app.get("/api/medications")
def get_medications():
    db = next(get_db())
    medications = db.query(models.Medication).all()
    return [schemas.MedicationResponse.model_validate(m).model_dump() for m in medications]


@app.post("/api/medications")
def create_medication(medication: schemas.MedicationCreate):
    db = next(get_db())
    db_medication = models.Medication(**medication.model_dump())
    db.add(db_medication)
    db.commit()
    db.refresh(db_medication)
    return schemas.MedicationResponse.model_validate(db_medication).model_dump()


@app.put("/api/medications/{medication_id}")
def update_medication(medication_id: int, medication: schemas.MedicationCreate):
    db = next(get_db())
    db_medication = db.query(models.Medication).filter(models.Medication.id == medication_id).first()
    if not db_medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    for key, value in medication.model_dump().items():
        setattr(db_medication, key, value)
    
    db.commit()
    db.refresh(db_medication)
    return schemas.MedicationResponse.model_validate(db_medication).model_dump()


@app.delete("/api/medications/{medication_id}")
def delete_medication(medication_id: int):
    db = next(get_db())
    db_medication = db.query(models.Medication).filter(models.Medication.id == medication_id).first()
    if not db_medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    db.delete(db_medication)
    db.commit()
    return {"message": "Medication deleted"}


# ========== MEDICATION LOGS ==========
@app.get("/api/medication-logs")
def get_medication_logs():
    db = next(get_db())
    logs = db.query(models.MedicationLog).all()
    return [schemas.MedicationLogResponse.model_validate(l).model_dump() for l in logs]


@app.post("/api/medication-logs")
def create_medication_log(log: schemas.MedicationLogCreate):
    db = next(get_db())
    db_log = models.MedicationLog(**log.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return schemas.MedicationLogResponse.model_validate(db_log).model_dump()


# ========== CONTATOS DE EMERGÊNCIA ==========
@app.get("/api/emergency-contacts")
def get_emergency_contacts():
    db = next(get_db())
    contacts = db.query(models.EmergencyContact).order_by(models.EmergencyContact.order).all()
    return [schemas.EmergencyContactResponse.model_validate(c).model_dump() for c in contacts]


@app.post("/api/emergency-contacts")
def create_emergency_contact(contact: schemas.EmergencyContactCreate):
    db = next(get_db())
    
    # Verificar limite de 5 contatos
    count = db.query(models.EmergencyContact).count()
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum of 5 emergency contacts allowed")
    
    db_contact = models.EmergencyContact(**contact.model_dump())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return schemas.EmergencyContactResponse.model_validate(db_contact).model_dump()


@app.put("/api/emergency-contacts/{contact_id}")
def update_emergency_contact(contact_id: int, contact: schemas.EmergencyContactCreate):
    db = next(get_db())
    db_contact = db.query(models.EmergencyContact).filter(models.EmergencyContact.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    for key, value in contact.model_dump().items():
        setattr(db_contact, key, value)
    
    db.commit()
    db.refresh(db_contact)
    return schemas.EmergencyContactResponse.model_validate(db_contact).model_dump()


@app.delete("/api/emergency-contacts/{contact_id}")
def delete_emergency_contact(contact_id: int):
    db = next(get_db())
    db_contact = db.query(models.EmergencyContact).filter(models.EmergencyContact.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    db.delete(db_contact)
    db.commit()
    return {"message": "Contact deleted"}


# ========== VISITAS AO MÉDICO ==========
@app.get("/api/doctor-visits")
def get_doctor_visits():
    db = next(get_db())
    visits = db.query(models.DoctorVisit).order_by(models.DoctorVisit.visit_date.desc()).all()
    return [schemas.DoctorVisitResponse.model_validate(v).model_dump() for v in visits]


@app.post("/api/doctor-visits")
def create_doctor_visit(visit: schemas.DoctorVisitCreate):
    db = next(get_db())
    db_visit = models.DoctorVisit(**visit.model_dump())
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return schemas.DoctorVisitResponse.model_validate(db_visit).model_dump()


@app.put("/api/doctor-visits/{visit_id}")
def update_doctor_visit(visit_id: int, visit: schemas.DoctorVisitCreate):
    db = next(get_db())
    db_visit = db.query(models.DoctorVisit).filter(models.DoctorVisit.id == visit_id).first()
    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    for key, value in visit.model_dump().items():
        setattr(db_visit, key, value)
    
    db.commit()
    db.refresh(db_visit)
    return schemas.DoctorVisitResponse.model_validate(db_visit).model_dump()


@app.delete("/api/doctor-visits/{visit_id}")
def delete_doctor_visit(visit_id: int):
    db = next(get_db())
    db_visit = db.query(models.DoctorVisit).filter(models.DoctorVisit.id == visit_id).first()
    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    db.delete(db_visit)
    db.commit()
    return {"message": "Visit deleted"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

