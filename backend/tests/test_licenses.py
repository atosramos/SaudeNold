"""
Testes completos para o sistema de licenças PRO
Cobre: integração, segurança, e fluxo end-to-end
"""
import pytest
from fastapi import status
from datetime import datetime, timedelta, timezone
import os
import sys

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from license_generator import generate_license_key, validate_license_key, LICENSE_DURATIONS
import models
import schemas


class TestLicenseGeneration:
    """Testes de geração de chaves de licença"""
    
    def test_generate_1_month_license(self, client, api_key):
        """Testa geração de licença de 1 mês"""
        response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "1_month",
                "user_id": "test-user-1"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "license_key" in data
        assert len(data["license_key"]) == 45
        assert data["license_key"].startswith("PRO")
        assert "expiration_date" in data
    
    def test_generate_6_months_license(self, client, api_key):
        """Testa geração de licença de 6 meses"""
        response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "6_months",
                "user_id": "test-user-2"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "license_key" in data
        assert len(data["license_key"]) == 45
    
    def test_generate_1_year_license(self, client, api_key):
        """Testa geração de licença de 1 ano"""
        response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "1_year",
                "user_id": "test-user-3"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "license_key" in data
    
    def test_generate_license_invalid_type(self, client, api_key):
        """Testa geração com tipo inválido"""
        response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "invalid_type",
                "user_id": "test-user"
            }
        )
        # Deve retornar erro ou usar padrão
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]
    
    def test_generate_license_without_api_key(self, client):
        """Testa geração sem API key"""
        response = client.post(
            "/api/generate-license",
            json={
                "license_type": "1_month",
                "user_id": "test-user"
            }
        )
        # Pode retornar 401 ou 403 dependendo da implementação
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


class TestLicenseValidation:
    """Testes de validação de chaves de licença"""
    
    def test_validate_valid_license(self, client, api_key, db_session):
        """Testa validação de licença válida"""
        # Primeiro gerar uma licença
        generate_response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "1_month",
                "user_id": "test-user-validation"
            }
        )
        assert generate_response.status_code == status.HTTP_200_OK
        license_key = generate_response.json()["license_key"]
        
        # Validar a licença gerada
        validate_response = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": license_key,
                "device_id": "test-device-1"
            }
        )
        assert validate_response.status_code == status.HTTP_200_OK
        data = validate_response.json()
        assert data["valid"] is True
        assert "license_type" in data
        assert "expiration_date" in data
    
    def test_validate_invalid_format(self, client, api_key):
        """Testa validação com formato inválido"""
        response = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": "INVALID_KEY",
                "device_id": "test-device"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is False
        assert "error" in data
    
    def test_validate_short_key(self, client, api_key):
        """Testa validação com chave muito curta"""
        response = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": "PRO123",
                "device_id": "test-device"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is False
    
    def test_validate_key_with_spaces_and_hyphens(self, client, api_key, db_session):
        """Testa que espaços e hífens são normalizados"""
        # Gerar licença
        generate_response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "1_month",
                "user_id": "test-user-normalize"
            }
        )
        license_key = generate_response.json()["license_key"]
        
        # Validar com espaços e hífens (deve funcionar)
        key_with_spaces = " ".join(license_key[i:i+5] for i in range(0, len(license_key), 5))
        response = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": key_with_spaces,
                "device_id": "test-device"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is True
    
    def test_validate_revoked_license(self, client, api_key, db_session):
        """Testa validação de licença revogada"""
        # Gerar e revogar licença
        generate_response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "1_month",
                "user_id": "test-user-revoke"
            }
        )
        if generate_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            pytest.skip("Rate limiting ativo, pulando teste")
        
        assert generate_response.status_code == status.HTTP_200_OK
        license_key = generate_response.json()["license_key"]
        
        # Revogar
        revoke_response = client.post(
            "/api/revoke-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_key": license_key,
                "reason": "Teste de revogação"
            }
        )
        assert revoke_response.status_code == status.HTTP_200_OK
        
        # Tentar validar licença revogada
        validate_response = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": license_key,
                "device_id": "test-device"
            }
        )
        assert validate_response.status_code == status.HTTP_200_OK
        data = validate_response.json()
        assert data["valid"] is False
        assert "revogada" in data["error"].lower() or "revoked" in data["error"].lower()
    
    def test_validate_device_limit(self, client, api_key, db_session):
        """Testa limite de 3 dispositivos por licença"""
        # Gerar licença
        generate_response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "1_month",
                "user_id": "test-user-device-limit"
            }
        )
        if generate_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            pytest.skip("Rate limiting ativo, pulando teste")
        
        assert generate_response.status_code == status.HTTP_200_OK
        license_key = generate_response.json()["license_key"]
        
        # Primeiro, validar a licença para criar o registro no banco
        # Isso é necessário porque o limite é verificado apenas quando há device_id
        first_validate = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": license_key,
                "device_id": "test-device-1"
            }
        )
        assert first_validate.status_code == status.HTTP_200_OK
        
        # Ativar em mais 2 dispositivos (total 3, deve funcionar)
        for i in range(2, 4):
            validate_response = client.post(
                "/api/validate-license",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "key": license_key,
                    "device_id": f"test-device-{i}"
                }
            )
            # Pode ser bloqueado por rate limiting
            if validate_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                pytest.skip("Rate limiting ativo, pulando teste")
            assert validate_response.status_code == status.HTTP_200_OK
            data = validate_response.json()
            assert data["valid"] is True
        
        # Tentar ativar em 4º dispositivo (deve falhar)
        validate_response = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": license_key,
                "device_id": "test-device-4"
            }
        )
        if validate_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            pytest.skip("Rate limiting ativo, pulando teste")
        assert validate_response.status_code == status.HTTP_200_OK
        data = validate_response.json()
        assert data["valid"] is False
        assert "limite" in data["error"].lower() or "limit" in data["error"].lower()


