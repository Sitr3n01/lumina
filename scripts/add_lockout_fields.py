#!/usr/bin/env python3
"""
Script para adicionar campos de Account Lockout à tabela users.
Correção de VULNERABILIDADES CRÍTICAS DE SEGURANÇA.
"""

import sys
from pathlib import Path

# Adicionar path do projeto
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text

from app.database.connection import engine


def add_lockout_fields():
    """
    Adiciona campos de Account Lockout à tabela users:
    - failed_login_attempts: contador de tentativas falhas
    - locked_until: timestamp de desbloqueio automático
    """
    print("=== Adicionando campos de Account Lockout ===\n")

    with engine.connect() as conn:
        try:
            # Verificar se campos já existem
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result]

            if "failed_login_attempts" in columns and "locked_until" in columns:
                print("[OK] Campos de lockout ja existem no banco de dados!")
                return

            # Adicionar campo failed_login_attempts
            if "failed_login_attempts" not in columns:
                print("Adicionando campo: failed_login_attempts...")
                conn.execute(text("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0"))
                print("[OK] Campo failed_login_attempts adicionado")

            # Adicionar campo locked_until
            if "locked_until" not in columns:
                print("Adicionando campo: locked_until...")
                conn.execute(text("ALTER TABLE users ADD COLUMN locked_until DATETIME"))
                print("[OK] Campo locked_until adicionado")

            conn.commit()
            print("\n[SUCCESS] Migracao concluida com sucesso!")
            print("\nProtecao contra Brute Force ativada:")
            print("- Maximo de 5 tentativas de login")
            print("- Bloqueio automatico por 15 minutos")
            print("- Admins podem desbloquear via: POST /api/v1/auth/unlock-user/{user_id}")

        except Exception as e:
            print(f"\n[ERROR] Erro ao adicionar campos: {e}")
            conn.rollback()
            sys.exit(1)


if __name__ == "__main__":
    add_lockout_fields()
