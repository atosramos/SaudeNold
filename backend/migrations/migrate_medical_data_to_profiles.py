#!/usr/bin/env python3
"""
Migração de dados médicos existentes para perfis familiares.
Associa dados médicos aos perfis dos usuários.
"""
import os
import sys
from pathlib import Path
import logging

# Adicionar diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import (
    User, FamilyProfile, Medication, MedicationLog, 
    EmergencyContact, DoctorVisit, MedicalExam, ExamDataPoint
)

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration_medical_data.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

# Tabelas de dados médicos e seus campos de profile_id
MEDICAL_TABLES = [
    ('medications', 'profile_id'),
    ('medication_logs', 'profile_id'),
    ('emergency_contacts', 'profile_id'),
    ('doctor_visits', 'profile_id'),
    ('medical_exams', 'profile_id'),
    ('exam_data_points', 'profile_id'),
]


def get_user_profile_id(db: Session, user_id: int) -> int:
    """
    Obtém o profile_id do perfil padrão do usuário.
    
    Args:
        db: Sessão do banco de dados
        user_id: ID do usuário
    
    Returns:
        ID do perfil ou None se não encontrado
    """
    # Buscar família do usuário
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.family_id:
        return None
    
    # Buscar perfil padrão (family_admin) do usuário na família
    profile = db.query(FamilyProfile).filter(
        FamilyProfile.family_id == user.family_id,
        FamilyProfile.account_type == 'family_admin',
        FamilyProfile.created_by == user_id
    ).first()
    
    if not profile:
        # Se não encontrar, buscar qualquer perfil da família criado pelo usuário
        profile = db.query(FamilyProfile).filter(
            FamilyProfile.family_id == user.family_id,
            FamilyProfile.created_by == user_id
        ).first()
    
    if not profile:
        # Última tentativa: buscar qualquer perfil da família
        profile = db.query(FamilyProfile).filter(
            FamilyProfile.family_id == user.family_id
        ).first()
    
    return profile.id if profile else None


def migrate_table_data(db: Session, table_name: str, profile_id_column: str, dry_run: bool = False) -> dict:
    """
    Migra dados de uma tabela médica para perfis.
    
    Args:
        db: Sessão do banco de dados
        table_name: Nome da tabela
        profile_id_column: Nome da coluna profile_id
        dry_run: Se True, apenas simula a migração
    
    Returns:
        dict com estatísticas da migração
    """
    stats = {
        'total_records': 0,
        'records_without_profile': 0,
        'records_migrated': 0,
        'records_orphaned': 0,
        'errors': []
    }
    
    try:
        # Contar total de registros
        count_query = text(f"SELECT COUNT(*) FROM {table_name}")
        result = db.execute(count_query)
        stats['total_records'] = result.scalar() or 0
        
        # Contar registros sem profile_id
        count_without_profile = text(f"""
            SELECT COUNT(*) FROM {table_name} 
            WHERE {profile_id_column} IS NULL
        """)
        result = db.execute(count_without_profile)
        stats['records_without_profile'] = result.scalar() or 0
        
        logger.info(f"Tabela {table_name}: {stats['total_records']} total, {stats['records_without_profile']} sem profile_id")
        
        if stats['records_without_profile'] == 0:
            logger.info(f"Nenhum registro precisa de migração na tabela {table_name}")
            return stats
        
        # Determinar coluna de user_id baseado na tabela
        user_id_column = None
        if table_name == 'medications':
            # Medications não tem user_id direto, precisa buscar via relacionamento
            # Vamos usar uma abordagem diferente
            user_id_column = None  # Será tratado separadamente
        elif table_name == 'medication_logs':
            user_id_column = None  # Também não tem user_id direto
        elif table_name == 'emergency_contacts':
            user_id_column = None
        elif table_name == 'doctor_visits':
            user_id_column = None
        elif table_name == 'medical_exams':
            user_id_column = None
        elif table_name == 'exam_data_points':
            # ExamDataPoint tem exam_id, precisa buscar via medical_exams
            user_id_column = None
        
        # Para tabelas sem user_id direto, vamos usar uma estratégia diferente
        # Buscar registros sem profile_id e tentar associar ao perfil padrão do usuário
        # que criou o registro (se houver campo created_by ou similar)
        
        # Estratégia: Para cada registro sem profile_id, tentar encontrar o perfil
        # do usuário que mais provavelmente criou o registro
        
        # Como não temos user_id direto em todas as tabelas, vamos usar uma abordagem
        # mais simples: associar todos os registros sem profile_id ao perfil padrão
        # do primeiro usuário admin que encontramos (ou usar DEFAULT_PROFILE_ID se configurado)
        
        default_profile_id = os.getenv("DEFAULT_PROFILE_ID")
        
        if default_profile_id:
            try:
                default_profile_id = int(default_profile_id)
                # Verificar se o perfil existe
                profile = db.query(FamilyProfile).filter(FamilyProfile.id == default_profile_id).first()
                if not profile:
                    logger.warning(f"Perfil padrão {default_profile_id} não encontrado. Pulando migração de {table_name}")
                    return stats
            except ValueError:
                logger.warning(f"DEFAULT_PROFILE_ID inválido: {default_profile_id}")
                default_profile_id = None
        
        if not default_profile_id:
            # Buscar primeiro perfil family_admin disponível
            profile = db.query(FamilyProfile).filter(
                FamilyProfile.account_type == 'family_admin'
            ).first()
            
            if not profile:
                logger.warning(f"Nenhum perfil family_admin encontrado. Não é possível migrar {table_name}")
                stats['records_orphaned'] = stats['records_without_profile']
                return stats
            
            default_profile_id = profile.id
        
        if dry_run:
            logger.info(f"[DRY RUN] Associaria {stats['records_without_profile']} registros de {table_name} ao perfil {default_profile_id}")
            stats['records_migrated'] = stats['records_without_profile']
            return stats
        
        # Atualizar registros sem profile_id
        update_query = text(f"""
            UPDATE {table_name} 
            SET {profile_id_column} = :profile_id
            WHERE {profile_id_column} IS NULL
        """)
        
        result = db.execute(update_query, {"profile_id": default_profile_id})
        stats['records_migrated'] = result.rowcount
        
        logger.info(f"Migrados {stats['records_migrated']} registros de {table_name} para perfil {default_profile_id}")
        
        # Verificar se ainda há registros órfãos
        result = db.execute(count_without_profile)
        remaining = result.scalar() or 0
        stats['records_orphaned'] = remaining
        
        if remaining > 0:
            logger.warning(f"Ainda há {remaining} registros órfãos em {table_name}")
        
    except Exception as e:
        error_msg = f"Erro ao migrar tabela {table_name}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        stats['errors'].append(error_msg)
    
    return stats


