"""
Migração para adicionar campo encrypted_data às tabelas de dados médicos.
Executa: python migrations/add_encrypted_data_fields.py
"""
import sys
import os
from pathlib import Path

# Adicionar diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def add_encrypted_data_fields():
    """
    Adiciona campo encrypted_data (JSONB) às tabelas de dados médicos.
    """
    tables = [
        "medications",
        "medical_exams",
        "doctor_visits",
        "emergency_contacts"
    ]
    
    with engine.connect() as conn:
        try:
            for table in tables:
                # Verificar se coluna já existe
                check_query = text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' 
                    AND column_name = 'encrypted_data'
                """)
                result = conn.execute(check_query)
                exists = result.fetchone() is not None
                
                if exists:
                    logger.info(f"Coluna encrypted_data já existe na tabela {table}")
                else:
                    # Adicionar coluna JSONB
                    alter_query = text(f"""
                        ALTER TABLE {table} 
                        ADD COLUMN encrypted_data JSONB
                    """)
                    conn.execute(alter_query)
                    conn.commit()
                    logger.info(f"Coluna encrypted_data adicionada à tabela {table}")
            
            logger.info("Migração concluída com sucesso!")
            return True
            
        except Exception as e:
            logger.error(f"Erro na migração: {e}")
            conn.rollback()
            return False


if __name__ == "__main__":
    print("=" * 60)
    print("  Migração: Adicionar campo encrypted_data")
    print("=" * 60)
    print()
    
    success = add_encrypted_data_fields()
    
    if success:
        print("SUCCESS: Migracao executada com sucesso!")
    else:
        print("ERROR: Erro ao executar migracao")
        sys.exit(1)
