import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy.orm import Session

import models
import schemas

TRUST_DEVICE_DAYS = int(os.getenv("TRUST_DEVICE_DAYS", "90"))


def _now():
    return datetime.now(timezone.utc)


def _apply_trust_expiration(session: models.UserSession) -> None:
    if session.trusted and session.trust_expires_at and session.trust_expires_at < _now():
        session.trusted = False
        session.trust_expires_at = None


def is_device_blocked(
    db: Session,
    user_id: int,
    device_id: Optional[str]
) -> bool:
    if not device_id:
        return False
    session = db.query(models.UserSession).filter(
        models.UserSession.user_id == user_id,
        models.UserSession.device_id == device_id,
        models.UserSession.revoked_at.is_(None)
    ).first()
    return bool(session and session.blocked)


def upsert_session(
    db: Session,
    user_id: int,
    device: Optional[schemas.DeviceInfo],
    ip_address: Optional[str],
    user_agent: Optional[str]
) -> Tuple[Optional[models.UserSession], bool]:
    if not device or not device.device_id:
        return None, False

    session = db.query(models.UserSession).filter(
        models.UserSession.user_id == user_id,
        models.UserSession.device_id == device.device_id,
        models.UserSession.revoked_at.is_(None)
    ).first()

    is_new = False
    if not session:
        session = models.UserSession(
            user_id=user_id,
            device_id=device.device_id,
            trusted=False,
            created_at=_now()
        )
        is_new = True

    _apply_trust_expiration(session)
    session.device_name = device.device_name or session.device_name
    session.device_model = device.device_model or session.device_model
    session.os_name = device.os_name or session.os_name
    session.os_version = device.os_version or session.os_version
    session.app_version = device.app_version or session.app_version
    session.push_token = device.push_token or session.push_token
    if device.location_lat is not None:
        session.location_lat = device.location_lat
    if device.location_lon is not None:
        session.location_lon = device.location_lon
    if device.location_accuracy_km is not None:
        session.location_accuracy_km = device.location_accuracy_km
    session.ip_address = ip_address or session.ip_address
    session.user_agent = user_agent or session.user_agent
    session.last_activity_at = _now()

    db.add(session)
    db.commit()
    db.refresh(session)
    return session, is_new


def mark_session_trusted(
    db: Session,
    user_id: int,
    session_id: Optional[int],
    device_id: Optional[str],
    trusted: bool
) -> Optional[models.UserSession]:
    if not session_id and not device_id:
        return None
    query = db.query(models.UserSession).filter(
        models.UserSession.user_id == user_id
    )
    if session_id:
        query = query.filter(models.UserSession.id == session_id)
    if device_id:
        query = query.filter(models.UserSession.device_id == device_id)
    session = query.first()
    if not session:
        return None
    session.trusted = trusted
    session.trust_expires_at = _now() + timedelta(days=TRUST_DEVICE_DAYS) if trusted else None
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def mark_session_blocked(
    db: Session,
    user_id: int,
    session_id: Optional[int],
    device_id: Optional[str],
    blocked: bool
) -> Optional[models.UserSession]:
    if not session_id and not device_id:
        return None
    query = db.query(models.UserSession).filter(
        models.UserSession.user_id == user_id
    )
    if session_id:
        query = query.filter(models.UserSession.id == session_id)
    if device_id:
        query = query.filter(models.UserSession.device_id == device_id)
    session = query.first()
    if not session:
        return None
    session.blocked = blocked
    session.blocked_at = _now() if blocked else None
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def revoke_sessions(
    db: Session,
    user_id: int,
    session_id: Optional[int] = None,
    device_id: Optional[str] = None,
    exclude_device_id: Optional[str] = None
) -> int:
    query = db.query(models.UserSession).filter(
        models.UserSession.user_id == user_id,
        models.UserSession.revoked_at.is_(None)
    )
    if session_id:
        query = query.filter(models.UserSession.id == session_id)
    if device_id:
        query = query.filter(models.UserSession.device_id == device_id)
    if exclude_device_id:
        query = query.filter(models.UserSession.device_id != exclude_device_id)

    sessions = query.all()
    if not sessions:
        return 0
    for session in sessions:
        _apply_trust_expiration(session)
        session.revoked_at = _now()
    db.commit()
    return len(sessions)


def log_login_event(
    db: Session,
    user_id: int,
    device_id: Optional[str],
    ip_address: Optional[str],
    user_agent: Optional[str]
) -> models.UserLoginEvent:
    event = models.UserLoginEvent(
        user_id=user_id,
        device_id=device_id,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=_now()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
