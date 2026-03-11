"""Entry point para execução do backend via PyInstaller.

Uso:
    python run_backend.py [porta] [host]
    python run_backend.py 9000
    python run_backend.py 9000 127.0.0.1

Nota sobre PyInstaller:
    uvicorn.run() deve receber o OBJETO app, não uma string "app.main:app".
    Em executáveis congelados, o importlib interno do Uvicorn não consegue
    resolver strings de módulo via FrozenImporter — apenas o import nativo
    do Python funciona no ambiente PyInstaller.
"""
import sys
import os

# Fix para PyInstaller: garantir que módulos são encontrados no diretório correto.
# os.chdir() deve ocorrer ANTES do import de app.main.
if getattr(sys, 'frozen', False):
    # Rodando como executável PyInstaller
    os.chdir(os.path.dirname(sys.executable))

import uvicorn


def main():
    """Inicia o servidor Uvicorn/FastAPI."""
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"

    # Importar o objeto app diretamente — obrigatório para PyInstaller.
    # A string "app.main:app" falha em builds frozen porque o importlib
    # interno do Uvicorn não passa pelo FrozenImporter do PyInstaller.
    from app.main import app as fastapi_app

    uvicorn.run(
        fastapi_app,
        host=host,
        port=port,
        log_level="info",
        workers=1,  # Único worker para desktop (SQLite não suporta múltiplos workers bem)
    )


if __name__ == '__main__':
    main()
