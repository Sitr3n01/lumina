#!/usr/bin/env python3
"""
Script para criar usuário administrador padrão.
Username: admin
Password: Admin123!

Usage:
    python scripts/create_default_admin.py
"""
import sys
from pathlib import Path

# Adicionar app ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash


def create_default_admin():
    """Cria usuário administrador padrão"""

    print("=" * 60)
    print("  SENTINEL - Criar Admin Padrao")
    print("=" * 60)
    print()

    db: Session = SessionLocal()

    try:
        # Verificar se admin já existe
        admin_exists = db.query(User).filter(User.username == "admin").first()

        if admin_exists:
            print("[AVISO] Usuario 'admin' ja existe!")
            print(f"  Email: {admin_exists.email}")
            print(f"  Ativo: {admin_exists.is_active}")
            print(f"  Admin: {admin_exists.is_admin}")
            print()
            return 0

        print(">> Criando administrador padrao...")
        print()

        # Criar usuário admin
        admin_user = User(
            username="admin",
            email="admin@lumina.local",
            full_name="Administrador",
            hashed_password=get_password_hash("Admin123!"),
            is_active=True,
            is_admin=True,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print()
        print("=" * 60)
        print("[OK] ADMINISTRADOR CRIADO COM SUCESSO!")
        print("=" * 60)
        print()
        print(f"ID:       {admin_user.id}")
        print(f"Username: {admin_user.username}")
        print(f"Email:    {admin_user.email}")
        print(f"Senha:    Admin123!")
        print(f"Admin:    Sim")
        print()
        print("IMPORTANTE: Troque a senha apos o primeiro login!")
        print()

        return 0

    except Exception as e:
        print(f"\n[ERRO] Erro ao criar administrador: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return 1

    finally:
        db.close()


if __name__ == "__main__":
    exit(create_default_admin())
