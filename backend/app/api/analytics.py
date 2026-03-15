"""
Analytics and dashboard statistics endpoints for SmartAttend.
Provides: overall stats, attendance trends, department/section comparisons,
weekly reports, and low-attendance alerts.
"""

import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import Optional
from datetime import datetime, date, timedelta

from ..core.database import get_db
from ..models.models import AttendanceLog, Student, Section, FacultyAssignment, User
from ..api import deps

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_admin_or_faculty),
):
    """Get overall dashboard statistics for admin."""
    total_students = db.query(func.count(Student.roll_number)).scalar() or 0
    total_faculty = db.query(func.count(User.id)).filter(User.role == "faculty").scalar() or 0
    total_sections = db.query(func.count(Section.id)).scalar() or 0

    today = date.today()
    today_sessions = db.query(func.count(distinct(AttendanceLog.session_id))).filter(
        AttendanceLog.submitted == True,
        func.date(AttendanceLog.timestamp) == today
    ).scalar() or 0

    today_present = db.query(func.count(distinct(AttendanceLog.student_roll))).filter(
        AttendanceLog.submitted == True,
        AttendanceLog.status == "Present",
        func.date(AttendanceLog.timestamp) == today
    ).scalar() or 0

    today_absent = db.query(func.count(distinct(AttendanceLog.student_roll))).filter(
        AttendanceLog.submitted == True,
        AttendanceLog.status == "Absent",
        func.date(AttendanceLog.timestamp) == today
    ).scalar() or 0

    return {
        "total_students": total_students,
        "total_faculty": total_faculty,
        "total_sections": total_sections,
        "today_sessions": today_sessions,
        "today_present_students": today_present,
        "today_absent_students": today_absent,
    }


@router.get("/attendance-trends")
def get_attendance_trends(
    days: int = Query(30, ge=7, le=365),
    section_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get daily attendance trends for the last N days."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    # Get present counts per day
    from sqlalchemy import case
    present_results = db.query(
        func.date(AttendanceLog.timestamp).label('dt'),
        func.count(AttendanceLog.id).label('total'),
        func.sum(case((AttendanceLog.status == "Present", 1), else_=0)).label('present'),
    ).filter(
        AttendanceLog.submitted == True,
        func.date(AttendanceLog.timestamp) >= start_date,
        func.date(AttendanceLog.timestamp) <= end_date,
    )

    if section_id:
        section_rolls = db.query(Student.roll_number).filter(Student.section_id == section_id)
        present_results = present_results.filter(AttendanceLog.student_roll.in_(section_rolls))

    results = present_results.group_by(
        func.date(AttendanceLog.timestamp)
    ).order_by(func.date(AttendanceLog.timestamp)).all()

    trends = []
    for row in results:
        total = row.total or 0
        present = row.present or 0
        trends.append({
            "date": str(row.dt),
            "present": present,
            "absent": total - present,
            "total": total,
            "percentage": round((present / total) * 100, 1) if total > 0 else 0
        })

    return {"trends": trends, "from_date": str(start_date), "to_date": str(end_date)}


@router.get("/department-summary")
def get_department_summary(
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_admin_or_faculty),
):
    """Get attendance summary grouped by department."""
    departments = db.query(distinct(Section.department)).filter(Section.department.isnot(None)).all()

    summary = []
    for (dept,) in departments:
        section_ids = [s.id for s in db.query(Section).filter(Section.department == dept).all()]
        if not section_ids:
            continue

        student_count = db.query(func.count(Student.roll_number)).filter(
            Student.section_id.in_(section_ids)
        ).scalar() or 0

        section_rolls = db.query(Student.roll_number).filter(Student.section_id.in_(section_ids))

        total_logs = db.query(func.count(AttendanceLog.id)).filter(
            AttendanceLog.submitted == True,
            AttendanceLog.student_roll.in_(section_rolls)
        ).scalar() or 0

        present_logs = db.query(func.count(AttendanceLog.id)).filter(
            AttendanceLog.submitted == True,
            AttendanceLog.status == "Present",
            AttendanceLog.student_roll.in_(section_rolls)
        ).scalar() or 0

        summary.append({
            "department": dept,
            "student_count": student_count,
            "section_count": len(section_ids),
            "total_records": total_logs,
            "present_records": present_logs,
            "percentage": round((present_logs / total_logs) * 100, 1) if total_logs > 0 else 0
        })

    summary.sort(key=lambda x: x["percentage"], reverse=True)
    return summary


@router.get("/section-comparison")
def get_section_comparison(
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_admin_or_faculty),
):
    """Get attendance comparison across sections."""
    sections = db.query(Section).all()

    comparison = []
    for section in sections:
        student_count = db.query(func.count(Student.roll_number)).filter(
            Student.section_id == section.id
        ).scalar() or 0

        section_rolls = db.query(Student.roll_number).filter(Student.section_id == section.id)

        total = db.query(func.count(AttendanceLog.id)).filter(
            AttendanceLog.submitted == True,
            AttendanceLog.student_roll.in_(section_rolls)
        ).scalar() or 0

        present = db.query(func.count(AttendanceLog.id)).filter(
            AttendanceLog.submitted == True,
            AttendanceLog.status == "Present",
            AttendanceLog.student_roll.in_(section_rolls)
        ).scalar() or 0

        comparison.append({
            "section_id": section.id,
            "section_name": section.name,
            "department": section.department,
            "year": section.year,
            "student_count": student_count,
            "total_records": total,
            "present_records": present,
            "percentage": round((present / total) * 100, 1) if total > 0 else 0
        })

    comparison.sort(key=lambda x: x["percentage"], reverse=True)
    return comparison


@router.get("/weekly-report")
def get_weekly_report(
    section_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get week-over-week attendance comparison."""
    today = date.today()
    this_week_start = today - timedelta(days=today.weekday())
    last_week_start = this_week_start - timedelta(days=7)
    last_week_end = this_week_start - timedelta(days=1)

    def get_week_stats(start, end):
        query = db.query(
            func.count(AttendanceLog.id).label('total'),
        ).filter(
            AttendanceLog.submitted == True,
            func.date(AttendanceLog.timestamp) >= start,
            func.date(AttendanceLog.timestamp) <= end,
        )
        if section_id:
            section_rolls = db.query(Student.roll_number).filter(Student.section_id == section_id)
            query = query.filter(AttendanceLog.student_roll.in_(section_rolls))

        total = query.scalar() or 0

        present_query = db.query(
            func.count(AttendanceLog.id),
        ).filter(
            AttendanceLog.submitted == True,
            AttendanceLog.status == "Present",
            func.date(AttendanceLog.timestamp) >= start,
            func.date(AttendanceLog.timestamp) <= end,
        )
        if section_id:
            section_rolls = db.query(Student.roll_number).filter(Student.section_id == section_id)
            present_query = present_query.filter(AttendanceLog.student_roll.in_(section_rolls))

        present = present_query.scalar() or 0
        return {
            "total": total,
            "present": present,
            "absent": total - present,
            "percentage": round((present / total) * 100, 1) if total > 0 else 0,
        }

    this_week = get_week_stats(this_week_start, today)
    last_week = get_week_stats(last_week_start, last_week_end)

    change = this_week["percentage"] - last_week["percentage"]

    return {
        "this_week": {**this_week, "from": str(this_week_start), "to": str(today)},
        "last_week": {**last_week, "from": str(last_week_start), "to": str(last_week_end)},
        "percentage_change": round(change, 1),
        "trend": "up" if change > 0 else ("down" if change < 0 else "stable"),
    }
