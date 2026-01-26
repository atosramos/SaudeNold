"""
Testes para modelos de família e perfis familiares.
"""
import pytest
from datetime import datetime, timezone
from models import Family, FamilyProfile, FamilyCaregiver, FamilyInvite, FamilyDataShare, User


class TestFamilyModel:
    """Testes para modelo Family"""
    
    def test_create_family(self, db_session):
        """Testa criação de família"""
        user = User(
            email="admin@test.com",
            password_hash="hash",
            is_active=True
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
        
        assert family.id is not None
        assert family.name == "Família Teste"
        assert family.admin_user_id == user.id
        assert family.created_at is not None
    
    def test_family_requires_admin_user_id(self, db_session):
        """Testa que família requer admin_user_id"""
        family = Family(name="Família Teste")
        db_session.add(family)
        
        with pytest.raises(Exception):  # Deve falhar por constraint NOT NULL
            db_session.commit()


class TestFamilyProfileModel:
    """Testes para modelo FamilyProfile"""
    
    def test_create_family_profile(self, db_session, test_user):
        """Testa criação de perfil familiar"""
        family = Family(
            name="Família Teste",
            admin_user_id=test_user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        profile = FamilyProfile(
            family_id=family.id,
            name="Perfil Teste",
            account_type="family_admin",
            created_by=test_user.id
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        assert profile.id is not None
        assert profile.family_id == family.id
        assert profile.name == "Perfil Teste"
        assert profile.account_type == "family_admin"
    
    def test_family_profile_account_types(self, db_session, test_user):
        """Testa diferentes tipos de conta"""
        family = Family(
            name="Família Teste",
            admin_user_id=test_user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        account_types = ["family_admin", "adult_member", "child", "elder_under_care"]
        
        for account_type in account_types:
            profile = FamilyProfile(
                family_id=family.id,
                name=f"Perfil {account_type}",
                account_type=account_type,
                created_by=test_user.id
            )
            db_session.add(profile)
        
        db_session.commit()
        
        profiles = db_session.query(FamilyProfile).filter(
            FamilyProfile.family_id == family.id
        ).all()
        
        assert len(profiles) == len(account_types)
        for profile in profiles:
            assert profile.account_type in account_types
    
    def test_family_profile_requires_family_id(self, db_session, test_user):
        """Testa que perfil requer family_id"""
        profile = FamilyProfile(
            name="Perfil Teste",
            account_type="family_admin",
            created_by=test_user.id
        )
        db_session.add(profile)
        
        with pytest.raises(Exception):
            db_session.commit()


class TestFamilyUserRelationship:
    """Testes para relacionamento família-usuário"""
    
    def test_user_family_relationship(self, db_session):
        """Testa relacionamento entre usuário e família"""
        user = User(
            email="user@test.com",
            password_hash="hash",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        family = Family(
            name="Família do Usuário",
            admin_user_id=user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        user.family_id = family.id
        db_session.commit()
        db_session.refresh(user)
        
        assert user.family_id == family.id
        
        # Verificar que podemos buscar família do usuário
        user_family = db_session.query(Family).filter(
            Family.id == user.family_id
        ).first()
        
        assert user_family is not None
        assert user_family.id == family.id


class TestFamilyProfilesRelationship:
    """Testes para relacionamento família-perfis"""
    
    def test_family_multiple_profiles(self, db_session, test_user):
        """Testa que uma família pode ter múltiplos perfis"""
        family = Family(
            name="Família Grande",
            admin_user_id=test_user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        # Criar múltiplos perfis
        profiles_data = [
            ("Admin", "family_admin"),
            ("Adulto", "adult_member"),
            ("Criança", "child"),
        ]
        
        for name, account_type in profiles_data:
            profile = FamilyProfile(
                family_id=family.id,
                name=name,
                account_type=account_type,
                created_by=test_user.id
            )
            db_session.add(profile)
        
        db_session.commit()
        
        # Verificar que todos os perfis pertencem à família
        profiles = db_session.query(FamilyProfile).filter(
            FamilyProfile.family_id == family.id
        ).all()
        
        assert len(profiles) == len(profiles_data)
        for profile in profiles:
            assert profile.family_id == family.id


class TestFamilyCaregiverModel:
    """Testes para modelo FamilyCaregiver"""
    
    def test_create_caregiver(self, db_session, test_user):
        """Testa criação de cuidador"""
        family = Family(
            name="Família Teste",
            admin_user_id=test_user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        profile = FamilyProfile(
            family_id=family.id,
            name="Idoso",
            account_type="elder_under_care",
            created_by=test_user.id
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        caregiver = FamilyCaregiver(
            profile_id=profile.id,
            caregiver_user_id=test_user.id,
            access_level="full"
        )
        db_session.add(caregiver)
        db_session.commit()
        db_session.refresh(caregiver)
        
        assert caregiver.id is not None
        assert caregiver.profile_id == profile.id
        assert caregiver.caregiver_user_id == test_user.id
        assert caregiver.access_level == "full"
    
    def test_caregiver_access_levels(self, db_session, test_user):
        """Testa diferentes níveis de acesso de cuidador"""
        family = Family(
            name="Família Teste",
            admin_user_id=test_user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        profile = FamilyProfile(
            family_id=family.id,
            name="Idoso",
            account_type="elder_under_care",
            created_by=test_user.id
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(profile)
        
        access_levels = ["read_only", "read_write", "full"]
        
        for access_level in access_levels:
            caregiver = FamilyCaregiver(
                profile_id=profile.id,
                caregiver_user_id=test_user.id,
                access_level=access_level
            )
            db_session.add(caregiver)
        
        db_session.commit()
        
        caregivers = db_session.query(FamilyCaregiver).filter(
            FamilyCaregiver.profile_id == profile.id
        ).all()
        
        assert len(caregivers) == len(access_levels)


class TestFamilyDataShareModel:
    """Testes para modelo FamilyDataShare"""
    
    def test_create_data_share(self, db_session, test_user):
        """Testa criação de compartilhamento de dados"""
        family = Family(
            name="Família Teste",
            admin_user_id=test_user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        profile1 = FamilyProfile(
            family_id=family.id,
            name="Perfil 1",
            account_type="family_admin",
            created_by=test_user.id
        )
        db_session.add(profile1)
        
        profile2 = FamilyProfile(
            family_id=family.id,
            name="Perfil 2",
            account_type="adult_member",
            created_by=test_user.id
        )
        db_session.add(profile2)
        db_session.commit()
        db_session.refresh(profile1)
        db_session.refresh(profile2)
        
        data_share = FamilyDataShare(
            family_id=family.id,
            from_profile_id=profile1.id,
            to_profile_id=profile2.id,
            permissions={"can_view": True, "can_edit": False}
        )
        db_session.add(data_share)
        db_session.commit()
        db_session.refresh(data_share)
        
        assert data_share.id is not None
        assert data_share.from_profile_id == profile1.id
        assert data_share.to_profile_id == profile2.id
        assert data_share.permissions == {"can_view": True, "can_edit": False}
        assert data_share.revoked_at is None
    
    def test_revoke_data_share(self, db_session, test_user):
        """Testa revogação de compartilhamento"""
        family = Family(
            name="Família Teste",
            admin_user_id=test_user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        profile1 = FamilyProfile(
            family_id=family.id,
            name="Perfil 1",
            account_type="family_admin",
            created_by=test_user.id
        )
        profile2 = FamilyProfile(
            family_id=family.id,
            name="Perfil 2",
            account_type="adult_member",
            created_by=test_user.id
        )
        db_session.add(profile1)
        db_session.add(profile2)
        db_session.commit()
        db_session.refresh(profile1)
        db_session.refresh(profile2)
        
        data_share = FamilyDataShare(
            family_id=family.id,
            from_profile_id=profile1.id,
            to_profile_id=profile2.id,
            permissions={"can_view": True}
        )
        db_session.add(data_share)
        db_session.commit()
        db_session.refresh(data_share)
        
        # Revogar compartilhamento
        data_share.revoked_at = datetime.now(timezone.utc)
        db_session.commit()
        db_session.refresh(data_share)
        
        assert data_share.revoked_at is not None


class TestFamilyInviteModel:
    """Testes para modelo FamilyInvite"""
    
    def test_create_family_invite(self, db_session, test_user):
        """Testa criação de convite"""
        family = Family(
            name="Família Teste",
            admin_user_id=test_user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        invite = FamilyInvite(
            family_id=family.id,
            inviter_user_id=test_user.id,
            invitee_email="convidado@test.com",
            invite_code="ABC123",
            status="pending"
        )
        db_session.add(invite)
        db_session.commit()
        db_session.refresh(invite)
        
        assert invite.id is not None
        assert invite.family_id == family.id
        assert invite.inviter_user_id == test_user.id
        assert invite.invitee_email == "convidado@test.com"
        assert invite.invite_code == "ABC123"
        assert invite.status == "pending"
    
    def test_invite_status_transitions(self, db_session, test_user):
        """Testa transições de status de convite"""
        family = Family(
            name="Família Teste",
            admin_user_id=test_user.id
        )
        db_session.add(family)
        db_session.commit()
        db_session.refresh(family)
        
        invite = FamilyInvite(
            family_id=family.id,
            inviter_user_id=test_user.id,
            invite_code="TEST123",
            status="pending"
        )
        db_session.add(invite)
        db_session.commit()
        db_session.refresh(invite)
        
        assert invite.status == "pending"
        
        # Aceitar convite
        invite.status = "accepted"
        invite.accepted_at = datetime.now(timezone.utc)
        db_session.commit()
        db_session.refresh(invite)
        
        assert invite.status == "accepted"
        assert invite.accepted_at is not None
