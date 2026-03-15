"""
Timetable generation and retrieval endpoints for SmartAttend.
Constraint-based scheduling: distributes subjects across days/periods,
avoids faculty conflicts, respects lunch breaks and daily limits.
"""

import logging
import random
from math import ceil
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..core.database import get_db
from ..core.config import settings
from ..models.models import TimetableSlot, FacultyAssignment, Section, User, Student
from ..api import deps

logger = logging.getLogger(__name__)
router = APIRouter()

DAYS = settings.TIMETABLE_DAYS
PERIODS_PER_DAY = settings.TIMETABLE_PERIODS_PER_DAY
ALL_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAY_NAMES = ALL_DAY_NAMES[:DAYS]


class TimetableSlotOut(BaseModel):
    id: int
    section_id: int
    day_of_week: int
    day_name: str
    period_number: int
    subject_name: str
    faculty_id: int
    faculty_name: Optional[str] = None
    section_name: Optional[str] = None
    section_department: Optional[str] = None
    section_year: Optional[int] = None

    class Config:
        from_attributes = True


class TimetableResponse(BaseModel):
    section_id: int
    section_name: str
    department: Optional[str] = None
    year: Optional[int] = None
    semester: Optional[int] = None
    slots: List[TimetableSlotOut]


def _build_slot_response(slot: TimetableSlot) -> TimetableSlotOut:
    day_name = DAY_NAMES[slot.day_of_week] if slot.day_of_week < len(DAY_NAMES) else f"Day {slot.day_of_week}"
    section = slot.section
    return TimetableSlotOut(
        id=slot.id,
        section_id=slot.section_id,
        day_of_week=slot.day_of_week,
        day_name=day_name,
        period_number=slot.period_number,
        subject_name=slot.subject_name,
        faculty_id=slot.faculty_id,
        faculty_name=slot.faculty.name if slot.faculty else None,
        section_name=section.name if section else None,
        section_department=section.department if section else None,
        section_year=section.year if section else None,
    )


def _is_lab(assignment) -> bool:
    """Check if an assignment is a lab (by subject_type field or name fallback)."""
    if hasattr(assignment, 'subject_type') and assignment.subject_type:
        return assignment.subject_type.lower() == "lab"
    return "lab" in assignment.subject_name.lower()


def _preallocate_all_labs(db: Session):
    """
    Globally pre-allocate lab windows across ALL sections before per-section generation.
    Returns: dict mapping (section_id, subject_name) -> (day, window) where window = [p1, p2, p3]
    """
    LUNCH_PERIOD = 3
    before_lunch = list(range(LUNCH_PERIOD))                      # [0, 1, 2]
    after_lunch = list(range(LUNCH_PERIOD + 1, PERIODS_PER_DAY))  # [4, 5, 6]

    # Only 2 valid windows per day: before-lunch and after-lunch
    all_windows = []
    for day in range(DAYS):
        all_windows.append((day, before_lunch[:3]))   # [0,1,2]
        all_windows.append((day, after_lunch[:3]))     # [4,5,6]

    # Gather all lab assignments across all sections
    all_labs = []
    for a in db.query(FacultyAssignment).all():
        if _is_lab(a):
            all_labs.append(a)

    # Group by faculty to schedule heaviest-loaded faculty first
    from collections import defaultdict
    faculty_labs = defaultdict(list)
    for a in all_labs:
        faculty_labs[a.faculty_id].append(a)

    # Sort faculty by number of lab sections (most constrained first)
    sorted_faculty = sorted(faculty_labs.items(), key=lambda x: len(x[1]), reverse=True)

    # Track which windows are used: per-faculty and per-section
    faculty_used_windows = defaultdict(set)   # faculty_id -> set of (day, half) tuples
    section_used_windows = defaultdict(set)   # section_id -> set of (day, half) tuples

    allocation = {}  # (section_id, subject_name) -> (day, [p1, p2, p3])

    for faculty_id, labs in sorted_faculty:
        random.shuffle(labs)
        available = list(range(len(all_windows)))
        random.shuffle(available)

        for lab in labs:
            placed = False
            for wi in available:
                day, window = all_windows[wi]
                half = 'before' if window[0] < LUNCH_PERIOD else 'after'
                key = (day, half)

                # Faculty must be free in this window
                if key in faculty_used_windows[faculty_id]:
                    continue
                # Section must be free in this window
                if key in section_used_windows[lab.section_id]:
                    continue

                allocation[(lab.section_id, lab.subject_name)] = (day, window)
                faculty_used_windows[faculty_id].add(key)
                section_used_windows[lab.section_id].add(key)
                placed = True
                break

            if not placed:
                # Could not find a window — will fall back to per-section placement
                pass

    return allocation


