#!/usr/bin/env python3
"""
SENTINEL - Security Check Script
Executa Bandit (code linter) e Safety (dependency checker)
"""

import subprocess
import sys


def run_bandit():
    """Executa Bandit para verificar vulnerabilidades no código"""
    print("=" * 60)
    print("BANDIT - Security Linter")
    print("=" * 60)
    print()

    try:
        result = subprocess.run(
            [
                "python",
                "-m",
                "bandit",
                "-r",
                "app/",  # Recursivo na pasta app
                "-ll",  # Apenas LOW e acima
                "-f",
                "screen",  # Formato para terminal
                "--exclude",
                "app/tests/",  # Excluir testes
            ],
            capture_output=True,
            text=True,
        )

        print(result.stdout)

        if result.stderr:
            print("[STDERR]", result.stderr)

        if result.returncode == 0:
            print("\n[OK] Nenhuma vulnerabilidade encontrada pelo Bandit!")
            return True
        elif result.returncode == 1:
            print("\n[WARNING] Vulnerabilidades encontradas! Verifique acima.")
            return False
        else:
            print(f"\n[ERROR] Bandit falhou com codigo: {result.returncode}")
            return False

    except FileNotFoundError:
        print("[ERROR] Bandit nao encontrado. Execute: pip install bandit")
        return False
    except Exception as e:
        print(f"[ERROR] Erro ao executar Bandit: {e}")
        return False


def run_safety():
    """Executa Safety para verificar vulnerabilidades em dependências"""
    print("\n")
    print("=" * 60)
    print("SAFETY - Dependency Vulnerability Scanner")
    print("=" * 60)
    print()

    try:
        # Nota: safety check foi movido para safety scan no v3+
        result = subprocess.run(["python", "-m", "safety", "check", "--json"], capture_output=True, text=True)

        # Safety retorna JSON, vamos formatar
        if (
            "No known security vulnerabilities found" in result.stdout
            or "No known security vulnerabilities reported" in result.stdout
            or result.returncode == 0
        ):
            print("[OK] Nenhuma vulnerabilidade conhecida em dependencias!")
            return True
        else:
            print("[WARNING] Vulnerabilidades encontradas nas dependencias!")
            print(result.stdout)
            return False

    except FileNotFoundError:
        print("[ERROR] Safety nao encontrado. Execute: pip install safety")
        return False
    except Exception as e:
        print(f"[ERROR] Erro ao executar Safety: {e}")
        return False


def main():
    """Executa todas as verificações de segurança"""
    print()
    print("=" * 60)
    print("SENTINEL - Security Check")
    print("=" * 60)
    print()

    bandit_ok = run_bandit()
    safety_ok = run_safety()

    print("\n")
    print("=" * 60)
    print("RESUMO")
    print("=" * 60)
    print(f"Bandit (Code Security): {'[OK]' if bandit_ok else '[FAIL]'}")
    print(f"Safety (Dependencies):  {'[OK]' if safety_ok else '[FAIL]'}")
    print()

    if bandit_ok and safety_ok:
        print("[SUCCESS] Todas as verificacoes de seguranca passaram!")
        return 0
    else:
        print("[FAIL] Algumas verificacoes falharam. Revise os erros acima.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
