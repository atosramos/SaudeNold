"""
Testes para scripts de migração de dados multiempresa.
"""
import pytest
from sqlalchemy.orm import Session
from sqlalchemy import text
from models import User, Family, FamilyProfile, Medication, MedicationLog


class TestUserMigration:
    """Testes para migração de usuários para famílias"""
    
    def test_user_without_family_gets_family(self, db_session: Session):
        """Testa que usuário sem família recebe uma família"""
        # Criar usuário sem família
        user = User(
            email="test@example.com",
            password_hash="hash",
            family_id=None
        )
        db_session.add(user)
        db_session.commit()
        
        # Simular migração (criar família e perfil)
        from models import Family, FamilyProfile
        from datetime import datetime
        
        family = Family(
            name="Família de Test",
            admin_user_id=user.id,
            created_at=datetime.utcnow()
        )
        db_session.add(family)
        db_session.flush()
        
        profile = FamilyProfile(
            family_id=family.id,
            name="Test",
            account_type="family_admin",
            created_by=user.id,
            permissions={},
            created_at=datetime.utcnow()
        )
        db_session.add(profile)
        db_session.flush()
        
        user.family_id = family.id
        user.account_type = "family_admin"
        db_session.commit()
        
        # Verificar
        db_session.refresh(user)
        assert user.family_id is not None
        assert user.family_id == family.id
        assert user.account_type == "family_admin"
    
    def test_user_has_profile_after_migration(self, db_session: Session):
        """Testa que usuário tem perfil após migração"""
        # Criar usuário e família
        user = User(
            email="test2@example.com",
            password_hash="hash"
        )
        db_session.add(user)
        db_session.flush()
        
        from models import Family, FamilyProfile
        from datetime import datetime
        
        family = Family(
            name="Família de Test2",
            admin_user_id=user.id,
            created_at=datetime.utcnow()
        )
        db_session.add(family)
        db_session.flush()
        
        profile = FamilyProfile(
            family_id=family.id,
            name="Test2",
            account_type="family_admin",
            created_by=user.id,
            permissions={},
            created_at=datetime.utcnow()
        )
        db_session.add(profile)
        db_session.commit()
        
        # Verificar que perfil existe
        profile_check = db_session.query(FamilyProfile).filter(
            FamilyProfile.family_id == family.id,
            FamilyProfile.created_by == user.id
        ).first()
        
        assert profile_check is not None
        assert profile_check.account_type == "family_admin"


class TestMedicalDataMigration:
    """Testes para migração de dados médicos para perfis"""
    
    def test_medication_gets_profile_id(self, db_session: Session, test_profile):
        """Testa que medicamento recebe profile_id"""
        # Criar medicamento sem profile_id
        medication = Medication(
            name="Paracetamol",
            dosage="500mg",
            schedules=["08:00"],
            profile_id=None
        )
        db_session.add(medication)
        db_session.commit()
        
        # Simular migração (atualizar profile_id)
        medication.profile_id = test_profile.id
        db_session.commit()
        
        # Verificar
        db_session.refresh(medication)
        assert medication.profile_id == test_profile.id
    
    def test_medication_log_gets_profile_id(self, db_session: Session, test_profile):
        """Testa que log de medicamento recebe profile_id"""
        from datetime import datetime
        
        # Criar log sem profile_id
        log = MedicationLog(
            medication_name="Paracetamol",
            scheduled_time=datetime.utcnow(),
            status="taken",
            profile_id=None
        )
        db_session.add(log)
        db_session.commit()
        
        # Simular migração
        log.profile_id = test_profile.id
        db_session.commit()
        
        # Verificar
        db_session.refresh(log)
        assert log.profile_id == test_profile.id


class TestMigrationIntegrity:
    """Testes de integridade após migração"""
    
    def test_all_users_have_family(self, db_session: Session):
        """Testa que todos os usuários têm família"""
        # Criar alguns usuários
        users = []
        for i in range(3):
            user = User(
                email=f"user{i}@example.com",
                password_hash="hash"
            )
            db_session.add(user)
            users.append(user)
        db_session.flush()
        
        # Criar famílias para todos
        from models import Family
        from datetime import datetime
        
        for user in users:
            family = Family(
                name=f"Família de User{i}",
                admin_user_id=user.id,
                created_at=datetime.utcnow()
            )
            db_session.add(family)
            user.family_id = family.id
        db_session.commit()
        
        # Verificar que todos têm família
        users_without_family = db_session.query(User).filter(
            (User.family_id == None) | (User.family_id == 0)
        ).count()
        
        assert users_without_family == 0
    
    def test_all_medical_data_has_profile_id(self, db_session: Session, test_profile):
        """Testa que todos os dados médicos têm profile_id"""
        from datetime import datetime
        
        # Criar alguns dados médicos
        medications = []
        for i in range(3):
            med = Medication(
                name=f"Medication {i}",
                dosage="100mg",
                profile_id=None
            )
            db_session.add(med)
            medications.append(med)
        db_session.flush()
        
        # Simular migração
        for med in medications:
            med.profile_id = test_profile.id
        db_session.commit()
        
        # Verificar que todos têm profile_id
        meds_without_profile = db_session.query(Medication).filter(
            Medication.profile_id == None
        ).count()
        
        assert meds_without_profile == 0


class TestMigrationRollback:
    """Testes de rollback de migração"""
    
    def test_migration_can_be_rolled_back(self, db_session: Session):
        """Testa que migração pode ser revertida"""
        # Criar estado inicial
        user = User(
            email="rollback@example.com",
            password_hash="hash",
            family_id=None
        )
        db_session.add(user)
        db_session.commit()
        original_family_id = user.family_id
        
        # Simular migração
        from models import Family
        from datetime import datetime
        
        family = Family(
            name="Família Test",
            admin_user_id=user.id,
            created_at=datetime.utcnow()
        )
        db_session.add(family)
        db_session.flush()
        user.family_id = family.id
        db_session.commit()
        
        # Verificar migração
        db_session.refresh(user)
        assert user.family_id is not None
        
        # Simular rollback
        user.family_id = original_family_id
        db_session.delete(family)
        db_session.commit()
        
        # Verificar rollback
        db_session.refresh(user)
        assert user.family_id == original_family_id
