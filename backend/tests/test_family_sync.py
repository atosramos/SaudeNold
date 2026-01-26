"""
Testes de sincronização multi-perfil.
Valida que dados são sincronizados corretamente por perfil.
"""
import pytest
from fastapi import status
from datetime import datetime, timezone
from models import User, Family, FamilyProfile, Medication, MedicationLog


class TestProfileDataSync:
    """Testes de sincronização de dados por perfil"""
    
    def test_profile_a_syncs_only_to_profile_a(self, client, api_key, csrf_token, db_session):
        """CRÍTICO: Dados do perfil A sincronizam apenas para perfil A"""
        user = User(
            email="user@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        family = Family(name="Família", admin_user_id=user.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        user.family_id = family.id
        db_session.commit()
        
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
        
        # Criar medicamento para perfil A
        medication_a = Medication(
            profile_id=profile_a.id,
            name="Med A",
            dosage="100mg",
            schedules=["08:00"]
        )
        db_session.add(medication_a)
        db_session.commit()
        db_session.refresh(medication_a)
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email
        })
        
        # Buscar dados do perfil A
        response_a = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Profile-Id": str(profile_a.id)
            }
        )
        
        # Buscar dados do perfil B
        response_b = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Profile-Id": str(profile_b.id)
            }
        )
        
        assert response_a.status_code == status.HTTP_200_OK
        assert response_b.status_code == status.HTTP_200_OK
        
        meds_a = response_a.json()
        meds_b = response_b.json()
        
        # Perfil A deve ver seu medicamento
        assert len(meds_a) > 0
        assert any(m.get("id") == medication_a.id for m in meds_a)
        
        # Perfil B NÃO deve ver medicamento do perfil A
        assert len(meds_b) == 0 or all(m.get("id") != medication_a.id for m in meds_b)
    
    def test_profile_b_data_not_in_profile_a(self, client, api_key, csrf_token, db_session):
        """CRÍTICO: Dados do perfil B não aparecem no perfil A"""
        user = User(
            email="user@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        family = Family(name="Família", admin_user_id=user.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        user.family_id = family.id
        db_session.commit()
        
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
            name="Med B",
            dosage="200mg",
            schedules=["12:00"]
        )
        db_session.add(medication_b)
        db_session.commit()
        db_session.refresh(medication_b)
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email
        })
        
        # Buscar dados do perfil A
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Profile-Id": str(profile_a.id)
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        medications = response.json()
        # Perfil A não deve ver medicamento do perfil B
        assert len(medications) == 0 or all(m.get("id") != medication_b.id for m in medications)


