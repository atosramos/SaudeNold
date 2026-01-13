#!/usr/bin/env python3
"""
Script para testar o endpoint de dashboard diretamente
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import func, Float
from database import SessionLocal
import models
from datetime import datetime, timedelta, timezone

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

load_dotenv()

def test_dashboard_logic():
    """Testa a lógica do dashboard sem passar pelo FastAPI"""
    
    print("=" * 60)
    print("Testando logica do dashboard...")
    print("=" * 60)
    print()
    
    db = SessionLocal()
    
    try:
        # Estatísticas de licenças
        print("1. Testando estatisticas de licencas...")
        now = datetime.now(timezone.utc)
        total_licenses = db.query(models.License).count()
        print(f"   Total de licencas: {total_licenses}")
        
        active_licenses = db.query(models.License).filter(
            models.License.is_active == True,
            models.License.expiration_date > now
        ).count()
        print(f"   Licencas ativas: {active_licenses}")
        
        expired_licenses = db.query(models.License).filter(
            models.License.expiration_date <= now,
            models.License.is_active == True
        ).count()
        print(f"   Licencas expiradas: {expired_licenses}")
        
        revoked_licenses = db.query(models.License).filter(
            models.License.is_active == False
        ).count()
        print(f"   Licencas revogadas: {revoked_licenses}")
        print()
        
        # Estatísticas de ativações
        print("2. Testando estatisticas de ativacoes...")
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        total_activations = db.query(models.License).filter(
            models.License.device_id.isnot(None)
        ).count()
        print(f"   Total de ativacoes: {total_activations}")
        print()
        
        # Estatísticas de validações
        print("3. Testando estatisticas de validacoes...")
        total_validations = db.query(models.LicenseValidationLog).count()
        print(f"   Total de validacoes: {total_validations}")
        print()
        
        # Estatísticas de compras
        print("4. Testando estatisticas de compras...")
        total_purchases = db.query(models.Purchase).count()
        print(f"   Total de compras: {total_purchases}")
        
        total_revenue_result = db.query(
            func.sum(func.cast(models.Purchase.amount, Float))
        ).filter(
            models.Purchase.status == 'completed'
        ).scalar()
        total_revenue = float(total_revenue_result) if total_revenue_result else 0.0
        print(f"   Receita total: R$ {total_revenue:.2f}")
        print()
        
        print("=" * 60)
        print("SUCESSO: Logica do dashboard funcionando!")
        print("=" * 60)
        return True
        
    except Exception as e:
        import traceback
        print(f"ERRO: {str(e)}")
        print()
        print("Traceback completo:")
        print(traceback.format_exc())
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_dashboard_logic()
    sys.exit(0 if success else 1)
