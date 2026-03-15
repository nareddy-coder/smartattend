"""
Student management endpoints for SmartAttend.
CRUD for students, face enrollment (embedding generation), bulk CSV/Excel upload
with auto-section matching, and student photo URL handling.
"""

import logging
import pickle
import numpy as np
import cv2
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.config import settings
from ..models.models import Student, Section, Embedding, User
from ..api import deps
from ..services.face_recognition import face_service

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def _get_college_code(roll_number: str):
    """Determine college from roll number pattern (case-insensitive)."""
    rn = roll_number.lower()
    if len(rn) >= 4:
        prefix = rn[2:4]
        if prefix == 'mh':
            return 'ACOE', 'aceo.edu.in'
        elif prefix == 'p3':
            return 'ACET', 'acet.ac.in'
        elif prefix == 'a9':
            return 'AEC', 'aec.edu.in'
    return None, settings.INSTITUTION_EMAIL_DOMAIN


def _generate_student_email(roll_number: str) -> str:
    """Generate student email based on roll number pattern or config default."""
    rn = roll_number.lower()
    _, domain = _get_college_code(roll_number)
    return f"{rn}@{domain}"


def _generate_image_url(roll_number: str) -> str:
    """Generate student photo URL based on roll number pattern or config default."""
    college_code, _ = _get_college_code(roll_number)
    if college_code:
        return f"/{college_code}/StudentPhotos/{roll_number.upper()}.jpg"
    return f"{settings.INSTITUTION_PHOTO_BASE_URL}/{roll_number.upper()}.jpg"


