from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from database import get_db
from models import MapLocation, Libro

router = APIRouter()


# ── Schemas inline (avoid bloating schemas.py) ────────────────────────────

from pydantic import BaseModel

class MapLocationCreate(BaseModel):
    name: str
    place_type: str
    is_fictional: bool = False
    note: Optional[str] = None
    latitude: float
    longitude: float
    book_id: Optional[int] = None
    is_journey_point: Optional[bool] = True

class MapLocationUpdate(BaseModel):
    name: Optional[str] = None
    place_type: Optional[str] = None
    is_fictional: Optional[bool] = None
    note: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    book_id: Optional[int] = None
    is_journey_point: Optional[bool] = None

def _serialize(loc: MapLocation) -> dict:
    book = None
    if loc.book_id and loc.libro:
        book = {
            "id": loc.libro.id,
            "title": loc.libro.titulo,
            "author": loc.libro.autor,
            "color": loc.libro.color,
        }
    return {
        "id": loc.id,
        "name": loc.name,
        "place_type": loc.place_type,
        "is_fictional": loc.is_fictional,
        "note": loc.note,
        "latitude": loc.latitude,
        "longitude": loc.longitude,
        "is_journey_point": loc.is_journey_point,
        "book": book,
    }


# GET /api/map/locations
@router.get("/locations")
def list_locations(
    book_id: Optional[int] = Query(None),
    is_fictional: Optional[bool] = Query(None),
    place_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(MapLocation)
    if book_id is not None:
        q = q.filter(MapLocation.book_id == book_id)
        q = q.order_by(MapLocation.created_at.asc())
    if is_fictional is not None:
        q = q.filter(MapLocation.is_fictional == is_fictional)
    if place_type is not None:
        q = q.filter(MapLocation.place_type == place_type)
    return [_serialize(loc) for loc in q.all()]


# POST /api/map/locations
@router.post("/locations", status_code=201)
def create_location(body: MapLocationCreate, db: Session = Depends(get_db)):
    if body.book_id:
        libro = db.query(Libro).filter(Libro.id == body.book_id).first()
        if not libro:
            raise HTTPException(status_code=404, detail="Book not found")
    loc = MapLocation(
        name=body.name,
        place_type=body.place_type,
        is_fictional=body.is_fictional,
        note=body.note,
        latitude=body.latitude,
        longitude=body.longitude,
        book_id=body.book_id,
        is_journey_point=body.is_journey_point,
        created_at=datetime.utcnow(),
    )
    db.add(loc)
    db.commit()
    
    # Reload with libro relationship to ensure full serialization
    loc = db.query(MapLocation).filter(MapLocation.id == loc.id).first()
    return _serialize(loc)


# PUT /api/map/locations/:id
@router.put("/locations/{loc_id}")
def update_location(loc_id: int, body: MapLocationUpdate, db: Session = Depends(get_db)):
    loc = db.query(MapLocation).filter(MapLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(loc, field, value)
    db.commit()
    
    # Reload with libro relationship to ensure full serialization
    loc = db.query(MapLocation).filter(MapLocation.id == loc.id).first()
    return _serialize(loc)


# DELETE /api/map/locations/:id
@router.delete("/locations/{loc_id}", status_code=204)
def delete_location(loc_id: int, db: Session = Depends(get_db)):
    loc = db.query(MapLocation).filter(MapLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(loc)
    db.commit()
