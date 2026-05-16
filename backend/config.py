import os
import sys

def get_data_dir():
    # 1. Prioridad: Argumento de línea de comandos (pasado por Electron)
    if len(sys.argv) > 2:
        path_arg = sys.argv[2]
        if path_arg and os.path.isabs(path_arg):
            return path_arg

    # 2. Fallback: Detección automática
    home = os.path.expanduser("~")
    if sys.platform == "win32":
        try:
            import ctypes
            from ctypes import wintypes
            buf = ctypes.create_unicode_buffer(wintypes.MAX_PATH)
            # 5 = CSIDL_PERSONAL (Mis Documentos)
            ctypes.windll.shell32.SHGetFolderPathW(None, 5, None, 0, buf)
            documents = buf.value
            if not documents:
                raise Exception("SHGetFolderPathW returned empty")
        except Exception:
            # Fallback a la carpeta home + Documents
            documents = os.path.join(home, "Documents")
        
        return os.path.join(documents, "Bookish", "data")
    
    elif sys.platform == "darwin":
        return os.path.join(home, "Documents", "Bookish", "data")
    else:
        # Linux
        documents = os.path.join(home, "Documents")
        if os.path.exists(documents):
            return os.path.join(documents, "Bookish", "data")
        return os.path.join(home, ".bookish", "data")

DATA_DIR = get_data_dir()
os.makedirs(DATA_DIR, exist_ok=True)

# Directorio raíz del script original
BASE_DIR = os.path.dirname(__file__)

# Directorio donde se almacenan las portadas (ahora en AppData)
COVERS_DIR = os.path.join(DATA_DIR, "portadas")
os.makedirs(COVERS_DIR, exist_ok=True)

# Directorio donde se almacenan las capturas de sesiones de lectura
CAPTURAS_DIR = os.path.join(DATA_DIR, "capturas")
os.makedirs(CAPTURAS_DIR, exist_ok=True)

# Tamaño máximo permitido para imágenes de portada (5 MB)
MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024  # Fix-11
