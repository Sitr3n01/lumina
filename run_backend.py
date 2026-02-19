"""Entry point para execução do backend via PyInstaller.

Uso:
    python run_backend.py [porta] [host]
    python run_backend.py 9000
    python run_backend.py 9000 127.0.0.1
"""
import sys
import os

# Fix para PyInstaller: garantir que módulos são encontrados no diretório correto
if getattr(sys, 'frozen', False):
    # Rodando como executável PyInstaller
    os.chdir(os.path.dirname(sys.executable))

import uvicorn


def main():
    """Inicia o servidor Uvicorn/FastAPI."""
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
        workers=1  # Único worker para desktop (SQLite não suporta múltiplos workers bem)
    )


if __name__ == '__main__':
    main()