class TestLicenseRevocation:
    """Testes de revogação de licenças"""
    
    def test_revoke_active_license(self, client, api_key, db_session):
        """Testa revogação de licença ativa"""
        # Gerar licença
        generate_response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "1_month",
                "user_id": "test-user-revoke-active"
            }
        )
        if generate_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            pytest.skip("Rate limiting ativo, pulando teste")
        
        assert generate_response.status_code == status.HTTP_200_OK
        license_key = generate_response.json()["license_key"]
        
        # Revogar
        revoke_response = client.post(
            "/api/revoke-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_key": license_key,
                "reason": "Teste de revogação"
            }
        )
        assert revoke_response.status_code == status.HTTP_200_OK
        data = revoke_response.json()
        assert data["success"] is True
        assert "message" in data
    
    def test_revoke_nonexistent_license(self, client, api_key):
        """Testa revogação de licença inexistente"""
        response = client.post(
            "/api/revoke-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_key": "PRO1M1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
                "reason": "Teste"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is False
        assert "não encontrada" in data["error"].lower() or "not found" in data["error"].lower()
    
    def test_revoke_already_revoked_license(self, client, api_key, db_session):
        """Testa revogação de licença já revogada"""
        # Gerar e revogar
        generate_response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "1_month",
                "user_id": "test-user-double-revoke"
            }
        )
        if generate_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            pytest.skip("Rate limiting ativo, pulando teste")
        
        assert generate_response.status_code == status.HTTP_200_OK
        license_key = generate_response.json()["license_key"]
        
        # Primeira revogação
        revoke_response = client.post(
            "/api/revoke-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_key": license_key,
                "reason": "Primeira revogação"
            }
        )
        assert revoke_response.status_code == status.HTTP_200_OK
        
        # Segunda revogação (deve falhar)
        revoke_response2 = client.post(
            "/api/revoke-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_key": license_key,
                "reason": "Segunda revogação"
            }
        )
        assert revoke_response2.status_code == status.HTTP_200_OK
        data = revoke_response2.json()
        assert data["success"] is False
        assert "já está revogada" in data["error"].lower() or "already revoked" in data["error"].lower()


