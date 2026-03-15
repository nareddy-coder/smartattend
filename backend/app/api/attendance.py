"""
Attendance management endpoints for SmartAttend.
Face recognition-based attendance: session start, webcam frame processing,
multi-face detection/matching, period submission, student logs/summaries,
CSV/Excel export, and low-attendance alerts.
"""

import logging
import json
import pickle
import numpy as np
import cv2
from datetime import datetime, date, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from ..core.database import get_db
from ..core.config import settings
from ..models.models import AttendanceLog, Student, Embedding, User, FacultyAssignment, Section
from ..api import deps
from ..services.face_recognition import face_service

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
SIMILARITY_THRESHOLD = settings.FACE_SIMILARITY_THRESHOLD


@router.get("/taken-periods")
def get_taken_periods(
    section_id: int = Query(...),
    target_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Get periods already taken for a section on a given date."""
    if target_date:
        dt = datetime.strptime(target_date, "%Y-%m-%d").date()
    else:
        dt = date.today()

    logs = db.query(
        AttendanceLog.subject_name,
        AttendanceLog.period_number
    ).filter(
        AttendanceLog.submitted == True,
        AttendanceLog.period_number.isnot(None),
        AttendanceLog.student_roll.in_(
            db.query(Student.roll_number).filter(Student.section_id == section_id)
        ),
        func.date(AttendanceLog.timestamp) == dt
    ).distinct().all()

    taken = {}
    for subject_name, period_number in logs:
        key = subject_name or "__all__"
        if key not in taken:
            taken[key] = []
        if period_number not in taken[key]:
            taken[key].append(period_number)

    all_taken = list({period_number for _, period_number in logs if period_number is not None})

    return {"by_subject": taken, "all_taken": sorted(all_taken)}


@router.post("/recognize")
async def recognize_faces(
    file: UploadFile = File(...),
    section_id: int = Form(...),
    session_id: str = Form(...),
    subject_name: str = Form(None),
    db: Session = Depends(get_db),
    current_faculty: User = Depends(deps.get_current_user)
):
    # Read Image with size validation
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file. Could not decode.")

    # Detect Faces
    faces = face_service.preprocess_image(img)
    response_data = []

    # Get all embeddings for this section
    students = db.query(Student).filter(Student.section_id == section_id).all()
    known_embeddings = []

    for student in students:
        for embed in student.embeddings:
            try:
                known_embeddings.append({
                    "vector": pickle.loads(embed.embedding_vector),
                    "roll_number": student.roll_number,
                    "name": student.name,
                })
            except Exception as e:
                logger.warning(f"Failed to load embedding for {student.roll_number}: {e}")

    for face in faces:
        bbox = face['box']
        face_img = face['face_img']
        input_embed = face_service.generate_embedding(face_img)

        if input_embed is None:
            response_data.append({
                "bbox": bbox,
                "status": "Unknown",
                "student": None,
                "name": "Unknown",
                "roll_number": None,
                "confidence": 0.0
            })
            continue

        best_match = None
        max_sim = 0

        for known in known_embeddings:
            sim = face_service.compute_similarity(input_embed, known['vector'])
            if sim > max_sim:
                max_sim = sim
                best_match = known

        status = "Unknown"
        student_info = None

        if max_sim > SIMILARITY_THRESHOLD:
            status = "Identified"
            student_info = {"roll_number": best_match['roll_number'], "name": best_match['name']}

            existing_log = db.query(AttendanceLog).filter(
                AttendanceLog.session_id == session_id,
                AttendanceLog.student_roll == best_match['roll_number']
            ).first()

            if not existing_log:
                log = AttendanceLog(
                    student_roll=best_match['roll_number'],
                    session_id=session_id,
                    status="Present",
                    confidence_score=max_sim,
                    subject_name=subject_name
                )
                db.add(log)
                db.commit()

        response_data.append({
            "bbox": bbox,
            "status": status,
            "student": student_info,
            "name": student_info["name"] if student_info else "Unknown",
            "roll_number": student_info["roll_number"] if student_info else None,
            "confidence": float(max_sim)
        })

    return {"faces": response_data}


@router.get("/logs/{session_id}")
def get_session_logs(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    from urllib.parse import unquote
    session_id = unquote(session_id)
    logs = db.query(AttendanceLog).filter(AttendanceLog.session_id == session_id).all()
    results = []
    for log in logs:
        results.append({
            "roll_number": log.student_roll,
            "student_name": log.student.name if log.student else "Unknown",
            "timestamp": log.timestamp,
            "status": log.status,
            "confidence_score": log.confidence_score
        })
    return results


@router.get("/export/{session_id}")
async def export_attendance(
    session_id: str,
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Export attendance report as CSV or Excel"""
    from urllib.parse import unquote
    session_id = unquote(session_id)
    import pandas as pd
    import io

    logs = db.query(AttendanceLog).filter(AttendanceLog.session_id == session_id).all()

    if not logs:
        raise HTTPException(status_code=404, detail="No attendance records found for this session")

    data = []
    for log in logs:
        data.append({
            "Roll Number": log.student_roll,
            "Name": log.student.name if log.student else "Unknown",
            "Section": log.student.section.name if log.student and log.student.section else "N/A",
            "Timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "Status": log.status,
            "Confidence Score": round(log.confidence_score, 4) if log.confidence_score else 0
        })

    df = pd.DataFrame(data)

    if format.lower() == "excel":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Attendance')
        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=attendance_{session_id}.xlsx"}
        )
    else:
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=attendance_{session_id}.csv"}
        )


