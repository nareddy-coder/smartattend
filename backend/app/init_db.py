from app.core.database import Base, engine
from app.models.models import User, Section, Student, Embedding, AttendanceLog, FacultyAssignment, TimetableSlot, ActivityLog

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    init_db()
