#!/usr/bin/env python3
"""
Script para verificar estrutura do banco de dados PostgreSQL.
Verifica se todas as tabelas necessárias existem e se seguem critérios de segurança.
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import text, inspect
from database import engine

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

load_dotenv()

# Tabelas obrigatórias para o sistema de perfis familiares
REQUIRED_TABLES = [
    'families',
    'family_profiles',
    'family_caregivers',
    'family_profile_links',
    'family_invites',
    'family_data_shares',
]

# Tabelas que devem ter coluna profile_id
TABLES_WITH_PROFILE_ID = [
    'medications',
    'medication_logs',
    'emergency_contacts',
    'doctor_visits',
    'medical_exams',
    'exam_data_points',
]

# Colunas obrigatórias em users
REQUIRED_USER_COLUMNS = [
    'family_id',
    'account_type',
    'created_by',
    'permissions',
]

# Índices esperados para segurança e performance
EXPECTED_INDEXES = {
    'family_profiles': ['family_id', 'account_type', 'created_by'],
    'family_invites': ['family_id', 'inviter_user_id', 'invite_code', 'status', 'expires_at'],
    'family_data_shares': ['family_id', 'from_profile_id', 'to_profile_id'],
    'medications': ['profile_id'],
    'medication_logs': ['profile_id'],
    'emergency_contacts': ['profile_id'],
    'doctor_visits': ['profile_id'],
    'medical_exams': ['profile_id'],
    'exam_data_points': ['profile_id', 'exam_id'],
    'users': ['family_id', 'account_type'],
}

def check_table_exists(connection, table_name: str) -> bool:
    """Verifica se uma tabela existe"""
    result = connection.execute(text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = :table_name
        );
    """), {"table_name": table_name})
    return result.scalar()

def check_column_exists(connection, table_name: str, column_name: str) -> bool:
    """Verifica se uma coluna existe em uma tabela"""
    result = connection.execute(text("""
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = :table_name 
            AND column_name = :column_name
        );
    """), {"table_name": table_name, "column_name": column_name})
    return result.scalar()

def check_index_exists(connection, table_name: str, column_name: str) -> bool:
    """Verifica se existe índice em uma coluna"""
    result = connection.execute(text("""
        SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE tablename = :table_name 
            AND indexdef LIKE :pattern
        );
    """), {"table_name": table_name, "pattern": f"%{column_name}%"})
    return result.scalar()

def check_unique_constraint(connection, table_name: str, column_name: str) -> bool:
    """Verifica se existe constraint UNIQUE em uma coluna"""
    result = connection.execute(text("""
        SELECT EXISTS (
            SELECT FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage AS ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = :table_name 
            AND tc.constraint_type = 'UNIQUE'
            AND ccu.column_name = :column_name
        );
    """), {"table_name": table_name, "column_name": column_name})
    return result.scalar()