@router.get("/my-logs")
def get_my_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_student)
):
    """Get attendance logs for the logged-in student"""
    student = db.query(Student).filter(Student.roll_number == current_user.username).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found for this user")

    logs = db.query(AttendanceLog).filter(
        AttendanceLog.student_roll == student.roll_number,
        AttendanceLog.submitted == True
    ).order_by(AttendanceLog.timestamp.desc()).all()

    return [
        {
            "session_id": log.session_id,
            "timestamp": log.timestamp,
            "status": log.status,
            "confidence": log.confidence_score,
            "subject_name": log.subject_name,
            "period_number": log.period_number
        }
        for log in logs
    ]


@router.get("/my-subject-summary")
def get_my_subject_summary(
    mode: Optional[str] = Query("tillnow"),
    target_date: Optional[str] = Query(None),
    target_month: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_student)
):
    """Get subject-wise attendance summary for the logged-in student."""
    student = db.query(Student).filter(Student.roll_number == current_user.username).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    assignments = db.query(FacultyAssignment).filter(
        FacultyAssignment.section_id == student.section_id
    ).all()

    subject_names = list({a.subject_name for a in assignments})

    # Build date filters based on mode
    date_filters = []
    if mode == "period":
        dt = datetime.strptime(target_date, "%Y-%m-%d").date() if target_date else date.today()
        date_filters.append(func.date(AttendanceLog.timestamp) == dt)
    elif mode == "date_range":
        dt_from = datetime.strptime(from_date, "%Y-%m-%d").date() if from_date else date.today()
        dt_to = datetime.strptime(to_date, "%Y-%m-%d").date() if to_date else date.today()
        if dt_from > dt_to:
            raise HTTPException(status_code=400, detail="from_date must be before to_date")
        date_filters.append(func.date(AttendanceLog.timestamp) >= dt_from)
        date_filters.append(func.date(AttendanceLog.timestamp) <= dt_to)
    elif mode == "monthly":
        if target_month:
            year, month = map(int, target_month.split("-"))
        else:
            today = date.today()
            year, month = today.year, today.month
        from calendar import monthrange
        first_day = date(year, month, 1)
        last_day = date(year, month, monthrange(year, month)[1])
        date_filters.append(func.date(AttendanceLog.timestamp) >= first_day)
        date_filters.append(func.date(AttendanceLog.timestamp) <= last_day)

    summary = []
    total_held = 0
    total_attended = 0

    for subject in subject_names:
        held_query = db.query(func.count(distinct(AttendanceLog.session_id))).filter(
            AttendanceLog.subject_name == subject,
            AttendanceLog.submitted == True,
            AttendanceLog.student_roll.in_(
                db.query(Student.roll_number).filter(Student.section_id == student.section_id)
            )
        )
        for f in date_filters:
            held_query = held_query.filter(f)
        held = held_query.scalar() or 0

        attended_query = db.query(func.count(distinct(AttendanceLog.session_id))).filter(
            AttendanceLog.subject_name == subject,
            AttendanceLog.student_roll == student.roll_number,
            AttendanceLog.status == "Present",
            AttendanceLog.submitted == True
        )
        for f in date_filters:
            attended_query = attended_query.filter(f)
        attended = attended_query.scalar() or 0

        percentage = round((attended / held) * 100, 2) if held > 0 else 0.0

        summary.append({
            "subject": subject,
            "held": held,
            "attended": attended,
            "percentage": percentage
        })
        total_held += held
        total_attended += attended

    total_percentage = round((total_attended / total_held) * 100, 2) if total_held > 0 else 0.0

    return {
        "subjects": summary,
        "total_held": total_held,
        "total_attended": total_attended,
        "total_percentage": total_percentage
    }


