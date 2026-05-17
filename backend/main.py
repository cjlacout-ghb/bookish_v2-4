from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import libros, notas, sesiones, estadisticas, backup, stats, goals, mapa

from config import DATA_DIR, COVERS_DIR, CAPTURAS_DIR
import os

# STEP 1 — Lifespan: only init_db, no StaticFiles for covers
@asynccontextmanager
async def lifespan(app: FastAPI):
    from config import DATA_DIR
    import os
    from migrations import aplicar_migraciones
    
    db_path = os.path.join(DATA_DIR, "bookish.db")
    aplicar_migraciones(db_path)
    
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

# Asegurar que las carpetas existen con manejo de errores explícito
def ensure_directories():
    for d in [DATA_DIR, COVERS_DIR, CAPTURAS_DIR]:
        try:
            if not os.path.exists(d):
                os.makedirs(d, exist_ok=True)
            
            # Test de escritura rápido
            test_file = os.path.join(d, ".write_test")
            with open(test_file, "w") as f:
                f.write("test")
            os.remove(test_file)
        except Exception as e:
            print(f"CRITICAL ERROR creating or writing to {d}: {str(e)}")
            # Intentar escribir en un log file en el home como último recurso
            try:
                log_path = os.path.join(os.path.expanduser("~"), "bookish_error.log")
                with open(log_path, "a") as f:
                    import datetime
                    f.write(f"[{datetime.datetime.now()}] Error accessing {d}: {str(e)}\n")
            except:
                pass

ensure_directories()

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
