#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Validação de Context Engineering

Valida que os arquivos de contexto estão atualizados e consistentes.
"""

import os
import re
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Cores para output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

CONTEXT_DIR = Path(__file__).parent.parent / ".cursor" / "context"
REQUIRED_FILES = [
    "PROJECT-OVERVIEW.md",
    "ARCHITECTURE.md",
    "BACKEND-CONTEXT.md",
    "FRONTEND-CONTEXT.md",
    "MULTIEMPRESA-CONTEXT.md",
    "CURRENT-STATE.md",
]

MAX_AGE_DAYS = 30  # Arquivos devem ser atualizados a cada 30 dias


def check_file_exists(filepath: Path) -> Tuple[bool, str]:
    """Verifica se arquivo existe."""
    if filepath.exists():
        return True, f"{Colors.GREEN}✓{Colors.RESET} {filepath.name} existe"
    return False, f"{Colors.RED}✗{Colors.RESET} {filepath.name} não encontrado"


def check_last_updated(filepath: Path) -> Tuple[bool, str]:
    """Verifica data de última atualização."""
    try:
        content = filepath.read_text(encoding='utf-8')
        # Procurar por "Last Updated:" ou "Última Atualização:"
        match = re.search(r'(?:Last Updated|Última Atualização):\s*(\d{4}-\d{2}-\d{2})', content)
        if not match:
            return False, f"{Colors.YELLOW}⚠{Colors.RESET} {filepath.name} não tem data de atualização"
        
        last_updated = datetime.strptime(match.group(1), "%Y-%m-%d")
        age_days = (datetime.now() - last_updated).days
        
        if age_days > MAX_AGE_DAYS:
            return False, f"{Colors.YELLOW}⚠{Colors.RESET} {filepath.name} não atualizado há {age_days} dias (máx: {MAX_AGE_DAYS})"
        
        return True, f"{Colors.GREEN}✓{Colors.RESET} {filepath.name} atualizado há {age_days} dias"
    except Exception as e:
        return False, f"{Colors.RED}✗{Colors.RESET} Erro ao ler {filepath.name}: {e}"


def check_required_sections(filepath: Path, required_sections: List[str]) -> Tuple[bool, List[str]]:
    """Verifica seções obrigatórias no arquivo."""
    try:
        content = filepath.read_text(encoding='utf-8')
        missing = []
        for section in required_sections:
            # Procurar por headers markdown (## ou ###)
            pattern = rf'^#+\s+{re.escape(section)}'
            if not re.search(pattern, content, re.MULTILINE | re.IGNORECASE):
                missing.append(section)
        
        if missing:
            return False, missing
        return True, []
    except Exception as e:
        return False, [f"Erro: {e}"]


def check_references(filepath: Path) -> Tuple[bool, List[str]]:
    """Verifica referências a outros arquivos/documentos."""
    try:
        content = filepath.read_text(encoding='utf-8')
        # Procurar por links markdown [text](path)
        links = re.findall(r'\[([^\]]+)\]\(([^\)]+)\)', content)
        
        broken_refs = []
        for text, ref in links:
            # Ignorar URLs externas
            if ref.startswith('http://') or ref.startswith('https://'):
                continue
            
            # Verificar se arquivo referenciado existe
            if ref.startswith('docs/') or ref.startswith('.issues/'):
                ref_path = Path(__file__).parent.parent / ref
                if not ref_path.exists() and not ref_path.is_dir():
                    broken_refs.append(f"{text} → {ref}")
        
        if broken_refs:
            return False, broken_refs
        return True, []
    except Exception as e:
        return False, [f"Erro: {e}"]


def validate_all():
    """Valida todos os arquivos de contexto."""
    print(f"{Colors.BLUE}[*] Validando Context Engineering...{Colors.RESET}\n")
    
    issues = []
    warnings = []
    
    # Verificar se diretório existe
    if not CONTEXT_DIR.exists():
        print(f"{Colors.RED}✗ Diretório .cursor/context/ não encontrado{Colors.RESET}")
        return False
    
    # Verificar arquivos obrigatórios
    print(f"{Colors.BLUE}Verificando arquivos obrigatórios:{Colors.RESET}")
    for filename in REQUIRED_FILES:
        filepath = CONTEXT_DIR / filename
        exists, message = check_file_exists(filepath)
        print(f"  {message}")
        if not exists:
            issues.append(f"Arquivo obrigatório ausente: {filename}")
    
    print()
    
    # Verificar data de atualização
    print(f"{Colors.BLUE}Verificando datas de atualização:{Colors.RESET}")
    for filename in REQUIRED_FILES:
        filepath = CONTEXT_DIR / filename
        if filepath.exists():
            valid, message = check_last_updated(filepath)
            print(f"  {message}")
            if not valid:
                warnings.append(f"Arquivo desatualizado: {filename}")
    
    print()
    
    # Verificar seções obrigatórias
    print(f"{Colors.BLUE}Verificando seções obrigatórias:{Colors.RESET}")
    section_requirements = {
        "PROJECT-OVERVIEW.md": ["Project Overview", "Technology Stack", "Target Users"],
        "ARCHITECTURE.md": ["High-Level Architecture", "Data Flow", "Security"],
        "BACKEND-CONTEXT.md": ["Technology Stack", "Key Models", "Authentication"],
        "FRONTEND-CONTEXT.md": ["Technology Stack", "Key Services", "Storage"],
        "MULTIEMPRESA-CONTEXT.md": ["Overview", "Data Isolation", "Permission System"],
        "CURRENT-STATE.md": ["Completed Features", "Partially Implemented", "Planned Features"],
    }
    
    for filename, required_sections in section_requirements.items():
        filepath = CONTEXT_DIR / filename
        if filepath.exists():
            valid, missing = check_required_sections(filepath, required_sections)
            if valid:
                print(f"  {Colors.GREEN}✓{Colors.RESET} {filename} tem todas as seções")
            else:
                print(f"  {Colors.YELLOW}⚠{Colors.RESET} {filename} faltando seções: {', '.join(missing)}")
                warnings.append(f"{filename} faltando seções: {', '.join(missing)}")
    
    print()
    
    # Verificar referências
    print(f"{Colors.BLUE}Verificando referências:{Colors.RESET}")
    for filename in REQUIRED_FILES:
        filepath = CONTEXT_DIR / filename
        if filepath.exists():
            valid, broken = check_references(filepath)
            if valid:
                print(f"  {Colors.GREEN}✓{Colors.RESET} {filename} - referências OK")
            else:
                print(f"  {Colors.YELLOW}⚠{Colors.RESET} {filename} - referências quebradas:")
                for ref in broken:
                    print(f"    - {ref}")
                warnings.extend([f"{filename}: {ref}" for ref in broken])
    
    print()
    
    # Resumo
    print(f"{Colors.BLUE}[*] Resumo:{Colors.RESET}")
    if not issues and not warnings:
        print(f"  {Colors.GREEN}✓ Todos os arquivos de contexto estão válidos!{Colors.RESET}")
        return True
    else:
        if issues:
            print(f"  {Colors.RED}✗ Problemas encontrados: {len(issues)}{Colors.RESET}")
            for issue in issues:
                print(f"    - {issue}")
        if warnings:
            print(f"  {Colors.YELLOW}⚠ Avisos: {len(warnings)}{Colors.RESET}")
            for warning in warnings[:5]:  # Mostrar apenas os primeiros 5
                print(f"    - {warning}")
            if len(warnings) > 5:
                print(f"    ... e mais {len(warnings) - 5} avisos")
        return len(issues) == 0


if __name__ == "__main__":
    success = validate_all()
    exit(0 if success else 1)
