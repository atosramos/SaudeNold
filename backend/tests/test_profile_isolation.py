"""
Testes CRÍTICOS de isolamento de dados entre perfis.
Garante que não há vazamento de dados entre perfis ou famílias.
"""
import pytest
from fastapi import status
from datetime import datetime, timezone
from models import User, Family, FamilyProfile, Medication, MedicationLog, EmergencyContact, DoctorVisit, MedicalExam


class TestProfileIsolation:
    """Testes de isolamento entre perfis"""
    
    def test_profile_a_cannot_access_profile_b_data_same_family(self, client, api_key, csrf_token, db_session):
        """CRÍTICO: Perfil A não acessa dados do perfil B (mesma família)"""
        # Criar usuário e família
        user = User(
            email="user@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        family = Family(
            name="Família Teste",
            admin_user_id=user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        user.family_id = family.id
        db_session.commit()
        
        # Criar dois perfis na mesma família
        profile_a = FamilyProfile(
            family_id=family.id,
            name="Perfil A",
            account_type="adult_member",
            created_by=user.id
        )
        profile_b = FamilyProfile(
            family_id=family.id,
            name="Perfil B",
            account_type="adult_member",
            created_by=user.id
        )
        db_session.add(profile_a)
        db_session.add(profile_b)
        db_session.commit()
        db_session.refresh(profile_a)
        db_session.refresh(profile_b)
        
        # Criar medicamento para perfil B
        medication_b = Medication(
            profile_id=profile_b.id,
            name="Medicamento do Perfil B",
            dosage="100mg",
            schedules=["08:00"]
        )
        db_session.add(medication_b)
        db_session.commit()
        db_session.refresh(medication_b)
        
        # Tentar acessar com perfil A - NÃO DEVE ENCONTRAR
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(profile_a.id)
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        medications = response.json()
        # Perfil A não deve ver medicamento do perfil B
        assert len(medications) == 0 or all(m.get("id") != medication_b.id for m in medications)
    
    def test_profile_a_cannot_access_profile_b_data_different_families(self, client, api_key, csrf_token, db_session):
        """CRÍTICO: Perfil A não acessa dados do perfil B (famílias diferentes)"""
        # Criar dois usuários e duas famílias
        user1 = User(
            email="user1@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        user2 = User(
            email="user2@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(user1)
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user1)
        db_session.refresh(user2)
        
        family1 = Family(name="Família 1", admin_user_id=user1.id)
        family2 = Family(name="Família 2", admin_user_id=user2.id)
        db_session.add(family1)
        db_session.add(family2)
        db_session.commit()
        db_session.refresh(family1)
        db_session.refresh(family2)
        
        user1.family_id = family1.id
        user2.family_id = family2.id
        db_session.commit()
        
        profile_a = FamilyProfile(
            family_id=family1.id,
            name="Perfil A",
            account_type="family_admin",
            created_by=user1.id
        )
        profile_b = FamilyProfile(
            family_id=family2.id,
            name="Perfil B",
            account_type="family_admin",
            created_by=user2.id
        )
        db_session.add(profile_a)
        db_session.add(profile_b)
        db_session.commit()
        db_session.refresh(profile_a)
        db_session.refresh(profile_b)
        
        # Criar medicamento para perfil B (família 2)
        medication_b = Medication(
            profile_id=profile_b.id,
            name="Medicamento Família 2",
            dosage="200mg",
            schedules=["12:00"]
        )
        db_session.add(medication_b)
        db_session.commit()
        db_session.refresh(medication_b)
        
        # Tentar acessar com perfil A (família 1) - DEVE FALHAR
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(profile_a.id)
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        medications = response.json()
        # Perfil A não deve ver medicamento do perfil B (família diferente)
        assert len(medications) == 0 or all(m.get("id") != medication_b.id for m in medications)
    
    def test_profile_id_required_in_queries(self, client, api_key, db_session, test_profile):
        """CRÍTICO: Validação que profile_id é obrigatório em todas as queries"""
        # Criar medicamento
        medication = Medication(
            profile_id=test_profile.id,
            name="Test Medication",
            dosage="100mg",
            schedules=["08:00"]
        )
        db_session.add(medication)
        db_session.commit()
        db_session.refresh(medication)
        
        # Tentar acessar SEM X-Profile-Id - DEVE FALHAR ou retornar vazio
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}"
                # SEM X-Profile-Id
            }
        )
        
        # Deve retornar vazio ou erro, não os dados
        if response.status_code == status.HTTP_200_OK:
            medications = response.json()
            assert len(medications) == 0  # Não deve retornar dados sem profile_id
        else:
            # Ou deve retornar erro
            assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]


