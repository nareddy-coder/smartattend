"""
SQLAlchemy ORM models for SmartAttend.
Defines all database tables: User, Section, Student, Embedding,
FacultyAssignment, TimetableSlot, AttendanceLog, ActivityLog,
Notification, and LeaveRequest.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, LargeBinary, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..core.database import Base


def _utc_now():
    """Return current UTC time (timezone-aware). Used as default for DateTime columns."""
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "app_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # admin, faculty, student
    name = Column(String, nullable=True)
    employee_id = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    department = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    first_login = Column(Integer, default=1)  # SQLite uses 1/0 for boolean
    created_at = Column(DateTime, default=_utc_now)

class Section(Base):
    __tablename__ = "sections"
    __table_args__ = (
        UniqueConstraint('name', 'department', 'year', 'academic_year', name='uq_section_name_dept_year_acyr'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    academic_year = Column(String)
    department = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    semester = Column(Integer, nullable=True)

    students = relationship("Student", back_populates="section")

class Student(Base):
    __tablename__ = "students"

    roll_number = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    department = Column(String, nullable=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("app_users.id"), nullable=True)
    enrollment_date = Column(DateTime, default=_utc_now)

    section = relationship("Section", back_populates="students")
    embeddings = relationship("Embedding", back_populates="student", cascade="all, delete-orphan")
    attendance_logs = relationship("AttendanceLog", back_populates="student", cascade="all, delete-orphan")

class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, index=True)
    student_roll = Column(String, ForeignKey("students.roll_number"))
    embedding_vector = Column(LargeBinary) # Storing numpy array as bytes
    created_at = Column(DateTime, default=_utc_now)

    student = relationship("Student", back_populates="embeddings")

class FacultyAssignment(Base):
    __tablename__ = "faculty_assignments"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("app_users.id"), nullable=False)
    subject_name = Column(String, nullable=False)
    periods = Column(Integer, nullable=False)
    department = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    subject_type = Column(String, default="class")  # "class" or "lab"
    created_at = Column(DateTime, default=_utc_now)

    faculty = relationship("User")
    section = relationship("Section")

class TimetableSlot(Base):
    __tablename__ = "timetable_slots"
    __table_args__ = (
        UniqueConstraint('section_id', 'day_of_week', 'period_number', name='uq_section_day_period'),
    )

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)   # 0=Monday .. 5=Saturday
    period_number = Column(Integer, nullable=False)  # 1..7
    subject_name = Column(String, nullable=False)
    faculty_id = Column(Integer, ForeignKey("app_users.id"), nullable=False)
    created_at = Column(DateTime, default=_utc_now)

    section = relationship("Section")
    faculty = relationship("User")

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_roll = Column(String, ForeignKey("students.roll_number"))
    session_id = Column(String, index=True) # ID to group a class session
    timestamp = Column(DateTime, default=_utc_now)
    status = Column(String) # Present, Late, Absent, etc.
    confidence_score = Column(Float)
    subject_name = Column(String, nullable=True)
    submitted = Column(Boolean, default=False)
    period_number = Column(Integer, nullable=True)

    student = relationship("Student", back_populates="attendance_logs")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("app_users.id"), nullable=True)
    action = Column(String, nullable=False)
    detail = Column(String, nullable=True)
    timestamp = Column(DateTime, default=_utc_now)

    user = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("app_users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, default="info")  # info, warning, error, success
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utc_now)

    user = relationship("User")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_roll = Column(String, ForeignKey("students.roll_number"), nullable=False)
    from_date = Column(DateTime, nullable=False)
    to_date = Column(DateTime, nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, approved, rejected
    reviewed_by = Column(Integer, ForeignKey("app_users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utc_now)

    student = relationship("Student")
    reviewer = relationship("User")
