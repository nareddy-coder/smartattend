"""
Faculty/user management endpoints for SmartAttend.
CRUD for faculty users, password change/reset, profile management, bulk CSV/Excel upload.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..models.models import User
from ..api import deps
from ..core.security import get_password_hash, validate_password
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


class UserCreate(BaseModel):
    name: str
    employee_id: str
    email: str
    phone: str
    department: str
    designation: str


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    name: Optional[str] = None
    employee_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


@router.post("/", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    username = user.employee_id
    db_user = db.query(User).filter(User.username == username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Faculty with this employee ID already exists")
    # Only one HOD per department
    if user.designation and user.designation.upper() == 'HOD' and user.department:
        existing_hod = db.query(User).filter(
            User.role == 'faculty',
            User.designation == 'HOD',
            User.department == user.department
        ).first()
        if existing_hod:
            raise HTTPException(status_code=400, detail=f"{user.department} already has an HOD: {existing_hod.name} ({existing_hod.employee_id}). Remove the existing HOD designation first.")
    hashed_password = get_password_hash(user.employee_id)
    db_user = User(
        username=username,
        hashed_password=hashed_password,
        role="faculty",
        name=user.name,
        employee_id=user.employee_id,
        email=user.email,
        phone=user.phone,
        department=user.department,
        designation=user.designation,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    logger.info(f"Faculty created: {username} ({user.name})")

    return UserResponse(
        id=db_user.id, username=db_user.username, role=db_user.role,
        name=db_user.name, employee_id=db_user.employee_id,
        email=db_user.email, phone=db_user.phone, department=db_user.department,
        designation=db_user.designation,
    )


@router.get("/", response_model=List[UserResponse])
def read_users(
    skip: int = 0,
    limit: int = 10000,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_admin_or_faculty)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return [
        UserResponse(
            id=u.id, username=u.username, role=u.role,
            name=u.name, employee_id=u.employee_id,
            email=u.email, phone=u.phone, department=u.department,
            designation=u.designation,
        ) for u in users
    ]


@router.get("/me")
def get_my_profile(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile information"""
    from ..models.models import Student

    profile = {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }

    if current_user.role == "student":
        student = db.query(Student).filter(Student.roll_number == current_user.username).first()
        if student:
            profile["name"] = student.name
            profile["roll_number"] = student.roll_number
            profile["email"] = student.email
            profile["phone"] = student.phone
            profile["image_url"] = student.image_url
            profile["year"] = student.year
            profile["semester"] = student.semester
            profile["section"] = student.section.name if student.section else None
            profile["department"] = student.department
            profile["enrollment_date"] = student.enrollment_date.isoformat() if student.enrollment_date else None

    if current_user.role in ("faculty", "admin"):
        profile["name"] = current_user.name
        profile["employee_id"] = current_user.employee_id
        profile["email"] = current_user.email
        profile["phone"] = current_user.phone
        profile["department"] = current_user.department
        profile["designation"] = current_user.designation

    return profile