class TestFamilyIsolation:
    """Testes de isolamento entre famílias"""
    
    def test_family_a_cannot_access_family_b_data(self, client, api_key, db_session):
        """CRÍTICO: Família A não acessa dados da família B"""
        # Criar duas famílias
        user1 = User(
            email="family1@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        user2 = User(
            email="family2@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(user1)
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user1)
        db_session.refresh(user2)
        
        family1 = Family(name="Família 1", admin_user_id=user1.id)
        family2 = Family(name="Família 2", admin_user_id=user2.id)
        db_session.add(family1)
        db_session.add(family2)
        db_session.commit()
        db_session.refresh(family1)
        db_session.refresh(family2)
        
        user1.family_id = family1.id
        user2.family_id = family2.id
        db_session.commit()
        
        profile1 = FamilyProfile(
            family_id=family1.id,
            name="Perfil Família 1",
            account_type="family_admin",
            created_by=user1.id
        )
        profile2 = FamilyProfile(
            family_id=family2.id,
            name="Perfil Família 2",
            account_type="family_admin",
            created_by=user2.id
        )
        db_session.add(profile1)
        db_session.add(profile2)
        db_session.commit()
        db_session.refresh(profile1)
        db_session.refresh(profile2)
        
        # Criar dados para família 2
        medication2 = Medication(
            profile_id=profile2.id,
            name="Medicamento Família 2",
            dosage="300mg",
            schedules=["10:00"]
        )
        db_session.add(medication2)
        db_session.commit()
        db_session.refresh(medication2)
        
        # Tentar acessar dados da família 2 usando perfil da família 1
        # Isso deve ser bloqueado pelo middleware
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(profile1.id)  # Perfil da família 1
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        medications = response.json()
        # Família 1 não deve ver dados da família 2
        assert len(medications) == 0 or all(m.get("id") != medication2.id for m in medications)
    
    def test_family_id_verified(self, client, api_key, db_session):
        """CRÍTICO: Validação que family_id é verificado"""
        # Criar duas famílias
        user1 = User(
            email="user1@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        user2 = User(
            email="user2@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(user1)
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user1)
        db_session.refresh(user2)
        
        family1 = Family(name="Família 1", admin_user_id=user1.id)
        family2 = Family(name="Família 2", admin_user_id=user2.id)
        db_session.add(family1)
        db_session.add(family2)
        db_session.commit()
        db_session.refresh(family1)
        db_session.refresh(family2)
        
        user1.family_id = family1.id
        user2.family_id = family2.id
        db_session.commit()
        
        profile1 = FamilyProfile(
            family_id=family1.id,
            name="Perfil 1",
            account_type="family_admin",
            created_by=user1.id
        )
        profile2 = FamilyProfile(
            family_id=family2.id,
            name="Perfil 2",
            account_type="family_admin",
            created_by=user2.id
        )
        db_session.add(profile1)
        db_session.add(profile2)
        db_session.commit()
        db_session.refresh(profile1)
        db_session.refresh(profile2)
        
        # Tentar acessar perfil de outra família deve falhar
        # O middleware deve verificar que o perfil pertence à família do usuário
        response = client.get(
            "/api/family/profiles",
            headers={
                "Authorization": f"Bearer {api_key}"
            }
        )
        
        # Deve retornar apenas perfis da família do usuário autenticado
        assert response.status_code == status.HTTP_200_OK
        profiles = response.json()
        # Verificar que não há perfis de outra família
        for profile in profiles:
            assert profile.get("family_id") == family1.id  # Apenas família 1


class TestProfileMiddleware:
    """Testes do middleware de perfil"""
    
    def test_middleware_blocks_access_without_profile_id(self, client, api_key, db_session, test_profile):
        """CRÍTICO: Middleware bloqueia acesso sem X-Profile-Id"""
        # Criar medicamento
        medication = Medication(
            profile_id=test_profile.id,
            name="Test Medication",
            dosage="100mg",
            schedules=["08:00"]
        )
        db_session.add(medication)
        db_session.commit()
        
        # Tentar acessar sem X-Profile-Id
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}"
                # SEM X-Profile-Id
            }
        )
        
        # Deve retornar vazio ou erro
        if response.status_code == status.HTTP_200_OK:
            medications = response.json()
            assert len(medications) == 0  # Não deve retornar dados
        else:
            assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]
    
    def test_middleware_blocks_access_to_other_family_profile(self, client, api_key, db_session):
        """CRÍTICO: Middleware bloqueia acesso a perfil de outra família"""
        # Criar duas famílias
        user1 = User(
            email="user1@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        user2 = User(
            email="user2@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(user1)
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user1)
        db_session.refresh(user2)
        
        family1 = Family(name="Família 1", admin_user_id=user1.id)
        family2 = Family(name="Família 2", admin_user_id=user2.id)
        db_session.add(family1)
        db_session.add(family2)
        db_session.commit()
        db_session.refresh(family1)
        db_session.refresh(family2)
        
        user1.family_id = family1.id
        user2.family_id = family2.id
        db_session.commit()
        
        profile1 = FamilyProfile(
            family_id=family1.id,
            name="Perfil 1",
            account_type="family_admin",
            created_by=user1.id
        )
        profile2 = FamilyProfile(
            family_id=family2.id,
            name="Perfil 2",
            account_type="family_admin",
            created_by=user2.id
        )
        db_session.add(profile1)
        db_session.add(profile2)
        db_session.commit()
        db_session.refresh(profile1)
        db_session.refresh(profile2)
        
        # Tentar acessar perfil 2 usando autenticação do usuário 1
        # Isso deve ser bloqueado
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(profile2.id)  # Perfil de outra família
            }
        )
        
        # Deve retornar vazio ou erro
        if response.status_code == status.HTTP_200_OK:
            medications = response.json()
            assert len(medications) == 0  # Não deve retornar dados
        else:
            assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST]
    
    def test_middleware_allows_access_to_own_profile(self, client, api_key, csrf_token, db_session, test_profile):
        """CRÍTICO: Middleware permite acesso ao próprio perfil"""
        # Criar medicamento para o perfil
        medication = Medication(
            profile_id=test_profile.id,
            name="My Medication",
            dosage="100mg",
            schedules=["08:00"]
        )
        db_session.add(medication)
        db_session.commit()
        db_session.refresh(medication)
        
        # Acessar com o próprio perfil
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(test_profile.id)
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        medications = response.json()
        # Deve encontrar o medicamento
        assert len(medications) > 0
        assert any(m.get("id") == medication.id for m in medications)


