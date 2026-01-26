#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de teste para endpoints de licenças PRO
Execute: python test_licenses.py
"""

import requests
import json
import os
import sys
from datetime import datetime

# Configurar encoding para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Configuração
API_URL = os.getenv("API_URL", "http://localhost:8000")
API_KEY = os.getenv("API_KEY", "sua-api-key-aqui")

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}


def test_validate_license():
    """Testa validação de licença"""
    print("\n=== Teste: Validar Licença ===")
    
    # Teste com chave inválida
    print("\n1. Testando chave inválida...")
    response = requests.post(
        f"{API_URL}/api/validate-license",
        headers=headers,
        json={"key": "INVALID_KEY"}
    )
    print(f"Status: {response.status_code}")
    print(f"Resposta: {json.dumps(response.json(), indent=2)}")
    
    # Teste com formato válido mas chave não gerada
    print("\n2. Testando formato válido mas chave não existente...")
    response = requests.post(
        f"{API_URL}/api/validate-license",
        headers=headers,
        json={"key": "PRO1M1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456", "device_id": "test-device-123"}
    )
    print(f"Status: {response.status_code}")
    print(f"Resposta: {json.dumps(response.json(), indent=2)}")


def test_generate_license():
    """Testa geração de licença"""
    print("\n=== Teste: Gerar Licença ===")
    
    test_cases = [
        {"license_type": "1_month", "user_id": "test-user-1"},
        {"license_type": "6_months", "user_id": "test-user-2"},
        {"license_type": "1_year", "user_id": "test-user-3"},
    ]
    
    generated_keys = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. Gerando licença {test_case['license_type']}...")
        response = requests.post(
            f"{API_URL}/api/generate-license",
            headers=headers,
            json=test_case
        )
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Resposta: {json.dumps(result, indent=2)}")
        
        if result.get("success") and result.get("license_key"):
            generated_keys.append(result["license_key"])
            print(f"✅ Chave gerada: {result['license_key']}")
            
            # Testar validação da chave gerada
            print(f"\n   Validando chave gerada...")
            validate_response = requests.post(
                f"{API_URL}/api/validate-license",
                headers=headers,
                json={"key": result["license_key"], "device_id": "test-device"}
            )
            validate_result = validate_response.json()
            print(f"   Validação: {json.dumps(validate_result, indent=2)}")
    
    return generated_keys


def test_purchase_status():
    """Testa verificação de status de compra"""
    print("\n=== Teste: Status de Compra ===")
    
    # Teste com purchase_id inexistente
    print("\n1. Testando purchase_id inexistente...")
    response = requests.get(
        f"{API_URL}/api/purchase-status/nonexistent-123",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    print(f"Resposta: {json.dumps(response.json(), indent=2)}")


def test_webhook():
    """Testa webhook do Google Pay"""
    print("\n=== Teste: Webhook Google Pay ===")
    
    webhook_data = {
        "purchase_id": f"test-purchase-{int(datetime.now().timestamp())}",
        "transaction_id": f"test-transaction-{int(datetime.now().timestamp())}",
        "status": "completed",
        "license_type": "1_month",
        "user_id": "test-user-webhook",
        "amount": "9.90",
        "currency": "BRL"
    }
    
    print("\n1. Enviando webhook de compra completada...")
    response = requests.post(
        f"{API_URL}/api/webhook/google-pay",
        headers=headers,
        json=webhook_data
    )
    print(f"Status: {response.status_code}")
    print(f"Resposta: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        # Verificar status da compra
        print(f"\n2. Verificando status da compra criada...")
        status_response = requests.get(
            f"{API_URL}/api/purchase-status/{webhook_data['purchase_id']}",
            headers=headers
        )
        print(f"Status: {status_response.status_code}")
        print(f"Resposta: {json.dumps(status_response.json(), indent=2)}")


def main():
    """Executa todos os testes"""
    print("=" * 60)
    print("TESTES DE ENDPOINTS DE LICENÇAS PRO")
    print("=" * 60)
    print(f"\nAPI URL: {API_URL}")
    
    try:
        # Teste de saúde
        print("\n=== Teste: Health Check ===")
        response = requests.get(f"{API_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Resposta: {response.json()}")
        
        if response.status_code != 200:
            print("\n❌ Backend não está respondendo corretamente!")
            return
        
        # Executar testes
        test_validate_license()
        generated_keys = test_generate_license()
        test_purchase_status()
        test_webhook()
        
        print("\n" + "=" * 60)
        print("[OK] TESTES CONCLUIDOS")
        print("=" * 60)
        
        if generated_keys:
            print("\n📝 Chaves geradas (para teste manual):")
            for key in generated_keys:
                print(f"   {key}")
        
    except requests.exceptions.ConnectionError:
        print("\n[ERRO] Nao foi possivel conectar ao backend!")
        print(f"   Verifique se o backend esta rodando em {API_URL}")
        print("   Execute: cd backend && uvicorn main:app --reload")
    except Exception as e:
        print(f"\n[ERRO] {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
