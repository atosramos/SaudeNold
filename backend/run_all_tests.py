#!/usr/bin/env python3
"""
Script para executar todos os testes TDD.
Executa testes em ordem lógica e exibe resumo.
"""
import sys
import subprocess
import os

# Cores para output (Windows-compatible)
try:
    from colorama import init, Fore, Style
    init()
    GREEN = Fore.GREEN
    RED = Fore.RED
    YELLOW = Fore.YELLOW
    RESET = Style.RESET_ALL
except ImportError:
    GREEN = RED = YELLOW = RESET = ""

def run_tests():
    """Executa todos os testes."""
    print("=" * 70)
    print("  EXECUTANDO TESTES TDD")
    print("=" * 70)
    print()
    
    # Lista de testes em ordem
    test_files = [
        ("Conexão Redis", "tests/test_redis_connection.py"),
        ("Rate Limiting Redis", "tests/test_rate_limiting_redis.py"),
        ("Token Blacklist", "tests/test_token_blacklist.py"),
        ("Proteção CSRF", "tests/test_csrf_protection.py"),
        ("Validação e Sanitização", "tests/test_validation.py"),
        ("Serviço de Criptografia", "tests/test_encryption_service.py"),
        ("Endpoints com Criptografia", "tests/test_endpoints_encryption.py"),
    ]
    
    results = []
    total_passed = 0
    total_failed = 0
    
    for test_name, test_file in test_files:
        print(f"Executando: {test_name}...")
        print("-" * 70)
        
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pytest", test_file, "-v", "--tb=short"],
                cwd=os.path.dirname(os.path.abspath(__file__)),
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"{GREEN}✓ {test_name}: PASSOU{RESET}")
                total_passed += 1
                results.append((test_name, True, None))
            else:
                print(f"{RED}✗ {test_name}: FALHOU{RESET}")
                print(result.stdout)
                print(result.stderr)
                total_failed += 1
                results.append((test_name, False, result.stderr))
        
        except Exception as e:
            print(f"{RED}✗ {test_name}: ERRO - {e}{RESET}")
            total_failed += 1
            results.append((test_name, False, str(e)))
        
        print()
    
    # Resumo
    print("=" * 70)
    print("  RESUMO DOS TESTES")
    print("=" * 70)
    print()
    
    for test_name, passed, error in results:
        status = f"{GREEN}✓ PASSOU{RESET}" if passed else f"{RED}✗ FALHOU{RESET}"
        print(f"  {test_name}: {status}")
    
    print()
    print(f"Total: {len(results)} testes")
    print(f"{GREEN}Passou: {total_passed}{RESET}")
    print(f"{RED}Falhou: {total_failed}{RESET}")
    print()
    
    if total_failed == 0:
        print(f"{GREEN}Todos os testes passaram! ✓{RESET}")
        return 0
    else:
        print(f"{RED}Alguns testes falharam. Verifique os erros acima.{RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
