#!/usr/bin/env python3
import argparse
import sys

from auth import hash_password
from database import SessionLocal
import models


def validate_password(password: str) -> None:
    if len(password) < 8:
        raise ValueError("Senha deve ter pelo menos 8 caracteres")
    if len(password) > 255:
        raise ValueError("Senha muito longa")
    if not any(c.islower() for c in password):
        raise ValueError("Senha deve conter letra minuscula")
    if not any(c.isupper() for c in password):
        raise ValueError("Senha deve conter letra maiuscula")
    if not any(c.isdigit() for c in password):
        raise ValueError("Senha deve conter numero")
    if not any(c in "!@#$%^&*" for c in password):
        raise ValueError("Senha deve conter caractere especial (!@#$%^&*)")


def reset_password(email: str, new_password: str) -> None:
    validate_password(new_password)
    session = SessionLocal()
    try:
        user = session.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise RuntimeError(f"Usuario nao encontrado: {email}")
        user.password_hash = hash_password(new_password)
        session.commit()
        print(f"Senha atualizada para {email}.")
    finally:
        session.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Resetar senha de usuario SaudeNold")
    parser.add_argument("--email", required=True, help="Email do usuario")
    parser.add_argument("--password", required=True, help="Nova senha")
    args = parser.parse_args()

    email = args.email.strip().lower()
    if not email:
        print("Email invalido.", file=sys.stderr)
        return 1
    try:
        reset_password(email, args.password)
    except Exception as exc:
        print(f"Erro ao resetar senha: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
