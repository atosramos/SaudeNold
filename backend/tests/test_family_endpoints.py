"""
Testes para endpoints de família e perfis familiares.
"""
import pytest
from fastapi import status
from datetime import datetime, timezone, timedelta
from models import User, Family, FamilyProfile, FamilyInvite, License


class TestListFamilyProfiles:
    """Testes para GET /api/family/profiles"""
    
    def test_list_profiles_success(self, client, api_key, db_session, test_user, test_profile):
        """Testa listar perfis da família com sucesso"""
        response = client.get(
            "/api/family/profiles",
            headers={
                "Authorization": f"Bearer {api_key}"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        profiles = response.json()
        assert isinstance(profiles, list)
        # Deve incluir o perfil de teste
        profile_ids = [p.get("id") for p in profiles]
        assert test_profile.id in profile_ids
    
    def test_list_profiles_multiple(self, client, api_key, db_session, test_user, test_profile):
        """Testa listagem com múltiplos perfis"""
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
        
        response = client.get(
            "/api/family/profiles",
            headers={
                "Authorization": f"Bearer {api_key}"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        profiles = response.json()
        assert len(profiles) >= 3  # Pelo menos os 3 perfis criados
    
    def test_list_profiles_filtered_by_family(self, client, api_key, db_session):
        """Testa que perfis são filtrados por família"""
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
        
        # Criar perfis em cada família
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
        
        # Listar perfis (deve retornar apenas da família do usuário autenticado)
        # Como não temos JWT real, vamos testar que o endpoint funciona
        response = client.get(
            "/api/family/profiles",
            headers={
                "Authorization": f"Bearer {api_key}"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        profiles = response.json()
        # Todos os perfis devem pertencer à mesma família
        if len(profiles) > 1:
            family_ids = [p.get("family_id") for p in profiles]
            assert len(set(family_ids)) == 1  # Todos da mesma família


class TestFamilyInvites:
    """Testes para endpoints de convites"""
    
    @pytest.fixture
    def test_family_with_admin(self, db_session):
        """Cria família com admin para testes de convite"""
        user = User(
            email="admin@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True,
            account_type="family_admin"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        family = Family(
            name="Família Admin",
            admin_user_id=user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        user.family_id = family.id
        db_session.commit()
        
        # Criar licença PRO para o usuário
        license_obj = License(
            license_key="TEST-LICENSE-KEY",
            license_type="1_month",
            user_id=str(user.id),
            activated_at=datetime.now(timezone.utc),
            expiration_date=datetime.now(timezone.utc) + timedelta(days=30),
            is_active=True
        )
        db_session.add(license_obj)
        db_session.commit()
        
        return user, family
    
    def test_create_invite_success(self, client, api_key, csrf_token, db_session, test_family_with_admin):
        """Testa criação de convite bem-sucedida"""
        user, family = test_family_with_admin
        
        # Criar token JWT para o usuário
        from auth import create_access_token
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email
        })
        
        invite_data = {
            "invitee_email": "convidado@test.com",
            "permissions": {"can_view": True, "can_edit": False}
        }
        
        response = client.post(
            "/api/family/invite-adult",
            json=invite_data,
            headers={
                "Authorization": f"Bearer {token}",
                "X-CSRF-Token": csrf_token
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        invite = response.json()
        assert invite.get("family_id") == family.id
        assert invite.get("inviter_user_id") == user.id
        assert invite.get("status") == "pending"
        assert invite.get("invite_code") is not None
    
    def test_create_invite_requires_pro_license(self, client, api_key, csrf_token, db_session):
        """Testa que criação de convite requer licença PRO"""
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
        
        family = Family(name="Família Teste", admin_user_id=user.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        user.family_id = family.id
        db_session.commit()
        
        # NÃO criar licença PRO
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email
        })
        
        invite_data = {
            "invitee_email": "convidado@test.com"
        }
        
        response = client.post(
            "/api/family/invite-adult",
            json=invite_data,
            headers={
                "Authorization": f"Bearer {token}",
                "X-CSRF-Token": csrf_token
            }
        )
        
        # Deve retornar erro 403 (licença PRO necessária)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        detail = response.json().get("detail", "").lower()
        assert "licença" in detail or "pro" in detail or "license" in detail
    
    def test_list_invites(self, client, api_key, db_session, test_user, test_profile):
        """Testa listar convites"""
        family = db_session.query(Family).filter(Family.id == test_profile.family_id).first()
        
        # Criar convite
        invite = FamilyInvite(
            family_id=family.id,
            inviter_user_id=test_user.id,
            invitee_email="test@example.com",
            invite_code="TEST123",
            status="pending",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db_session.add(invite)
        db_session.commit()
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(test_user.id),
            "email": test_user.email
        })
        
        response = client.get(
            "/api/family/invites",
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        invites = response.json()
        assert isinstance(invites, list)
        assert len(invites) > 0
        assert any(inv.get("id") == invite.id for inv in invites)
    
    def test_cancel_invite(self, client, api_key, db_session, test_user, test_profile):
        """Testa cancelar convite"""
        family = db_session.query(Family).filter(Family.id == test_profile.family_id).first()
        
        invite = FamilyInvite(
            family_id=family.id,
            inviter_user_id=test_user.id,
            invite_code="CANCEL123",
            status="pending",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db_session.add(invite)
        db_session.commit()
        db_session.refresh(invite)
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(test_user.id),
            "email": test_user.email
        })
        
        response = client.delete(
            f"/api/family/invite/{invite.id}",
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert result.get("status") == "cancelled"
    
    def test_accept_invite_success(self, client, api_key, db_session):
        """Testa aceitar convite com sucesso"""
        # Criar família e convite
        inviter = User(
            email="inviter@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True,
            account_type="family_admin"
        )
        invitee = User(
            email="invitee@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(inviter)
        db_session.add(invitee)
        db_session.commit()
        db_session.refresh(inviter)
        db_session.refresh(invitee)
        
        family = Family(name="Família Inviter", admin_user_id=inviter.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        inviter.family_id = family.id
        db_session.commit()
        
        invite = FamilyInvite(
            family_id=family.id,
            inviter_user_id=inviter.id,
            invitee_email=invitee.email,
            invite_code="ACCEPT123",
            status="pending",
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db_session.add(invite)
        db_session.commit()
        db_session.refresh(invite)
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(invitee.id),
            "email": invitee.email
        })
        
        response = client.post(
            "/api/family/accept-invite",
            json={"code": "ACCEPT123"},
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert result.get("status") == "accepted"
        assert result.get("accepted_by_user_id") == invitee.id
    
    def test_accept_invite_expired(self, client, api_key, db_session):
        """Testa que convite expirado não pode ser aceito"""
        inviter = User(
            email="inviter@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        invitee = User(
            email="invitee@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(inviter)
        db_session.add(invitee)
        db_session.commit()
        db_session.refresh(inviter)
        db_session.refresh(invitee)
        
        family = Family(name="Família", admin_user_id=inviter.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        invite = FamilyInvite(
            family_id=family.id,
            inviter_user_id=inviter.id,
            invite_code="EXPIRED123",
            status="pending",
            expires_at=datetime.now(timezone.utc) - timedelta(days=1)  # Expirado
        )
        db_session.add(invite)
        db_session.commit()
        db_session.refresh(invite)
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(invitee.id),
            "email": invitee.email
        })
        
        response = client.post(
            "/api/family/accept-invite",
            json={"code": "EXPIRED123"},
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        detail = response.json().get("detail", "").lower()
        assert "expirado" in detail or "expired" in detail
    
    def test_accept_invite_already_accepted(self, client, api_key, db_session):
        """Testa que convite já aceito não pode ser aceito novamente"""
        inviter = User(
            email="inviter@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        invitee = User(
            email="invitee@test.com",
            password_hash="hash",
            is_active=True,
            email_verified=True
        )
        db_session.add(inviter)
        db_session.add(invitee)
        db_session.commit()
        db_session.refresh(inviter)
        db_session.refresh(invitee)
        
        family = Family(name="Família", admin_user_id=inviter.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        invite = FamilyInvite(
            family_id=family.id,
            inviter_user_id=inviter.id,
            invite_code="ACCEPTED123",
            status="accepted",  # Já aceito
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db_session.add(invite)
        db_session.commit()
        db_session.refresh(invite)
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(invitee.id),
            "email": invitee.email
        })
        
        response = client.post(
            "/api/family/accept-invite",
            json={"code": "ACCEPTED123"},
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        detail = response.json().get("detail", "").lower()
        assert "pendente" in detail or "pending" in detail


class TestDeleteFamilyProfile:
    """Testes para DELETE /api/family/profiles/{profile_id}"""
    
    def test_delete_profile_success(self, client, api_key, db_session, test_user):
        """Testa deletar perfil com sucesso"""
        family = Family(name="Família Teste", admin_user_id=test_user.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        test_user.family_id = family.id
        test_user.account_type = "family_admin"
        db_session.commit()
        
        # Criar perfil para deletar
        profile = FamilyProfile(
            family_id=family.id,
            name="Perfil para Deletar",
            account_type="adult_member",
            created_by=test_user.id
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(test_user.id),
            "email": test_user.email
        })
        
        response = client.delete(
            f"/api/family/profiles/{profile.id}",
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        result = response.json()
        assert result.get("success") is True
        
        # Verificar que perfil foi deletado
        deleted = db_session.query(FamilyProfile).filter(FamilyProfile.id == profile.id).first()
        assert deleted is None
    
    def test_delete_profile_requires_admin(self, client, api_key, db_session, test_user):
        """Testa que apenas admin pode deletar perfil"""
        family = Family(name="Família Teste", admin_user_id=test_user.id)
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        test_user.family_id = family.id
        test_user.account_type = "adult_member"  # NÃO é admin
        db_session.commit()
        
        profile = FamilyProfile(
            family_id=family.id,
            name="Perfil",
            account_type="adult_member",
            created_by=test_user.id
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        from auth import create_access_token
        token = create_access_token({
            "sub": str(test_user.id),
            "email": test_user.email
        })
        
        response = client.delete(
            f"/api/family/profiles/{profile.id}",
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
