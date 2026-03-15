"""
Faculty-subject assignment endpoints for SmartAttend.
CRUD for mapping faculty to subjects/sections, with bulk CSV/Excel upload.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..models.models import FacultyAssignment, User, Section
from ..api import deps
from pydantic import BaseModel
import io

router = APIRouter()

class AssignmentCreate(BaseModel):
    faculty_id: int
    subject_name: str
    periods: int
    department: str
    year: int
    section_id: int
    subject_type: str = "class"  # "class" or "lab"

class AssignmentResponse(BaseModel):
    id: int
    faculty_id: int
    faculty_name: Optional[str] = None
    faculty_employee_id: Optional[str] = None
    subject_name: str
    periods: int
    department: str
    year: int
    section_id: int
    section_name: Optional[str] = None
    subject_type: str = "class"

@router.post("/", response_model=AssignmentResponse)
def create_assignment(
    assignment: AssignmentCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    faculty = db.query(User).filter(User.id == assignment.faculty_id, User.role == "faculty").first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    section = db.query(Section).filter(Section.id == assignment.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    existing = db.query(FacultyAssignment).filter(
        FacultyAssignment.faculty_id == assignment.faculty_id,
        FacultyAssignment.subject_name == assignment.subject_name,
        FacultyAssignment.section_id == assignment.section_id,
        FacultyAssignment.year == assignment.year,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This assignment already exists")

    db_assignment = FacultyAssignment(
        faculty_id=assignment.faculty_id,
        subject_name=assignment.subject_name,
        periods=assignment.periods,
        department=assignment.department,
        year=assignment.year,
        section_id=assignment.section_id,
        subject_type=assignment.subject_type or "class",
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)

    return AssignmentResponse(
        id=db_assignment.id,
        faculty_id=db_assignment.faculty_id,
        faculty_name=faculty.name,
        faculty_employee_id=faculty.employee_id,
        subject_name=db_assignment.subject_name,
        periods=db_assignment.periods,
        department=db_assignment.department,
        year=db_assignment.year,
        section_id=db_assignment.section_id,
        section_name=section.name,
        subject_type=db_assignment.subject_type if hasattr(db_assignment, 'subject_type') else "class",
    )

@router.get("/", response_model=List[AssignmentResponse])
def list_assignments(
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_admin_or_faculty)
):
    assignments = db.query(FacultyAssignment).all()
    results = []
    for a in assignments:
        results.append(AssignmentResponse(
            id=a.id,
            faculty_id=a.faculty_id,
            faculty_name=a.faculty.name if a.faculty else None,
            faculty_employee_id=a.faculty.employee_id if a.faculty else None,
            subject_name=a.subject_name,
            periods=a.periods,
            department=a.department,
            year=a.year,
            section_id=a.section_id,
            section_name=a.section.name if a.section else None,
            subject_type=a.subject_type or "class",
        ))
    return results

@router.get("/my-assignments", response_model=List[AssignmentResponse])
def get_my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    assignments = db.query(FacultyAssignment).filter(
        FacultyAssignment.faculty_id == current_user.id
    ).all()
    results = []
    for a in assignments:
        results.append(AssignmentResponse(
            id=a.id,
            faculty_id=a.faculty_id,
            faculty_name=a.faculty.name if a.faculty else None,
            faculty_employee_id=a.faculty.employee_id if a.faculty else None,
            subject_name=a.subject_name,
            periods=a.periods,
            department=a.department,
            year=a.year,
            section_id=a.section_id,
            section_name=a.section.name if a.section else None,
            subject_type=a.subject_type or "class",
        ))
    return results

class AssignmentUpdate(BaseModel):
    faculty_id: Optional[int] = None
    subject_name: Optional[str] = None
    periods: Optional[int] = None
    department: Optional[str] = None
    year: Optional[int] = None
    section_id: Optional[int] = None
    subject_type: Optional[str] = None

@router.put("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(
    assignment_id: int,
    data: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    assignment = db.query(FacultyAssignment).filter(FacultyAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if data.faculty_id is not None:
        faculty = db.query(User).filter(User.id == data.faculty_id, User.role == "faculty").first()
        if not faculty:
            raise HTTPException(status_code=404, detail="Faculty not found")
        assignment.faculty_id = data.faculty_id

    if data.section_id is not None:
        section = db.query(Section).filter(Section.id == data.section_id).first()
        if not section:
            raise HTTPException(status_code=404, detail="Section not found")
        assignment.section_id = data.section_id

    if data.subject_name is not None:
        assignment.subject_name = data.subject_name
    if data.periods is not None:
        assignment.periods = data.periods
    if data.department is not None:
        assignment.department = data.department
    if data.year is not None:
        assignment.year = data.year
    if data.subject_type is not None:
        assignment.subject_type = data.subject_type

    db.commit()
    db.refresh(assignment)

    return AssignmentResponse(
        id=assignment.id,
        faculty_id=assignment.faculty_id,
        faculty_name=assignment.faculty.name if assignment.faculty else None,
        faculty_employee_id=assignment.faculty.employee_id if assignment.faculty else None,
        subject_name=assignment.subject_name,
        periods=assignment.periods,
        department=assignment.department,
        year=assignment.year,
        section_id=assignment.section_id,
        section_name=assignment.section.name if assignment.section else None,
    )

@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    assignment = db.query(FacultyAssignment).filter(FacultyAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted successfully"}

@router.post("/bulk-upload")
async def bulk_upload_assignments(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    """
    Bulk upload faculty subject assignments from CSV or Excel file.
    Expected columns: employee_id, subject_name, periods, department, year, section_name
    """
    import pandas as pd

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

    # 'type' column is optional (defaults to 'class'); values: 'class' or 'lab'
    required_cols = ['employee_id', 'subject_name', 'periods', 'department', 'year', 'section_name']
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"File must contain columns: {required_cols}. Missing: {missing_cols}. Found: {list(df.columns)}"
        )

    created = []
    skipped = []
    errors = []

    for idx, row in df.iterrows():
        row_num = idx + 2
        employee_id = str(row.get('employee_id', '')).strip()
        subject_name = str(row.get('subject_name', '')).strip()
        periods_val = row.get('periods')
        department = str(row.get('department', '')).strip()
        year_val = row.get('year')
        section_name = str(row.get('section_name', '')).strip()

        if not employee_id or employee_id == 'nan':
            errors.append(f"Row {row_num}: Missing employee_id")
            continue
        if not subject_name or subject_name == 'nan':
            errors.append(f"Row {row_num}: Missing subject_name")
            continue

        # Find faculty by employee_id
        faculty = db.query(User).filter(User.employee_id == employee_id, User.role == "faculty").first()
        if not faculty:
            errors.append(f"Row {row_num}: Faculty with employee_id '{employee_id}' not found")
            continue

        # Find section by name + department + year (names like "A" repeat across depts)
        section_query = db.query(Section).filter(Section.name == section_name)
        if department:
            section_query = section_query.filter(Section.department == department)
        try:
            year_int = int(year_val) if pd.notna(year_val) else None
            if year_int:
                section_query = section_query.filter(Section.year == year_int)
        except (ValueError, TypeError):
            pass
        section = section_query.first()
        if not section:
            errors.append(f"Row {row_num}: Section '{section_name}' not found for dept={department} year={year_val}")
            continue

        try:
            periods = int(periods_val) if pd.notna(periods_val) else 0
            year = int(year_val) if pd.notna(year_val) else 0
        except (ValueError, TypeError):
            errors.append(f"Row {row_num}: Invalid periods or year value")
            continue

        # Check duplicate
        existing = db.query(FacultyAssignment).filter(
            FacultyAssignment.faculty_id == faculty.id,
            FacultyAssignment.subject_name == subject_name,
            FacultyAssignment.section_id == section.id,
            FacultyAssignment.year == year,
        ).first()
        if existing:
            skipped.append(f"{employee_id} - {subject_name} ({section_name}) already exists")
            continue

        # Read optional type column (class/lab), default to 'class'
        subject_type = str(row.get('type', 'class')).strip().lower()
        if subject_type not in ('class', 'lab'):
            subject_type = 'lab' if 'lab' in subject_name.lower() else 'class'

        # Lab subjects must have exactly 3 periods
        if subject_type == 'lab' and periods != 3:
            periods = 3

        try:
            db_assignment = FacultyAssignment(
                faculty_id=faculty.id,
                subject_name=subject_name,
                periods=periods,
                department=department or None,
                year=year,
                section_id=section.id,
                subject_type=subject_type,
            )
            db.add(db_assignment)
            created.append(f"{employee_id} - {subject_name} ({section_name})")
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    db.commit()

    return {
        "message": f"Bulk upload complete. {len(created)} created, {len(skipped)} skipped, {len(errors)} errors.",
        "created": created,
        "skipped": skipped,
        "errors": errors,
    }
