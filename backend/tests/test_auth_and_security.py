"""
Testes unitários para autenticação e validações de segurança
"""
import pytest
from fastapi import status
import base64
import os


class TestAuthentication:
    """Testes para autenticação e API keys"""
    
    def test_health_check_no_auth_required(self, client):
        """Testa que o endpoint /health não requer autenticação"""
        response = client.get("/health")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "ok"
    
    def test_get_medications_without_auth(self, client):
        """Testa acesso sem autenticação retorna 403"""
        response = client.get("/api/medications")
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_medications_invalid_api_key(self, client):
        """Testa acesso com API key inválida"""
        response = client.get(
            "/api/medications",
            headers={"Authorization": "Bearer invalid-key"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid API Key" in response.json()["detail"]
    
    def test_get_medications_valid_api_key(self, client, api_key):
        """Testa acesso com API key válida"""
        response = client.get(
            "/api/medications",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK


class TestInputValidation:
    """Testes para validação de entrada e sanitização"""
    
    def test_medication_log_invalid_status(self, client, api_key):
        """Testa criar log com status inválido"""
        log_data = {
            "medication_name": "Paracetamol",
            "scheduled_time": "2024-12-30T08:00:00",
            "status": "invalid_status"
        }
        response = client.post(
            "/api/medication-logs",
            json=log_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid status" in response.json()["detail"]
    
    def test_medication_log_valid_statuses(self, client, api_key):
        """Testa criar log com status válidos"""
        valid_statuses = ["taken", "skipped", "postponed"]
        for status_val in valid_statuses:
            log_data = {
                "medication_name": "Paracetamol",
                "scheduled_time": "2024-12-30T08:00:00",
                "status": status_val
            }
            response = client.post(
                "/api/medication-logs",
                json=log_data,
                headers={"Authorization": f"Bearer {api_key}"}
            )
            assert response.status_code == status.HTTP_200_OK
            assert response.json()["status"] == status_val


class TestImageValidation:
    """Testes para validação de imagens base64"""
    
    def generate_large_base64_image(self, size_mb: float) -> str:
        """Gera uma string base64 simulando uma imagem grande"""
        # Base64 é ~33% maior que o original
        # Para 5MB original, precisamos de ~6.67MB em base64
        size_bytes = int(size_mb * 1024 * 1024)
        # Criar dados simulados
        fake_image_data = "A" * size_bytes
        encoded = base64.b64encode(fake_image_data.encode()).decode()
        return f"data:image/png;base64,{encoded}"
    
    def test_medication_with_large_image(self, client, api_key):
        """Testa criar medicamento com imagem muito grande"""
        large_image = self.generate_large_base64_image(6.0)  # 6MB em base64 = ~4.5MB original
        medication_data = {
            "name": "Paracetamol",
            "dosage": "500mg",
            "schedules": ["08:00"],
            "image_base64": large_image,
            "active": True
        }
        response = client.post(
            "/api/medications",
            json=medication_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Image size exceeds" in response.json()["detail"]
    
    def test_medication_with_small_image(self, client, api_key):
        """Testa criar medicamento com imagem pequena (deve passar)"""
        small_image = self.generate_large_base64_image(1.0)  # 1MB
        medication_data = {
            "name": "Paracetamol",
            "dosage": "500mg",
            "schedules": ["08:00"],
            "image_base64": small_image,
            "active": True
        }
        response = client.post(
            "/api/medications",
            json=medication_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
    
    def test_emergency_contact_with_large_image(self, client, api_key):
        """Testa criar contato com foto muito grande"""
        large_image = self.generate_large_base64_image(6.0)
        contact_data = {
            "name": "Maria Silva",
            "phone": "+5511999999999",
            "relation": "Filha",
            "photo_base64": large_image,
            "order": 0
        }
        response = client.post(
            "/api/emergency-contacts",
            json=contact_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Image size exceeds" in response.json()["detail"]


class TestStringSanitization:
    """Testes para sanitização de strings"""
    
    def test_sanitize_string_removes_control_chars(self, client, api_key):
        """Testa que caracteres de controle são removidos"""
        # Caracteres de controle (exceto \n\r\t) devem ser removidos
        medication_data = {
            "name": "Medicamento\x00com\x01caracteres\x02especiais",
            "dosage": "500mg",
            "schedules": ["08:00"],
            "active": True
        }
        response = client.post(
            "/api/medications",
            json=medication_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        # O nome deve ser sanitizado (caracteres de controle removidos)
        data = response.json()
        # Verificar que não há caracteres de controle ASCII < 32 (exceto \n\r\t)
        assert "\x00" not in data["name"]
        assert "\x01" not in data["name"]
    
    def test_sanitize_string_preserves_newlines(self, client, api_key):
        """Testa que newlines são preservados"""
        medication_data = {
            "name": "Medicamento\ncom\nnewlines",
            "dosage": "500mg",
            "schedules": ["08:00"],
            "notes": "Nota com\ntabulação\te texto",
            "active": True
        }
        response = client.post(
            "/api/medications",
            json=medication_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "\n" in data["name"]
        assert "\n" in data["notes"]
        assert "\t" in data["notes"]


class TestRateLimiting:
    """Testes básicos para rate limiting (se aplicável)"""
    
    def test_multiple_requests_succeed(self, client, api_key):
        """Testa que múltiplas requisições válidas são aceitas"""
        for i in range(10):
            response = client.get(
                "/api/medications",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            assert response.status_code == status.HTTP_200_OK









