"""
Testes unitários para endpoints de logs de medicamentos
"""
import pytest
from datetime import datetime
from fastapi import status


class TestMedicationLogs:
    """Testes para endpoints de logs de medicamentos"""
    
    def test_get_medication_logs_empty(self, client, api_key):
        """Testa listar logs quando não há nenhum"""
        response = client.get(
            "/api/medication-logs",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []
    
    def test_create_medication_log_taken(self, client, api_key):
        """Testa criar log de medicamento tomado"""
        log_data = {
            "medication_name": "Paracetamol",
            "scheduled_time": "2024-12-30T08:00:00",
            "taken_at": "2024-12-30T08:05:00",
            "status": "taken"
        }
        response = client.post(
            "/api/medication-logs",
            json=log_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["medication_name"] == log_data["medication_name"]
        assert data["status"] == "taken"
        assert "id" in data
        assert "created_at" in data
    
    def test_create_medication_log_skipped(self, client, api_key):
        """Testa criar log de medicamento pulado"""
        log_data = {
            "medication_name": "Ibuprofeno",
            "scheduled_time": "2024-12-30T12:00:00",
            "status": "skipped"
        }
        response = client.post(
            "/api/medication-logs",
            json=log_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "skipped"
        assert data["taken_at"] is None
    
    def test_create_medication_log_postponed(self, client, api_key):
        """Testa criar log de medicamento adiado"""
        log_data = {
            "medication_name": "Aspirina",
            "scheduled_time": "2024-12-30T18:00:00",
            "status": "postponed"
        }
        response = client.post(
            "/api/medication-logs",
            json=log_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "postponed"
    
    def test_get_medication_logs_after_create(self, client, api_key):
        """Testa listar logs após criar um"""
        # Criar log
        log_data = {
            "medication_name": "Paracetamol",
            "scheduled_time": "2024-12-30T08:00:00",
            "status": "taken"
        }
        create_response = client.post(
            "/api/medication-logs",
            json=log_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert create_response.status_code == status.HTTP_200_OK
        created_id = create_response.json()["id"]
        
        # Listar logs
        response = client.get(
            "/api/medication-logs",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        logs = response.json()
        assert len(logs) == 1
        assert logs[0]["id"] == created_id
        assert logs[0]["medication_name"] == log_data["medication_name"]
        assert logs[0]["status"] == log_data["status"]
    
    def test_create_medication_log_without_auth(self, client):
        """Testa criar log sem autenticação"""
        log_data = {
            "medication_name": "Paracetamol",
            "scheduled_time": "2024-12-30T08:00:00",
            "status": "taken"
        }
        response = client.post("/api/medication-logs", json=log_data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_create_multiple_logs(self, client, api_key):
        """Testa criar múltiplos logs"""
        logs_data = [
            {
                "medication_name": "Paracetamol",
                "scheduled_time": "2024-12-30T08:00:00",
                "status": "taken"
            },
            {
                "medication_name": "Ibuprofeno",
                "scheduled_time": "2024-12-30T12:00:00",
                "status": "taken"
            },
            {
                "medication_name": "Aspirina",
                "scheduled_time": "2024-12-30T18:00:00",
                "status": "skipped"
            }
        ]
        
        for log_data in logs_data:
            response = client.post(
                "/api/medication-logs",
                json=log_data,
                headers={"Authorization": f"Bearer {api_key}"}
            )
            assert response.status_code == status.HTTP_200_OK
        
        # Verificar que todos foram criados
        response = client.get(
            "/api/medication-logs",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        logs = response.json()
        assert len(logs) == 3