@router.get("/my-period-summary")
def get_my_period_summary(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_student)
):
    """Get period-wise attendance for the student between two dates."""
    student = db.query(Student).filter(Student.roll_number == current_user.username).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    dt_from = datetime.strptime(from_date, "%Y-%m-%d").date() if from_date else date.today()
    dt_to = datetime.strptime(to_date, "%Y-%m-%d").date() if to_date else date.today()

    if dt_from > dt_to:
        raise HTTPException(status_code=400, detail="from_date must be before to_date")

    section_rolls = db.query(Student.roll_number).filter(Student.section_id == student.section_id)

    taken_periods = db.query(
        func.date(AttendanceLog.timestamp).label('dt'),
        AttendanceLog.period_number,
        AttendanceLog.subject_name,
    ).filter(
        AttendanceLog.submitted == True,
        AttendanceLog.period_number.isnot(None),
        AttendanceLog.student_roll.in_(section_rolls),
        func.date(AttendanceLog.timestamp) >= dt_from,
        func.date(AttendanceLog.timestamp) <= dt_to,
    ).distinct().all()

    student_present = db.query(
        func.date(AttendanceLog.timestamp).label('dt'),
        AttendanceLog.period_number,
    ).filter(
        AttendanceLog.submitted == True,
        AttendanceLog.period_number.isnot(None),
        AttendanceLog.student_roll == student.roll_number,
        AttendanceLog.status == "Present",
        func.date(AttendanceLog.timestamp) >= dt_from,
        func.date(AttendanceLog.timestamp) <= dt_to,
    ).distinct().all()

    present_set = {(str(r.dt), r.period_number) for r in student_present}

    date_period_map = {}
    for row in taken_periods:
        key = str(row.dt)
        if key not in date_period_map:
            date_period_map[key] = {}
        date_period_map[key][row.period_number] = row.subject_name

    periods = []
    total_held = 0
    total_attended = 0

    for dt_str in sorted(date_period_map.keys(), reverse=True):
        for period_num in sorted(date_period_map[dt_str].keys()):
            status = "Present" if (dt_str, period_num) in present_set else "Absent"
            periods.append({
                "date": dt_str,
                "period": period_num,
                "subject": date_period_map[dt_str][period_num],
                "status": status,
            })
            total_held += 1
            if status == "Present":
                total_attended += 1

    total_percentage = round((total_attended / total_held) * 100, 2) if total_held > 0 else 0.0

    return {
        "from_date": str(dt_from),
        "to_date": str(dt_to),
        "periods": periods,
        "total_held": total_held,
        "total_attended": total_attended,
        "total_percentage": total_percentage,
    }