# Global lab allocation cache (populated by generate-all, used by _generate_timetable)
_lab_allocation_cache = {}


def _generate_timetable(db: Session, section_id: int):
    """
    Auto-generate timetable for a section using greedy constraint-based scheduling.
    - Lab subjects (3 periods) are placed in consecutive slots on the same day
    - Remaining empty slots are filled with FIP (Faculty Interaction Period) and Seminar
    """

    assignments = db.query(FacultyAssignment).filter(
        FacultyAssignment.section_id == section_id
    ).all()

    if not assignments:
        raise HTTPException(status_code=400, detail="No subject assignments found for this section. Add assignments first.")

    LUNCH_PERIOD = 3  # 0-indexed; period_number 4 = lunch (12:00-1:00)

    total_periods = sum(a.periods for a in assignments)
    max_slots = DAYS * (PERIODS_PER_DAY - 1)  # exclude lunch period

    if total_periods > max_slots:
        raise HTTPException(
            status_code=400,
            detail=f"Total periods ({total_periods}) exceed available slots ({max_slots}). Reduce assignments or periods."
        )

    # Separate lab and regular assignments
    lab_assignments = [a for a in assignments if _is_lab(a)]
    regular_assignments = [a for a in assignments if not _is_lab(a)]

    faculty_ids = list(set(a.faculty_id for a in assignments))
    # Load existing slots but exclude FIP/Seminar (they don't represent real teaching)
    existing_slots = db.query(TimetableSlot).filter(
        TimetableSlot.faculty_id.in_(faculty_ids),
        TimetableSlot.section_id != section_id,
        TimetableSlot.subject_name.notin_(["FIP", "Seminar"]),
    ).all()

    faculty_busy = {}
    for fid in faculty_ids:
        faculty_busy[fid] = set()
    for slot in existing_slots:
        if slot.faculty_id in faculty_busy:
            # Convert 1-indexed period_number from DB to 0-indexed for grid comparison
            faculty_busy[slot.faculty_id].add((slot.day_of_week, slot.period_number - 1))

    grid = [[None for _ in range(PERIODS_PER_DAY)] for _ in range(DAYS)]
    subject_day_count = {}

    # --- Step 1: Place labs first (need 3 consecutive periods on same day) ---
    random.shuffle(lab_assignments)

    for lab in lab_assignments:
        placed = False
        fid = lab.faculty_id

        # Check if there's a pre-allocated window from global lab planning
        prealloc_key = (section_id, lab.subject_name)
        if prealloc_key in _lab_allocation_cache:
            prealloc_day, prealloc_window = _lab_allocation_cache[prealloc_key]
            # Verify the window is still valid
            if (all(grid[prealloc_day][p] is None for p in prealloc_window) and
                not any((prealloc_day, p) in faculty_busy.get(fid, set()) for p in prealloc_window)):
                for p in prealloc_window:
                    grid[prealloc_day][p] = (lab.subject_name, lab.faculty_id)
                    faculty_busy.setdefault(fid, set()).add((prealloc_day, p))
                subject_day_count[(lab.subject_name, prealloc_day)] = 3
                placed = True

        if not placed:
            # Standard placement: try all valid windows (no lunch crossing)
            days_order = list(range(DAYS))
            random.shuffle(days_order)
            before_lunch = list(range(LUNCH_PERIOD))                          # [0, 1, 2]
            after_lunch = list(range(LUNCH_PERIOD + 1, PERIODS_PER_DAY))      # [4, 5, 6]

            for day in days_order:
                windows = []
                for block in [before_lunch, after_lunch]:
                    for i in range(len(block) - 2):
                        windows.append([block[i], block[i + 1], block[i + 2]])
                random.shuffle(windows)

                for window in windows:
                    if any(grid[day][p] is not None for p in window):
                        continue
                    if any((day, p) in faculty_busy.get(fid, set()) for p in window):
                        continue

                    for p in window:
                        grid[day][p] = (lab.subject_name, lab.faculty_id)
                        faculty_busy.setdefault(fid, set()).add((day, p))
                    subject_day_count[(lab.subject_name, day)] = 3
                    placed = True
                    break

                if placed:
                    break

        if not placed:
            raise HTTPException(
                status_code=409,
                detail=f"Could not place lab '{lab.subject_name}' in 3 consecutive periods. Faculty may be overloaded."
            )

    # --- Step 2: Place regular subjects ---
    slot_pool = []
    for a in regular_assignments:
        for _ in range(a.periods):
            slot_pool.append((a.subject_name, a.faculty_id, a.periods))

    subject_max_per_day = {}
    for a in regular_assignments:
        subject_max_per_day[a.subject_name] = ceil(a.periods / DAYS)

    random.shuffle(slot_pool)
    slot_pool.sort(key=lambda x: x[2])

    all_positions = [(d, p) for d in range(DAYS) for p in range(PERIODS_PER_DAY) if p != LUNCH_PERIOD]

    for subject_name, faculty_id, _ in slot_pool:
        placed = False
        random.shuffle(all_positions)

        # Try with daily spread constraint first, then relax if needed
        for relax in (False, True):
            for day, period in all_positions:
                if grid[day][period] is not None:
                    continue
                if (day, period) in faculty_busy.get(faculty_id, set()):
                    continue
                if not relax:
                    key = (subject_name, day)
                    current_count = subject_day_count.get(key, 0)
                    if current_count >= subject_max_per_day.get(subject_name, 1):
                        continue

                grid[day][period] = (subject_name, faculty_id)
                subject_day_count[(subject_name, day)] = subject_day_count.get((subject_name, day), 0) + 1
                faculty_busy.setdefault(faculty_id, set()).add((day, period))
                placed = True
                break
            if placed:
                break

        if not placed:
            raise HTTPException(
                status_code=409,
                detail=f"Could not place all periods for '{subject_name}'. Faculty may be overloaded. Try regenerating or reduce assignments."
            )

    # --- Step 3: Fill empty slots with FIP and Seminar ---
    # Use a dummy faculty_id=0 for these (no real faculty assigned)
    # Get any faculty_id from this section's assignments as placeholder
    placeholder_faculty_id = assignments[0].faculty_id if assignments else 1

    fip_count = 0
    seminar_count = 0

    for day in range(DAYS):
        for period in range(PERIODS_PER_DAY):
            if period == LUNCH_PERIOD:
                continue  # Skip lunch
            if grid[day][period] is not None:
                continue  # Already filled

            # Alternate between FIP and Seminar
            if fip_count <= seminar_count:
                grid[day][period] = ("FIP", placeholder_faculty_id)
                fip_count += 1
            else:
                grid[day][period] = ("Seminar", placeholder_faculty_id)
                seminar_count += 1

    # --- Step 4: Build timetable slots ---
    new_slots = []
    for day in range(DAYS):
        for period in range(PERIODS_PER_DAY):
            if grid[day][period] is not None:
                subject_name, faculty_id = grid[day][period]
                new_slots.append(TimetableSlot(
                    section_id=section_id,
                    day_of_week=day,
                    period_number=period + 1,
                    subject_name=subject_name,
                    faculty_id=faculty_id,
                ))

    db.bulk_save_objects(new_slots)
    db.commit()

    return len(new_slots)