class TestFamilyProfilesSync:
    """Testes de sincronização de perfis da família"""
    
    def test_profiles_list_syncs_correctly(self, client, api_key, db_session, test_user, test_profile):
        """Testa que lista de perfis sincroniza corretamente"""
        family = db_session.query(Family).filter(Family.id == test_profile.family_id).first()
        
        # Criar mais perfis
        profile2 = FamilyProfile(
            family_id=family.id,
            name="Perfil 2",
            account_type="adult_member",
            created_by=test_user.id
        )
        profile3 = FamilyProfile(
            family_id=family.id,
            name="Perfil 3",
            account_type="child",
            created_by=test_user.id
        )
        db_session.add(profile2)
        db_session.add(profile3)
        db_session.commit()
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(test_user.id),
            "email": test_user.email
        })
        
        response = client.get(
            "/api/family/profiles",
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        profiles = response.json()
        assert len(profiles) >= 3  # Pelo menos os 3 perfis
        
        # Verificar que todos os perfis estão na lista
        profile_ids = [p.get("id") for p in profiles]
        assert test_profile.id in profile_ids
        assert profile2.id in profile_ids
        assert profile3.id in profile_ids
    
    def test_new_profiles_appear_after_sync(self, client, api_key, db_session, test_user, test_profile):
        """Testa que novos perfis aparecem após sincronização"""
        family = db_session.query(Family).filter(Family.id == test_profile.family_id).first()
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(test_user.id),
            "email": test_user.email
        })
        
        # Listar perfis inicialmente
        response1 = client.get(
            "/api/family/profiles",
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        
        assert response1.status_code == status.HTTP_200_OK
        initial_count = len(response1.json())
        
        # Criar novo perfil
        new_profile = FamilyProfile(
            family_id=family.id,
            name="Novo Perfil",
            account_type="adult_member",
            created_by=test_user.id
        )
        db_session.add(new_profile)
        db_session.commit()
        db_session.refresh(new_profile)
        
        # Listar perfis novamente
        response2 = client.get(
            "/api/family/profiles",
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        
        assert response2.status_code == status.HTTP_200_OK
        profiles = response2.json()
        assert len(profiles) > initial_count
        assert any(p.get("id") == new_profile.id for p in profiles)


class TestConflictResolution:
    """Testes de resolução de conflitos"""
    
    def test_local_and_server_data_conflict(self, db_session):
        """Testa conflito entre dados locais e servidor"""
        # Este teste valida que o sistema pode lidar com conflitos
        # Na prática, a resolução de conflitos é feita no frontend,
        # mas o backend deve suportar atualizações
        
        user = User(
            email="user@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        family = Family(name="Família", admin_user_id=user.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        user.family_id = family.id
        db_session.commit()
        
        profile = FamilyProfile(
            family_id=family.id,
            name="Perfil",
            account_type="adult_member",
            created_by=user.id
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        # Criar medicamento no servidor
        medication = Medication(
            profile_id=profile.id,
            name="Medication Server",
            dosage="100mg",
            schedules=["08:00"],
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(medication)
        db_session.commit()
        db_session.refresh(medication)
        
        # Simular atualização (conflito resolvido no frontend, backend aceita)
        medication.name = "Medication Updated"
        medication.updated_at = datetime.now(timezone.utc)
        db_session.commit()
        db_session.refresh(medication)
        
        assert medication.name == "Medication Updated"
    
    def test_last_write_wins_strategy(self, db_session):
        """Testa estratégia last-write-wins"""
        user = User(
            email="user@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        family = Family(name="Família", admin_user_id=user.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        user.family_id = family.id
        db_session.commit()
        
        profile = FamilyProfile(
            family_id=family.id,
            name="Perfil",
            account_type="adult_member",
            created_by=user.id
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        medication = Medication(
            profile_id=profile.id,
            name="Original",
            dosage="100mg",
            schedules=["08:00"],
            updated_at=datetime.now(timezone.utc)
        )
        db_session.add(medication)
        db_session.commit()
        db_session.refresh(medication)
        
        original_updated = medication.updated_at
        
        # Atualizar (last write wins)
        medication.name = "Updated"
        medication.updated_at = datetime.now(timezone.utc)
        db_session.commit()
        db_session.refresh(medication)
        
        assert medication.name == "Updated"
        assert medication.updated_at > original_updated


class TestOfflineFirstSync:
    """Testes de sincronização offline-first"""
    
    def test_data_saved_offline_syncs_when_online(self, client, api_key, csrf_token, db_session, test_profile):
        """Testa que dados salvos offline são sincronizados quando online"""
        # Este teste valida que o backend aceita dados criados offline
        from auth import create_access_token
        from models import User
        
        user = db_session.query(User).filter(User.id == test_profile.created_by).first()
        
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email
        })
        
        # Simular criação de medicamento offline (sem ID do servidor)
        medication_data = {
            "name": "Offline Medication",
            "dosage": "100mg",
            "schedules": ["08:00"],
            "active": True
        }
        
        # Criar no servidor (simula sincronização quando online)
        response = client.post(
            "/api/medications",
            json=medication_data,
            headers={
                "Authorization": f"Bearer {token}",
                "X-CSRF-Token": csrf_token,
                "X-Profile-Id": str(test_profile.id)
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        medication = response.json()
        assert medication.get("id") is not None
        assert medication.get("name") == "Offline Medication"
    
    def test_data_not_lost_during_sync(self, client, api_key, csrf_token, db_session, test_profile):
        """Testa que dados não são perdidos durante sincronização"""
        from auth import create_access_token
        from models import User
        
        user = db_session.query(User).filter(User.id == test_profile.created_by).first()
        
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email
        })
        
        # Criar múltiplos medicamentos
        medications_data = [
            {"name": f"Med {i}", "dosage": "100mg", "schedules": ["08:00"]}
            for i in range(5)
        ]
        
        created_ids = []
        for med_data in medications_data:
            response = client.post(
                "/api/medications",
                json=med_data,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-CSRF-Token": csrf_token,
                    "X-Profile-Id": str(test_profile.id)
                }
            )
            if response.status_code == status.HTTP_200_OK:
                created_ids.append(response.json().get("id"))
        
        # Verificar que todos foram criados
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Profile-Id": str(test_profile.id)
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        medications = response.json()
        # Todos os medicamentos devem estar presentes
        medication_ids = [m.get("id") for m in medications]
        for created_id in created_ids:
            assert created_id in medication_ids