def get_table_columns(connection, table_name: str) -> list:
    """Obtém lista de colunas de uma tabela"""
    result = connection.execute(text("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = :table_name
        ORDER BY ordinal_position;
    """), {"table_name": table_name})
    return result.fetchall()

def verify_database():
    """Verifica estrutura completa do banco de dados"""
    print("=" * 80)
    print("VERIFICAÇÃO DO BANCO DE DADOS POSTGRESQL")
    print("=" * 80)
    print()
    
    issues = []
    warnings = []
    
    with engine.connect() as connection:
        # 1. Verificar tabelas obrigatórias
        print("1. VERIFICANDO TABELAS OBRIGATÓRIAS")
        print("-" * 80)
        for table in REQUIRED_TABLES:
            exists = check_table_exists(connection, table)
            if exists:
                print(f"  ✅ {table} - existe")
            else:
                print(f"  ❌ {table} - NÃO EXISTE")
                issues.append(f"Tabela {table} não existe")
        print()
        
        # 2. Verificar coluna profile_id nas tabelas de dados
        print("2. VERIFICANDO COLUNA profile_id")
        print("-" * 80)
        for table in TABLES_WITH_PROFILE_ID:
            exists = check_table_exists(connection, table)
            if not exists:
                print(f"  ⚠️  {table} - tabela não existe, pulando verificação de profile_id")
                warnings.append(f"Tabela {table} não existe")
                continue
            
            has_profile_id = check_column_exists(connection, table, 'profile_id')
            if has_profile_id:
                print(f"  ✅ {table} - tem coluna profile_id")
            else:
                print(f"  ❌ {table} - NÃO tem coluna profile_id")
                issues.append(f"Tabela {table} não tem coluna profile_id")
        print()
        
        # 3. Verificar colunas obrigatórias em users
        print("3. VERIFICANDO COLUNAS EM users")
        print("-" * 80)
        users_exists = check_table_exists(connection, 'users')
        if users_exists:
            for column in REQUIRED_USER_COLUMNS:
                exists = check_column_exists(connection, 'users', column)
                if exists:
                    print(f"  ✅ users.{column} - existe")
                else:
                    print(f"  ❌ users.{column} - NÃO EXISTE")
                    issues.append(f"Coluna users.{column} não existe")
        else:
            print("  ❌ Tabela users não existe")
            issues.append("Tabela users não existe")
        print()
        
        # 4. Verificar índices para segurança e performance
        print("4. VERIFICANDO ÍNDICES")
        print("-" * 80)
        for table, columns in EXPECTED_INDEXES.items():
            if not check_table_exists(connection, table):
                print(f"  ⚠️  {table} - tabela não existe, pulando verificação de índices")
                continue
            
            for column in columns:
                has_index = check_index_exists(connection, table, column)
                if has_index:
                    print(f"  ✅ {table}.{column} - tem índice")
                else:
                    print(f"  ⚠️  {table}.{column} - sem índice (recomendado para performance)")
                    warnings.append(f"Tabela {table}.{column} não tem índice")
        print()
        
        # 5. Verificar constraints UNIQUE importantes
        print("5. VERIFICANDO CONSTRAINTS UNIQUE")
        print("-" * 80)
        # invite_code deve ser único
        if check_table_exists(connection, 'family_invites'):
            has_unique = check_unique_constraint(connection, 'family_invites', 'invite_code')
            if has_unique:
                print(f"  ✅ family_invites.invite_code - tem constraint UNIQUE")
            else:
                print(f"  ⚠️  family_invites.invite_code - sem constraint UNIQUE (recomendado para segurança)")
                warnings.append("family_invites.invite_code não tem constraint UNIQUE")
        
        # license_key deve ser único
        if check_table_exists(connection, 'licenses'):
            has_unique = check_unique_constraint(connection, 'licenses', 'license_key')
            if has_unique:
                print(f"  ✅ licenses.license_key - tem constraint UNIQUE")
            else:
                print(f"  ⚠️  licenses.license_key - sem constraint UNIQUE (recomendado para segurança)")
                warnings.append("licenses.license_key não tem constraint UNIQUE")
        print()
        
        # 6. Verificar estrutura detalhada de tabelas críticas
        print("6. ESTRUTURA DETALHADA DE TABELAS CRÍTICAS")
        print("-" * 80)
        critical_tables = ['family_profiles', 'family_invites', 'family_data_shares']
        for table in critical_tables:
            if check_table_exists(connection, table):
                print(f"\n  {table}:")
                columns = get_table_columns(connection, table)
                for col_name, col_type, is_nullable in columns:
                    nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
                    print(f"    - {col_name}: {col_type} ({nullable})")
        print()
        
        # 7. Resumo
        print("=" * 80)
        print("RESUMO")
        print("=" * 80)
        
        if not issues and not warnings:
            print("✅ Banco de dados está completo e segue critérios de segurança!")
        else:
            if issues:
                print(f"\n❌ PROBLEMAS ENCONTRADOS ({len(issues)}):")
                for issue in issues:
                    print(f"  - {issue}")
            
            if warnings:
                print(f"\n⚠️  AVISOS ({len(warnings)}):")
                for warning in warnings:
                    print(f"  - {warning}")
        
        print()
        print("=" * 80)
        
        return len(issues) == 0

if __name__ == "__main__":
    try:
        success = verify_database()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERRO ao verificar banco de dados: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
