"""
Testes de performance para sistema multiempresa.
Valida que o sistema funciona bem com múltiplos perfis e famílias.
"""
import pytest
import time
from datetime import datetime, timezone
from models import User, Family, FamilyProfile, Medication


class TestMultipleProfilesPerformance:
    """Testes de performance com múltiplos perfis"""
    
    def test_performance_with_multiple_profiles(self, client, api_key, db_session):
        """Testa performance com múltiplos perfis (10+)"""
        user = User(
            email="user@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        family = Family(name="Família Grande", admin_user_id=user.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        user.family_id = family.id
        db_session.commit()
        
        # Criar 10 perfis
        profiles = []
        for i in range(10):
            profile = FamilyProfile(
                family_id=family.id,
                name=f"Perfil {i+1}",
                account_type="adult_member" if i % 2 == 0 else "child",
                created_by=user.id
            )
            db_session.add(profile)
            profiles.append(profile)
        
        db_session.commit()
        
        for profile in profiles:
            db_session.refresh(profile)
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email
        })
        
        # Medir tempo de listagem
        start_time = time.time()
        response = client.get(
            "/api/family/profiles",
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert len(result) >= 10
        
        # Performance: deve ser rápido (< 1 segundo)
        assert elapsed_time < 1.0, f"Listagem levou {elapsed_time:.2f}s, esperado < 1.0s"
    
    def test_performance_with_profile_data(self, client, api_key, csrf_token, db_session):
        """Testa performance ao buscar dados de um perfil específico"""
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
        
        # Criar 50 medicamentos para o perfil
        for i in range(50):
            medication = Medication(
                profile_id=profile.id,
                name=f"Medication {i}",
                dosage="100mg",
                schedules=["08:00"]
            )
            db_session.add(medication)
        
        db_session.commit()
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email
        })
        
        # Medir tempo de busca
        start_time = time.time()
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Profile-Id": str(profile.id)
            }
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == status.HTTP_200_OK
        medications = response.json()
        assert len(medications) == 50
        
        # Performance: deve ser rápido mesmo com muitos dados
        assert elapsed_time < 2.0, f"Busca levou {elapsed_time:.2f}s, esperado < 2.0s"


class TestMultipleFamiliesPerformance:
    """Testes de performance com múltiplas famílias"""
    
    def test_performance_with_multiple_families(self, client, api_key, db_session):
        """Testa performance com múltiplas famílias (100+)"""
        # Criar 100 famílias
        families = []
        users = []
        
        for i in range(100):
            user = User(
                email=f"user{i}@test.com",
                password_hash="hash",
                is_active=True,
                email_verified=True
            )
            db_session.add(user)
            users.append(user)
        
        db_session.commit()
        
        for i, user in enumerate(users):
            db_session.refresh(user)
            family = Family(
                name=f"Família {i+1}",
                admin_user_id=user.id
            )
            db_session.add(family)
            families.append(family)
            user.family_id = family.id
        
        db_session.commit()
        
        # Criar perfil para cada família
        for i, (user, family) in enumerate(zip(users, families)):
            db_session.refresh(family)
            profile = FamilyProfile(
                family_id=family.id,
                name=f"Perfil {i+1}",
                account_type="family_admin",
                created_by=user.id
            )
            db_session.add(profile)
        
        db_session.commit()
        
        # Testar que queries são eficientes mesmo com muitas famílias
        # Buscar uma família específica
        test_family = families[50]
        test_user = users[50]
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(test_user.id),
            "email": test_user.email
        })
        
        start_time = time.time()
        response = client.get(
            "/api/family/profiles",
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == status.HTTP_200_OK
        profiles = response.json()
        # Deve retornar apenas perfis da família do usuário
        for profile in profiles:
            assert profile.get("family_id") == test_family.id
        
        # Performance: deve ser rápido mesmo com muitas famílias
        assert elapsed_time < 1.0, f"Busca levou {elapsed_time:.2f}s, esperado < 1.0s"


class TestProfileIdFilterPerformance:
    """Testes de performance de filtros por profile_id"""
    
    def test_queries_with_profile_id_filter(self, client, api_key, db_session):
        """Testa performance de queries com filtros de profile_id"""
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
        
        # Criar 5 perfis
        profiles = []
        for i in range(5):
            profile = FamilyProfile(
                family_id=family.id,
                name=f"Perfil {i+1}",
                account_type="adult_member",
                created_by=user.id
            )
            db_session.add(profile)
            profiles.append(profile)
        
        db_session.commit()
        
        for profile in profiles:
            db_session.refresh(profile)
        
        # Criar 20 medicamentos para cada perfil (100 total)
        for profile in profiles:
            for j in range(20):
                medication = Medication(
                    profile_id=profile.id,
                    name=f"Med {j}",
                    dosage="100mg",
                    schedules=["08:00"]
                )
                db_session.add(medication)
        
        db_session.commit()
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email
        })
        
        # Testar busca com filtro de profile_id
        test_profile = profiles[2]
        
        start_time = time.time()
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Profile-Id": str(test_profile.id)
            }
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == status.HTTP_200_OK
        medications = response.json()
        # Deve retornar apenas 20 medicamentos (do perfil específico)
        assert len(medications) == 20
        # Todos devem pertencer ao perfil
        for med in medications:
            assert med.get("profile_id") == test_profile.id
        
        # Performance: filtro deve ser eficiente
        assert elapsed_time < 1.0, f"Busca filtrada levou {elapsed_time:.2f}s, esperado < 1.0s"


class TestDatabaseIndexes:
    """Testes de índices de banco de dados"""
    
    def test_profile_id_index_exists(self, db_session):
        """Testa que índice em profile_id existe (indiretamente)"""
        # Verificar que queries com profile_id são rápidas
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
        
        profile = FamilyProfile(
            family_id=family.id,
            name="Perfil",
            account_type="adult_member",
            created_by=user.id
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        # Criar muitos medicamentos
        for i in range(100):
            medication = Medication(
                profile_id=profile.id,
                name=f"Med {i}",
                dosage="100mg",
                schedules=["08:00"]
            )
            db_session.add(medication)
        
        db_session.commit()
        
        # Query com filtro de profile_id deve ser rápida (se houver índice)
        start_time = time.time()
        medications = db_session.query(Medication).filter(
            Medication.profile_id == profile.id
        ).all()
        elapsed_time = time.time() - start_time
        
        assert len(medications) == 100
        # Com índice, deve ser muito rápido
        assert elapsed_time < 0.5, f"Query com índice levou {elapsed_time:.2f}s, esperado < 0.5s"
    
    def test_family_id_index_exists(self, db_session):
        """Testa que índice em family_id existe (indiretamente)"""
        # Criar múltiplas famílias
        families = []
        for i in range(50):
            user = User(
                email=f"user{i}@test.com",
                password_hash="hash",
                is_active=True,
                email_verified=True
            )
            db_session.add(user)
            families.append((user, None))
        
        db_session.commit()
        
        for i, (user, _) in enumerate(families):
            db_session.refresh(user)
            family = Family(name=f"Família {i}", admin_user_id=user.id)
            db_session.add(family)
            families[i] = (user, family)
        
        db_session.commit()
        
        # Query com filtro de family_id deve ser rápida
        test_family = families[25][1]
        db_session.refresh(test_family)
        
        start_time = time.time()
        profiles = db_session.query(FamilyProfile).filter(
            FamilyProfile.family_id == test_family.id
        ).all()
        elapsed_time = time.time() - start_time
        
        # Com índice, deve ser muito rápido
        assert elapsed_time < 0.5, f"Query com índice levou {elapsed_time:.2f}s, esperado < 0.5s"