@router.post("/session/{session_id}/submit")
def submit_attendance(
    session_id: str,
    section_id: int = Form(...),
    period_numbers: str = Form(...),
    subject_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_faculty: User = Depends(deps.get_current_user)
):
    """Submit attendance for selected periods."""
    from urllib.parse import unquote
    session_id = unquote(session_id)

    try:
        periods = json.loads(period_numbers)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid period_numbers format. Expected JSON array e.g. [1,2]")

    if not periods or not isinstance(periods, list):
        raise HTTPException(status_code=400, detail="At least one period must be selected")

    logs = db.query(AttendanceLog).filter(AttendanceLog.session_id == session_id).all()
    today = datetime.now(timezone.utc).date()

    # Check for period conflicts
    already_taken = db.query(AttendanceLog.period_number).filter(
        AttendanceLog.submitted == True,
        AttendanceLog.period_number.in_(periods),
        AttendanceLog.student_roll.in_(
            db.query(Student.roll_number).filter(Student.section_id == section_id)
        ),
        func.date(AttendanceLog.timestamp) == today
    ).distinct().all()
    already_taken_nums = {r[0] for r in already_taken}

    conflict = already_taken_nums & set(periods)
    if conflict:
        raise HTTPException(
            status_code=400,
            detail=f"Period(s) {sorted(conflict)} already have attendance submitted for this section today"
        )

    students = db.query(Student).filter(Student.section_id == section_id).all()
    present_rolls = {log.student_roll for log in logs}

    if not subject_name and logs:
        subject_name = logs[0].subject_name

    first_period = periods[0]

    try:
        if logs:
            for log in logs:
                log.submitted = True
                log.period_number = first_period
            db.flush()

        # Create Absent logs for students not in the session (for first period)
        for student in students:
            if student.roll_number not in present_rolls:
                absent_log = AttendanceLog(
                    student_roll=student.roll_number,
                    session_id=session_id,
                    status="Absent",
                    confidence_score=0.0,
                    subject_name=subject_name,
                    submitted=True,
                    period_number=first_period,
                )
                db.add(absent_log)

        # For additional periods, create logs for ALL students
        for p in periods[1:]:
            period_session_id = f"{session_id}__p{p}"
            for student in students:
                is_present = student.roll_number in present_rolls
                dup = AttendanceLog(
                    student_roll=student.roll_number,
                    session_id=period_session_id,
                    timestamp=datetime.now(timezone.utc),
                    status="Present" if is_present else "Absent",
                    confidence_score=1.0 if is_present else 0.0,
                    subject_name=subject_name,
                    submitted=True,
                    period_number=p,
                )
                db.add(dup)

        db.commit()
        logger.info(f"Attendance submitted for session {session_id}, periods {periods}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to submit attendance: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit attendance. Please try again.")

    present_students = []
    absent_students = []
    for student in students:
        info = {"roll_number": student.roll_number, "name": student.name, "email": student.email}
        if student.roll_number in present_rolls:
            present_students.append(info)
        else:
            absent_students.append(info)

    return {
        "message": f"Attendance submitted for Period(s) {sorted(periods)}. It will now reflect in student dashboards.",
        "present_students": present_students,
        "absent_students": absent_students,
        "periods": sorted(periods),
    }


