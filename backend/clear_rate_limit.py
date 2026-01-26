#!/usr/bin/env python3
"""
Script para limpar rate limiting e tentativas falhadas de login.
Execute este script quando estiver bloqueado por rate limiting.
"""

import sys
from datetime import datetime, timezone, timedelta
from database import SessionLocal
from models import UserLoginAttempt

def clear_failed_attempts():
    """Limpa todas as tentativas falhadas de login"""
    db = SessionLocal()
    try:
        # Limpar todas as tentativas
        deleted = db.query(UserLoginAttempt).delete()
        db.commit()
        print(f"✅ Removidas {deleted} tentativas falhadas de login")
        return deleted
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao limpar tentativas: {e}")
        return 0
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 50)
    print("  Limpar Rate Limit de Login")
    print("=" * 50)
    print()
    
    deleted = clear_failed_attempts()
    
    print()
    print("=" * 50)
    print("  Limpeza Concluída!")
    print("=" * 50)
    print()
    print("⚠️  IMPORTANTE:")
    print("   O slowapi rate limit (5/15min) usa cache em memória.")
    print("   Para limpar completamente, REINICIE o backend:")
    print("     1. Pare o backend (Ctrl+C)")
    print("     2. Inicie novamente: uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    print()
    print("   OU aguarde 15 minutos para o rate limit expirar automaticamente.")
    print()