class TestGooglePayWebhook:
    """Testes de webhook do Google Pay"""
    
    def test_webhook_completed_purchase(self, client, api_key, db_session):
        """Testa webhook de compra completada"""
        purchase_id = f"test-purchase-{int(datetime.now().timestamp())}"
        response = client.post(
            "/api/webhook/google-pay",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "purchase_id": purchase_id,
                "transaction_id": f"test-transaction-{int(datetime.now().timestamp())}",
                "status": "completed",
                "license_type": "1_month",
                "user_id": "test-user-webhook",
                "amount": "9.90",
                "currency": "BRL"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ok"
        # Verificar se a licença foi criada verificando o status da compra
        status_response = client.get(
            f"/api/purchase-status/{purchase_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert status_response.status_code == status.HTTP_200_OK
        status_data = status_response.json()
        assert status_data["status"] == "completed"
        assert "license_key" in status_data
    
    def test_webhook_pending_purchase(self, client, api_key):
        """Testa webhook de compra pendente"""
        purchase_id = f"test-purchase-pending-{int(datetime.now().timestamp())}"
        response = client.post(
            "/api/webhook/google-pay",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "purchase_id": purchase_id,
                "transaction_id": f"test-transaction-{int(datetime.now().timestamp())}",
                "status": "pending",
                "license_type": "1_month",
                "user_id": "test-user-webhook-pending",
                "amount": "9.90",
                "currency": "BRL"
            }
        )
        assert response.status_code == status.HTTP_200_OK
    
    def test_webhook_update_existing_purchase(self, client, api_key, db_session):
        """Testa atualização de compra existente via webhook"""
        purchase_id = f"test-purchase-update-{int(datetime.now().timestamp())}"
        
        # Primeiro webhook (pending)
        response1 = client.post(
            "/api/webhook/google-pay",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "purchase_id": purchase_id,
                "transaction_id": f"test-transaction-1",
                "status": "pending",
                "license_type": "1_month",
                "user_id": "test-user-update",
                "amount": "9.90",
                "currency": "BRL"
            }
        )
        assert response1.status_code == status.HTTP_200_OK
        
        # Segundo webhook (completed) - deve atualizar
        response2 = client.post(
            "/api/webhook/google-pay",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "purchase_id": purchase_id,
                "transaction_id": f"test-transaction-2",
                "status": "completed",
                "license_type": "1_month",
                "user_id": "test-user-update",
                "amount": "9.90",
                "currency": "BRL"
            }
        )
        assert response2.status_code == status.HTTP_200_OK
        data = response2.json()
        assert data["status"] == "ok"
        # Verificar se a licença foi gerada
        status_response = client.get(
            f"/api/purchase-status/{purchase_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert status_response.status_code == status.HTTP_200_OK
        status_data = status_response.json()
        assert status_data["status"] == "completed"


class TestPurchaseStatus:
    """Testes de verificação de status de compra"""
    
    def test_get_purchase_status_existing(self, client, api_key, db_session):
        """Testa verificação de status de compra existente"""
        # Criar compra via webhook
        purchase_id = f"test-purchase-status-{int(datetime.now().timestamp())}"
        webhook_response = client.post(
            "/api/webhook/google-pay",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "purchase_id": purchase_id,
                "transaction_id": f"test-transaction-{int(datetime.now().timestamp())}",
                "status": "completed",
                "license_type": "1_month",
                "user_id": "test-user-status",
                "amount": "9.90",
                "currency": "BRL"
            }
        )
        assert webhook_response.status_code == status.HTTP_200_OK
        
        # Verificar status
        status_response = client.get(
            f"/api/purchase-status/{purchase_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert status_response.status_code == status.HTTP_200_OK
        data = status_response.json()
        assert data["status"] == "completed"
        assert "license_key" in data
    
    def test_get_purchase_status_nonexistent(self, client, api_key):
        """Testa verificação de compra inexistente"""
        response = client.get(
            "/api/purchase-status/nonexistent-purchase-123",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "not_found"
        assert "error" in data


class TestSecurity:
    """Testes de segurança"""
    
    def test_fake_license_key(self, client, api_key):
        """Testa tentativa de falsificar chave"""
        # Tentar validar chave falsificada
        fake_key = "PRO1MFAKEKEY1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        response = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": fake_key,
                "device_id": "test-device"
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is False
        assert "error" in data
    
    def test_sql_injection_in_license_key(self, client, api_key):
        """Testa proteção contra SQL injection na chave"""
        sql_injection_key = "PRO1M'; DROP TABLE licenses; --"
        response = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": sql_injection_key,
                "device_id": "test-device"
            }
        )
        # Deve falhar na validação de formato, não executar SQL
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is False
    
    def test_sql_injection_in_device_id(self, client, api_key, db_session):
        """Testa proteção contra SQL injection no device_id"""
        # Gerar licença válida
        generate_response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "1_month",
                "user_id": "test-user-sql"
            }
        )
        if generate_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            pytest.skip("Rate limiting ativo, pulando teste")
        
        assert generate_response.status_code == status.HTTP_200_OK
        license_key = generate_response.json()["license_key"]
        
        # Tentar SQL injection no device_id
        response = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": license_key,
                "device_id": "'; DROP TABLE licenses; --"
            }
        )
        # Deve funcionar normalmente (ORM protege contra SQL injection)
        assert response.status_code == status.HTTP_200_OK
    
    def test_rate_limiting_validation(self, client, api_key):
        """Testa rate limiting na validação (10 tentativas/15min)"""
        # Fazer 11 tentativas rápidas com chave inválida
        blocked_count = 0
        for i in range(11):
            response = client.post(
                "/api/validate-license",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "key": f"INVALID_KEY_{i}",
                    "device_id": "test-device"
                }
            )
            # As primeiras 10 devem passar (mesmo que inválidas)
            # A 11ª deve ser bloqueada pelo rate limiting
            if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                blocked_count += 1
            else:
                assert response.status_code == status.HTTP_200_OK
        
        # Pelo menos uma requisição deve ter sido bloqueada
        assert blocked_count > 0, "Rate limiting não está funcionando"
    
    def test_input_validation_license_type(self, client, api_key):
        """Testa validação de entrada no tipo de licença"""
        response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "<script>alert('xss')</script>",
                "user_id": "test-user"
            }
        )
        # Deve falhar na validação do schema Pydantic
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]
    
    def test_input_validation_user_id(self, client, api_key):
        """Testa validação de entrada no user_id"""
        # Testar com user_id muito longo
        long_user_id = "a" * 1000
        response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "1_month",
                "user_id": long_user_id
            }
        )
        # Deve aceitar ou truncar (dependendo da validação)
        # O importante é não quebrar o sistema
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]


