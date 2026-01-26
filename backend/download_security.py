from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

import models

DOWNLOAD_WINDOW_MINUTES = 5
DOWNLOAD_THRESHOLD = 20


def _now():
    return datetime.now(timezone.utc)


def _cutoff(minutes: int):
    return _now() - timedelta(minutes=minutes)


def record_download(
    db: Session,
    user_id: int,
    resource_type: str,
    resource_id: Optional[str],
    ip_address: Optional[str],
    user_agent: Optional[str]
) -> None:
    event = models.UserDownloadEvent(
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=_now()
    )
    db.add(event)
    db.commit()


def get_recent_download_count(
    db: Session,
    user_id: int,
    window_minutes: int = DOWNLOAD_WINDOW_MINUTES
) -> int:
    cutoff = _cutoff(window_minutes)
    return db.query(models.UserDownloadEvent).filter(
        models.UserDownloadEvent.user_id == user_id,
        models.UserDownloadEvent.created_at >= cutoff
    ).count()
