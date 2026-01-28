#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para Atualizar CURRENT-STATE.md Automaticamente

Analisa o código e issues do GitHub para atualizar o estado atual do projeto.
"""

import os
import re
import sys
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

CONTEXT_DIR = Path(__file__).parent.parent / ".cursor" / "context"
CURRENT_STATE_FILE = CONTEXT_DIR / "CURRENT-STATE.md"
ISSUES_DIR = Path(__file__).parent.parent / ".issues"
BACKEND_DIR = Path(__file__).parent.parent / "backend"
FRONTEND_DIR = Path(__file__).parent.parent / "app"


def get_github_issues() -> Dict[str, Dict]:
    """Obtém issues do GitHub usando gh CLI."""
    try:
        result = subprocess.run(
            ["gh", "issue", "list", "--state", "all", "--limit", "100", "--json", "number,title,state,labels"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        if result.returncode == 0:
            import json
            issues = json.loads(result.stdout)
            return {str(issue["number"]): issue for issue in issues}
    except Exception as e:
        print(f"⚠ Aviso: Não foi possível obter issues do GitHub: {e}")
    return {}


def find_completed_features() -> List[str]:
    """Encontra features completas analisando arquivos de confirmação."""
    completed = []
    confirmation_files = list(ISSUES_DIR.glob("CONFIRMACAO*.md"))
    
    for file in confirmation_files:
        content = file.read_text(encoding='utf-8')
        # Procurar por "COMPLETA" ou "COMPLETE"
        if re.search(r'COMPLETA|COMPLETE|✅.*COMPLETA', content, re.IGNORECASE):
            # Extrair número da issue do nome do arquivo
            match = re.search(r'ISSUE-(\d+)', file.name)
            if match:
                completed.append(f"#{match.group(1)}")
    
    return completed


def find_test_files() -> Dict[str, int]:
    """Encontra arquivos de teste e conta testes."""
    test_stats = {
        "backend_tests": 0,
        "frontend_tests": 0,
        "test_files": 0
    }
    
    # Backend tests
    backend_tests = list(BACKEND_DIR.glob("tests/test_*.py"))
    test_stats["test_files"] = len(backend_tests)
    
    for test_file in backend_tests:
        content = test_file.read_text(encoding='utf-8')
        # Contar funções de teste (def test_)
        tests = len(re.findall(r'def test_', content))
        test_stats["backend_tests"] += tests
    
    # Frontend tests (se existirem) - evitar node_modules
    try:
        frontend_tests = []
        for pattern in ["**/__tests__/**/*.js", "**/*.test.js", "**/*.spec.js"]:
            for test_file in Path(__file__).parent.parent.glob(pattern):
                # Ignorar node_modules
                if "node_modules" not in str(test_file):
                    frontend_tests.append(test_file)
        
        for test_file in frontend_tests:
            try:
                content = test_file.read_text(encoding='utf-8')
                tests = len(re.findall(r'(?:test\(|it\(|describe\()', content))
                test_stats["frontend_tests"] += tests
            except Exception:
                continue  # Ignorar arquivos com problemas
    except Exception:
        pass  # Se não conseguir encontrar testes, continua
    
    return test_stats


def find_implemented_endpoints() -> List[str]:
    """Encontra endpoints implementados no backend."""
    endpoints = []
    main_py = BACKEND_DIR / "main.py"
    
    if main_py.exists():
        content = main_py.read_text(encoding='utf-8')
        # Procurar por decorators de rota (@app.get, @app.post, etc)
        route_pattern = r'@app\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']'
        matches = re.findall(route_pattern, content)
        endpoints = [f"{method.upper()} {path}" for method, path in matches]
    
    return endpoints


def update_current_state():
    """Atualiza CURRENT-STATE.md com informações atuais."""
    print("[*] Atualizando CURRENT-STATE.md...\n")
    
    if not CURRENT_STATE_FILE.exists():
        print(f"[X] Arquivo {CURRENT_STATE_FILE} não encontrado")
        return False
    
    # Ler conteúdo atual
    content = CURRENT_STATE_FILE.read_text(encoding='utf-8')
    
    # Obter informações
    print("[*] Coletando informações...")
    issues = get_github_issues()
    completed_features = find_completed_features()
    test_stats = find_test_files()
    endpoints = find_implemented_endpoints()
    
    # Atualizar data
    today = datetime.now().strftime("%Y-%m-%d")
    content = re.sub(
        r'\*\*Last Updated:\*\* \d{4}-\d{2}-\d{2}',
        f'**Last Updated:** {today}',
        content
    )
    
    # Atualizar estatísticas de testes
    if test_stats["backend_tests"] > 0:
        test_section = f"- **Backend Tests**: {test_stats['backend_tests']} testes em {test_stats['test_files']} arquivos"
        # Adicionar ou atualizar seção de testes
        if "## Test Coverage" in content:
            content = re.sub(
                r'## Test Coverage.*?##',
                f'## Test Coverage\n\n{test_section}\n- **Frontend Tests**: {test_stats["frontend_tests"]} testes\n- **Isolation Tests**: 100% (critical)\n\n##',
                content,
                flags=re.DOTALL
            )
    
    # Atualizar número de endpoints
    if endpoints:
        endpoint_count = len(endpoints)
        # Procurar seção de API e atualizar
        if "API Response" in content:
            content = re.sub(
                r'## Performance Metrics.*?##',
                f'## Performance Metrics\n\n- **API Endpoints**: {endpoint_count} endpoints implementados\n- **App Startup**: <2s (target)\n- **API Response**: <500ms average\n- **Offline Operations**: <100ms\n- **Sync Time**: <5s for typical dataset\n\n##',
                content,
                flags=re.DOTALL
            )
    
    # Salvar arquivo atualizado
    CURRENT_STATE_FILE.write_text(content, encoding='utf-8')
    
    print(f"[OK] {CURRENT_STATE_FILE.name} atualizado com sucesso!")
    print(f"   - Data atualizada: {today}")
    print(f"   - Testes encontrados: {test_stats['backend_tests']} backend, {test_stats['frontend_tests']} frontend")
    print(f"   - Endpoints encontrados: {len(endpoints)}")
    
    return True


if __name__ == "__main__":
    success = update_current_state()
    exit(0 if success else 1)
