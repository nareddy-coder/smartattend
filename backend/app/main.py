"""
SmartAttend FastAPI application entry point.
Sets up CORS, static files, all API routers, and creates DB tables on startup.
"""

import logging
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.core import config
from app.core.database import Base, engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=config.settings.PROJECT_NAME,
    version="2.0.0",
    description="Face Recognition based Attendance Management System",
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.warning(f"Validation Error: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)},
    )


# CORS — allow all origins so network/mobile devices can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure static directory exists
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Import and include routers
from app.api import auth, users, students, attendance, sections, assignments, timetable, activity, analytics, notifications

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(students.router, prefix="/students", tags=["students"])
app.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
app.include_router(sections.router, prefix="/sections", tags=["sections"])
app.include_router(assignments.router, prefix="/assignments", tags=["assignments"])
app.include_router(timetable.router, prefix="/timetable", tags=["timetable"])
app.include_router(activity.router, prefix="/activity", tags=["activity"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])


@app.on_event("startup")
def on_startup():
    logger.info("Starting up - creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created.")

    # Create default admin if not exists
    from app.create_initial_data import init
    init()

    logger.info(f"Application started: {config.settings.PROJECT_NAME}")
    logger.info("CORS origins: * (all origins allowed)")


@app.get("/")
def read_root():
    return {
        "message": f"{config.settings.PROJECT_NAME} API is running",
        "version": "2.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
