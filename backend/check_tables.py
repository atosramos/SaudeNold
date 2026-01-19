#!/usr/bin/env python3
"""
Script para verificar se as tabelas necessárias existem no banco de dados
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from database import Base, engine

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Carregar variáveis de ambiente
load_dotenv()

def check_tables():
    """Verifica se as tabelas necessárias existem"""
    
    # Lista de tabelas necessárias para analytics
    required_tables = [
        'licenses',
        'purchases',
        'license_validation_logs'
    ]
    
    print("=" * 60)
    print("Verificando tabelas no banco de dados...")
    print("=" * 60)
    print()
    
    try:
        # Conectar ao banco
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        print(f"Tabelas encontradas no banco: {len(existing_tables)}")
        print()
        
        # Verificar cada tabela necessária
        all_exist = True
        for table in required_tables:
            if table in existing_tables:
                print(f"[OK] {table} - EXISTE")
                
                # Contar registros
                try:
                    with engine.connect() as conn:
                        result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = result.scalar()
                        print(f"  Registros: {count}")
                except Exception as e:
                    print(f"  Erro ao contar registros: {e}")
            else:
                print(f"[ERRO] {table} - NAO EXISTE")
                all_exist = False
            print()
        
        # Listar todas as tabelas
        print("Todas as tabelas no banco:")
        for table in sorted(existing_tables):
            print(f"  - {table}")
        print()
        
        if all_exist:
            print("=" * 60)
            print("SUCESSO: Todas as tabelas necessarias existem!")
            print("=" * 60)
            return True
        else:
            print("=" * 60)
            print("ERRO: Algumas tabelas estao faltando!")
            print("Execute: python -c 'from database import Base, engine; Base.metadata.create_all(bind=engine)'")
            print("=" * 60)
            return False
            
    except Exception as e:
        print(f"ERRO ao conectar ao banco de dados: {e}")
        print()
        print("Verifique:")
        print("  1. Se o PostgreSQL esta rodando")
        print("  2. Se as credenciais no .env estao corretas")
        print("  3. Se o banco 'saudenold' existe")
        return False

if __name__ == "__main__":
    success = check_tables()
    sys.exit(0 if success else 1)
