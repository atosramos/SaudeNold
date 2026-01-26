#!/usr/bin/env python3
"""
Migração de usuários existentes para o sistema de famílias.
Cria família e perfil padrão para cada usuário sem family_id.
"""
import os
import sys
from pathlib import Path
from datetime import datetime
import logging

# Adicionar diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import User, Family, FamilyProfile

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration_users.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()


def get_user_name(user: User) -> str:
    """Extrai nome do usuário do email ou usa padrão"""
    if user.email:
        # Extrair nome do email (parte antes do @)
        name = user.email.split('@')[0]
        # Capitalizar primeira letra
        return name.capitalize()
    return "Usuário"


def migrate_users_to_families(dry_run: bool = False) -> dict:
    """
    Migra usuários existentes para o sistema de famílias.
    
    Args:
        dry_run: Se True, apenas simula a migração sem fazer alterações
    
    Returns:
        dict com estatísticas da migração
    """
    stats = {
        'total_users': 0,
        'users_without_family': 0,
        'families_created': 0,
        'profiles_created': 0,
        'users_updated': 0,
        'errors': []
    }
    
    db: Session = SessionLocal()
    
    try:
        # Contar total de usuários
        stats['total_users'] = db.query(User).count()
        logger.info(f"Total de usuários no banco: {stats['total_users']}")
        
        # Identificar usuários sem family_id
        users_without_family = db.query(User).filter(
            (User.family_id == None) | (User.family_id == 0)
        ).all()
        
        stats['users_without_family'] = len(users_without_family)
        logger.info(f"Usuários sem família: {stats['users_without_family']}")
        
        if stats['users_without_family'] == 0:
            logger.info("Nenhum usuário precisa de migração.")
            return stats
        
        if dry_run:
            logger.info("=== MODO DRY RUN - Nenhuma alteração será feita ===")
        
        # Migrar cada usuário
        for user in users_without_family:
            try:
                user_name = get_user_name(user)
                family_name = f"Família de {user_name}"
                
                if dry_run:
                    logger.info(f"[DRY RUN] Criaria família '{family_name}' para usuário {user.id} ({user.email})")
                    stats['families_created'] += 1
                    stats['profiles_created'] += 1
                    stats['users_updated'] += 1
                    continue
                
                # Criar família
                family = Family(
                    name=family_name,
                    admin_user_id=user.id,
                    created_at=datetime.utcnow()
                )
                db.add(family)
                db.flush()  # Para obter o ID da família
                
                logger.info(f"Criada família ID {family.id}: '{family_name}' para usuário {user.id}")
                stats['families_created'] += 1
                
                # Criar perfil familiar padrão
                profile = FamilyProfile(
                    family_id=family.id,
                    name=user_name,
                    account_type='family_admin',
                    created_by=user.id,
                    permissions={},
                    created_at=datetime.utcnow()
                )
                db.add(profile)
                db.flush()  # Para obter o ID do perfil
                
                logger.info(f"Criado perfil ID {profile.id}: '{user_name}' (family_admin) na família {family.id}")
                stats['profiles_created'] += 1
                
                # Atualizar usuário
                user.family_id = family.id
                user.account_type = 'family_admin'
                
                logger.info(f"Usuário {user.id} atualizado: family_id={family.id}, account_type=family_admin")
                stats['users_updated'] += 1
                
            except Exception as e:
                error_msg = f"Erro ao migrar usuário {user.id} ({user.email}): {str(e)}"
                logger.error(error_msg)
                stats['errors'].append(error_msg)
        
        if not dry_run:
            db.commit()
            logger.info("Migração concluída com sucesso!")
        else:
            db.rollback()
            logger.info("=== DRY RUN concluído - Nenhuma alteração foi feita ===")
        
    except Exception as e:
        db.rollback()
        error_msg = f"Erro crítico na migração: {str(e)}"
        logger.error(error_msg)
        stats['errors'].append(error_msg)
        raise
    
    finally:
        db.close()
    
    return stats


def print_report(stats: dict):
    """Imprime relatório da migração"""
    print("\n" + "="*60)
    print("RELATÓRIO DE MIGRAÇÃO DE USUÁRIOS")
    print("="*60)
    print(f"Total de usuários no banco: {stats['total_users']}")
    print(f"Usuários sem família: {stats['users_without_family']}")
    print(f"Famílias criadas: {stats['families_created']}")
    print(f"Perfis criados: {stats['profiles_created']}")
    print(f"Usuários atualizados: {stats['users_updated']}")
    print(f"Erros: {len(stats['errors'])}")
    
    if stats['errors']:
        print("\nErros encontrados:")
        for error in stats['errors']:
            print(f"  - {error}")
    
    print("="*60 + "\n")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrar usuários existentes para sistema de famílias')
    parser.add_argument('--dry-run', action='store_true', help='Simular migração sem fazer alterações')
    args = parser.parse_args()
    
    try:
        logger.info("Iniciando migração de usuários para famílias...")
        if args.dry_run:
            logger.info("Modo DRY RUN ativado")
        
        stats = migrate_users_to_families(dry_run=args.dry_run)
        print_report(stats)
        
        if stats['errors']:
            sys.exit(1)
        else:
            logger.info("Migração concluída com sucesso!")
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"Erro fatal: {e}", exc_info=True)
        sys.exit(1)
