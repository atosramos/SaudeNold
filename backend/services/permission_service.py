"""
Permission Service - Centralized Permission Checking

This service provides a centralized function to check permissions for users
accessing resources in the multi-tenant system.
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import User, FamilyProfile, FamilyCaregiver, FamilyDataShare
from utils.rbac import (
    ACCOUNT_TYPE_FAMILY_ADMIN,
    ACTION_VIEW,
    ACTION_EDIT,
    ACTION_DELETE,
    can_perform_action,
    has_permission
)


def check_permission(
    user: User,
    action: str,
    resource_owner_id: int,
    db: Session,
    resource_type: Optional[str] = None
) -> bool:
    """
    Centralized permission checking function.
    
    Checks if a user has permission to perform an action on a resource owned by another user.
    
    Args:
        user: The user requesting access
        action: The action to perform (view, edit, delete)
        resource_owner_id: The profile_id that owns the resource
        db: Database session
        resource_type: Optional resource type (own_data, child_data, elder_data, etc.)
    
    Returns:
        True if permission is granted, raises HTTPException(403) if denied
    
    Raises:
        HTTPException: 403 if permission is denied
    """
    # 1. Check if user is family_admin (full access)
    if user.account_type == ACCOUNT_TYPE_FAMILY_ADMIN:
        # Verify profile belongs to user's family
        profile = db.query(FamilyProfile).filter(
            FamilyProfile.id == resource_owner_id,
            FamilyProfile.family_id == user.family_id
        ).first()
        if profile:
            return True
        raise HTTPException(status_code=403, detail="Perfil não pertence à família")
    
    # 2. Check if it's own data
    user_profile = db.query(FamilyProfile).filter(
        FamilyProfile.family_id == user.family_id,
        FamilyProfile.created_by == user.id
    ).first()
    
    if user_profile and user_profile.id == resource_owner_id:
        # Own data - check account type permissions
        if action == ACTION_VIEW:
            return True  # Users can always view their own data
        if action == ACTION_EDIT:
            # Check if account type allows editing own data
            if has_permission(user.account_type, "can_edit_family_data"):
                return True
            raise HTTPException(status_code=403, detail="Sem permissão para editar seus próprios dados")
        if action == ACTION_DELETE:
            # Only family_admin can delete (for safety)
            if user.account_type == ACCOUNT_TYPE_FAMILY_ADMIN:
                return True
            raise HTTPException(status_code=403, detail="Sem permissão para deletar")
        return True
    
    # 3. Check if user is a caregiver for this profile
    caregiver = db.query(FamilyCaregiver).filter(
        FamilyCaregiver.profile_id == resource_owner_id,
        FamilyCaregiver.caregiver_user_id == user.id
    ).first()
    
    if caregiver:
        # Verify profile belongs to same family
        profile = db.query(FamilyProfile).filter(
            FamilyProfile.id == resource_owner_id,
            FamilyProfile.family_id == user.family_id
        ).first()
        if not profile:
            raise HTTPException(status_code=403, detail="Perfil não pertence à família")
        
        # Check if access level allows the action
        if can_perform_action(caregiver.access_level, action):
            return True
        raise HTTPException(
            status_code=403,
            detail=f"Sem permissão para {action} (nível de acesso: {caregiver.access_level})"
        )
    
    # 4. Check data sharing (FamilyDataShare)
    if user_profile:
        data_share = db.query(FamilyDataShare).filter(
            FamilyDataShare.family_id == user.family_id,
            FamilyDataShare.from_profile_id == resource_owner_id,
            FamilyDataShare.to_profile_id == user_profile.id,
            FamilyDataShare.revoked_at.is_(None)
        ).first()
        
        if data_share:
            # Verify profile belongs to same family
            profile = db.query(FamilyProfile).filter(
                FamilyProfile.id == resource_owner_id,
                FamilyProfile.family_id == user.family_id
            ).first()
            if not profile:
                raise HTTPException(status_code=403, detail="Perfil não pertence à família")
            
            # Check expiration
            from datetime import datetime, timezone
            if data_share.expires_at and data_share.expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=403, detail="Compartilhamento expirado")
            
            # Check permissions in data_share
            permissions = data_share.permissions or {}
            
            if action == ACTION_VIEW:
                if permissions.get("can_view", False):
                    return True
                raise HTTPException(status_code=403, detail="Sem permissão para visualizar")
            
            if action == ACTION_EDIT:
                if permissions.get("can_edit", False):
                    return True
                raise HTTPException(status_code=403, detail="Sem permissão para editar")
            
            if action == ACTION_DELETE:
                if permissions.get("can_delete", False):
                    return True
                raise HTTPException(status_code=403, detail="Sem permissão para deletar")
    
    # 5. Check if user can view family data (read-only access to other profiles)
    if action == ACTION_VIEW and has_permission(user.account_type, "can_view_family_data"):
        # Verify profile belongs to same family
        profile = db.query(FamilyProfile).filter(
            FamilyProfile.id == resource_owner_id,
            FamilyProfile.family_id == user.family_id
        ).first()
        if profile:
            return True
    
    # Permission denied
    raise HTTPException(
        status_code=403,
        detail=f"Sem permissão para {action} neste recurso"
    )


def check_profile_access(
    user: User,
    profile_id: int,
    db: Session,
    write_access: bool = False,
    delete_access: bool = False
) -> bool:
    """
    Convenience function to check profile access (backward compatibility).
    
    This wraps check_permission for the common case of checking profile access.
    
    Args:
        user: The user requesting access
        profile_id: The profile ID to access
        db: Database session
        write_access: Whether write access is needed
        delete_access: Whether delete access is needed
    
    Returns:
        True if access is granted
    
    Raises:
        HTTPException: 403 if access is denied
    """
    if delete_access:
        check_permission(user, ACTION_DELETE, profile_id, db)
    elif write_access:
        check_permission(user, ACTION_EDIT, profile_id, db)
    else:
        check_permission(user, ACTION_VIEW, profile_id, db)
    
    return True
