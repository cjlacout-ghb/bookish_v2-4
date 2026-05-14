"""
sesiones.py — Timer control, session management, and reading reports.
Stage 1.5 — replaces the original minimal router.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Form, File, UploadFile
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta, timezone
import calendar
from zoneinfo import ZoneInfo
import os
import shutil
import uuid
from pathlib import Path

from config import CAPTURAS_DIR

TZ_BA = ZoneInfo("America/Argentina/Buenos_Aires")

from database import get_db
from models import Libro, SesionLectura
from schemas import (
    SesionCreate, SesionOut, SesionActivaOut, SesionUpdate,
    StopTimerBody, ReporteDia, ReporteMes, ReporteAnio,
    SesionReporteOut, FilaDiaMes, FilaMesAnio,
)

router = APIRouter()

NOMBRES_MESES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_libro_or_404(libro_id: int, db: Session) -> Libro:
    libro = db.query(Libro).filter(Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return libro


def _get_sesion_or_404(sesion_id: int, db: Session) -> SesionLectura:
    s = db.query(SesionLectura).filter(SesionLectura.id == sesion_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return s


def _active_session(libro_id: int, db: Session) -> Optional[SesionLectura]:
    return db.query(SesionLectura).filter(
        SesionLectura.libro_id == libro_id,
        SesionLectura.is_active == True,
    ).first()


def _diff_seg(dt1: datetime, dt2: datetime) -> int:
    """Calcula dt1 - dt2 en segundos, normalizando tzinfo."""
    if not dt1 or not dt2:
        return 0
    d1 = dt1.replace(tzinfo=None) if dt1.tzinfo else dt1
    d2 = dt2.replace(tzinfo=None) if dt2.tzinfo else dt2
    return int((d1 - d2).total_seconds())

# ── Legacy: list / create sessions (Stage 1 compat) ──────────────────────────

@router.get("/libros/{libro_id}/sesiones", response_model=List[SesionOut])
def listar_sesiones(libro_id: int, db: Session = Depends(get_db)):
    return db.query(SesionLectura).filter(
        SesionLectura.libro_id == libro_id
    ).order_by(SesionLectura.iniciado_en.desc()).all()


@router.post("/libros/{libro_id}/sesiones", response_model=SesionOut, status_code=201)
def guardar_sesion(libro_id: int, sesion: SesionCreate, db: Session = Depends(get_db)):
    libro = _get_libro_or_404(libro_id, db)
    db_sesion = SesionLectura(libro_id=libro_id, **sesion.model_dump())
    db.add(db_sesion)
    db.commit()
    db.refresh(db_sesion)
    return db_sesion

# ── Timer control ─────────────────────────────────────────────────────────────

@router.post("/libros/{libro_id}/timer/start", response_model=SesionOut)
def timer_start(libro_id: int, db: Session = Depends(get_db)):
    _get_libro_or_404(libro_id, db)
    existing = _active_session(libro_id, db)
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una sesión activa para este libro")
    sesion = SesionLectura(
        libro_id=libro_id,
        iniciado_en=datetime.now(timezone.utc).replace(tzinfo=None),
        is_active=True,
        pause_offset_seconds=0,
    )
    db.add(sesion)
    db.commit()
    db.refresh(sesion)
    return sesion


@router.post("/libros/{libro_id}/timer/pause", response_model=SesionOut)
def timer_pause(libro_id: int, db: Session = Depends(get_db)):
    _get_libro_or_404(libro_id, db)
    sesion = _active_session(libro_id, db)
    if not sesion:
        raise HTTPException(status_code=404, detail="No hay sesión activa para este libro")
    if sesion.paused_at:
        raise HTTPException(status_code=400, detail="La sesión ya está pausada")
    sesion.paused_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(sesion)
    return sesion


@router.post("/libros/{libro_id}/timer/resume", response_model=SesionOut)
def timer_resume(libro_id: int, db: Session = Depends(get_db)):
    _get_libro_or_404(libro_id, db)
    sesion = _active_session(libro_id, db)
    if not sesion:
        raise HTTPException(status_code=404, detail="No hay sesión activa para este libro")
    if not sesion.paused_at:
        raise HTTPException(status_code=400, detail="La sesión no está pausada")
    # Accumulate the pause time
    # Use naive UTC for compatibility with SQLite naive datetimes
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    paused_duration = _diff_seg(now, sesion.paused_at)
    sesion.pause_offset_seconds = (sesion.pause_offset_seconds or 0) + paused_duration
    sesion.paused_at = None
    db.commit()
    db.refresh(sesion)
    return sesion


@router.post("/libros/{libro_id}/timer/stop", response_model=SesionOut)
def timer_stop(
    libro_id: int, 
    session_note: Optional[str] = Form(None),
    captura: Optional[UploadFile] = File(None),
    pagina_actual: Optional[int] = Form(None),
    db: Session = Depends(get_db)):
    libro = _get_libro_or_404(libro_id, db)
    sesion = _active_session(libro_id, db)
    if not sesion:
        raise HTTPException(status_code=404, detail="No hay sesión activa para este libro")

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # If still paused, add remaining pause to offset before stopping
    if sesion.paused_at:
        paused_duration = _diff_seg(now, sesion.paused_at)
        sesion.pause_offset_seconds = (sesion.pause_offset_seconds or 0) + paused_duration
        sesion.paused_at = None

    total_elapsed = _diff_seg(now, sesion.iniciado_en)
    net_seconds = max(0, total_elapsed - (sesion.pause_offset_seconds or 0))

    sesion.finalizado_en = now
    sesion.duracion_segundos = net_seconds
    sesion.is_active = False
    sesion.session_note = session_note
    
    # Update book progress if provided
    if pagina_actual is not None:
        libro.pagina_actual = pagina_actual

    # Save image if provided
    if captura:
        ext = os.path.splitext(captura.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            raise HTTPException(status_code=400, detail="Tipo de archivo no permitido.")
        
        contenido = captura.file.read()
        if len(contenido) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Archivo demasiado grande. Máximo 5MB.")
            
        unique_name = f"captura_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(CAPTURAS_DIR, unique_name)
        with open(filepath, "wb") as buffer:
            buffer.write(contenido)
        sesion.captura_filename = unique_name

    db.commit()
    db.refresh(sesion)
    return sesion

# ── Active sessions (central panel) ──────────────────────────────────────────

@router.get("/sessions/active", response_model=List[SesionActivaOut])
def sesiones_activas(db: Session = Depends(get_db)):
    sesiones = db.query(SesionLectura).filter(
        SesionLectura.is_active == True
    ).all()
    return sesiones

# ── Session CRUD (edit / delete) ──────────────────────────────────────────────

@router.put("/sessions/{sesion_id}", response_model=SesionOut)
def editar_sesion(
    sesion_id: int, 
    iniciado_en: Optional[datetime] = Form(None),
    finalizado_en: Optional[datetime] = Form(None),
    session_note: Optional[str] = Form(None),
    captura: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)):
    sesion = _get_sesion_or_404(sesion_id, db)
    
    if iniciado_en is not None:
        sesion.iniciado_en = iniciado_en.replace(tzinfo=None)
    if finalizado_en is not None:
        sesion.finalizado_en = finalizado_en.replace(tzinfo=None)
    if session_note is not None:
        sesion.session_note = session_note

    # Recompute duration if both timestamps present
    if sesion.finalizado_en and sesion.iniciado_en:
        fin = sesion.finalizado_en.replace(tzinfo=None) if sesion.finalizado_en.tzinfo else sesion.finalizado_en
        ini = sesion.iniciado_en.replace(tzinfo=None) if sesion.iniciado_en.tzinfo else sesion.iniciado_en
        computed = int((fin - ini).total_seconds())
        sesion.duracion_segundos = max(0, computed - (sesion.pause_offset_seconds or 0))
        
    if captura:
        ext = os.path.splitext(captura.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            raise HTTPException(status_code=400, detail="Tipo de archivo no permitido.")
        
        contenido = captura.file.read()
        if len(contenido) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Archivo demasiado grande. Máximo 5MB.")
            
        unique_name = f"captura_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(CAPTURAS_DIR, unique_name)
        with open(filepath, "wb") as buffer:
            buffer.write(contenido)
        sesion.captura_filename = unique_name

    db.commit()
    db.refresh(sesion)
    return sesion


@router.delete("/sessions/{sesion_id}", status_code=204)
def eliminar_sesion(sesion_id: int, db: Session = Depends(get_db)):
    sesion = _get_sesion_or_404(sesion_id, db)
    
    if sesion.captura_filename:
        file_path = Path(CAPTURAS_DIR) / sesion.captura_filename
        try:
            if file_path.exists():
                file_path.unlink()
        except OSError:
            pass

    db.delete(sesion)
    db.commit()

# ── Reports ───────────────────────────────────────────────────────────────────

def _sesion_to_reporte(s: SesionLectura) -> SesionReporteOut:
    return SesionReporteOut(
        id=s.id,
        libro_id=s.libro_id,
        libro_titulo=s.libro.titulo if s.libro else "—",
        libro_portada=s.libro.portada_filename if s.libro else None,
        iniciado_en=s.iniciado_en,
        finalizado_en=s.finalizado_en,
        duracion_segundos=s.duracion_segundos or 0,
        session_note=s.session_note,
        captura_filename=s.captura_filename,
    )


@router.get("/reports/day", response_model=ReporteDia)
def reporte_dia(date_str: str = Query(None, alias="date"), db: Session = Depends(get_db)):
    if date_str:
        try:
            target = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")
    else:
        target = datetime.now(TZ_BA).date()

    # Define boundaries in Buenos Aires time
    day_start_ba = datetime(target.year, target.month, target.day, 0, 0, 0, tzinfo=TZ_BA)
    day_end_ba = datetime(target.year, target.month, target.day, 23, 59, 59, tzinfo=TZ_BA)

    # Convert mapping to UTC naive for DB querying
    day_start_utc = day_start_ba.astimezone(timezone.utc).replace(tzinfo=None)
    day_end_utc = day_end_ba.astimezone(timezone.utc).replace(tzinfo=None)

    sesiones = (
        db.query(SesionLectura)
        .filter(
            SesionLectura.is_active == False,
            SesionLectura.iniciado_en >= day_start_utc,
            SesionLectura.iniciado_en <= day_end_utc,
        )
        .order_by(SesionLectura.iniciado_en)
        .all()
    )

    total_segundos = sum(s.duracion_segundos or 0 for s in sesiones)
    libros_ids = set(s.libro_id for s in sesiones)

    return ReporteDia(
        fecha=target.isoformat(),
        total_segundos=total_segundos,
        libros_count=len(libros_ids),
        sesiones=[_sesion_to_reporte(s) for s in sesiones],
    )


@router.get("/reports/month", response_model=ReporteMes)
def reporte_mes(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
):
    if not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="Mes inválido")

    _, days_in_month = calendar.monthrange(year, month)
    
    # Month boundaries in BA time
    month_start_ba = datetime(year, month, 1, 0, 0, 0, tzinfo=TZ_BA)
    month_end_ba = datetime(year, month, days_in_month, 23, 59, 59, tzinfo=TZ_BA)

    # Convert to UTC naive
    month_start_utc = month_start_ba.astimezone(timezone.utc).replace(tzinfo=None)
    month_end_utc = month_end_ba.astimezone(timezone.utc).replace(tzinfo=None)

    sesiones = (
        db.query(SesionLectura)
        .filter(
            SesionLectura.is_active == False,
            SesionLectura.iniciado_en >= month_start_utc,
            SesionLectura.iniciado_en <= month_end_utc,
        )
        .all()
    )

    # Aggregate by day and book
    por_dia: dict[int, int] = {}
    por_libro: dict[int, int] = {}
    for s in sesiones:
        d = s.iniciado_en.day
        por_dia[d] = por_dia.get(d, 0) + (s.duracion_segundos or 0)
        por_libro[s.libro_id] = por_libro.get(s.libro_id, 0) + (s.duracion_segundos or 0)

    total_segundos = sum(por_dia.values())
    dias_con_lectura = len(por_dia)
    promedio = (total_segundos // dias_con_lectura) if dias_con_lectura else 0

    # Most-read book
    libro_mas_leido = None
    if por_libro:
        top_id = max(por_libro, key=lambda k: por_libro[k])
        libro_obj = db.query(Libro).filter(Libro.id == top_id).first()
        if libro_obj:
            libro_mas_leido = libro_obj.titulo


    filas = [
        FilaDiaMes(
            dia=d,
            fecha=f"{year:04d}-{month:02d}-{d:02d}",
            total_segundos=por_dia.get(d, 0),
        )
        for d in range(1, days_in_month + 1)
    ]

    return ReporteMes(
        anio=year,
        mes=month,
        total_segundos=total_segundos,
        promedio_segundos_dia=promedio,
        libro_mas_leido=libro_mas_leido,
        dias=filas,
    )


@router.get("/reports/year", response_model=ReporteAnio)
def reporte_anio(year: int = Query(...), db: Session = Depends(get_db)):
    # Year boundaries in BA time
    year_start_ba = datetime(year, 1, 1, 0, 0, 0, tzinfo=TZ_BA)
    year_end_ba = datetime(year, 12, 31, 23, 59, 59, tzinfo=TZ_BA)

    # Convert to UTC naive
    year_start_utc = year_start_ba.astimezone(timezone.utc).replace(tzinfo=None)
    year_end_utc = year_end_ba.astimezone(timezone.utc).replace(tzinfo=None)

    sesiones = (
        db.query(SesionLectura)
        .filter(
            SesionLectura.is_active == False,
            SesionLectura.iniciado_en >= year_start_utc,
            SesionLectura.iniciado_en <= year_end_utc,
        )
        .all()
    )

    por_mes: dict[int, int] = {}
    por_libro: dict[int, int] = {}
    por_dia_anio: dict[str, int] = {}
    for s in sesiones:
        m = s.iniciado_en.month
        por_mes[m] = por_mes.get(m, 0) + (s.duracion_segundos or 0)
        por_libro[s.libro_id] = por_libro.get(s.libro_id, 0) + (s.duracion_segundos or 0)
        fecha_str = s.iniciado_en.strftime("%Y-%m-%d")
        por_dia_anio[fecha_str] = por_dia_anio.get(fecha_str, 0) + (s.duracion_segundos or 0)

    total_segundos = sum(por_mes.values())
    dias_con_lectura = len(por_dia_anio)
    promedio = (total_segundos // dias_con_lectura) if dias_con_lectura else 0

    # Most-read book
    libro_mas_leido = None
    if por_libro:
        top_id = max(por_libro, key=lambda k: por_libro[k])
        libro_obj = db.query(Libro).filter(Libro.id == top_id).first()
        if libro_obj:
            libro_mas_leido = libro_obj.titulo

    meses = [
        FilaMesAnio(
            mes=m,
            nombre_mes=NOMBRES_MESES[m],
            total_segundos=por_mes.get(m, 0),
        )
        for m in range(1, 13)
    ]

    return ReporteAnio(
        anio=year,
        total_segundos=total_segundos,
        promedio_segundos_dia=promedio,
        libro_mas_leido=libro_mas_leido,
        meses=meses,
    )
