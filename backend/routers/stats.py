from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, distinct
from database import get_db
from models import Libro, SesionLectura, EstadoLibro
from datetime import datetime
import calendar

router = APIRouter()


# ── Helper: current year in Buenos Aires time (UTC-3) ───────────────────────
def _current_year() -> int:
    from datetime import timezone, timedelta
    tz_ba = timezone(timedelta(hours=-3))
    return datetime.now(tz=tz_ba).year


MESES_ES = {
    1: "Ene", 2: "Feb", 3: "Mar", 4: "Abr",
    5: "May", 6: "Jun", 7: "Jul", 8: "Ago",
    9: "Sep", 10: "Oct", 11: "Nov", 12: "Dic",
}


# ── GET /api/stats/overview ──────────────────────────────────────────────────
@router.get("/stats/overview")
def stats_overview(db: Session = Depends(get_db)):
    total_books_read = (
        db.query(func.count(Libro.id))
        .filter(Libro.estado == EstadoLibro.leido)
        .scalar() or 0
    )
    total_pages = (
        db.query(func.sum(Libro.paginas))
        .filter(Libro.estado == EstadoLibro.leido)
        .scalar() or 0
    )
    unique_authors = (
        db.query(func.count(distinct(Libro.autor)))
        .filter(Libro.estado == EstadoLibro.leido)
        .scalar() or 0
    )
    # Correctly count unique genres by splitting strings
    genre_rows = (
        db.query(Libro.genero)
        .filter(
            Libro.estado == EstadoLibro.leido,
            Libro.genero != None,
            Libro.genero != "",
        )
        .all()
    )
    unique_genres_set = set()
    for r in genre_rows:
        if r.genero:
            parts = [g.strip() for g in r.genero.split(",") if g.strip()]
            unique_genres_set.update(parts)
    unique_genres = len(unique_genres_set)
    return {
        "total_books_read": total_books_read,
        "total_pages": total_pages,
        "unique_authors": unique_authors,
        "unique_genres": unique_genres,
    }


# ── GET /api/stats/by-genre ──────────────────────────────────────────────────
@router.get("/stats/by-genre")
def stats_by_genre(db: Session = Depends(get_db)):
    from collections import Counter
    rows = (
        db.query(Libro.genero)
        .filter(
            Libro.estado == EstadoLibro.leido,
            Libro.genero != None,
            Libro.genero != "",
        )
        .all()
    )
    
    counter = Counter()
    for r in rows:
        if r.genero:
            genres = [g.strip() for g in r.genero.split(",") if g.strip()]
            counter.update(genres)
            
    return [{"genre": g, "count": c} for g, c in counter.most_common()]


# ── GET /api/stats/by-author ─────────────────────────────────────────────────
@router.get("/stats/by-author")
def stats_by_author(db: Session = Depends(get_db)):
    rows = (
        db.query(Libro.autor, func.count(Libro.id).label("count"))
        .filter(Libro.estado == EstadoLibro.leido)
        .group_by(Libro.autor)
        .order_by(func.count(Libro.id).desc())
        .limit(10)
        .all()
    )
    return [{"author": r.autor, "count": r.count} for r in rows]


# ── GET /api/stats/by-publisher ──────────────────────────────────────────────
@router.get("/stats/by-publisher")
def stats_by_publisher(db: Session = Depends(get_db)):
    rows = (
        db.query(Libro.editorial, func.count(Libro.id).label("count"))
        .filter(
            Libro.estado == EstadoLibro.leido,
            Libro.editorial != None,
            Libro.editorial != "",
        )
        .group_by(Libro.editorial)
        .order_by(func.count(Libro.id).desc())
        .limit(10)
        .all()
    )
    return [{"publisher": r.editorial, "count": r.count} for r in rows]


# ── GET /api/stats/rhythm?year=YYYY ─────────────────────────────────────────
@router.get("/stats/rhythm")
def stats_rhythm(
    year: int = Query(default=None),
    db: Session = Depends(get_db),
):
    if year is None:
        year = _current_year()

    # Books finished via reading session in this year
    # ended_at = finalizado_en on the LAST session of a "leido" book
    # Fallback: use creado_en on the book itself

    # Step 1: gather libro_ids that are "leido"
    libros_leidos = (
        db.query(Libro.id, Libro.creado_en)
        .filter(Libro.estado == EstadoLibro.leido)
        .all()
    )

    # Step 2: for each libro, find the max finalizado_en from sessions
    # Build a map: libro_id -> finished_date (year, month)
    from sqlalchemy import and_

    # Get last session per book in one query
    session_rows = (
        db.query(
            SesionLectura.libro_id,
            func.max(SesionLectura.finalizado_en).label("last_session"),
        )
        .filter(SesionLectura.finalizado_en != None)
        .group_by(SesionLectura.libro_id)
        .all()
    )

    session_map = {row.libro_id: row.last_session for row in session_rows}

    # Count per month
    counts = {m: 0 for m in range(1, 13)}

    for libro in libros_leidos:
        finish_dt = session_map.get(libro.id) or libro.creado_en
        if finish_dt is None:
            continue
        if hasattr(finish_dt, "year"):
            if finish_dt.year == year:
                counts[finish_dt.month] += 1

    return [
        {
            "month": m,
            "month_name": MESES_ES[m],
            "count": counts[m],
        }
        for m in range(1, 13)
    ]


# ── GET /api/stats/ratings-evolution ────────────────────────────────────────
@router.get("/stats/ratings-evolution")
def stats_ratings_evolution(db: Session = Depends(get_db)):
    # Get all read books with rating > 0, group by year of creado_en
    rows = (
        db.query(
            extract("year", Libro.creado_en).label("year"),
            func.avg(Libro.calificacion).label("avg_rating"),
        )
        .filter(
            Libro.estado == EstadoLibro.leido,
            Libro.calificacion != None,
            Libro.calificacion > 0,
        )
        .group_by(extract("year", Libro.creado_en))
        .order_by(extract("year", Libro.creado_en).asc())
        .all()
    )

    return [
        {
            "year": int(r.year),
            "average_rating": round(float(r.avg_rating), 1),
        }
        for r in rows
    ]
