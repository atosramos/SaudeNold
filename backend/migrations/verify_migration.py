#!/usr/bin/env python3
"""
Script de verificação pós-migração.
Verifica integridade dos dados após migração para sistema multiempresa.
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
        logging.FileHandler('verify_migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

# Tabelas de dados médicos
MEDICAL_TABLES = [
    'medications',
    'medication_logs',
    'emergency_contacts',
    'doctor_visits',
    'medical_exams',
    'exam_data_points',
]


def verify_users_have_family(db: Session) -> dict:
    """Verifica que todos os usuários têm family_id"""
    result = {
        'total_users': 0,
        'users_with_family': 0,
        'users_without_family': 0,
        'users_without_family_list': [],
        'status': 'ok'
    }
    
    try:
        result['total_users'] = db.query(User).count()
        
        users_with_family = db.query(User).filter(
            User.family_id.isnot(None),
            User.family_id != 0
        ).count()
        result['users_with_family'] = users_with_family
        
        users_without_family = db.query(User).filter(
            (User.family_id == None) | (User.family_id == 0)
        ).all()
        result['users_without_family'] = len(users_without_family)
        
        if users_without_family:
            result['users_without_family_list'] = [
                {'id': u.id, 'email': u.email} for u in users_without_family
            ]
            result['status'] = 'error'
        
        logger.info(f"Usuários: {result['users_with_family']}/{result['total_users']} com família")
        
    except Exception as e:
        result['status'] = 'error'
        result['error'] = str(e)
        logger.error(f"Erro ao verificar usuários: {e}")
    
    return result


def verify_users_have_profile(db: Session) -> dict:
    """Verifica que todos os usuários têm perfil em family_profiles"""
    result = {
        'total_users': 0,
        'users_with_profile': 0,
        'users_without_profile': 0,
        'users_without_profile_list': [],
        'status': 'ok'
    }
    
    try:
        result['total_users'] = db.query(User).count()
        
        # Buscar usuários com família
        users_with_family = db.query(User).filter(
            User.family_id.isnot(None),
            User.family_id != 0
        ).all()
        
        for user in users_with_family:
            # Verificar se existe perfil para este usuário na família
            profile = db.query(FamilyProfile).filter(
                FamilyProfile.family_id == user.family_id,
                FamilyProfile.created_by == user.id
            ).first()
            
            if profile:
                result['users_with_profile'] += 1
            else:
                result['users_without_profile'] += 1
                result['users_without_profile_list'].append({
                    'id': user.id,
                    'email': user.email,
                    'family_id': user.family_id
                })
        
        if result['users_without_profile'] > 0:
            result['status'] = 'error'
        
        logger.info(f"Usuários: {result['users_with_profile']}/{result['total_users']} com perfil")
        
    except Exception as e:
        result['status'] = 'error'
        result['error'] = str(e)
        logger.error(f"Erro ao verificar perfis: {e}")
    
    return result


def verify_medical_data_has_profile(db: Session, table_name: str) -> dict:
    """Verifica que todos os dados médicos têm profile_id"""
    result = {
        'table': table_name,
        'total_records': 0,
        'records_with_profile': 0,
        'records_without_profile': 0,
        'status': 'ok'
    }
    
    try:
        # Contar total
        count_query = text(f"SELECT COUNT(*) FROM {table_name}")
        result['total_records'] = db.execute(count_query).scalar() or 0
        
        if result['total_records'] == 0:
            result['status'] = 'ok'
            return result
        
        # Contar com profile_id
        count_with_profile = text(f"""
            SELECT COUNT(*) FROM {table_name} 
            WHERE profile_id IS NOT NULL
        """)
        result['records_with_profile'] = db.execute(count_with_profile).scalar() or 0
        
        # Contar sem profile_id
        count_without_profile = text(f"""
            SELECT COUNT(*) FROM {table_name} 
            WHERE profile_id IS NULL
        """)
        result['records_without_profile'] = db.execute(count_without_profile).scalar() or 0
        
        if result['records_without_profile'] > 0:
            result['status'] = 'warning'
        
        logger.info(f"{table_name}: {result['records_with_profile']}/{result['total_records']} com profile_id")
        
    except Exception as e:
        result['status'] = 'error'
        result['error'] = str(e)
        logger.error(f"Erro ao verificar {table_name}: {e}")
    
    return result


def verify_referential_integrity(db: Session) -> dict:
    """Verifica integridade referencial"""
    result = {
        'families_without_admin': [],
        'profiles_without_family': [],
        'profiles_with_invalid_family': [],
        'status': 'ok'
    }
    
    try:
        # Verificar famílias sem admin válido
        families_query = text("""
            SELECT f.id, f.name, f.admin_user_id 
            FROM families f
            LEFT JOIN users u ON f.admin_user_id = u.id
            WHERE u.id IS NULL
        """)
        families = db.execute(families_query).fetchall()
        result['families_without_admin'] = [{'id': f[0], 'name': f[1], 'admin_user_id': f[2]} for f in families]
        
        # Verificar perfis sem família válida
        profiles_query = text("""
            SELECT fp.id, fp.name, fp.family_id 
            FROM family_profiles fp
            LEFT JOIN families f ON fp.family_id = f.id
            WHERE f.id IS NULL
        """)
        profiles = db.execute(profiles_query).fetchall()
        result['profiles_without_family'] = [{'id': p[0], 'name': p[1], 'family_id': p[2]} for p in profiles]
        
        # Verificar perfis com família inválida (family_id não existe)
        invalid_family_query = text("""
            SELECT fp.id, fp.name, fp.family_id 
            FROM family_profiles fp
            WHERE fp.family_id NOT IN (SELECT id FROM families)
        """)
        invalid_profiles = db.execute(invalid_family_query).fetchall()
        result['profiles_with_invalid_family'] = [{'id': p[0], 'name': p[1], 'family_id': p[2]} for p in invalid_profiles]
        
        if (result['families_without_admin'] or 
            result['profiles_without_family'] or 
            result['profiles_with_invalid_family']):
            result['status'] = 'error'
        
        logger.info(f"Integridade referencial: {result['status']}")
        
    except Exception as e:
        result['status'] = 'error'
        result['error'] = str(e)
        logger.error(f"Erro ao verificar integridade referencial: {e}")
    
    return result


def verify_migration() -> dict:
    """
    Executa todas as verificações pós-migração.
    
    Returns:
        dict com resultados de todas as verificações
    """
    overall_result = {
        'users_family': {},
        'users_profile': {},
        'medical_data': {},
        'referential_integrity': {},
        'overall_status': 'ok',
        'errors': [],
        'warnings': []
    }
    
    db: Session = SessionLocal()
    
    try:
        logger.info("Iniciando verificação pós-migração...")
        
        # Verificar usuários têm família
        logger.info("\n1. Verificando se usuários têm família...")
        overall_result['users_family'] = verify_users_have_family(db)
        if overall_result['users_family']['status'] == 'error':
            overall_result['overall_status'] = 'error'
            overall_result['errors'].append("Alguns usuários não têm família")
        
        # Verificar usuários têm perfil
        logger.info("\n2. Verificando se usuários têm perfil...")
        overall_result['users_profile'] = verify_users_have_profile(db)
        if overall_result['users_profile']['status'] == 'error':
            overall_result['overall_status'] = 'error'
            overall_result['errors'].append("Alguns usuários não têm perfil")
        
        # Verificar dados médicos têm profile_id
        logger.info("\n3. Verificando se dados médicos têm profile_id...")
        for table in MEDICAL_TABLES:
            result = verify_medical_data_has_profile(db, table)
            overall_result['medical_data'][table] = result
            if result['status'] == 'error':
                overall_result['overall_status'] = 'error'
                overall_result['errors'].append(f"Erro ao verificar {table}")
            elif result['status'] == 'warning':
                overall_result['warnings'].append(f"{table}: {result['records_without_profile']} registros sem profile_id")
        
        # Verificar integridade referencial
        logger.info("\n4. Verificando integridade referencial...")
        overall_result['referential_integrity'] = verify_referential_integrity(db)
        if overall_result['referential_integrity']['status'] == 'error':
            overall_result['overall_status'] = 'error'
            overall_result['errors'].append("Problemas de integridade referencial encontrados")
        
        logger.info("\nVerificação concluída!")
        
    except Exception as e:
        overall_result['overall_status'] = 'error'
        overall_result['errors'].append(f"Erro crítico: {str(e)}")
        logger.error(f"Erro crítico na verificação: {e}", exc_info=True)
    
    finally:
        db.close()
    
    return overall_result


def print_report(result: dict):
    """Imprime relatório de verificação"""
    print("\n" + "="*60)
    print("RELATÓRIO DE VERIFICAÇÃO PÓS-MIGRAÇÃO")
    print("="*60)
    
    # Status geral
    status_icon = "✅" if result['overall_status'] == 'ok' else "❌"
    print(f"\nStatus Geral: {status_icon} {result['overall_status'].upper()}")
    
    # Usuários
    print("\n1. USUÁRIOS E FAMÍLIAS")
    print("-" * 60)
    uf = result['users_family']
    print(f"Total de usuários: {uf.get('total_users', 0)}")
    print(f"Usuários com família: {uf.get('users_with_family', 0)}")
    print(f"Usuários sem família: {uf.get('users_without_family', 0)}")
    if uf.get('users_without_family_list'):
        print("  Usuários sem família:")
        for u in uf['users_without_family_list']:
            print(f"    - ID {u['id']}: {u['email']}")
    
    up = result['users_profile']
    print(f"\nUsuários com perfil: {up.get('users_with_profile', 0)}")
    print(f"Usuários sem perfil: {up.get('users_without_profile', 0)}")
    if up.get('users_without_profile_list'):
        print("  Usuários sem perfil:")
        for u in up['users_without_profile_list']:
            print(f"    - ID {u['id']}: {u['email']} (family_id: {u['family_id']})")
    
    # Dados médicos
    print("\n2. DADOS MÉDICOS")
    print("-" * 60)
    for table, data in result['medical_data'].items():
        status_icon = "✅" if data['status'] == 'ok' else "⚠️" if data['status'] == 'warning' else "❌"
        print(f"{status_icon} {table}:")
        print(f"  Total: {data.get('total_records', 0)}")
        print(f"  Com profile_id: {data.get('records_with_profile', 0)}")
        print(f"  Sem profile_id: {data.get('records_without_profile', 0)}")
    
    # Integridade referencial
    print("\n3. INTEGRIDADE REFERENCIAL")
    print("-" * 60)
    ri = result['referential_integrity']
    print(f"Famílias sem admin válido: {len(ri.get('families_without_admin', []))}")
    print(f"Perfis sem família válida: {len(ri.get('profiles_without_family', []))}")
    print(f"Perfis com família inválida: {len(ri.get('profiles_with_invalid_family', []))}")
    
    # Erros e avisos
    if result.get('errors'):
        print("\n❌ ERROS ENCONTRADOS:")
        for error in result['errors']:
            print(f"  - {error}")
    
    if result.get('warnings'):
        print("\n⚠️ AVISOS:")
        for warning in result['warnings']:
            print(f"  - {warning}")
    
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    try:
        result = verify_migration()
        print_report(result)
        
        if result['overall_status'] == 'ok':
            logger.info("Verificação concluída com sucesso - Todos os checks passaram!")
            sys.exit(0)
        else:
            logger.warning("Verificação concluída com problemas - Verifique o relatório acima")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Erro fatal: {e}", exc_info=True)
        sys.exit(1)
