#!/usr/bin/env python3
"""
Script para adicionar índices de segurança e performance ao banco de dados.
Executa após migrate_family_profiles.py para otimizar queries e garantir segurança.
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import text
from database import engine

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

load_dotenv()

# Índices para segurança e performance
SECURITY_INDEXES = [
    # Índices em family_invites
    "CREATE INDEX IF NOT EXISTS idx_family_invites_family_id ON family_invites(family_id)",
    "CREATE INDEX IF NOT EXISTS idx_family_invites_inviter_user_id ON family_invites(inviter_user_id)",
    "CREATE INDEX IF NOT EXISTS idx_family_invites_status ON family_invites(status)",
    "CREATE INDEX IF NOT EXISTS idx_family_invites_expires_at ON family_invites(expires_at)",
    
    # Índices em tabelas com profile_id (para isolamento de dados)
    "CREATE INDEX IF NOT EXISTS idx_medications_profile_id ON medications(profile_id)",
    "CREATE INDEX IF NOT EXISTS idx_medication_logs_profile_id ON medication_logs(profile_id)",
    "CREATE INDEX IF NOT EXISTS idx_emergency_contacts_profile_id ON emergency_contacts(profile_id)",
    "CREATE INDEX IF NOT EXISTS idx_doctor_visits_profile_id ON doctor_visits(profile_id)",
    "CREATE INDEX IF NOT EXISTS idx_medical_exams_profile_id ON medical_exams(profile_id)",
    "CREATE INDEX IF NOT EXISTS idx_exam_data_points_profile_id ON exam_data_points(profile_id)",
    
    # Índices em users
    "CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id)",
    "CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type)",
]

# Constraints UNIQUE para segurança
UNIQUE_CONSTRAINTS = [
    # Garantir que license_key seja único (se tabela licenses existir)
    """
    DO $$
    BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'licenses') THEN
            IF NOT EXISTS (
                SELECT FROM information_schema.table_constraints 
                WHERE constraint_name = 'licenses_license_key_key'
            ) THEN
                ALTER TABLE licenses ADD CONSTRAINT licenses_license_key_key UNIQUE (license_key);
            END IF;
        END IF;
    END $$;
    """,
]


def add_indexes():
    """Adiciona índices de segurança e performance"""
    print("=" * 80)
    print("ADICIONANDO ÍNDICES DE SEGURANÇA E PERFORMANCE")
    print("=" * 80)
    print()
    
    with engine.begin() as connection:
        # Adicionar índices
        print("Adicionando índices...")
        for index_sql in SECURITY_INDEXES:
            try:
                connection.execute(text(index_sql))
                index_name = index_sql.split("idx_")[1].split(" ")[0] if "idx_" in index_sql else "índice"
                print(f"  ✅ {index_name}")
            except Exception as e:
                print(f"  ⚠️  Erro ao criar índice: {str(e)}")
        
        print()
        
        # Adicionar constraints UNIQUE
        print("Adicionando constraints UNIQUE...")
        for constraint_sql in UNIQUE_CONSTRAINTS:
            try:
                connection.execute(text(constraint_sql))
                print(f"  ✅ Constraint UNIQUE adicionada")
            except Exception as e:
                print(f"  ⚠️  Erro ao adicionar constraint: {str(e)}")
        
        print()
        print("=" * 80)
        print("✅ Índices e constraints adicionados com sucesso!")
        print("=" * 80)


if __name__ == "__main__":
    try:
        add_indexes()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ ERRO ao adicionar índices: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