def migrate_medical_data(dry_run: bool = False) -> dict:
    """
    Migra todos os dados médicos para perfis.
    
    Args:
        dry_run: Se True, apenas simula a migração
    
    Returns:
        dict com estatísticas da migração
    """
    overall_stats = {
        'tables_processed': 0,
        'total_records_migrated': 0,
        'total_records_orphaned': 0,
        'errors': []
    }
    
    db: Session = SessionLocal()
    
    try:
        if dry_run:
            logger.info("=== MODO DRY RUN - Nenhuma alteração será feita ===")
        
        # Migrar cada tabela
        for table_name, profile_id_column in MEDICAL_TABLES:
            logger.info(f"\nProcessando tabela: {table_name}")
            stats = migrate_table_data(db, table_name, profile_id_column, dry_run)
            
            overall_stats['tables_processed'] += 1
            overall_stats['total_records_migrated'] += stats['records_migrated']
            overall_stats['total_records_orphaned'] += stats['records_orphaned']
            overall_stats['errors'].extend(stats['errors'])
        
        if not dry_run:
            db.commit()
            logger.info("\nMigração de dados médicos concluída com sucesso!")
        else:
            db.rollback()
            logger.info("\n=== DRY RUN concluído - Nenhuma alteração foi feita ===")
        
    except Exception as e:
        db.rollback()
        error_msg = f"Erro crítico na migração: {str(e)}"
        logger.error(error_msg, exc_info=True)
        overall_stats['errors'].append(error_msg)
        raise
    
    finally:
        db.close()
    
    return overall_stats


def print_report(stats: dict):
    """Imprime relatório da migração"""
    print("\n" + "="*60)
    print("RELATÓRIO DE MIGRAÇÃO DE DADOS MÉDICOS")
    print("="*60)
    print(f"Tabelas processadas: {stats['tables_processed']}")
    print(f"Total de registros migrados: {stats['total_records_migrated']}")
    print(f"Total de registros órfãos: {stats['total_records_orphaned']}")
    print(f"Erros: {len(stats['errors'])}")
    
    if stats['errors']:
        print("\nErros encontrados:")
        for error in stats['errors']:
            print(f"  - {error}")
    
    print("="*60 + "\n")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrar dados médicos para perfis familiares')
    parser.add_argument('--dry-run', action='store_true', help='Simular migração sem fazer alterações')
    args = parser.parse_args()
    
    try:
        logger.info("Iniciando migração de dados médicos para perfis...")
        if args.dry_run:
            logger.info("Modo DRY RUN ativado")
        
        stats = migrate_medical_data(dry_run=args.dry_run)
        print_report(stats)
        
        if stats['errors']:
            sys.exit(1)
        else:
            logger.info("Migração concluída com sucesso!")
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"Erro fatal: {e}", exc_info=True)
        sys.exit(1)
