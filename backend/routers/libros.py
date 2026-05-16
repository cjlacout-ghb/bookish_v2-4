from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
import os
import shutil
import uuid
from pathlib import Path

from database import get_db
from models import Libro, SesionLectura
from schemas import LibroCreate, LibroUpdate, LibroOut
from config import COVERS_DIR, CAPTURAS_DIR, MAX_COVER_SIZE_BYTES  # Fix-05: fuente única

router = APIRouter()

# ── Fix-10: Obtiene totales de segundos para una lista de libros en 1 query ──
def _totales_segundos(libro_ids: list, db: Session) -> dict:
    """Retorna {libro_id: total_segundos} para todos los IDs dados, en una sola query."""
    if not libro_ids:
        return {}
    rows = (
        db.query(SesionLectura.libro_id, func.sum(SesionLectura.duracion_segundos))
        .filter(SesionLectura.libro_id.in_(libro_ids))
        .group_by(SesionLectura.libro_id)
        .all()
    )
    return {libro_id: total or 0 for libro_id, total in rows}


def calcular_total_segundos(libro_id: int, db: Session) -> int:
    """Mantiene compatibilidad con detalle individual."""
    resultado = db.query(func.sum(SesionLectura.duracion_segundos)).filter(
        SesionLectura.libro_id == libro_id
    ).scalar()
    return resultado or 0


def _libro_dict(libro: Libro, total_segundos: int) -> dict:
    return {
        "id": libro.id,
        "titulo": libro.titulo,
        "autor": libro.autor,
        "genero": libro.genero,
        "paginas": libro.paginas,
        "pagina_actual": libro.pagina_actual,
        "editorial": libro.editorial,
        "primera_edicion_anio": libro.primera_edicion_anio,
        "isbn": libro.isbn,
        "estado": libro.estado,
        "formato": libro.formato,
        "calificacion": libro.calificacion,
        "fecha_inicio": libro.fecha_inicio,
        "fecha_fin": libro.fecha_fin,
        "ultima_edicion_anio": libro.ultima_edicion_anio,
        "actual_edicion_anio": libro.actual_edicion_anio,
        "portada_filename": libro.portada_filename,
        "etiquetas": libro.etiquetas,
        "resena": libro.resena,
        "color": libro.color,
        "creado_en": libro.creado_en,
        "total_segundos": total_segundos,
    }



def libro_to_out(libro: Libro, db: Session) -> dict:
    """Detalle individual — mantiene la firma original."""
    return _libro_dict(libro, calcular_total_segundos(libro.id, db))


@router.get("", response_model=List[LibroOut])
def listar_libros(db: Session = Depends(get_db)):
    # Fix-10: una sola query para todos los totales de segundos
    libros = db.query(Libro).order_by(Libro.creado_en.desc()).all()
    totales = _totales_segundos([l.id for l in libros], db)
    return [_libro_dict(l, totales.get(l.id, 0)) for l in libros]


@router.post("", response_model=LibroOut, status_code=201)
def crear_libro(libro: LibroCreate, db: Session = Depends(get_db)):
    try:
        db_libro = Libro(**libro.model_dump())
        db.add(db_libro)
        db.commit()
        db.refresh(db_libro)
        return libro_to_out(db_libro, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al guardar en BD: {str(e)}")


@router.get("/{libro_id}", response_model=LibroOut)
def obtener_libro(libro_id: int, db: Session = Depends(get_db)):
    libro = db.query(Libro).filter(Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return libro_to_out(libro, db)


@router.put("/{libro_id}", response_model=LibroOut)
def actualizar_libro(libro_id: int, datos: LibroUpdate, db: Session = Depends(get_db)):
    libro = db.query(Libro).filter(Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    try:
        for campo, valor in datos.model_dump(exclude_unset=True).items():
            setattr(libro, campo, valor)
        db.commit()
        db.refresh(libro)
        return libro_to_out(libro, db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar en BD: {str(e)}")


@router.delete("/{libro_id}", status_code=204)
def eliminar_libro(libro_id: int, db: Session = Depends(get_db)):
    libro = db.query(Libro).filter(Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")

    sesiones_con_captura = db.query(SesionLectura).filter(
        SesionLectura.libro_id == libro_id,
        SesionLectura.captura_filename != None
    ).all()
    for s in sesiones_con_captura:
        if s.captura_filename:
            file_path = Path(CAPTURAS_DIR) / s.captura_filename
            try:
                if file_path.exists():
                    file_path.unlink()
            except OSError:
                pass

    if libro.portada_filename:
        ruta = Path(COVERS_DIR) / libro.portada_filename
        try:
            if ruta.exists():
                ruta.unlink()
        except OSError:
            pass

    db.delete(libro)
    db.commit()


@router.post("/{libro_id}/portada", response_model=LibroOut)
async def subir_portada(
    libro_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    libro = db.query(Libro).filter(Libro.id == libro_id).first()
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")

    extension = os.path.splitext(archivo.filename)[1].lower()
    if extension not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Formato de imagen no soportado")

    # Fix-11: validar tamaño máximo (5 MB)
    contenido = await archivo.read()
    if len(contenido) > MAX_COVER_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"La imagen supera el tamaño máximo de {MAX_COVER_SIZE_BYTES // (1024*1024)} MB"
        )

    # Eliminar portada anterior si existe
    if libro.portada_filename:
        ruta_anterior = os.path.join(COVERS_DIR, libro.portada_filename)
        if os.path.exists(ruta_anterior):
            os.remove(ruta_anterior)

    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    ruta_destino = os.path.join(COVERS_DIR, nombre_archivo)

    with open(ruta_destino, "wb") as f:
        f.write(contenido)

    libro.portada_filename = nombre_archivo
    db.commit()
    db.refresh(libro)
    return libro_to_out(libro, db)