class TestAutomaticFilters:
    """Testes de filtros automáticos por profile_id"""
    
    def test_data_filtered_by_profile_id_automatically(self, client, api_key, csrf_token, db_session, test_profile):
        """CRÍTICO: Dados são filtrados por profile_id automaticamente"""
        # Criar múltiplos medicamentos para o mesmo perfil
        medications = []
        for i in range(3):
            med = Medication(
                profile_id=test_profile.id,
                name=f"Medication {i}",
                dosage="100mg",
                schedules=["08:00"]
            )
            db_session.add(med)
            medications.append(med)
        db_session.commit()
        
        for med in medications:
            db_session.refresh(med)
        
        # Buscar medicamentos
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(test_profile.id)
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        # Deve retornar apenas medicamentos do perfil
        assert len(result) == len(medications)
        # Verificar que todos os medicamentos retornados pertencem ao perfil
        # (profile_id pode não estar no response, mas os dados devem estar filtrados)
        assert len(result) == 3  # Deve retornar exatamente os 3 medicamentos do perfil
    
    def test_queries_without_profile_id_return_empty(self, client, api_key, db_session, test_profile):
        """CRÍTICO: Queries sem profile_id retornam vazio"""
        # Criar medicamento
        medication = Medication(
            profile_id=test_profile.id,
            name="Test Medication",
            dosage="100mg",
            schedules=["08:00"]
        )
        db_session.add(medication)
        db_session.commit()
        
        # Buscar sem profile_id
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}"
                # SEM X-Profile-Id
            }
        )
        
        # Deve retornar vazio
        if response.status_code == status.HTTP_200_OK:
            medications = response.json()
            assert len(medications) == 0
        else:
            # Ou erro
            assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]
    
    def test_no_data_leakage_between_profiles(self, client, api_key, csrf_token, db_session):
        """CRÍTICO: Validação que não há vazamento de dados"""
        # Criar dois perfis na mesma família
        user = User(
            email="user@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        family = Family(name="Família Teste", admin_user_id=user.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        user.family_id = family.id
        db_session.commit()
        
        profile1 = FamilyProfile(
            family_id=family.id,
            name="Perfil 1",
            account_type="adult_member",
            created_by=user.id
        )
        profile2 = FamilyProfile(
            family_id=family.id,
            name="Perfil 2",
            account_type="adult_member",
            created_by=user.id
        )
        db_session.add(profile1)
        db_session.add(profile2)
        db_session.commit()
        db_session.refresh(profile1)
        db_session.refresh(profile2)
        
        # Criar dados para cada perfil
        med1 = Medication(profile_id=profile1.id, name="Med 1", dosage="100mg", schedules=["08:00"])
        med2 = Medication(profile_id=profile2.id, name="Med 2", dosage="200mg", schedules=["12:00"])
        db_session.add(med1)
        db_session.add(med2)
        db_session.commit()
        db_session.refresh(med1)
        db_session.refresh(med2)
        
        # Buscar com perfil 1
        response1 = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(profile1.id)
            }
        )
        
        # Buscar com perfil 2
        response2 = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-Profile-Id": str(profile2.id)
            }
        )
        
        assert response1.status_code == status.HTTP_200_OK
        assert response2.status_code == status.HTTP_200_OK
        
        meds1 = response1.json()
        meds2 = response2.json()
        
        # Perfil 1 só deve ver med1
        med1_ids = [m.get("id") for m in meds1]
        assert med1.id in med1_ids
        assert med2.id not in med1_ids
        
        # Perfil 2 só deve ver med2
        med2_ids = [m.get("id") for m in meds2]
        assert med2.id in med2_ids
        assert med1.id not in med2_ids
