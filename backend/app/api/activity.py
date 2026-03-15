"""
Activity logging endpoints for SmartAttend.
Provides a helper to log user actions and an admin-only endpoint to retrieve logs.
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from ..core.database import get_db
from ..models.models import ActivityLog, User
from ..api import deps

logger = logging.getLogger(__name__)
router = APIRouter()


def log_activity(db: Session, user_id: Optional[int], action: str, detail: str = ""):
    """Helper to log an activity. Can be imported and used anywhere."""
    entry = ActivityLog(user_id=user_id, action=action, detail=detail)
    db.add(entry)
    db.commit()


@router.get("/")
def get_activity_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_admin_or_faculty),
):
    """Get recent activity logs (admin only)."""
    logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit).all()

    return [
        {
            "id": log.id,
            "user": log.user.name if log.user else "System",
            "action": log.action,
            "detail": log.detail,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in logs
    ]
