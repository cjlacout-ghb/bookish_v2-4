def aplicar_migraciones(db_path):
    import sqlite3
    import os
    
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Nuevas tablas (Etapa 2 y 3)
    creaciones = [
        # Etapa 2 - ReadingGoal
        """CREATE TABLE IF NOT EXISTS reading_goals (
            id INTEGER PRIMARY KEY,
            year INTEGER UNIQUE,
            target_books INTEGER,
            created_at DATETIME,
            updated_at DATETIME
        )""",
        
        # Etapa 3 - MapLocation
        """CREATE TABLE IF NOT EXISTS map_locations (
            id INTEGER PRIMARY KEY,
            book_id INTEGER REFERENCES libros(id),
            name TEXT NOT NULL,
            place_type TEXT,
            is_fictional BOOLEAN DEFAULT 0,
            note TEXT,
            latitude FLOAT NOT NULL,
            longitude FLOAT NOT NULL,
            is_journey_point BOOLEAN DEFAULT 1,
            created_at DATETIME
        )"""
    ]
    
    for sql in creaciones:
        try:
            cursor.execute(sql)
        except Exception as e:
            print(f"Migración omitida (ya existe o error): {e}")

    # 2. Modificaciones de tablas existentes (ALTER TABLE)
    # SQLite no soporta IF NOT EXISTS en ALTER TABLE, por eso se hace con try/except
    alteraciones = [
        # Etapa 1.5 - Sesiones de Lectura
        "ALTER TABLE sesiones_lectura ADD COLUMN is_active BOOLEAN DEFAULT 0",
        "ALTER TABLE sesiones_lectura ADD COLUMN paused_at DATETIME",
        "ALTER TABLE sesiones_lectura ADD COLUMN session_note TEXT",
        "ALTER TABLE sesiones_lectura ADD COLUMN pause_offset_seconds INTEGER DEFAULT 0",
        "ALTER TABLE sesiones_lectura ADD COLUMN captura_filename TEXT",

        # Nuevas columnas en libros (por compatibilidad hacia atrás con v1)
        "ALTER TABLE libros ADD COLUMN color TEXT DEFAULT '#c9a84c'",
        "ALTER TABLE libros ADD COLUMN etiquetas TEXT",
        "ALTER TABLE libros ADD COLUMN resena TEXT",
        "ALTER TABLE libros ADD COLUMN ultima_edicion_anio INTEGER",
        "ALTER TABLE libros ADD COLUMN actual_edicion_anio INTEGER",
        "ALTER TABLE libros ADD COLUMN primera_edicion_anio INTEGER",
        
        # Nuevas columnas en map_locations (por si se creó antes del fix de journey_point)
        "ALTER TABLE map_locations ADD COLUMN is_journey_point BOOLEAN DEFAULT 1"
    ]

    for sql in alteraciones:
        try:
            cursor.execute(sql)
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                pass # Es esperado si la columna ya existe
            else:
                print(f"Error en ALTER TABLE: {sql} - {e}")
        except Exception as e:
            print(f"Error inesperado en ALTER TABLE: {sql} - {e}")

    # Renombrar columnas antiguas si existen en la tabla libros (retrocompatibilidad)
    try:
        cursor.execute("PRAGMA table_info(libros)")
        cols = {row[1] for row in cursor.fetchall()}
        
        if 'anio' in cols and 'primera_edicion_anio' in cols:
            cursor.execute("UPDATE libros SET primera_edicion_anio = anio WHERE primera_edicion_anio IS NULL")
        if 'ultima_edicion_detalle' in cols and 'actual_edicion_anio' in cols:
            cursor.execute("UPDATE libros SET actual_edicion_anio = CAST(ultima_edicion_detalle AS INTEGER) WHERE actual_edicion_anio IS NULL")
    except Exception as e:
        print(f"Error copiando datos legacy en libros: {e}")

    conn.commit()
    conn.close()
