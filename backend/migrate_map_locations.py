import os
import sqlite3
from config import DATA_DIR

DB_PATH = os.path.join(DATA_DIR, "bookish.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print("Database not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("PRAGMA table_info(map_locations)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "is_journey_point" not in columns:
            print("Adding is_journey_point column to map_locations table...")
            cursor.execute("ALTER TABLE map_locations ADD COLUMN is_journey_point BOOLEAN NOT NULL DEFAULT 1")
            conn.commit()
            print("Migration successful.")
        else:
            print("Column is_journey_point already exists.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