@router.post("/manual-mark")
def manual_mark_present(
    session_id: str = Form(...),
    student_roll: str = Form(...),
    section_id: int = Form(...),
    subject_name: str = Form(None),
    db: Session = Depends(get_db),
    current_faculty: User = Depends(deps.get_current_user)
):
    """Manually mark a student as present (e.g., HOD permission)."""
    student = db.query(Student).filter(
        Student.roll_number == student_roll,
        Student.section_id == section_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in this section")

    existing = db.query(AttendanceLog).filter(
        AttendanceLog.session_id == session_id,
        AttendanceLog.student_roll == student_roll
    ).first()

    if existing:
        return {"message": f"{student.name} is already marked present in this session"}

    log = AttendanceLog(
        student_roll=student_roll,
        session_id=session_id,
        status="Present",
        confidence_score=1.0,
        subject_name=subject_name,
    )
    db.add(log)
    db.commit()

    logger.info(f"Manual mark: {student_roll} marked present by {current_faculty.username}")

    return {
        "message": f"{student.name} ({student_roll}) manually marked present (HOD Permission)",
        "student": {
            "roll_number": student.roll_number,
            "name": student.name,
        }
    }


@router.post("/manual-unmark")
def manual_unmark_present(
    session_id: str = Form(...),
    student_roll: str = Form(...),
    db: Session = Depends(get_db),
    current_faculty: User = Depends(deps.get_current_user)
):
    """Remove a manually marked student from the session."""
    log = db.query(AttendanceLog).filter(
        AttendanceLog.session_id == session_id,
        AttendanceLog.student_roll == student_roll,
        AttendanceLog.submitted == False,
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="No unsubmitted attendance log found for this student in this session")

    db.delete(log)
    db.commit()

    return {"message": f"{student_roll} removed from this session's attendance"}


@router.post("/session/{session_id}/complete")
def complete_attendance_session(
    session_id: str,
    section_id: int = Form(...),
    db: Session = Depends(get_db),
    current_faculty: User = Depends(deps.get_current_user)
):
    from urllib.parse import unquote
    session_id = unquote(session_id)
    from ..services.email_service import send_attendance_email

    students = db.query(Student).filter(Student.section_id == section_id).all()
    logs = db.query(AttendanceLog).filter(AttendanceLog.session_id == session_id).all()

    present_rolls = {log.student_roll for log in logs if log.status in ("Present", "Identified")}

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    absent_students = []
    present_students = []

    for student in students:
        status = "Present" if student.roll_number in present_rolls else "Absent"
        info = {"roll_number": student.roll_number, "name": student.name, "email": student.email}
        if status == "Absent":
            absent_students.append(info)
        else:
            present_students.append(info)

        if student.email:
            send_attendance_email(student.email, student.name, status, date_str)

    return {
        "message": "Session completed and emails dispatched.",
        "absent_students": absent_students,
        "present_students": present_students
    }


@router.get("/faculty/session-history")
def get_faculty_session_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Get session history for the current faculty."""
    assignments = db.query(FacultyAssignment).filter(
        FacultyAssignment.faculty_id == current_user.id
    ).all()

    if not assignments:
        return []

    section_ids = list({a.section_id for a in assignments})
    subject_names = list({a.subject_name for a in assignments})

    sessions = db.query(
        AttendanceLog.session_id,
        AttendanceLog.subject_name,
        AttendanceLog.period_number,
        func.min(AttendanceLog.timestamp).label('session_time'),
        func.count(func.distinct(AttendanceLog.student_roll)).label('student_count'),
    ).filter(
        AttendanceLog.submitted == True,
        AttendanceLog.subject_name.in_(subject_names),
        AttendanceLog.student_roll.in_(
            db.query(Student.roll_number).filter(Student.section_id.in_(section_ids))
        ),
    ).group_by(
        AttendanceLog.session_id,
        AttendanceLog.subject_name,
        AttendanceLog.period_number,
    ).order_by(func.min(AttendanceLog.timestamp).desc()).limit(50).all()

    results = []
    for s in sessions:
        present = db.query(func.count(AttendanceLog.id)).filter(
            AttendanceLog.session_id == s.session_id,
            AttendanceLog.subject_name == s.subject_name,
            AttendanceLog.period_number == s.period_number,
            AttendanceLog.status == "Present",
            AttendanceLog.submitted == True,
        ).scalar() or 0

        results.append({
            "session_id": s.session_id,
            "subject_name": s.subject_name,
            "period_number": s.period_number,
            "date": s.session_time.strftime("%Y-%m-%d") if s.session_time else None,
            "time": s.session_time.strftime("%H:%M") if s.session_time else None,
            "total_students": s.student_count,
            "present_count": present,
        })

    return results


@router.get("/low-attendance")
def get_low_attendance_students(
    threshold: float = Query(75.0),
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_admin_or_faculty),
):
    """Get students below a given attendance percentage."""
    all_students = db.query(Student).all()
    results = []

    for student in all_students:
        section_rolls = db.query(Student.roll_number).filter(Student.section_id == student.section_id)
        held = db.query(func.count(distinct(AttendanceLog.session_id))).filter(
            AttendanceLog.submitted == True,
            AttendanceLog.student_roll.in_(section_rolls),
        ).scalar() or 0

        if held == 0:
            continue

        attended = db.query(func.count(distinct(AttendanceLog.session_id))).filter(
            AttendanceLog.student_roll == student.roll_number,
            AttendanceLog.status == "Present",
            AttendanceLog.submitted == True,
        ).scalar() or 0

        pct = round((attended / held) * 100, 2)
        if pct < threshold:
            section = db.query(Section).filter(Section.id == student.section_id).first()
            results.append({
                "roll_number": student.roll_number,
                "name": student.name,
                "section": section.name if section else str(student.section_id),
                "department": student.department,
                "attended": attended,
                "held": held,
                "percentage": pct,
            })

    results.sort(key=lambda x: x["percentage"])
    return results


@router.get("/admin/export")
def admin_export_attendance(
    section_id: int = Query(...),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_admin_or_faculty),
):
    """Export attendance summary for a section as CSV."""
    import io

    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    section_students = db.query(Student).filter(Student.section_id == section_id).all()
    subjects = list({a.subject_name for a in db.query(FacultyAssignment).filter(
        FacultyAssignment.section_id == section_id
    ).all()})

    date_filters = []
    if from_date:
        date_filters.append(func.date(AttendanceLog.timestamp) >= datetime.strptime(from_date, "%Y-%m-%d").date())
    if to_date:
        date_filters.append(func.date(AttendanceLog.timestamp) <= datetime.strptime(to_date, "%Y-%m-%d").date())

    section_rolls = [s.roll_number for s in section_students]

    rows = []
    for student in section_students:
        row = {"Roll Number": student.roll_number, "Name": student.name}
        total_held = 0
        total_attended = 0

        for subject in subjects:
            held_q = db.query(func.count(distinct(AttendanceLog.session_id))).filter(
                AttendanceLog.subject_name == subject,
                AttendanceLog.submitted == True,
                AttendanceLog.student_roll.in_(section_rolls),
            )
            for f in date_filters:
                held_q = held_q.filter(f)
            held = held_q.scalar() or 0

            att_q = db.query(func.count(distinct(AttendanceLog.session_id))).filter(
                AttendanceLog.subject_name == subject,
                AttendanceLog.student_roll == student.roll_number,
                AttendanceLog.status == "Present",
                AttendanceLog.submitted == True,
            )
            for f in date_filters:
                att_q = att_q.filter(f)
            attended = att_q.scalar() or 0

            pct = round((attended / held) * 100, 1) if held > 0 else 0
            row[subject] = f"{attended}/{held} ({pct}%)"
            total_held += held
            total_attended += attended

        overall = round((total_attended / total_held) * 100, 1) if total_held > 0 else 0
        row["Overall"] = f"{total_attended}/{total_held} ({overall}%)"
        rows.append(row)

    headers = ["Roll Number", "Name"] + subjects + ["Overall"]

    # Use proper CSV writer for escaping
    import csv
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    for row in rows:
        writer.writerow({h: row.get(h, "-") for h in headers})

    filename = f"attendance_{section.name}_{from_date or 'all'}_{to_date or 'all'}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
