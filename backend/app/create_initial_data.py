"""
Initial data seeder for SmartAttend.
Creates the default admin user on first startup if it doesn't exist.
"""

import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.models import User
from app.core.security import get_password_hash
from app.core.config import settings

logger = logging.getLogger(__name__)


def init():
    """Create the default admin user if it doesn't already exist."""
    db = SessionLocal()
    try:
        # Check if admin exists
        user = db.query(User).filter(User.username == "admin").first()
        if not user:
            password = settings.ADMIN_DEFAULT_PASSWORD
            user = User(
                username="admin",
                hashed_password=get_password_hash(password),
                role="admin",
                name="Administrator",
                first_login=1,
            )
            db.add(user)
            db.commit()
            logger.info("Admin user created with default password. Please change it immediately!")
            if password == "Admin@2024!":
                logger.warning("Using default admin password. Set ADMIN_DEFAULT_PASSWORD env variable.")
        else:
            logger.info("Admin user already exists")
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init()
