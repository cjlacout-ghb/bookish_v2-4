from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db
from models import Libro, SesionLectura, ReadingGoal, EstadoLibro
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta

router = APIRouter()


# ── Helper: Buenos Aires "now" ───────────────────────────────────────────────
def _now_ba() -> datetime:
    tz_ba = timezone(timedelta(hours=-3))
    return datetime.now(tz=tz_ba)


def _current_year() -> int:
    return _now_ba().year


def _current_month() -> int:
    return _now_ba().month


# ── Helper: count books "finished" in a given year ───────────────────────────
def _books_read_in_year(db: Session, year: int) -> int:
    """
    For each book with estado="leido":
      - Use max(finalizado_en) from sessions if any exist
      - Else fallback to book's creado_en
    Count those whose finish date falls in `year`.
    """
    libros_leidos = (
        db.query(Libro.id, Libro.creado_en)
        .filter(Libro.estado == EstadoLibro.leido)
        .all()
    )

    session_rows = (
        db.query(
            SesionLectura.libro_id,
            func.max(SesionLectura.finalizado_en).label("last_session"),
        )
        .filter(SesionLectura.finalizado_en != None)
        .group_by(SesionLectura.libro_id)
        .all()
    )
    session_map = {r.libro_id: r.last_session for r in session_rows}

    count = 0
    for libro in libros_leidos:
        finish_dt = session_map.get(libro.id) or libro.creado_en
        if finish_dt and hasattr(finish_dt, "year") and finish_dt.year == year:
            count += 1
    return count


# ── Pydantic schema ───────────────────────────────────────────────────────────
class GoalIn(BaseModel):
    year: int
    target_books: int


# ── GET /api/goals/{year} ─────────────────────────────────────────────────────
@router.get("/goals/{year}")
def get_goal(year: int, db: Session = Depends(get_db)):
    goal = db.query(ReadingGoal).filter(ReadingGoal.year == year).first()
    if not goal:
        return None
    return {"year": goal.year, "target_books": goal.target_books}


# ── POST /api/goals ───────────────────────────────────────────────────────────
@router.post("/goals")
def upsert_goal(body: GoalIn, db: Session = Depends(get_db)):
    goal = db.query(ReadingGoal).filter(ReadingGoal.year == body.year).first()
    if goal:
        goal.target_books = body.target_books
        goal.updated_at = datetime.utcnow()
    else:
        goal = ReadingGoal(
            year=body.year,
            target_books=body.target_books,
        )
        db.add(goal)
    db.commit()
    db.refresh(goal)
    return {"year": goal.year, "target_books": goal.target_books}


# ── GET /api/goals/{year}/progress ───────────────────────────────────────────
@router.get("/goals/{year}/progress")
def get_goal_progress(year: int, db: Session = Depends(get_db)):
    goal = db.query(ReadingGoal).filter(ReadingGoal.year == year).first()

    if not goal or goal.target_books == 0:
        return {
            "year": year,
            "target_books": goal.target_books if goal else 0,
            "books_read": 0,
            "books_remaining": 0,
            "percentage": 0.0,
            "on_track": None,
        }

    books_read = _books_read_in_year(db, year)
    target = goal.target_books
    books_remaining = max(0, target - books_read)
    percentage = round(min(100.0, (books_read / target) * 100), 1)

    # on_track only meaningful for the current year
    on_track = None
    if year == _current_year():
        current_month = _current_month()
        expected = (target / 12) * current_month
        on_track = books_read >= expected

    return {
        "year": year,
        "target_books": target,
        "books_read": books_read,
        "books_remaining": books_remaining,
        "percentage": percentage,
        "on_track": on_track,
    }