@router.post("/", response_model=dict)
def create_student(
    name: str = Form(...),
    roll_number: str = Form(...),
    phone: str = Form(...),
    year: int = Form(...),
    semester: int = Form(...),
    section_id: int = Form(...),
    department: str = Form(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    from ..core.security import get_password_hash

    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found. Please create the section first.")

    student = db.query(Student).filter(Student.roll_number == roll_number).first()
    if student:
        raise HTTPException(status_code=400, detail="Student with this roll number already exists")

    email = _generate_student_email(roll_number)
    image_url = _generate_image_url(roll_number)

    existing_user = db.query(User).filter(User.username == roll_number).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User account with this roll number already exists")

    student = Student(
        name=name, roll_number=roll_number, email=email,
        phone=phone, image_url=image_url, year=year,
        semester=semester, department=department, section_id=section_id
    )
    db.add(student)

    initial_password = roll_number
    hashed_password = get_password_hash(initial_password)
    user = User(username=roll_number, hashed_password=hashed_password, role="student", name=name, department=department, first_login=1)
    db.add(user)

    db.commit()

    logger.info(f"Student created: {roll_number} ({name})")

    return {
        "roll_number": student.roll_number,
        "name": student.name,
        "username": roll_number,
        "initial_password": initial_password,
        "message": "Student account created. Share these credentials with the student."
    }


@router.post("/bulk-upload")
async def bulk_upload_students(
    file: UploadFile = File(...),
    section_id: int = Form(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    """Bulk upload students from a CSV or Excel file.

    Students are auto-assigned to sections based on their department, year, and section_name columns.
    If section_name is not in the CSV, falls back to the section_id form parameter.
    """
    import pandas as pd
    import io
    from ..core.security import get_password_hash

    contents = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Only CSV and Excel (.xlsx/.xls) files are supported")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]

    required_cols = ['name', 'roll_number', 'phone', 'year', 'semester']
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"File must contain columns: {required_cols}. Missing: {missing_cols}. Found: {list(df.columns)}"
        )

    # Determine if CSV has section_name and department for auto-matching
    auto_section = 'section_name' in df.columns and 'department' in df.columns

    if not auto_section and section_id is None:
        raise HTTPException(
            status_code=400,
            detail="CSV must have 'section_name' and 'department' columns for auto section assignment, or provide section_id."
        )

    # If using fixed section_id, validate it
    fixed_section = None
    if not auto_section and section_id is not None:
        fixed_section = db.query(Section).filter(Section.id == section_id).first()
        if not fixed_section:
            raise HTTPException(status_code=404, detail="Section not found")

    # Cache sections for auto-matching
    section_cache = {}
    if auto_section:
        all_sections = db.query(Section).all()
        for s in all_sections:
            key = (str(s.name).strip().upper(), str(s.department).strip().upper() if s.department else '', s.year or 0)
            section_cache[key] = s

    created = []
    skipped = []
    errors = []

    for idx, row in df.iterrows():
        row_num = idx + 2
        name = str(row.get('name', '')).strip()
        roll_number = str(row.get('roll_number', '')).strip()
        phone = str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else ''
        year = row.get('year')
        semester = row.get('semester')

        email = _generate_student_email(roll_number)
        image_url = _generate_image_url(roll_number)

        if not name or not roll_number or name == 'nan' or roll_number == 'nan':
            errors.append(f"Row {row_num}: Missing name or roll_number")
            continue
        if not phone:
            errors.append(f"Row {row_num}: Missing phone")
            continue
        if pd.isna(year) or pd.isna(semester):
            errors.append(f"Row {row_num}: Missing year or semester")
            continue
        year = int(year)
        semester = int(semester)

        # Resolve section
        resolved_section_id = section_id
        department = str(row.get('department', '')).strip() if 'department' in df.columns and pd.notna(row.get('department')) else None

        if auto_section:
            section_name = str(row.get('section_name', '')).strip()
            dept_upper = department.upper() if department else ''
            cache_key = (section_name.upper(), dept_upper, year)
            matched_section = section_cache.get(cache_key)
            if not matched_section:
                errors.append(f"Row {row_num}: Section '{section_name}' not found for dept={department}, year={year}")
                continue
            resolved_section_id = matched_section.id

        if resolved_section_id is None:
            errors.append(f"Row {row_num}: Could not determine section")
            continue

        existing = db.query(Student).filter(Student.roll_number == roll_number).first()
        if existing:
            skipped.append(f"{roll_number} ({name}) - already exists")
            continue

        existing_user = db.query(User).filter(User.username == roll_number).first()
        if existing_user:
            skipped.append(f"{roll_number} ({name}) - user account exists")
            continue

        try:
            student = Student(
                name=name, roll_number=roll_number, email=email,
                phone=phone, image_url=image_url, year=year,
                semester=semester, department=department, section_id=resolved_section_id
            )
            db.add(student)

            hashed_password = get_password_hash(roll_number)
            user = User(username=roll_number, hashed_password=hashed_password, role="student", name=name, department=department, first_login=1)
            db.add(user)

            created.append(f"{roll_number} ({name})")
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    db.commit()

    logger.info(f"Bulk upload: {len(created)} students created, {len(skipped)} skipped, {len(errors)} errors")

    return {
        "message": f"Bulk upload complete. {len(created)} created, {len(skipped)} skipped, {len(errors)} errors.",
        "created": created,
        "skipped": skipped,
        "errors": errors,
    }


@router.post("/{roll_number}/enroll")
async def enroll_face(
    roll_number: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    student = db.query(Student).filter(Student.roll_number == roll_number).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    count = 0
    for file in files:
        contents = await file.read()

        if len(contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File '{file.filename}' too large. Maximum: {settings.MAX_UPLOAD_SIZE_MB}MB"
            )

        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            logger.warning(f"Failed to decode image for {roll_number}: {file.filename}")
            continue

        faces = face_service.preprocess_image(img)
        if not faces:
            continue

        faces.sort(key=lambda x: x['box'][2] * x['box'][3], reverse=True)
        primary_face = faces[0]['face_img']

        embedding_vector = face_service.generate_embedding(primary_face)
        if embedding_vector is None:
            continue

        embed_bytes = pickle.dumps(embedding_vector)

        embedding_obj = Embedding(student_roll=student.roll_number, embedding_vector=embed_bytes)
        db.add(embedding_obj)
        count += 1

    db.commit()
    logger.info(f"Enrolled {count} face images for {roll_number}")
    return {"message": f"Successfully enrolled {count} face images"}


@router.delete("/{roll_number}")
def delete_student(
    roll_number: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    student = db.query(Student).filter(Student.roll_number == roll_number).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = db.query(User).filter(User.username == student.roll_number).first()
    if user:
        db.delete(user)

    db.delete(student)
    db.commit()

    logger.info(f"Student deleted: {roll_number}")
    return {"message": "Student and associated user account deleted successfully"}


@router.get("/", response_model=List[dict])
def list_students(
    skip: int = 0, limit: int = 10000,
    section_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    query = db.query(Student)
    if section_id is not None:
        query = query.filter(Student.section_id == section_id)
    students = query.offset(skip).limit(limit).all()
    return [
        {
            "roll_number": s.roll_number,
            "name": s.name,
            "email": s.email,
            "phone": s.phone,
            "image_url": s.image_url,
            "year": s.year,
            "semester": s.semester,
            "department": s.department,
            "section_id": s.section_id,
            "embeddings": [{"id": e.id} for e in s.embeddings]
        }
        for s in students
    ]


@router.put("/{roll_number}")
def update_student(
    roll_number: str,
    name: str = Form(None),
    phone: str = Form(None),
    year: int = Form(None),
    semester: int = Form(None),
    section_id: int = Form(None),
    department: str = Form(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    student = db.query(Student).filter(Student.roll_number == roll_number).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if name is not None:
        student.name = name
    if phone is not None:
        student.phone = phone
    if year is not None:
        student.year = year
    if semester is not None:
        student.semester = semester
    if department is not None:
        student.department = department
    if section_id is not None:
        section = db.query(Section).filter(Section.id == section_id).first()
        if not section:
            raise HTTPException(status_code=404, detail="Section not found")
        student.section_id = section_id

    # Sync changes to the users table
    user = db.query(User).filter(User.username == roll_number).first()
    if user:
        if name is not None:
            user.name = name
        if department is not None:
            user.department = department

    db.commit()

    return {
        "message": "Student updated successfully",
        "student": {
            "roll_number": student.roll_number,
            "name": student.name,
            "email": student.email,
            "phone": student.phone,
            "image_url": student.image_url,
            "year": student.year,
            "semester": student.semester,
            "department": student.department,
            "section_id": student.section_id
        }
    }