@router.post("/generate/{section_id}")
def generate_timetable(
    section_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin),
):
    """Generate timetable for a section. Deletes existing timetable first."""
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    db.query(TimetableSlot).filter(TimetableSlot.section_id == section_id).delete()
    db.commit()

    count = _generate_timetable(db, section_id)
    logger.info(f"Timetable generated for section {section_id}: {count} slots")
    return {"message": f"Timetable generated successfully with {count} slots", "slots_created": count}


@router.get("/section/{section_id}", response_model=TimetableResponse)
def get_section_timetable(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get timetable for a section."""
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    slots = db.query(TimetableSlot).filter(
        TimetableSlot.section_id == section_id
    ).order_by(TimetableSlot.day_of_week, TimetableSlot.period_number).all()

    return TimetableResponse(
        section_id=section.id,
        section_name=section.name,
        department=section.department,
        year=section.year,
        semester=section.semester,
        slots=[_build_slot_response(s) for s in slots],
    )


@router.get("/faculty/me", response_model=List[TimetableSlotOut])
def get_my_timetable(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get current faculty's timetable across all sections."""
    slots = db.query(TimetableSlot).filter(
        TimetableSlot.faculty_id == current_user.id,
    ).order_by(TimetableSlot.day_of_week, TimetableSlot.period_number).all()

    return [_build_slot_response(s) for s in slots]


@router.get("/student/me", response_model=TimetableResponse)
def get_student_timetable(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Get timetable for the current student's section."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        # Fallback: try matching by username = roll_number
        student = db.query(Student).filter(Student.roll_number == current_user.username).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    section = db.query(Section).filter(Section.id == student.section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    slots = db.query(TimetableSlot).filter(
        TimetableSlot.section_id == student.section_id
    ).order_by(TimetableSlot.day_of_week, TimetableSlot.period_number).all()

    return TimetableResponse(
        section_id=section.id,
        section_name=section.name,
        department=section.department,
        year=section.year,
        semester=section.semester,
        slots=[_build_slot_response(s) for s in slots],
    )


@router.post("/generate-all")
def generate_all_timetables(
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin),
):
    """Generate timetables for ALL sections that have assignments."""
    section_ids = [row[0] for row in db.query(FacultyAssignment.section_id).distinct().all()]

    if not section_ids:
        raise HTTPException(status_code=400, detail="No assignments found for any section.")

    global _lab_allocation_cache
    best_results = []
    best_errors = section_ids[:]  # worst case

    # Try multiple global orderings to find the best result
    for global_attempt in range(10):
        db.query(TimetableSlot).delete()
        db.commit()

        # Pre-allocate lab windows globally before per-section generation
        _lab_allocation_cache = _preallocate_all_labs(db)
        logger.info(f"Pre-allocated {len(_lab_allocation_cache)} lab windows globally")

        random.shuffle(section_ids)
        results = []
        errors = []
        failed_sids = []

        for sid in section_ids:
            section = db.query(Section).filter(Section.id == sid).first()
            section_label = f"{section.name} ({section.department} Year {section.year})" if section else f"ID {sid}"
            generated = False
            last_error = ""
            for attempt in range(15):
                try:
                    db.query(TimetableSlot).filter(TimetableSlot.section_id == sid).delete()
                    db.commit()
                    count = _generate_timetable(db, sid)
                    results.append(f"{section_label}: {count} slots")
                    generated = True
                    break
                except HTTPException as e:
                    last_error = e.detail
            if not generated:
                errors.append(f"{section_label}: {last_error}")
                failed_sids.append(sid)

        # Phase 2: "Jiggle" — for each failed section, find sections sharing lab faculty,
        # delete those neighbors + failed section, and re-generate them together
        if failed_sids:
            for fsid in list(failed_sids):
                # Find lab faculty for this section
                lab_faculty_ids = [
                    a.faculty_id for a in db.query(FacultyAssignment).filter(
                        FacultyAssignment.section_id == fsid
                    ).all() if _is_lab(a)
                ]
                # Find other sections sharing those lab faculty
                neighbor_sids = set()
                for fid in lab_faculty_ids:
                    related = db.query(FacultyAssignment.section_id).filter(
                        FacultyAssignment.faculty_id == fid,
                        FacultyAssignment.section_id != fsid,
                    ).distinct().all()
                    for r in related:
                        neighbor_sids.add(r[0])

                # Pick up to 3 random neighbors to jiggle
                neighbors = random.sample(list(neighbor_sids), min(3, len(neighbor_sids)))
                jiggle_sids = [fsid] + neighbors

                for js in jiggle_sids:
                    db.query(TimetableSlot).filter(TimetableSlot.section_id == js).delete()
                db.commit()

                # Re-generate jiggled sections in random order
                jiggle_ok = True
                for js in random.sample(jiggle_sids, len(jiggle_sids)):
                    regen = False
                    for attempt in range(15):
                        try:
                            db.query(TimetableSlot).filter(TimetableSlot.section_id == js).delete()
                            db.commit()
                            _generate_timetable(db, js)
                            regen = True
                            break
                        except HTTPException:
                            pass
                    if not regen:
                        jiggle_ok = False

                if jiggle_ok and fsid in failed_sids:
                    failed_sids.remove(fsid)
                    # Update results/errors
                    section = db.query(Section).filter(Section.id == fsid).first()
                    section_label = f"{section.name} ({section.department} Year {section.year})" if section else f"ID {fsid}"
                    results.append(f"{section_label}: jiggled OK")
                    errors = [e for e in errors if not e.startswith(section_label)]

        if len(results) > len(best_results):
            best_results = results
            best_errors = errors

        logger.info(f"Generate-all attempt {global_attempt + 1}: {len(results)}/{len(section_ids)} OK, {len(errors)} failed")

        if not errors:
            break  # Perfect — all sections generated

    logger.info(f"Generated timetables for {len(best_results)} sections, {len(best_errors)} errors (best of attempts)")

    return {
        "message": f"Generated timetables for {len(best_results)} sections. {len(best_errors)} failed.",
        "generated": best_results,
        "errors": best_errors,
    }


@router.get("/check-conflicts")
def check_conflicts(
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_admin_or_faculty),
):
    """Check for faculty conflicts across all timetables."""
    # Exclude FIP/Seminar as they are placeholder activities, not real teaching
    all_slots = db.query(TimetableSlot).filter(
        TimetableSlot.subject_name.notin_(["FIP", "Seminar"])
    ).all()

    slot_map = {}
    conflicts = []
    for slot in all_slots:
        key = (slot.faculty_id, slot.day_of_week, slot.period_number)
        if key in slot_map:
            other = slot_map[key]
            faculty = db.query(User).filter(User.id == slot.faculty_id).first()
            section1 = db.query(Section).filter(Section.id == other.section_id).first()
            section2 = db.query(Section).filter(Section.id == slot.section_id).first()
            conflicts.append({
                "faculty": faculty.name if faculty else f"ID {slot.faculty_id}",
                "day": DAY_NAMES[slot.day_of_week] if slot.day_of_week < len(DAY_NAMES) else f"Day {slot.day_of_week}",
                "period": slot.period_number,
                "section_1": section1.name if section1 else str(other.section_id),
                "subject_1": other.subject_name,
                "section_2": section2.name if section2 else str(slot.section_id),
                "subject_2": slot.subject_name,
            })
        else:
            slot_map[key] = slot

    return {
        "has_conflicts": len(conflicts) > 0,
        "conflict_count": len(conflicts),
        "conflicts": conflicts,
    }


class SlotUpdateRequest(BaseModel):
    subject_name: str
    faculty_id: int


@router.put("/slot/{slot_id}")
def update_timetable_slot(
    slot_id: int,
    data: SlotUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin),
):
    """Manually edit a single timetable slot with conflict checking."""
    slot = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found")

    conflict = db.query(TimetableSlot).filter(
        TimetableSlot.faculty_id == data.faculty_id,
        TimetableSlot.day_of_week == slot.day_of_week,
        TimetableSlot.period_number == slot.period_number,
        TimetableSlot.id != slot_id,
    ).first()

    if conflict:
        faculty = db.query(User).filter(User.id == data.faculty_id).first()
        section = db.query(Section).filter(Section.id == conflict.section_id).first()
        day_name = DAY_NAMES[slot.day_of_week] if slot.day_of_week < len(DAY_NAMES) else f"Day {slot.day_of_week}"
        raise HTTPException(
            status_code=409,
            detail=f"Faculty '{faculty.name if faculty else data.faculty_id}' is already assigned to {section.name if section else conflict.section_id} on {day_name} Period {slot.period_number}"
        )

    slot.subject_name = data.subject_name
    slot.faculty_id = data.faculty_id
    db.commit()
    db.refresh(slot)

    return _build_slot_response(slot)