@router.put("/update-profile")
def update_my_profile(
    profile_update: UserUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's own profile."""
    from ..models.models import Student

    if profile_update.name is not None:
        current_user.name = profile_update.name
    if profile_update.email is not None:
        current_user.email = profile_update.email
    if profile_update.phone is not None:
        current_user.phone = profile_update.phone

    if current_user.role == "student":
        student = db.query(Student).filter(Student.roll_number == current_user.username).first()
        if student:
            if profile_update.name is not None:
                student.name = profile_update.name
            if profile_update.email is not None:
                student.email = profile_update.email
            if profile_update.phone is not None:
                student.phone = profile_update.phone

    db.commit()
    return {"message": "Profile updated successfully"}


@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password with strength validation."""
    from ..core.security import verify_password

    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    # Validate new password strength
    is_valid, error_msg = validate_password(password_data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    if password_data.old_password == password_data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from old password")

    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.first_login = 0
    db.commit()

    logger.info(f"Password changed for user: {current_user.username}")
    return {"message": "Password changed successfully"}


@router.post("/reset-password/{user_id}")
def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    """Admin: Reset a user's password to their username/employee_id."""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Reset password to username (roll_number or employee_id)
    new_password = db_user.employee_id or db_user.username
    db_user.hashed_password = get_password_hash(new_password)
    db_user.first_login = 1
    db.commit()

    # Send notification email
    if db_user.email:
        from ..services.email_service import send_password_reset_notification
        send_password_reset_notification(db_user.email, db_user.name or db_user.username)

    logger.info(f"Password reset for user: {db_user.username} by admin: {current_admin.username}")
    return {"message": f"Password reset for {db_user.username}. They will be prompted to change it on next login."}


@router.post("/bulk-upload")
async def bulk_upload_faculty(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    """Bulk upload faculty from a CSV or Excel file."""
    import pandas as pd
    import io

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

    required_cols = ['name', 'employee_id', 'email', 'phone', 'department', 'designation']
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
        name = str(row.get('name', '')).strip()
        employee_id = str(row.get('employee_id', '')).strip()
        email = str(row.get('email', '')).strip()
        phone = str(row.get('phone', '')).strip()
        department = str(row.get('department', '')).strip()
        designation = str(row.get('designation', '')).strip()

        if not name or not employee_id or name == 'nan' or employee_id == 'nan':
            errors.append(f"Row {row_num}: Missing name or employee_id")
            continue

        existing = db.query(User).filter(User.username == employee_id).first()
        if existing:
            skipped.append(f"{employee_id} ({name}) - already exists")
            continue

        if designation.upper() == 'HOD' and department:
            existing_hod = db.query(User).filter(
                User.role == 'faculty',
                User.designation == 'HOD',
                User.department == department
            ).first()
            if existing_hod:
                errors.append(f"Row {row_num}: {department} already has an HOD: {existing_hod.name} ({existing_hod.employee_id})")
                continue

        try:
            hashed_password = get_password_hash(employee_id)
            user = User(
                username=employee_id, hashed_password=hashed_password, role="faculty",
                name=name, employee_id=employee_id, email=email, phone=phone,
                department=department, designation=designation,
            )
            db.add(user)
            created.append(f"{employee_id} ({name})")
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    db.commit()

    logger.info(f"Faculty bulk upload: {len(created)} created, {len(skipped)} skipped, {len(errors)} errors")

    return {
        "message": f"Bulk upload complete. {len(created)} created, {len(skipped)} skipped, {len(errors)} errors.",
        "created": created,
        "skipped": skipped,
        "errors": errors,
    }


# Routes with path parameters MUST come after fixed routes
@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_admin_or_faculty)
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=db_user.id, username=db_user.username, role=db_user.role,
        name=db_user.name, employee_id=db_user.employee_id,
        email=db_user.email, phone=db_user.phone, department=db_user.department,
        designation=db_user.designation,
    )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    new_designation = user_update.designation if user_update.designation is not None else db_user.designation
    new_department = user_update.department if user_update.department is not None else db_user.department
    if new_designation and new_designation.upper() == 'HOD' and new_department:
        existing_hod = db.query(User).filter(
            User.role == 'faculty',
            User.designation == 'HOD',
            User.department == new_department,
            User.id != user_id
        ).first()
        if existing_hod:
            raise HTTPException(status_code=400, detail=f"{new_department} already has an HOD: {existing_hod.name} ({existing_hod.employee_id}). Remove the existing HOD designation first.")
    if user_update.name is not None:
        db_user.name = user_update.name
    if user_update.email is not None:
        db_user.email = user_update.email
    if user_update.phone is not None:
        db_user.phone = user_update.phone
    if user_update.department is not None:
        db_user.department = user_update.department
    if user_update.designation is not None:
        db_user.designation = user_update.designation
    db.commit()
    db.refresh(db_user)
    return UserResponse(
        id=db_user.id, username=db_user.username, role=db_user.role,
        name=db_user.name, employee_id=db_user.employee_id,
        email=db_user.email, phone=db_user.phone, department=db_user.department,
        designation=db_user.designation,
    )


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin)
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.username == current_admin.username:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    db.delete(db_user)
    db.commit()
    logger.info(f"User deleted: {db_user.username} by admin: {current_admin.username}")
    return {"message": "User deleted successfully"}