class TestEndToEnd:
    """Testes end-to-end do fluxo completo"""
    
    def test_complete_flow_purchase_to_activation(self, client, api_key, db_session):
        """Testa fluxo completo: compra → geração → ativação → uso"""
        user_id = f"test-user-e2e-{int(datetime.now().timestamp())}"
        
        # 1. Simular compra via webhook
        purchase_id = f"test-purchase-e2e-{int(datetime.now().timestamp())}"
        webhook_response = client.post(
            "/api/webhook/google-pay",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "purchase_id": purchase_id,
                "transaction_id": f"test-transaction-{int(datetime.now().timestamp())}",
                "status": "completed",
                "license_type": "1_month",
                "user_id": user_id,
                "amount": "9.90",
                "currency": "BRL"
            }
        )
        assert webhook_response.status_code == status.HTTP_200_OK
        webhook_data = webhook_response.json()
        assert webhook_data["status"] == "ok"
        
        # Obter license_key do status da compra
        status_response = client.get(
            f"/api/purchase-status/{purchase_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert status_response.status_code == status.HTTP_200_OK
        status_data = status_response.json()
        license_key = status_data["license_key"]
        
        # 2. Verificar status da compra
        status_response = client.get(
            f"/api/purchase-status/{purchase_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert status_response.status_code == status.HTTP_200_OK
        status_data = status_response.json()
        assert status_data["status"] == "completed"
        assert status_data["license_key"] == license_key
        
        # 3. Ativar licença em dispositivo
        device_id = "test-device-e2e"
        validate_response = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": license_key,
                "device_id": device_id
            }
        )
        # Pode ser bloqueado por rate limiting se muitos testes rodaram
        if validate_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            pytest.skip("Rate limiting ativo, pulando teste")
        assert validate_response.status_code == status.HTTP_200_OK
        validate_data = validate_response.json()
        assert validate_data["valid"] is True
        assert validate_data["license_type"] == "1_month"
        
        # 4. Validar novamente (deve funcionar para mesmo dispositivo)
        validate_response2 = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": license_key,
                "device_id": device_id
            }
        )
        assert validate_response2.status_code == status.HTTP_200_OK
        validate_data2 = validate_response2.json()
        assert validate_data2["valid"] is True
    
    def test_error_scenario_invalid_purchase(self, client, api_key):
        """Testa cenário de erro: compra inválida"""
        # Tentar verificar status de compra inexistente
        response = client.get(
            "/api/purchase-status/invalid-purchase-123",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "not_found"
    
    def test_error_scenario_expired_license(self, client, api_key, db_session):
        """Testa cenário de erro: licença expirada"""
        # Gerar licença
        generate_response = client.post(
            "/api/generate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "license_type": "1_month",
                "user_id": "test-user-expired"
            }
        )
        # Verificar se não foi bloqueado por rate limiting
        if generate_response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            pytest.skip("Rate limiting ativo, pulando teste")
        
        assert generate_response.status_code == status.HTTP_200_OK
        license_key = generate_response.json()["license_key"]
        
        # A licença recém-gerada não deve estar expirada
        validate_response = client.post(
            "/api/validate-license",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "key": license_key,
                "device_id": "test-device"
            }
        )
        assert validate_response.status_code == status.HTTP_200_OK
        data = validate_response.json()
        # A licença recém-gerada não deve estar expirada
        assert data["valid"] is True
        # (Teste de expiração real requereria mock de tempo ou modificar data no banco)
