"""
Authentication endpoints for SmartAttend.
- Login with role-based access and rate limiting
"""

import logging
from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.core import security, config
from app.api import deps
from app.core.database import get_db
from app.models.models import User

logger = logging.getLogger(__name__)
router = APIRouter()

# Rate limiting: track login attempts per username
_login_attempts = {}  # key: username -> list of timestamps


def _check_rate_limit(username: str):
    now = datetime.now(timezone.utc)
    key = username.lower()
    max_attempts = config.settings.MAX_LOGIN_ATTEMPTS
    window_seconds = config.settings.LOGIN_WINDOW_SECONDS

    if key not in _login_attempts:
        _login_attempts[key] = []
    # Remove old attempts outside the window
    _login_attempts[key] = [t for t in _login_attempts[key] if (now - t).total_seconds() < window_seconds]
    if len(_login_attempts[key]) >= max_attempts:
        logger.warning(f"Rate limit exceeded for user: {key}")
        raise HTTPException(
            status_code=429,
            detail=f"Too many login attempts. Please try again in {window_seconds // 60} minutes."
        )
    _login_attempts[key].append(now)


@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    role: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    # Rate limit check
    _check_rate_limit(form_data.username)

    # Case-insensitive username lookup
    username_lower = form_data.username.strip().lower()

    # First: find user matching BOTH username and selected role
    if role:
        user = db.query(User).filter(func.lower(User.username) == username_lower, User.role == role).first()
    else:
        user = db.query(User).filter(func.lower(User.username) == username_lower).first()

    if not user:
        # Check if user exists under a different role
        other_user = db.query(User).filter(func.lower(User.username) == username_lower).first()
        if other_user and role:
            role_labels = {"admin": "Admin", "faculty": "Faculty", "student": "Student"}
            actual_role = role_labels.get(other_user.role, other_user.role)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"WRONG_ROLE:{actual_role}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="USER_NOT_FOUND",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="WRONG_PASSWORD",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get display name for the user
    display_name = user.name or user.username
    if user.role == "student":
        from app.models.models import Student
        student = db.query(Student).filter(Student.roll_number == user.username).first()
        if student:
            display_name = student.name

    logger.info(f"User logged in: {user.username} (role={user.role})")

    access_token_expires = timedelta(minutes=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "first_login": bool(user.first_login), "name": display_name}
