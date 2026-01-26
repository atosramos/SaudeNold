#!/usr/bin/env python3
"""
Migração para suporte a perfis familiares.
Adiciona colunas e tabelas necessárias no PostgreSQL.
Versão melhorada com validações, rollback e logs detalhados.
"""
import os
import sys
from pathlib import Path
from datetime import datetime
import logging
import json

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from sqlalchemy import text, inspect
from database import engine

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration_family_profiles.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

DEFAULT_PROFILE_ID = os.getenv("DEFAULT_PROFILE_ID")

MIGRATIONS = [
    # Novas tabelas
    """
    CREATE TABLE IF NOT EXISTS families (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        admin_user_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS family_profiles (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        account_type VARCHAR(50) NOT NULL,
        birth_date TIMESTAMP WITH TIME ZONE,
        gender VARCHAR(50),
        blood_type VARCHAR(10),
        created_by INTEGER,
        permissions JSON,
        allow_quick_access BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS family_caregivers (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER NOT NULL,
        caregiver_user_id INTEGER NOT NULL,
        access_level VARCHAR(50) DEFAULT 'full',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS family_profile_links (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL,
        source_profile_id INTEGER NOT NULL,
        target_profile_id INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        approved_at TIMESTAMP WITH TIME ZONE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS family_invites (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL,
        inviter_user_id INTEGER NOT NULL,
        invitee_email VARCHAR(255),
        invite_code VARCHAR(64) UNIQUE,
        status VARCHAR(20) DEFAULT 'pending',
        expires_at TIMESTAMP WITH TIME ZONE,
        accepted_at TIMESTAMP WITH TIME ZONE,
        accepted_by_user_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS family_data_shares (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL,
        from_profile_id INTEGER NOT NULL,
        to_profile_id INTEGER NOT NULL,
        permissions JSON,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        revoked_at TIMESTAMP WITH TIME ZONE
    )
    """,
    # Colunas novas
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS family_id INTEGER",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'family_admin'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSON",
    "ALTER TABLE medications ADD COLUMN IF NOT EXISTS profile_id INTEGER",
    "ALTER TABLE medication_logs ADD COLUMN IF NOT EXISTS profile_id INTEGER",
    "ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS profile_id INTEGER",
    "ALTER TABLE doctor_visits ADD COLUMN IF NOT EXISTS profile_id INTEGER",
    "ALTER TABLE medical_exams ADD COLUMN IF NOT EXISTS profile_id INTEGER",
    "ALTER TABLE exam_data_points ADD COLUMN IF NOT EXISTS profile_id INTEGER",
]


