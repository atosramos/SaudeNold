from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

import models

MAX_ATTEMPTS = 5
WINDOW_MINUTES = 15
SUSPICIOUS_LOGIN_WINDOW_MINUTES = 60


def _now():
    return datetime.now(timezone.utc)


def _cutoff(minutes: int):
    return _now() - timedelta(minutes=minutes)


def record_failed_login(
    db: Session,
    email: str,
    ip_address: Optional[str],
    user_agent: Optional[str]
) -> None:
    attempt = models.UserLoginAttempt(
        email=email,
        ip_address=ip_address,
        user_agent=user_agent,
        success=False,  # Explicitamente marcar como falha
        created_at=_now()
    )
    db.add(attempt)
    db.commit()


def record_successful_login(
    db: Session,
    email: str,
    ip_address: Optional[str],
    user_agent: Optional[str]
) -> None:
    """Registra uma tentativa de login bem-sucedida"""
    attempt = models.UserLoginAttempt(
        email=email,
        ip_address=ip_address,
        user_agent=user_agent,
        success=True,
        created_at=_now()
    )
    db.add(attempt)
    db.commit()


def clear_failed_logins(
    db: Session,
    email: str,
    ip_address: Optional[str]
) -> None:
    """Remove apenas tentativas FALHADAS antigas (success=False)"""
    query = db.query(models.UserLoginAttempt).filter(
        models.UserLoginAttempt.email == email,
        models.UserLoginAttempt.success == False  # Apenas falhas
    )
    if ip_address:
        query = query.filter(models.UserLoginAttempt.ip_address == ip_address)
    query.delete()
    db.commit()


def get_failed_attempts_count(
    db: Session,
    email: str,
    ip_address: Optional[str],
    window_minutes: int = WINDOW_MINUTES
) -> int:
    """Conta apenas tentativas FALHADAS (success=False)"""
    query = db.query(models.UserLoginAttempt).filter(
        models.UserLoginAttempt.email == email,
        models.UserLoginAttempt.success == False,  # Apenas falhas
        models.UserLoginAttempt.created_at >= _cutoff(window_minutes)
    )
    if ip_address:
        query = query.filter(models.UserLoginAttempt.ip_address == ip_address)
    return query.count()


def has_suspicious_login_pattern(
    db: Session,
    user_id: int,
    ip_address: Optional[str],
    window_minutes: int = SUSPICIOUS_LOGIN_WINDOW_MINUTES
) -> bool:
    if not ip_address:
        return False
    cutoff = _cutoff(window_minutes)
    recent_ips = db.query(models.UserLoginEvent.ip_address).filter(
        models.UserLoginEvent.user_id == user_id,
        models.UserLoginEvent.created_at >= cutoff,
        models.UserLoginEvent.ip_address.isnot(None)
    ).distinct().all()
    ip_set = {row[0] for row in recent_ips if row[0]}
    return len(ip_set) > 1 and ip_address in ip_set
