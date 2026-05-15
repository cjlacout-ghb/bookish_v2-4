from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from database import Base


class EstadoLibro(str, enum.Enum):
    leyendo = "leyendo"
    leido = "leido"
    por_leer = "por_leer"


class Libro(Base):
    __tablename__ = "libros"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(500), nullable=False)
    autor = Column(String(300), nullable=False)
    genero = Column(String(100))
    paginas = Column(Integer)
    pagina_actual = Column(Integer, default=0)
    editorial = Column(String(300))
    primera_edicion_anio = Column(Integer)

    isbn = Column(String(20))
    formato = Column(String(50), default="analógico")
    estado = Column(Enum(EstadoLibro), default=EstadoLibro.por_leer)
    calificacion = Column(Integer, default=0)
    portada_filename = Column(String(300))
    fecha_inicio = Column(Date)
    fecha_fin = Column(Date)
    ultima_edicion_anio = Column(Integer)
    actual_edicion_anio = Column(Integer)

    etiquetas = Column(String(500))
    resena = Column(Text)
    color = Column(String(50), default="#c9a84c", nullable=False, server_default="#c9a84c")
    creado_en = Column(DateTime, default=datetime.utcnow)

    notas = relationship("Nota", back_populates="libro", cascade="all, delete-orphan")
    sesiones = relationship("SesionLectura", back_populates="libro", cascade="all, delete-orphan")


class Nota(Base):
    __tablename__ = "notas"

    id = Column(Integer, primary_key=True, index=True)
    libro_id = Column(Integer, ForeignKey("libros.id"), nullable=False)
    contenido = Column(Text, nullable=False)
    numero_pagina = Column(Integer)
    es_cita = Column(Boolean, default=False)
    creado_en = Column(DateTime, default=datetime.utcnow)

    libro = relationship("Libro", back_populates="notas")


class SesionLectura(Base):
    __tablename__ = "sesiones_lectura"

    id = Column(Integer, primary_key=True, index=True)
    libro_id = Column(Integer, ForeignKey("libros.id"), nullable=False)
    iniciado_en = Column(DateTime, default=datetime.utcnow)
    finalizado_en = Column(DateTime, nullable=True)
    duracion_segundos = Column(Integer, default=0)

    # Stage 1.5 — new fields (all nullable for backward compat)
    is_active = Column(Boolean, default=False, nullable=False, server_default="0")
    paused_at = Column(DateTime, nullable=True)
    pause_offset_seconds = Column(Integer, default=0, nullable=False, server_default="0")
    session_note = Column(String(1000), nullable=True)
    captura_filename = Column(String(300), nullable=True)

    libro = relationship("Libro", back_populates="sesiones")


class ReadingGoal(Base):
    __tablename__ = "reading_goals"

    id            = Column(Integer, primary_key=True, index=True)
    year          = Column(Integer, unique=True, nullable=False, index=True)
    target_books  = Column(Integer, nullable=False, default=0)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MapLocation(Base):
    __tablename__ = "map_locations"

    id          = Column(Integer, primary_key=True, index=True)
    book_id     = Column(Integer, ForeignKey("libros.id"), nullable=True)
    name        = Column(String(500), nullable=False)
    place_type  = Column(String(100))
    is_fictional = Column(Boolean, default=False)
    note        = Column(Text, nullable=True)
    latitude    = Column(Float, nullable=False)
    longitude   = Column(Float, nullable=False)
    is_journey_point = Column(Boolean, default=True, nullable=False, server_default="1")
    created_at  = Column(DateTime, default=datetime.utcnow)

    libro = relationship("Libro", backref="map_locations")