@router.delete("/section/{section_id}")
def delete_timetable(
    section_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_active_admin),
):
    """Delete timetable for a section."""
    count = db.query(TimetableSlot).filter(TimetableSlot.section_id == section_id).delete()
    db.commit()
    return {"message": f"Deleted {count} timetable slots"}


@router.get("/faculty-workload")
def get_faculty_workload(
    db: Session = Depends(get_db),
    current_admin: User = Depends(deps.get_current_admin_or_faculty),
):
    """Get workload summary for all faculty across all sections."""
    from sqlalchemy import func

    workload = db.query(
        TimetableSlot.faculty_id,
        TimetableSlot.section_id,
        func.count(TimetableSlot.id).label("period_count"),
    ).group_by(
        TimetableSlot.faculty_id, TimetableSlot.section_id
    ).all()

    faculty_map = {}
    for row in workload:
        fid = row.faculty_id
        if fid not in faculty_map:
            faculty = db.query(User).filter(User.id == fid).first()
            faculty_map[fid] = {
                "faculty_id": fid,
                "faculty_name": faculty.name if faculty else f"ID {fid}",
                "total_periods": 0,
                "sections": [],
            }
        section = db.query(Section).filter(Section.id == row.section_id).first()
        faculty_map[fid]["sections"].append({
            "section_id": row.section_id,
            "section_name": section.name if section else str(row.section_id),
            "periods": row.period_count,
        })
        faculty_map[fid]["total_periods"] += row.period_count

    result = sorted(faculty_map.values(), key=lambda x: x["total_periods"], reverse=True)
    return result
