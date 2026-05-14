#!/usr/bin/env python3
"""
Script para adicionar proteção de autenticação em rotas restantes.
"""

import re
from pathlib import Path

# Routers para proteger
routers = [
    "app/routers/bookings.py",
    "app/routers/conflicts.py",
    "app/routers/statistics.py",
    "app/routers/calendar.py",
    "app/routers/sync_actions.py",
]

base_path = Path(__file__).parent.parent

for router_path in routers:
    file_path = base_path / router_path

    if not file_path.exists():
        print(f"[SKIP] {router_path} - arquivo não encontrado")
        continue

    content = file_path.read_text(encoding="utf-8")
    modified = False

    # Padrão para encontrar funções que precisam de proteção
    # Procura por: db: Session = Depends(get_db)\n):
    # E adiciona: ,\n    current_user: User = Depends(get_current_active_user)

    pattern = r"(    db: Session = Depends\(get_db\))\n(\):)"
    replacement = r"\1,\n    current_user: User = Depends(get_current_active_user)\n\2"

    new_content = re.sub(pattern, replacement, content)

    if new_content != content:
        file_path.write_text(new_content, encoding="utf-8")
        print(f"[OK] {router_path} - rotas protegidas")
        modified = True
    else:
        print(f"[SKIP] {router_path} - nenhuma alteração necessária")

print("\nConcluído!")
