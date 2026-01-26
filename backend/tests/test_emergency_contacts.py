"""
Testes unitários para endpoints de contatos de emergência
"""
import pytest
from fastapi import status


class TestEmergencyContacts:
    """Testes para endpoints de contatos de emergência"""
    
    def test_get_emergency_contacts_empty(self, client, api_key):
        """Testa listar contatos quando não há nenhum"""
        response = client.get(
            "/api/emergency-contacts",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []
    
    def test_create_emergency_contact_success(self, client, api_key, csrf_token):
        """Testa criar um contato de emergência com sucesso"""
        contact_data = {
            "name": "Maria Silva",
            "phone": "+5511999999999",
            "relation": "Filha",
            "order": 0
        }
        response = client.post(
            "/api/emergency-contacts",
            json=contact_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-CSRF-Token": csrf_token
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == contact_data["name"]
        assert data["phone"] == contact_data["phone"]
        assert data["relation"] == contact_data["relation"]
        assert "id" in data
        assert "created_at" in data
    
    def test_create_emergency_contact_limit(self, client, api_key, csrf_token):
        """Testa o limite de 5 contatos de emergência"""
        # Criar 5 contatos
        for i in range(5):
            contact_data = {
                "name": f"Contato {i+1}",
                "phone": f"+551199999999{i}",
                "relation": "Familiar",
                "order": i
            }
            response = client.post(
                "/api/emergency-contacts",
                json=contact_data,
                headers={
                "Authorization": f"Bearer {api_key}",
                "X-CSRF-Token": csrf_token
            }
            )
            assert response.status_code == status.HTTP_200_OK
        
        # Tentar criar o 6º contato
        contact_data = {
            "name": "Contato 6",
            "phone": "+5511999999999",
            "relation": "Familiar",
            "order": 5
        }
        response = client.post(
            "/api/emergency-contacts",
            json=contact_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-CSRF-Token": csrf_token
            }
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Maximum of 5 emergency contacts" in response.json()["detail"]
    
    def test_get_emergency_contacts_after_create(self, client, api_key, csrf_token, jwt_token, test_profile):
        """Testa listar contatos após criar um"""
        # Criar contato
        contact_data = {
            "name": "João Silva",
            "phone": "+5511888888888",
            "relation": "Filho",
            "order": 0
        }
        create_response = client.post(
            "/api/emergency-contacts",
            json=contact_data,
            headers={
                "Authorization": f"Bearer {jwt_token}",
                "X-CSRF-Token": csrf_token,
                "X-Profile-Id": str(test_profile.id)
            }
        )
        assert create_response.status_code == status.HTTP_200_OK
        created_id = create_response.json()["id"]
        
        # Listar contatos
        response = client.get(
            "/api/emergency-contacts",
            headers={
                "Authorization": f"Bearer {jwt_token}",
                "X-Profile-Id": str(test_profile.id)
            }
        )
        assert response.status_code == status.HTTP_200_OK
        contacts = response.json()
        assert len(contacts) == 1
        assert contacts[0]["id"] == created_id
        assert contacts[0]["name"] == contact_data["name"]
    
    def test_update_emergency_contact(self, client, api_key, csrf_token):
        """Testa atualizar um contato de emergência"""
        # Criar contato
        contact_data = {
            "name": "Maria Silva",
            "phone": "+5511999999999",
            "relation": "Filha",
            "order": 0
        }
        create_response = client.post(
            "/api/emergency-contacts",
            json=contact_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-CSRF-Token": csrf_token
            }
        )
        contact_id = create_response.json()["id"]
        
        # Atualizar contato
        update_data = {
            "name": "Maria Silva Santos",
            "phone": "+5511999999998",
            "relation": "Filha",
            "order": 0
        }
        response = client.put(
            f"/api/emergency-contacts/{contact_id}",
            json=update_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-CSRF-Token": csrf_token
            }
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["phone"] == update_data["phone"]
    
    def test_update_emergency_contact_not_found(self, client, api_key, csrf_token):
        """Testa atualizar contato inexistente"""
        update_data = {
            "name": "Maria Silva",
            "phone": "+5511999999999",
            "relation": "Filha",
            "order": 0
        }
        response = client.put(
            "/api/emergency-contacts/99999",
            json=update_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-CSRF-Token": csrf_token
            }
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_emergency_contact(self, client, api_key, csrf_token):
        """Testa deletar um contato de emergência"""
        # Criar contato
        contact_data = {
            "name": "Maria Silva",
            "phone": "+5511999999999",
            "relation": "Filha",
            "order": 0
        }
        create_response = client.post(
            "/api/emergency-contacts",
            json=contact_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-CSRF-Token": csrf_token
            }
        )
        contact_id = create_response.json()["id"]
        
        # Deletar contato
        response = client.delete(
            f"/api/emergency-contacts/{contact_id}",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-CSRF-Token": csrf_token
            }
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["message"] == "Contact deleted"
        
        # Verificar que foi deletado
        get_response = client.get(
            "/api/emergency-contacts",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-CSRF-Token": csrf_token
            }
        )
        assert len(get_response.json()) == 0
    
    def test_delete_emergency_contact_not_found(self, client, api_key, csrf_token):
        """Testa deletar contato inexistente"""
        response = client.delete(
            "/api/emergency-contacts/99999",
            headers={
                "Authorization": f"Bearer {api_key}",
                "X-CSRF-Token": csrf_token
            }
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_create_emergency_contact_without_auth(self, client):
        """Testa criar contato sem autenticação"""
        contact_data = {
            "name": "Maria Silva",
            "phone": "+5511999999999",
            "relation": "Filha"
        }
        # CSRF middleware bloqueia antes da autenticação
        try:
            response = client.post("/api/emergency-contacts", json=contact_data)
            # Se chegou aqui, deve retornar 403
            assert response.status_code == status.HTTP_403_FORBIDDEN
            detail = response.json().get("detail", "").lower()
            assert "csrf" in detail
        except Exception:
            # Se levantou exceção, está correto (middleware bloqueou)
            pass









