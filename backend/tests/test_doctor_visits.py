"""
Testes unitários para endpoints de visitas ao médico
"""
import pytest
from datetime import datetime
from fastapi import status


class TestDoctorVisits:
    """Testes para endpoints de visitas ao médico"""
    
    def test_get_doctor_visits_empty(self, client, api_key):
        """Testa listar visitas quando não há nenhuma"""
        response = client.get(
            "/api/doctor-visits",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []
    
    def test_create_doctor_visit_success(self, client, api_key):
        """Testa criar uma visita ao médico com sucesso"""
        visit_data = {
            "doctor_name": "Dr. João Silva",
            "specialty": "Cardiologista",
            "visit_date": "2024-12-30T10:00:00",
            "notes": "Consulta de rotina"
        }
        response = client.post(
            "/api/doctor-visits",
            json=visit_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["doctor_name"] == visit_data["doctor_name"]
        assert data["specialty"] == visit_data["specialty"]
        assert data["notes"] == visit_data["notes"]
        assert "id" in data
        assert "created_at" in data
    
    def test_get_doctor_visits_after_create(self, client, api_key):
        """Testa listar visitas após criar uma"""
        # Criar visita
        visit_data = {
            "doctor_name": "Dr. Maria Santos",
            "specialty": "Clínico Geral",
            "visit_date": "2024-12-30T14:00:00",
            "notes": "Primeira consulta"
        }
        create_response = client.post(
            "/api/doctor-visits",
            json=visit_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert create_response.status_code == status.HTTP_200_OK
        created_id = create_response.json()["id"]
        
        # Listar visitas
        response = client.get(
            "/api/doctor-visits",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        visits = response.json()
        assert len(visits) == 1
        assert visits[0]["id"] == created_id
        assert visits[0]["doctor_name"] == visit_data["doctor_name"]
    
    def test_update_doctor_visit(self, client, api_key):
        """Testa atualizar uma visita ao médico"""
        # Criar visita
        visit_data = {
            "doctor_name": "Dr. João Silva",
            "specialty": "Cardiologista",
            "visit_date": "2024-12-30T10:00:00",
            "notes": "Consulta inicial"
        }
        create_response = client.post(
            "/api/doctor-visits",
            json=visit_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        visit_id = create_response.json()["id"]
        
        # Atualizar visita
        update_data = {
            "doctor_name": "Dr. João Silva",
            "specialty": "Cardiologista",
            "visit_date": "2024-12-30T10:00:00",
            "notes": "Consulta de retorno - tudo bem"
        }
        response = client.put(
            f"/api/doctor-visits/{visit_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["notes"] == update_data["notes"]
    
    def test_update_doctor_visit_not_found(self, client, api_key):
        """Testa atualizar visita inexistente"""
        update_data = {
            "doctor_name": "Dr. João Silva",
            "specialty": "Cardiologista",
            "visit_date": "2024-12-30T10:00:00",
            "notes": "Consulta"
        }
        response = client.put(
            "/api/doctor-visits/99999",
            json=update_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_doctor_visit(self, client, api_key):
        """Testa deletar uma visita ao médico"""
        # Criar visita
        visit_data = {
            "doctor_name": "Dr. João Silva",
            "specialty": "Cardiologista",
            "visit_date": "2024-12-30T10:00:00",
            "notes": "Consulta"
        }
        create_response = client.post(
            "/api/doctor-visits",
            json=visit_data,
            headers={"Authorization": f"Bearer {api_key}"}
        )
        visit_id = create_response.json()["id"]
        
        # Deletar visita
        response = client.delete(
            f"/api/doctor-visits/{visit_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Visit deleted"
        
        # Verificar que foi deletado
        get_response = client.get(
            "/api/doctor-visits",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert len(get_response.json()) == 0
    
    def test_delete_doctor_visit_not_found(self, client, api_key):
        """Testa deletar visita inexistente"""
        response = client.delete(
            "/api/doctor-visits/99999",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_create_doctor_visit_without_auth(self, client):
        """Testa criar visita sem autenticação"""
        visit_data = {
            "doctor_name": "Dr. João Silva",
            "specialty": "Cardiologista",
            "visit_date": "2024-12-30T10:00:00"
        }
        response = client.post("/api/doctor-visits", json=visit_data)
        assert response.status_code == status.HTTP_403_FORBIDDEN








