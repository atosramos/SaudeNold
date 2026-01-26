#!/usr/bin/env python3
"""
Script master para executar todas as migrações em ordem.
Executa: schema → usuários → dados médicos → verificação
"""
import os
import sys
from pathlib import Path
import logging
import subprocess

# Adicionar diretório raiz ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('run_all_migrations.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def run_script(script_path: str, args: list = None, description: str = None) -> bool:
    """
    Executa um script Python.
    
    Args:
        script_path: Caminho do script
        args: Argumentos adicionais
        description: Descrição do script
    
    Returns:
        True se executado com sucesso, False caso contrário
    """
    if description:
        logger.info(f"\n{'='*60}")
        logger.info(f"{description}")
        logger.info(f"{'='*60}")
    
    cmd = [sys.executable, str(script_path)]
    if args:
        cmd.extend(args)
    
    try:
        result = subprocess.run(cmd, cwd=backend_dir, check=True, capture_output=True, text=True)
        logger.info(result.stdout)
        if result.stderr:
            logger.warning(result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Erro ao executar {script_path}:")
        logger.error(e.stdout)
        logger.error(e.stderr)
        return False


def run_all_migrations(dry_run: bool = False, skip_verification: bool = False):
    """
    Executa todas as migrações em ordem.
    
    Args:
        dry_run: Se True, apenas simula as migrações
        skip_verification: Se True, pula a verificação final
    """
    dry_run_flag = ['--dry-run'] if dry_run else []
    
    migrations = [
        {
            'script': backend_dir / 'migrate_family_profiles.py',
            'description': '1. Migração de Schema (Tabelas e Colunas)',
            'args': dry_run_flag
        },
        {
            'script': backend_dir / 'migrations' / 'migrate_existing_users_to_families.py',
            'description': '2. Migração de Usuários para Famílias',
            'args': dry_run_flag
        },
        {
            'script': backend_dir / 'migrations' / 'migrate_medical_data_to_profiles.py',
            'description': '3. Migração de Dados Médicos para Perfis',
            'args': dry_run_flag
        },
    ]
    
    if not skip_verification:
        migrations.append({
            'script': backend_dir / 'migrations' / 'verify_migration.py',
            'description': '4. Verificação Pós-Migração',
            'args': []
        })
    
    logger.info("="*60)
    logger.info("INICIANDO PROCESSO DE MIGRAÇÃO COMPLETO")
    logger.info("="*60)
    
    if dry_run:
        logger.info("⚠️  MODO DRY RUN - Nenhuma alteração será feita")
    
    success_count = 0
    failed_migrations = []
    
    for i, migration in enumerate(migrations, 1):
        logger.info(f"\n[{i}/{len(migrations)}] {migration['description']}")
        
        success = run_script(
            migration['script'],
            migration.get('args', []),
            migration['description']
        )
        
        if success:
            success_count += 1
            logger.info(f"✅ {migration['description']} - CONCLUÍDO")
        else:
            failed_migrations.append(migration['description'])
            logger.error(f"❌ {migration['description']} - FALHOU")
            
            if not dry_run:
                logger.error("Migração falhou. Processo interrompido.")
                logger.error("Execute manualmente as migrações restantes ou faça rollback.")
                return False
    
    # Resumo final
    logger.info("\n" + "="*60)
    logger.info("RESUMO DO PROCESSO DE MIGRAÇÃO")
    logger.info("="*60)
    logger.info(f"Migrações executadas: {success_count}/{len(migrations)}")
    
    if failed_migrations:
        logger.error("\nMigrações que falharam:")
        for failed in failed_migrations:
            logger.error(f"  - {failed}")
        return False
    else:
        logger.info("\n✅ Todas as migrações foram executadas com sucesso!")
        return True


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Executar todas as migrações em ordem')
    parser.add_argument('--dry-run', action='store_true', help='Simular migrações sem fazer alterações')
    parser.add_argument('--skip-verification', action='store_true', help='Pular verificação final')
    args = parser.parse_args()
    
    try:
        success = run_all_migrations(
            dry_run=args.dry_run,
            skip_verification=args.skip_verification
        )
        
        if success:
            sys.exit(0)
        else:
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.warning("\nMigração interrompida pelo usuário")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Erro fatal: {e}", exc_info=True)
        sys.exit(1)
