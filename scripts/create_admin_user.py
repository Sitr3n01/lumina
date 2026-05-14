#!/usr/bin/env python3
"""
Script para criar primeiro usuário administrador.

Usage:
    python scripts/create_admin_user.py
"""

import sys
from pathlib import Path

# Adicionar app ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from getpass import getpass

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.database.connection import SessionLocal, engine
from app.models.base import Base
from app.models.user import User


def create_admin():
    """Cria usuário administrador interativamente"""

    print("=" * 60)
    print("  SENTINEL - Criar Usuário Administrador")
    print("=" * 60)
    print()

    # Criar tabelas se não existirem
    print("📋 Criando tabelas do banco de dados...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tabelas criadas/verificadas")
    print()

    # Conectar ao banco
    db: Session = SessionLocal()

    try:
        # Verificar se já existe admin
        admin_exists = db.query(User).filter(User.is_admin == True).first()

        if admin_exists:
            print(f"⚠️  Já existe um administrador: {admin_exists.username}")
            print()
            response = input("Deseja criar outro administrador? (s/N): ").strip().lower()
            if response != "s":
                print("Operação cancelada.")
                return

        # Coletar dados
        print("Digite os dados do administrador:")
        print()

        username = input("Username: ").strip()
        if not username:
            print("❌ Username não pode ser vazio")
            return

        # Verificar se username já existe
        if db.query(User).filter(User.username == username).first():
            print(f"❌ Username '{username}' já existe")
            return

        email = input("Email: ").strip()
        if not email:
            print("❌ Email não pode ser vazio")
            return

        # Verificar se email já existe
        if db.query(User).filter(User.email == email).first():
            print(f"❌ Email '{email}' já cadastrado")
            return

        full_name = input("Nome completo (opcional): ").strip() or None

        # Senha (input oculto)
        while True:
            password = getpass("Senha (mínimo 8 caracteres): ")

            if len(password) < 8:
                print("❌ Senha deve ter no mínimo 8 caracteres")
                continue

            # Validar força da senha
            has_upper = any(c.isupper() for c in password)
            has_lower = any(c.islower() for c in password)
            has_digit = any(c.isdigit() for c in password)

            if not (has_upper and has_lower and has_digit):
                print("❌ Senha deve conter: 1 maiúscula, 1 minúscula e 1 número")
                continue

            # Confirmar senha
            password_confirm = getpass("Confirme a senha: ")

            if password != password_confirm:
                print("❌ Senhas não conferem")
                continue

            break

        print()
        print("Criando administrador...")

        # Criar usuário
        admin_user = User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_admin=True,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print()
        print("=" * 60)
        print("✅ ADMINISTRADOR CRIADO COM SUCESSO!")
        print("=" * 60)
        print()
        print(f"ID:       {admin_user.id}")
        print(f"Username: {admin_user.username}")
        print(f"Email:    {admin_user.email}")
        print(f"Nome:     {admin_user.full_name or '(não informado)'}")
        print("Admin:    Sim")
        print()
        print("Use estas credenciais para fazer login no sistema.")
        print()

    except KeyboardInterrupt:
        print("\n\nOperação cancelada pelo usuário.")
        return

    except Exception as e:
        print(f"\n❌ Erro ao criar administrador: {e!s}")
        db.rollback()
        return

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
