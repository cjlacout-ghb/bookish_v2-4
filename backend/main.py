from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import libros, notas, sesiones, estadisticas, backup, stats, goals, mapa

# STEP 1 — Lifespan: only init_db, no StaticFiles for covers
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

# STEP 2 — App init (unchanged)
app = FastAPI(title="Bookish API", version="1.5.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
from config import COVERS_DIR, CAPTURAS_DIR
import os

# Asegurar que las carpetas existen
if not os.path.exists(COVERS_DIR):
    os.makedirs(COVERS_DIR, exist_ok=True)
if not os.path.exists(CAPTURAS_DIR):
    os.makedirs(CAPTURAS_DIR, exist_ok=True)

# Servir estáticos desde la ruta oficial (Documentos) para el modo browser
app.mount("/covers", StaticFiles(directory=COVERS_DIR), name="covers")
app.mount("/capturas", StaticFiles(directory=CAPTURAS_DIR), name="capturas")

# STEP 3 — Routers (unchanged)
app.include_router(libros.router,       prefix="/api/libros",   tags=["Libros"])
app.include_router(notas.router,        prefix="/api",          tags=["Notas"])
app.include_router(sesiones.router,     prefix="/api",          tags=["Sesiones"])
app.include_router(estadisticas.router, prefix="/api",          tags=["Estadisticas"])
app.include_router(backup.router,       prefix="/api/backup",   tags=["Backup"])
app.include_router(stats.router,        prefix="/api",          tags=["Stats"])
app.include_router(goals.router,        prefix="/api",          tags=["Goals"])
app.include_router(mapa.router,         prefix="/api/map",      tags=["Mapa"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run(app, host="127.0.0.1", port=port)
