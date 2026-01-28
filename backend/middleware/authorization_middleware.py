"""
Authorization Middleware

Provides decorators and middleware for route-level authorization checks.
"""

from functools import wraps
from typing import Callable, Optional, Any
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from auth import get_user_from_token
from services.permission_service import check_permission
from utils.rbac import ACTION_VIEW, ACTION_EDIT, ACTION_DELETE


def require_permission(
    action: str,
    resource_type: Optional[str] = None,
    extract_profile_id: Optional[Callable] = None
):
    """
    Decorator to require permission for a route.
    
    Usage:
        @app.get("/api/resource/{resource_id}")
        @require_permission(ACTION_VIEW)
        async def get_resource(resource_id: int, ...):
            ...
    
    Args:
        action: The action required (view, edit, delete)
        resource_type: Optional resource type
        extract_profile_id: Optional function to extract profile_id from request
    
    Returns:
        Decorator function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request and db from kwargs
            request: Optional[Request] = kwargs.get('request')
            db: Optional[Session] = kwargs.get('db')
            credentials: Optional[HTTPAuthorizationCredentials] = kwargs.get('credentials')
            
            if not request or not db:
                raise HTTPException(
                    status_code=500,
                    detail="Request and db must be available for permission check"
                )
            
            # Get user from token
            if credentials:
                token = credentials.credentials
            else:
                from main import get_bearer_token
                token = get_bearer_token(request)
            
            if not token:
                raise HTTPException(status_code=401, detail="Token required")
            
            user = get_user_from_token(db, token)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid token")
            
            # Extract profile_id
            profile_id = None
            
            # Try custom extractor first
            if extract_profile_id:
                try:
                    profile_id = extract_profile_id(request, *args, **kwargs)
                except Exception:
                    pass
            
            # Try from header
            if not profile_id:
                profile_id_header = request.headers.get("X-Profile-Id")
                if profile_id_header:
                    try:
                        profile_id = int(profile_id_header)
                    except ValueError:
                        pass
            
            # Try from path parameters
            if not profile_id:
                profile_id = kwargs.get('profile_id')
                if profile_id:
                    try:
                        profile_id = int(profile_id)
                    except (ValueError, TypeError):
                        profile_id = None
            
            # Try from resource_id (common pattern)
            if not profile_id:
                resource_id = kwargs.get('resource_id')
                if resource_id:
                    # Assume resource_id might be profile_id
                    try:
                        profile_id = int(resource_id)
                    except (ValueError, TypeError):
                        pass
            
            if not profile_id:
                raise HTTPException(
                    status_code=400,
                    detail="Profile ID required for permission check"
                )
            
            # Check permission
            try:
                check_permission(user, action, profile_id, db, resource_type)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error checking permission: {str(e)}"
                )
            
            # Call original function
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_view_permission(resource_type: Optional[str] = None):
    """Convenience decorator for view permission."""
    return require_permission(ACTION_VIEW, resource_type)


def require_edit_permission(resource_type: Optional[str] = None):
    """Convenience decorator for edit permission."""
    return require_permission(ACTION_EDIT, resource_type)


def require_delete_permission(resource_type: Optional[str] = None):
    """Convenience decorator for delete permission."""
    return require_permission(ACTION_DELETE, resource_type)
