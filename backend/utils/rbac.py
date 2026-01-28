"""
RBAC Constants and Helpers

This module contains constants and helper functions for Role-Based Access Control.
"""

# Account Types
ACCOUNT_TYPE_FAMILY_ADMIN = "family_admin"
ACCOUNT_TYPE_ADULT_MEMBER = "adult_member"
ACCOUNT_TYPE_CHILD = "child"
ACCOUNT_TYPE_ELDER_UNDER_CARE = "elder_under_care"

# Access Levels for Caregivers
ACCESS_LEVEL_READ_ONLY = "read_only"
ACCESS_LEVEL_READ_WRITE = "read_write"
ACCESS_LEVEL_FULL = "full"

# Actions
ACTION_VIEW = "view"
ACTION_EDIT = "edit"
ACTION_DELETE = "delete"
ACTION_SHARE = "share"
ACTION_MANAGE_PROFILES = "manage_profiles"

# Resource Types
RESOURCE_TYPE_OWN_DATA = "own_data"
RESOURCE_TYPE_CHILD_DATA = "child_data"
RESOURCE_TYPE_ELDER_DATA = "elder_data"
RESOURCE_TYPE_ADULT_DATA = "adult_data"
RESOURCE_TYPE_FAMILY_DATA = "family_data"

# Data Share Scopes
SCOPE_ALL = "all"
SCOPE_BASIC = "basic"
SCOPE_EMERGENCY_ONLY = "emergency_only"
SCOPE_CUSTOM = "custom"

# Permission Matrix
ACCOUNT_PERMISSIONS = {
    ACCOUNT_TYPE_FAMILY_ADMIN: {
        "can_manage_profiles": True,
        "can_view_family_data": True,
        "can_edit_family_data": True,
        "can_delete_family_data": True,
        "can_share_data": True
    },
    ACCOUNT_TYPE_ADULT_MEMBER: {
        "can_manage_profiles": False,
        # Adult members podem ver/editar seus próprios dados, mas não devem ter
        # acesso automático a dados de outros perfis sem caregiver/data-share.
        "can_view_family_data": False,
        "can_edit_family_data": True,
        "can_delete_family_data": False,
        "can_share_data": True
    },
    ACCOUNT_TYPE_CHILD: {
        "can_manage_profiles": False,
        "can_view_family_data": False,
        "can_edit_family_data": False,
        "can_delete_family_data": False,
        "can_share_data": False
    },
    ACCOUNT_TYPE_ELDER_UNDER_CARE: {
        "can_manage_profiles": False,
        "can_view_family_data": False,
        "can_edit_family_data": False,
        "can_delete_family_data": False,
        "can_share_data": False
    }
}


def build_permissions(account_type: str) -> dict:
    """
    Build permissions dictionary for a given account type.
    
    Args:
        account_type: The account type (family_admin, adult_member, child, elder_under_care)
    
    Returns:
        Dictionary with permission flags
    """
    return ACCOUNT_PERMISSIONS.get(account_type, {})


def get_account_type_permissions(account_type: str) -> dict:
    """Alias for build_permissions for consistency."""
    return build_permissions(account_type)


def has_permission(account_type: str, permission: str) -> bool:
    """
    Check if an account type has a specific permission.
    
    Args:
        account_type: The account type
        permission: The permission to check (e.g., "can_view_family_data")
    
    Returns:
        True if the account type has the permission, False otherwise
    """
    permissions = build_permissions(account_type)
    return permissions.get(permission, False)


def is_valid_account_type(account_type: str) -> bool:
    """Check if account type is valid."""
    return account_type in ACCOUNT_PERMISSIONS


def is_valid_access_level(access_level: str) -> bool:
    """Check if access level is valid for caregivers."""
    return access_level in [ACCESS_LEVEL_READ_ONLY, ACCESS_LEVEL_READ_WRITE, ACCESS_LEVEL_FULL]


def is_valid_scope(scope: str) -> bool:
    """Check if data share scope is valid."""
    return scope in [SCOPE_ALL, SCOPE_BASIC, SCOPE_EMERGENCY_ONLY, SCOPE_CUSTOM]


def can_perform_action(access_level: str, action: str) -> bool:
    """
    Check if an access level allows a specific action.
    
    Args:
        access_level: The access level (read_only, read_write, full)
        action: The action to check (view, edit, delete)
    
    Returns:
        True if the access level allows the action
    """
    if access_level == ACCESS_LEVEL_FULL:
        return True
    if access_level == ACCESS_LEVEL_READ_WRITE:
        return action in [ACTION_VIEW, ACTION_EDIT]
    if access_level == ACCESS_LEVEL_READ_ONLY:
        return action == ACTION_VIEW
    return False
