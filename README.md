# Bookish ◆ El Archivo Noir
### Tu biblioteca personal — Etapa 1

Una aplicación de escritorio local para llevar el registro de tus lecturas, con estética Art Déco, negro y oro.

---

## ¿Qué incluye la Etapa 1?

- **Registro de libros**: título, autor, género, páginas, editorial, año, ISBN, estado, calificación, etiquetas y reseña personal
- **Estados**: Por leer / Leyendo / Leído
- **Portadas**: cargá imágenes locales para cada libro
- **Sistema de estrellitas**: calificación de 1 a 5
- **Timers múltiples**: un cronómetro independiente por libro activo, con acumulado total de horas
- **Notas y citas**: agregá reflexiones personales o citas textuales del libro
- **Estadísticas**: total de libros, leídos, páginas y horas de lectura
- **Diseño Art Déco**: Cinzel + EB Garamond, negro y oro, sin gradientes ni sombras

---

## Estructura del proyecto

```
Bookish_v2-4/
├── backend/
│   ├── main.py          # FastAPI — todas las rutas
│   ├── models.py        # Modelos SQLAlchemy (Libro, Nota, SesionLectura)
│   ├── database.py      # Conexión SQLite e inicialización
│   ├── covers/          # Portadas subidas por el usuario
│   └── bookish.db       # Base de datos SQLite (se crea automáticamente)
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── styles/
│   │   │   └── global.css   # Sistema de diseño Art Déco completo
│   │   ├── pages/
│   │   │   ├── Biblioteca.jsx     # Pantalla principal
│   │   │   ├── DetalleLibro.jsx   # Detalle de un libro
│   │   │   └── FormLibro.jsx      # Formulario agregar / editar
│   │   └── components/
│   │       ├── TarjetaLibro.jsx   # Tarjeta en la grilla
│   │       ├── Estrellas.jsx      # Selector de calificación
│   │       ├── Timer.jsx          # Cronómetro de lectura
│   │       └── ModalNota.jsx      # Modal para agregar notas
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Cómo ejecutar la app

### 1. Backend (FastAPI + SQLite)

```bash
cd backend
pip install fastapi uvicorn sqlalchemy python-multipart
uvicorn main:app --reload --port 8000
```

El backend corre en: `http://localhost:8000`
La base de datos `bookish.db` se crea automáticamente al iniciar.

### 2. Frontend (React + Vite)

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La app abre en: `http://localhost:5173`

---

## Rutas de la aplicación

| Ruta | Pantalla |
|------|----------|
| `/` | Biblioteca principal |
| `/libro/:id` | Detalle del libro |
| `/agregar` | Formulario para agregar un libro |
| `/libro/:id/editar` | Formulario de edición |

---

## API del backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/libros` | Listar todos los libros |
| `POST` | `/api/libros` | Crear un libro |
| `GET` | `/api/libros/:id` | Obtener un libro |
| `PUT` | `/api/libros/:id` | Actualizar un libro |
| `DELETE` | `/api/libros/:id` | Eliminar un libro |
| `POST` | `/api/libros/:id/portada` | Subir portada |
| `GET` | `/api/libros/:id/notas` | Listar notas del libro |
| `POST` | `/api/libros/:id/notas` | Crear nota o cita |
| `DELETE` | `/api/notas/:id` | Eliminar nota |
| `GET` | `/api/libros/:id/sesiones` | Listar sesiones de lectura |
| `POST` | `/api/libros/:id/sesiones` | Guardar sesión completada |
| `GET` | `/api/estadisticas` | Estadísticas globales |
| `GET` | `/portadas/:filename` | Servir imagen de portada |

---

## Notas técnicas

- Los timers viven **solo en el estado del frontend**. Al cerrar o recargar la página, el cronómetro activo se pierde. Solo las sesiones guardadas (al detener el timer) persisten en la base de datos.
- Las portadas se almacenan en `backend/covers/` con nombre de archivo aleatorio (UUID).
- El proxy de Vite redirige `/api` y `/portadas` al backend automáticamente durante el desarrollo.

---

## Roadmap

- **Etapa 2** — Dashboard con gráficos e historia lectora anual
- **Etapa 3** — Mapa interactivo de lugares ficticios
- **Etapa 4** — UI responsive para acceso desde celular
- **Etapa 5** — Recomendaciones con IA + OpenLibrary API

---

*Bookish — Un santuario para el bibliófilo.*  ◆