def check_table_exists(connection, table_name: str) -> bool:
    """Verifica se uma tabela existe"""
    query = text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = :table_name
        )
    """)
    result = connection.execute(query, {"table_name": table_name})
    return result.scalar()


def check_column_exists(connection, table_name: str, column_name: str) -> bool:
    """Verifica se uma coluna existe em uma tabela"""
    query = text("""
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = :table_name
            AND column_name = :column_name
        )
    """)
    result = connection.execute(query, {"table_name": table_name, "column_name": column_name})
    return result.scalar()


def validate_pre_migration(connection) -> dict:
    """
    Valida o estado do banco antes da migração.
    
    Returns:
        dict com resultados da validação
    """
    validation = {
        'tables_exist': {},
        'columns_exist': {},
        'data_integrity': {},
        'warnings': [],
        'errors': []
    }
    
    logger.info("Validando estado do banco antes da migração...")
    
    # Verificar tabelas necessárias
    required_tables = ['users', 'medications', 'medication_logs', 'emergency_contacts', 
                      'doctor_visits', 'medical_exams', 'exam_data_points']
    
    for table in required_tables:
        exists = check_table_exists(connection, table)
        validation['tables_exist'][table] = exists
        if not exists:
            validation['warnings'].append(f"Tabela {table} não existe (será criada se necessário)")
    
    # Verificar colunas necessárias
    required_columns = {
        'users': ['family_id', 'account_type', 'created_by', 'permissions'],
        'medications': ['profile_id'],
        'medication_logs': ['profile_id'],
        'emergency_contacts': ['profile_id'],
        'doctor_visits': ['profile_id'],
        'medical_exams': ['profile_id'],
        'exam_data_points': ['profile_id'],
    }
    
    for table, columns in required_columns.items():
        if validation['tables_exist'].get(table, True):
            validation['columns_exist'][table] = {}
            for column in columns:
                exists = check_column_exists(connection, table, column)
                validation['columns_exist'][table][column] = exists
                if not exists:
                    logger.info(f"Coluna {table}.{column} não existe (será criada)")
    
    # Verificar integridade básica dos dados
    try:
        # Contar usuários
        count_users = text("SELECT COUNT(*) FROM users")
        user_count = connection.execute(count_users).scalar() or 0
        validation['data_integrity']['total_users'] = user_count
        logger.info(f"Total de usuários: {user_count}")
        
        # Contar dados médicos
        medical_tables = ['medications', 'medication_logs', 'emergency_contacts', 
                         'doctor_visits', 'medical_exams', 'exam_data_points']
        for table in medical_tables:
            if validation['tables_exist'].get(table, True):
                try:
                    count_query = text(f"SELECT COUNT(*) FROM {table}")
                    count = connection.execute(count_query).scalar() or 0
                    validation['data_integrity'][table] = count
                except Exception as e:
                    validation['warnings'].append(f"Erro ao contar registros em {table}: {str(e)}")
    except Exception as e:
        validation['errors'].append(f"Erro ao validar integridade: {str(e)}")
    
    return validation


def create_backup(connection) -> str:
    """
    Cria backup do estado atual (apenas metadados, não dados).
    Retorna caminho do arquivo de backup.
    """
    backup_file = f"migration_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    backup_data = {
        'timestamp': datetime.now().isoformat(),
        'tables': {},
        'columns': {}
    }
    
    logger.info("Criando backup do estado atual...")
    
    # Backup de estrutura de tabelas e colunas
    tables_query = text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    """)
    tables = connection.execute(tables_query).fetchall()
    
    for (table_name,) in tables:
        backup_data['tables'][table_name] = True
        
        columns_query = text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = :table_name
        """)
        columns = connection.execute(columns_query, {"table_name": table_name}).fetchall()
        backup_data['columns'][table_name] = {col[0]: col[1] for col in columns}
    
    # Salvar backup
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Backup salvo em: {backup_file}")
    return backup_file


def migrate(dry_run: bool = False) -> dict:
    """
    Executa a migração.
    
    Args:
        dry_run: Se True, apenas simula a migração
    
    Returns:
        dict com estatísticas da migração
    """
    stats = {
        'tables_created': 0,
        'columns_added': 0,
        'records_updated': 0,
        'errors': [],
        'warnings': []
    }
    
    connection = engine.connect()
    trans = connection.begin()
    
    try:
        # Validação pré-migração
        validation = validate_pre_migration(connection)
        
        if validation['errors']:
            logger.error("Erros encontrados na validação:")
            for error in validation['errors']:
                logger.error(f"  - {error}")
            raise RuntimeError("Validação pré-migração falhou")
        
        if validation['warnings']:
            logger.warning("Avisos encontrados na validação:")
            for warning in validation['warnings']:
                logger.warning(f"  - {warning}")
        
        # Criar backup
        if not dry_run:
            backup_file = create_backup(connection)
            stats['backup_file'] = backup_file
        
        if dry_run:
            logger.info("=== MODO DRY RUN - Nenhuma alteração será feita ===")
        
        # Executar migrações
        for i, statement in enumerate(MIGRATIONS, 1):
            try:
                if dry_run:
                    logger.info(f"[DRY RUN] Executaria: {statement[:100]}...")
                    continue
                
                logger.info(f"Executando migração {i}/{len(MIGRATIONS)}...")
                result = connection.execute(text(statement))
                
                # Contar alterações
                if "CREATE TABLE" in statement.upper():
                    stats['tables_created'] += 1
                elif "ADD COLUMN" in statement.upper():
                    stats['columns_added'] += 1
                
            except Exception as e:
                error_msg = f"Erro ao executar migração {i}: {str(e)}"
                logger.error(error_msg)
                stats['errors'].append(error_msg)
                # Continuar com próxima migração
        
        # Atualizar dados existentes com DEFAULT_PROFILE_ID se configurado
        if DEFAULT_PROFILE_ID and not dry_run:
            try:
                profile_id = int(DEFAULT_PROFILE_ID)
                
                # Verificar se perfil existe
                check_profile = text("SELECT COUNT(*) FROM family_profiles WHERE id = :pid")
                profile_exists = connection.execute(check_profile, {"pid": profile_id}).scalar() > 0
                
                if not profile_exists:
                    logger.warning(f"Perfil padrão {profile_id} não existe. Pulando atualização de dados.")
                else:
                    for table in [
                        "medications",
                        "medication_logs",
                        "emergency_contacts",
                        "doctor_visits",
                        "medical_exams",
                        "exam_data_points",
                    ]:
                        update_query = text(f"""
                            UPDATE {table} 
                            SET profile_id = :pid 
                            WHERE profile_id IS NULL
                        """)
                        result = connection.execute(update_query, {"pid": profile_id})
                        updated = result.rowcount
                        if updated > 0:
                            logger.info(f"Atualizados {updated} registros em {table} com profile_id={profile_id}")
                            stats['records_updated'] += updated
            except ValueError:
                logger.warning(f"DEFAULT_PROFILE_ID inválido: {DEFAULT_PROFILE_ID}")
            except Exception as e:
                error_msg = f"Erro ao atualizar dados com DEFAULT_PROFILE_ID: {str(e)}"
                logger.error(error_msg)
                stats['errors'].append(error_msg)
        
        if not dry_run:
            trans.commit()
            logger.info("Migração concluída com sucesso!")
        else:
            trans.rollback()
            logger.info("=== DRY RUN concluído - Nenhuma alteração foi feita ===")
        
    except Exception as e:
        trans.rollback()
        error_msg = f"Erro crítico na migração: {str(e)}"
        logger.error(error_msg, exc_info=True)
        stats['errors'].append(error_msg)
        raise
    
    finally:
        connection.close()
    
    return stats


def print_report(stats: dict):
    """Imprime relatório da migração"""
    print("\n" + "="*60)
    print("RELATÓRIO DE MIGRAÇÃO")
    print("="*60)
    print(f"Tabelas criadas: {stats.get('tables_created', 0)}")
    print(f"Colunas adicionadas: {stats.get('columns_added', 0)}")
    print(f"Registros atualizados: {stats.get('records_updated', 0)}")
    if 'backup_file' in stats:
        print(f"Backup criado: {stats['backup_file']}")
    print(f"Erros: {len(stats.get('errors', []))}")
    
    if stats.get('errors'):
        print("\nErros encontrados:")
        for error in stats['errors']:
            print(f"  - {error}")
    
    print("="*60 + "\n")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrar banco de dados para suporte a perfis familiares')
    parser.add_argument('--dry-run', action='store_true', help='Simular migração sem fazer alterações')
    args = parser.parse_args()
    
    try:
        logger.info("Iniciando migração para suporte a perfis familiares...")
        if args.dry_run:
            logger.info("Modo DRY RUN ativado")
        
        stats = migrate(dry_run=args.dry_run)
        print_report(stats)
        
        if stats.get('errors'):
            sys.exit(1)
        else:
            logger.info("Migração concluída com sucesso!")
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"Erro fatal: {e}", exc_info=True)
        sys.exit(1)
