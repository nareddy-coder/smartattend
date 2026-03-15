"""
Application configuration for SmartAttend.
All settings are read from environment variables with sensible defaults.
Sections: general, JWT auth, database, SMTP email, face recognition,
upload limits, rate limiting, institution info, timetable, admin.
"""

import os
import logging

logger = logging.getLogger(__name__)


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Attendance System")
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "smartattend-secret-key-change-in-production-2024")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
    _raw_db_url: str = os.getenv("DATABASE_URL", "sqlite:///./attendance.db")
    # Supabase/Render give postgres:// but SQLAlchemy requires postgresql://
    DATABASE_URL: str = _raw_db_url.replace("postgres://", "postgresql://", 1) if _raw_db_url.startswith("postgres://") else _raw_db_url
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")

    # SMTP
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")

    # Face Recognition
    FACE_SIMILARITY_THRESHOLD: float = float(os.getenv("FACE_SIMILARITY_THRESHOLD", "0.70"))
    FACE_CONFIDENCE_THRESHOLD: float = float(os.getenv("FACE_CONFIDENCE_THRESHOLD", "0.5"))

    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "5"))

    # Rate limiting
    MAX_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
    LOGIN_WINDOW_SECONDS: int = int(os.getenv("LOGIN_WINDOW_SECONDS", "300"))

    # Institution
    INSTITUTION_NAME: str = os.getenv("INSTITUTION_NAME", "Attendance System")
    INSTITUTION_EMAIL_DOMAIN: str = os.getenv("INSTITUTION_EMAIL_DOMAIN", "aec.edu.in")
    INSTITUTION_PHOTO_BASE_URL: str = os.getenv("INSTITUTION_PHOTO_BASE_URL", "/AEC/StudentPhotos")

    # Timetable
    TIMETABLE_DAYS: int = int(os.getenv("TIMETABLE_DAYS", "6"))
    TIMETABLE_PERIODS_PER_DAY: int = int(os.getenv("TIMETABLE_PERIODS_PER_DAY", "7"))

    # Admin
    ADMIN_DEFAULT_PASSWORD: str = os.getenv("ADMIN_DEFAULT_PASSWORD", "Admin@2024!")

    class Config:
        case_sensitive = True


settings = Settings()

# Warn if using default secret key
if settings.SECRET_KEY == "smartattend-secret-key-change-in-production-2024":
    logger.warning(
        "WARNING: Using default JWT secret key! Set JWT_SECRET_KEY environment variable for production."
    )
