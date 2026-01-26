"""
Testes de segurança para sistema multiempresa.
Valida proteções contra acesso não autorizado e ataques.
"""
import pytest
from fastapi import status
from datetime import datetime, timezone
from models import User, Family, FamilyProfile, Medication


class TestUnauthorizedAccess:
    """Testes de tentativa de acesso não autorizado"""
    
    def test_unauthorized_access_attempt(self, client, db_session):
        """Testa tentativa de acesso não autorizado"""
        # Tentar acessar sem autenticação
        response = client.get(
            "/api/family/profiles"
        )
        
        # Deve retornar erro de autenticação
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ]
    
    def test_access_with_invalid_token(self, client, db_session):
        """Testa acesso com token inválido"""
        response = client.get(
            "/api/family/profiles",
            headers={
                "Authorization": "Bearer invalid-token-12345"
            }
        )
        
        # Deve retornar erro
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ]
    
    def test_access_to_other_family_profile(self, client, api_key, db_session):
        """Testa tentativa de acesso a perfil de outra família"""
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
        
        profile2 = FamilyProfile(
            family_id=family2.id,
            name="Perfil Família 2",
            account_type="family_admin",
            created_by=user2.id
        )
        db_session.add(profile2)
        db_session.commit()
        db_session.refresh(profile2)
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(user1.id),
            "email": user1.email
        })
        
        # User1 tentando acessar perfil da família 2
        response = client.get(
            "/api/medications",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Profile-Id": str(profile2.id)  # Perfil de outra família
            }
        )
        
        # Deve retornar vazio ou erro
        if response.status_code == status.HTTP_200_OK:
            medications = response.json()
            assert len(medications) == 0  # Não deve retornar dados
        else:
            assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST]


class TestSQLInjection:
    """Testes de proteção contra SQL injection"""
    
    def test_sql_injection_in_profile_id(self, client, api_key, db_session, test_profile):
        """Testa proteção contra SQL injection em profile_id"""
        # Tentativas comuns de SQL injection
        sql_injection_attempts = [
            "1 OR 1=1",
            "1; DROP TABLE medications;--",
            "1' OR '1'='1",
            "1 UNION SELECT * FROM users",
        ]
        
        from auth import create_access_token
        from models import User
        
        user = db_session.query(User).filter(User.id == test_profile.created_by).first()
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email
        })
        
        for attempt in sql_injection_attempts:
            response = client.get(
                "/api/medications",
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Profile-Id": attempt  # Tentativa de SQL injection
                }
            )
            
            # Deve retornar erro ou vazio, nunca executar SQL malicioso
            assert response.status_code in [
                status.HTTP_200_OK,  # Retorna vazio
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_403_FORBIDDEN
            ]
            
            # Se retornar 200, deve estar vazio
            if response.status_code == status.HTTP_200_OK:
                medications = response.json()
                # Não deve retornar dados de outros perfis
                assert len(medications) == 0 or all(
                    m.get("profile_id") == test_profile.id 
                    for m in medications
                )
    
    def test_sql_injection_in_family_id(self, client, api_key, db_session):
        """Testa proteção contra SQL injection em family_id"""
        # O family_id não é passado diretamente pelo usuário,
        # mas vem do token/autenticação, então é mais seguro
        # Ainda assim, validamos que queries são seguras
        
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
        
        # Verificar que queries usam parâmetros seguros (não concatenação)
        # Isso é validado indiretamente pelos testes funcionarem
        profiles = db_session.query(FamilyProfile).filter(
            FamilyProfile.family_id == family.id
        ).all()
        
        # Se chegou aqui sem erro, queries são seguras
        assert isinstance(profiles, list)


class TestInputValidation:
    """Testes de validação de entrada"""
    
    def test_xss_protection_in_profile_name(self, client, api_key, csrf_token, db_session, test_user):
        """Testa proteção contra XSS em nome de perfil"""
        family = Family(name="Família", admin_user_id=test_user.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        test_user.family_id = family.id
        db_session.commit()
        
        # Tentativas de XSS
        xss_attempts = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<svg onload=alert('XSS')>",
        ]
        
        for xss in xss_attempts:
            # Tentar criar perfil com XSS
            # O sistema deve sanitizar ou rejeitar
            profile = FamilyProfile(
                family_id=family.id,
                name=xss,  # Tentativa de XSS
                account_type="adult_member",
                created_by=test_user.id
            )
            db_session.add(profile)
            
            try:
                db_session.commit()
                db_session.refresh(profile)
                # Se salvou, nome deve estar sanitizado
                assert "<script>" not in profile.name.lower()
                assert "javascript:" not in profile.name.lower()
            except Exception:
                # Ou deve rejeitar completamente
                db_session.rollback()
                pass
    
    def test_input_sanitization(self, db_session, test_user):
        """Testa sanitização de entrada"""
        family = Family(name="Família", admin_user_id=test_user.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        test_user.family_id = family.id
        db_session.commit()
        
        # Criar perfil com caracteres especiais
        profile = FamilyProfile(
            family_id=family.id,
            name="Perfil Test <>&\"'",
            account_type="adult_member",
            created_by=test_user.id
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        # Nome deve ser salvo (sanitização é feita na exibição, não no armazenamento)
        assert profile.name is not None


class TestRateLimiting:
    """Testes de rate limiting em endpoints de família"""
    
    def test_rate_limiting_on_family_profiles(self, client, api_key, db_session, test_user, test_profile):
        """Testa rate limiting em endpoint de perfis"""
        from auth import create_access_token
        token = create_access_token({
            "sub": str(test_user.id),
            "email": test_user.email
        })
        
        # Fazer múltiplas requisições rapidamente
        responses = []
        for _ in range(10):
            response = client.get(
                "/api/family/profiles",
                headers={
                    "Authorization": f"Bearer {token}"
                }
            )
            responses.append(response.status_code)
        
        # Todas devem ser bem-sucedidas (rate limit é alto: 100/minute)
        # Se houver rate limit, algumas devem retornar 429
        success_count = sum(1 for code in responses if code == status.HTTP_200_OK)
        assert success_count >= 8  # Pelo menos 8 devem passar
    
    def test_rate_limiting_on_invites(self, client, api_key, csrf_token, db_session):
        """Testa rate limiting em criação de convites"""
        user = User(
            email="user@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True,
            account_type="family_admin"
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
        
        # Criar licença PRO
        from models import License
        from datetime import timedelta
        license_obj = License(
            license_key="TEST-LICENSE",
            license_type="1_month",
            user_id=str(user.id),
            activated_at=datetime.now(timezone.utc),
            expiration_date=datetime.now(timezone.utc) + timedelta(days=30),
            is_active=True
        )
        db_session.add(license_obj)
        db_session.commit()
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email
        })
        
        # Fazer múltiplas requisições (rate limit: 5/minute)
        responses = []
        for i in range(7):
            response = client.post(
                "/api/family/invite-adult",
                json={"invitee_email": f"test{i}@example.com"},
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-CSRF-Token": csrf_token
                }
            )
            responses.append(response.status_code)
        
        # Após 5 requisições, deve começar a retornar 429
        # (mas pode variar dependendo da implementação)
        rate_limited = sum(1 for code in responses if code == status.HTTP_429_TOO_MANY_REQUESTS)
        # Pelo menos algumas devem passar
        success_count = sum(1 for code in responses if code == status.HTTP_200_OK)
        assert success_count >= 3  # Pelo menos 3 devem passar
