# Bookish ◆ El Archivo Noir
### Tu santuario bibliófilo personal — Versión 2.4

Una aplicación de escritorio local para el coleccionista de historias, con estética Art Déco, negro y oro.

---

## Características Principales

- **Registro de libros**: Sistema completo con portadas, metadatos, calificación y reseñas.
- **Mapa de Mundos**: Cartografía interactiva para situar lugares reales y ficticios. Trazado de recorridos narrativos.
- **Gestión del Tiempo**: Temporizadores persistentes por libro y historial de sesiones de lectura.
- **Inteligencia Visual**: Dashboard con gráficos de géneros, autores y cumplimiento de metas anuales.
- **Respaldo Total**: Sistema de exportación e importación vía archivos ZIP para portabilidad absoluta.
- **Diseño Noir**: Interfaz optimizada (Responsive) con tipografías Cinzel y EB Garamond.

---

## Estructura del proyecto

```
Bookish_v2-4/
├── backend/
│   ├── main.py          # FastAPI — Router principal
│   ├── models.py        # SQLAlchemy (Libro, Nota, SesionLectura, MapLocation)
│   ├── database.py      # Conexión SQLite y migración de datos
│   └── bookish.db       # Semilla de base de datos (desarrollo)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Biblioteca.jsx     # Carrusel principal
│   │   │   ├── MapaDeMundos.jsx   # Mapa interactivo Leaflet
│   │   │   ├── InteligenciaVisual.jsx # Dashboard y Metas
│   │   │   └── GuiaUsuario.jsx    # Manual integrado
│   │   └── components/
│   │       ├── Header.jsx         # Menú responsive
│   │       └── DatePicker.jsx     # Selector Noir
├── electron/
│   ├── main.cjs         # Proceso principal (Ventana y Protocolo app://)
│   └── preload.cjs      # Puente seguro entre Electron y React
└── README.md
```

---

## Cómo ejecutar (Desarrollo)

### 1. Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## Notas Técnicas y Persistencia

- **Ubicación de Datos**: En producción, Bookish guarda todo en `%USERPROFILE%\Documents\Bookish\data\`.
- **Servicio de Imágenes**: Las portadas se sirven mediante el protocolo `app://covers/` manejado por Electron para mayor seguridad y velocidad.
- **Base de Datos**: SQLite (SQLAlchemy 1.4.52 por compatibilidad).

---

## Estado del Proyecto (Roadmap)

- [x] **Etapa 1** — Registro base y Estética Noir.
- [x] **Etapa 2** — Dashboard e Inteligencia Visual.
- [x] **Etapa 3** — Mapa de Mundos y Recorridos.
- [x] **Etapa 4** — UI Responsive y Menú Mobile.
- [ ] **Etapa 5** — Recomendaciones con IA y API externa.

---

*Bookish — Un santuario para el bibliófilo.*  ◆
