# Master Rule: Bookish — El Archivo Noir (v2.4)

Este documento es la única fuente de verdad para la arquitectura, rutas y comportamiento del proyecto. Ignorar cualquier información de proyectos previos.

## 1. Contexto de Ejecución Dual
El proyecto tiene dos estados que conviven durante el desarrollo:
- **MODO DESARROLLO (Browser)**: Se visualiza en el navegador vía Vite (vía `localhost`). Las rutas de archivos locales (`app://`) pueden fallar en un navegador estándar.
- **MODO PRODUCCIÓN/FINAL (Electron EXE)**: El código se empaqueta en un ejecutable de Windows. Los datos persisten fuera de la carpeta del programa.

## 2. Gestión de Rutas y Persistencia
- **Ubicación de Datos**: Los datos del usuario (Base de Datos SQLite y Carpeta de Portadas) **NUNCA** deben estar dentro de la carpeta del código en producción.
- **Ruta Oficial (Windows)**: `%USERPROFILE%\Documents\Bookish\data`
  - `.../data/bookish.db` (Base de datos activa)
  - `.../data/portadas/` (Almacén de imágenes .webp/.jpg/.png)
- **Ruta de Desarrollo (Solo referencia)**: `backend/covers` y `backend/bookish.db` solo se usan para pruebas o como semillas iniciales. La app en vivo siempre mira en `Documentos`.

## 3. Servicio de Imágenes (Noir Architecture)
- **Protocolo Personalizado**: Las imágenes NO se sirven mediante FastAPI (Python). Se cargan usando el protocolo nativo de Electron `app://covers/<filename>`.
- **Flujo**: `React (Frontend)` -> `app://covers/` -> `Electron (Main Process)` -> `Disco Duro (Documentos)`.
- **Nombres de Archivo**: Las imágenes se guardan con nombres **UUID** (ej: `643446...webp`) para evitar colisiones y caracteres especiales.

## 4. Stack Tecnológico
- **Frontend**: Vite + React + Vanilla CSS (Aesthetics Noir/Art Déco).
- **Backend**: Python (FastAPI) + SQLAlchemy.
- **Contenedor**: Electron (Manejo de archivos locales y empaquetado EXE).

## 5. Reglas de Comunicación y Código
- Mantener siempre la estética "Noir/Elegante".
- No usar TailwindCSS (Vanilla CSS con Custom Properties).
- Antes de proponer cambios de rutas, verificar si afectan al modo Browser o al modo EXE.
