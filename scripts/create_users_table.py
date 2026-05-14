#!/usr/bin/env python3
"""
Script para criar tabela de usuários no banco de dados.

Usage:
    python scripts/create_users_table.py
"""

import sys
from pathlib import Path

# Adicionar app ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database.connection import engine
from app.models.base import Base
from app.models.user import User  # Importa model para criar tabela


def create_users_table():
    """Cria tabela de usuários no banco"""

    print("=" * 60)
    print("  SENTINEL - Criar Tabela de Usuários")
    print("=" * 60)
    print()

    try:
        print(">> Criando tabela 'users' no banco de dados...")

        # Criar apenas a tabela de usuários
        # (create_all só cria tabelas que não existem)
        Base.metadata.create_all(bind=engine, tables=[User.__table__])

        print("[OK] Tabela 'users' criada com sucesso!")
        print()
        print("Estrutura da tabela:")
        print("  - id (PK)")
        print("  - email (unique)")
        print("  - username (unique)")
        print("  - hashed_password")
        print("  - full_name")
        print("  - is_active")
        print("  - is_admin")
        print("  - created_at")
        print("  - updated_at")
        print("  - last_login_at")
        print()
        print("Proximo passo: Criar primeiro usuario admin")
        print("Execute: python scripts/create_admin_user.py")
        print()

    except Exception as e:
        print(f"[ERRO] Erro ao criar tabela: {e!s}")
        import traceback

        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit(create_users_table())
