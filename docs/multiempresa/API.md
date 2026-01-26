# Documentação de API - Sistema Multiempresa

## Autenticação

Todas as requisições requerem autenticação via JWT:

```http
Authorization: Bearer <jwt_token>
```

Para endpoints que operam em dados de perfil específico, é necessário incluir:

```http
X-Profile-Id: <profile_id>
```

## Endpoints de Perfis

### GET /api/family/profiles

Lista todos os perfis da família do usuário autenticado.

**Autenticação:** Obrigatória (JWT)

**Headers:**
```http
Authorization: Bearer <token>
```

**Resposta (200 OK):**
```json
[
  {
    "id": 1,
    "family_id": 1,
    "name": "João Silva",
    "account_type": "family_admin",
    "birth_date": "1980-01-15T00:00:00Z",
    "gender": "Masculino",
    "blood_type": "O+",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": null
  },
  {
    "id": 2,
    "family_id": 1,
    "name": "Maria Silva",
    "account_type": "adult_member",
    "birth_date": "1985-05-20T00:00:00Z",
    "gender": "Feminino",
    "blood_type": "A+",
    "created_at": "2026-01-02T00:00:00Z",
    "updated_at": null
  }
]
```

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Usuário não autenticado

**Rate Limit:** 100 requisições/minuto

---

### DELETE /api/family/profiles/{profile_id}

Deleta um perfil da família.

**Autenticação:** Obrigatória (JWT)  
**Permissão:** Apenas `family_admin`

**Headers:**
```http
Authorization: Bearer <token>
```

**Parâmetros:**
- `profile_id` (path): ID do perfil a ser deletado

**Resposta (200 OK):**
```json
{
  "success": true,
  "message": "Perfil deletado com sucesso"
}
```

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Usuário não é admin ou sem permissão
- `404 Not Found`: Perfil não encontrado
- `400 Bad Request`: Tentativa de deletar último administrador

**Rate Limit:** 10 requisições/minuto

---

## Endpoints de Convites

### POST /api/family/invite-adult

Cria um convite para adicionar um adulto à família.

**Autenticação:** Obrigatória (JWT)  
**Permissão:** `family_admin` ou `adult_member`  
**Requisito:** Licença PRO ativa (quando dados estão no servidor)

**Headers:**
```http
Authorization: Bearer <token>
X-CSRF-Token: <csrf_token>
```

**Body:**
```json
{
  "invitee_email": "convidado@example.com",  // Opcional
  "permissions": {                           // Opcional
    "can_view": true,
    "can_edit": false,
    "can_delete": false
  }
}
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "family_id": 1,
  "inviter_user_id": 1,
  "invitee_email": "convidado@example.com",
  "invite_code": "ABC123XYZ",  // Apenas se ALLOW_EMAIL_DEBUG=true
  "status": "pending",
  "expires_at": "2026-02-02T00:00:00Z",
  "accepted_at": null,
  "accepted_by_user_id": null,
  "created_at": "2026-01-26T00:00:00Z"
}
```

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sem permissão ou licença PRO necessária
- `400 Bad Request`: Usuário já está na família ou erro na criação

**Rate Limit:** 5 requisições/minuto

---

### GET /api/family/invites

Lista todos os convites da família.

**Autenticação:** Obrigatória (JWT)

**Headers:**
```http
Authorization: Bearer <token>
```

**Resposta (200 OK):**
```json
[
  {
    "id": 1,
    "family_id": 1,
    "inviter_user_id": 1,
    "invitee_email": "convidado@example.com",
    "invite_code": null,  // Oculto por padrão
    "status": "pending",
    "expires_at": "2026-02-02T00:00:00Z",
    "accepted_at": null,
    "accepted_by_user_id": null,
    "created_at": "2026-01-26T00:00:00Z"
  }
]
```

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido

---

### POST /api/family/accept-invite

Aceita um convite para entrar na família.

**Autenticação:** Obrigatória (JWT)

**Headers:**
```http
Authorization: Bearer <token>
```

**Body:**
```json
{
  "code": "ABC123XYZ"
}
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "family_id": 1,
  "inviter_user_id": 1,
  "invitee_email": "convidado@example.com",
  "invite_code": null,
  "status": "accepted",
  "expires_at": "2026-02-02T00:00:00Z",
  "accepted_at": "2026-01-26T12:00:00Z",
  "accepted_by_user_id": 2,
  "created_at": "2026-01-26T00:00:00Z"
}
```

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido
- `404 Not Found`: Convite não encontrado
- `400 Bad Request`: Convite expirado, já aceito ou não está pendente
- `403 Forbidden`: Convite não pertence ao email do usuário

**Comportamento:**
- Se usuário já pertence a outra família (com outros membros), move para nova família
- Cria `FamilyProfile` automaticamente
- Cria `FamilyDataShare` com permissões do convite

---

### DELETE /api/family/invite/{invite_id}

Cancela um convite pendente.

**Autenticação:** Obrigatória (JWT)

**Headers:**
```http
Authorization: Bearer <token>
```

**Parâmetros:**
- `invite_id` (path): ID do convite a ser cancelado

**Resposta (200 OK):**
```json
{
  "id": 1,
  "family_id": 1,
  "inviter_user_id": 1,
  "invitee_email": "convidado@example.com",
  "invite_code": null,
  "status": "cancelled",
  "expires_at": "2026-02-02T00:00:00Z",
  "accepted_at": null,
  "accepted_by_user_id": null,
  "created_at": "2026-01-26T00:00:00Z"
}
```

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido
- `404 Not Found`: Convite não encontrado

---

### POST /api/family/invite/{invite_id}/resend

Reenvia um convite pendente (renova expiração).

**Autenticação:** Obrigatória (JWT)  
**Permissão:** Apenas `family_admin`

**Headers:**
```http
Authorization: Bearer <token>
```

**Parâmetros:**
- `invite_id` (path): ID do convite a ser reenviado

**Resposta (200 OK):**
```json
{
  "id": 1,
  "family_id": 1,
  "inviter_user_id": 1,
  "invitee_email": "convidado@example.com",
  "invite_code": null,
  "status": "pending",
  "expires_at": "2026-02-09T00:00:00Z",  // Renovado (+7 dias)
  "accepted_at": null,
  "accepted_by_user_id": null,
  "created_at": "2026-01-26T00:00:00Z"
}
```

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sem permissão para reenviar
- `404 Not Found`: Convite não encontrado
- `400 Bad Request`: Convite não está pendente

**Rate Limit:** 5 requisições/minuto

---

## Endpoints de Links entre Perfis

### GET /api/family/links

Lista todos os links (vínculos) entre perfis da família.

**Autenticação:** Obrigatória (JWT)

**Headers:**
```http
Authorization: Bearer <token>
```

**Resposta (200 OK):**
```json
[
  {
    "id": 1,
    "family_id": 1,
    "source_profile_id": 1,
    "target_profile_id": 2,
    "status": "accepted",
    "created_at": "2026-01-26T00:00:00Z",
    "approved_at": "2026-01-26T12:00:00Z"
  }
]
```

**Status possíveis:**
- `pending`: Aguardando aprovação
- `accepted`: Aceito
- `rejected`: Rejeitado

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido

---

### POST /api/family/links

Cria um link (vínculo) entre dois perfis.

**Autenticação:** Obrigatória (JWT)  
**Permissão:** Apenas `family_admin`

**Headers:**
```http
Authorization: Bearer <token>
X-CSRF-Token: <csrf_token>
X-Profile-Id: <source_profile_id>
```

**Body:**
```json
{
  "target_profile_id": 2
}
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "family_id": 1,
  "source_profile_id": 1,
  "target_profile_id": 2,
  "status": "pending",
  "created_at": "2026-01-26T00:00:00Z",
  "approved_at": null
}
```

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sem permissão (não é admin)
- `400 Bad Request`: Profile ID requerido, perfis devem ser diferentes
- `404 Not Found`: Perfil alvo não encontrado

**Comportamento:**
- Se link já existe (não rejeitado), retorna o existente
- Link fica com status `pending` até ser aceito

---

### POST /api/family/links/{link_id}/accept

Aceita um link (vínculo) entre perfis.

**Autenticação:** Obrigatória (JWT)

**Headers:**
```http
Authorization: Bearer <token>
X-CSRF-Token: <csrf_token>
X-Profile-Id: <target_profile_id>  // Perfil que aceita
```

**Parâmetros:**
- `link_id` (path): ID do link a ser aceito

**Resposta (200 OK):**
```json
{
  "id": 1,
  "family_id": 1,
  "source_profile_id": 1,
  "target_profile_id": 2,
  "status": "accepted",
  "created_at": "2026-01-26T00:00:00Z",
  "approved_at": "2026-01-26T12:00:00Z"
}
```

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sem permissão para aceitar (não é o perfil alvo nem admin)
- `404 Not Found`: Link não encontrado

---

## Endpoints de Compartilhamento de Dados

### GET /api/family/data-shares

Lista compartilhamentos de dados da família.

**Autenticação:** Obrigatória (JWT)

**Headers:**
```http
Authorization: Bearer <token>
X-Profile-Id: <profile_id>  // Opcional: filtra por perfil
```

**Resposta (200 OK):**
```json
[
  {
    "id": 1,
    "family_id": 1,
    "from_profile_id": 1,
    "to_profile_id": 2,
    "permissions": {
      "can_view": true,
      "can_edit": false,
      "can_delete": false
    },
    "created_at": "2026-01-26T00:00:00Z",
    "revoked_at": null
  }
]
```

**Filtros:**
- Se `X-Profile-Id` fornecido: retorna apenas compartilhamentos onde o perfil é origem ou destino
- Sem `X-Profile-Id`: retorna todos os compartilhamentos da família

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido

---

### POST /api/family/data-shares

Cria um compartilhamento de dados entre perfis.

**Autenticação:** Obrigatória (JWT)  
**Permissão:** Apenas `family_admin`

**Headers:**
```http
Authorization: Bearer <token>
X-CSRF-Token: <csrf_token>
X-Profile-Id: <from_profile_id>  // Perfil que compartilha
```

**Body:**
```json
{
  "to_profile_id": 2,
  "permissions": {  // Opcional
    "can_view": true,
    "can_edit": false,
    "can_delete": false
  }
}
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "family_id": 1,
  "from_profile_id": 1,
  "to_profile_id": 2,
  "permissions": {
    "can_view": true,
    "can_edit": false,
    "can_delete": false
  },
  "created_at": "2026-01-26T00:00:00Z",
  "revoked_at": null
}
```

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sem permissão (não é admin)
- `400 Bad Request`: Profile ID requerido
- `404 Not Found`: Perfil alvo não encontrado

---

### DELETE /api/family/data-shares/{share_id}

Revoga um compartilhamento de dados.

**Autenticação:** Obrigatória (JWT)  
**Permissão:** `family_admin` ou dono do perfil que compartilha

**Headers:**
```http
Authorization: Bearer <token>
X-CSRF-Token: <csrf_token>
X-Profile-Id: <from_profile_id>  // Opcional
```

**Parâmetros:**
- `share_id` (path): ID do compartilhamento a ser revogado

**Resposta (200 OK):**
```json
{
  "success": true
}
```

**Códigos de Erro:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sem permissão para revogar
- `404 Not Found`: Compartilhamento não encontrado

**Comportamento:**
- Define `revoked_at` no compartilhamento
- Não remove o registro (auditoria)
- Acesso é imediatamente bloqueado

---

## Autenticação e Autorização

### JWT Token

Todas as requisições requerem um token JWT válido:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Profile Context

Para operações em dados de perfil específico, inclua:

```http
X-Profile-Id: 1
```

O middleware valida:
1. Token JWT válido
2. Perfil pertence à família do usuário
3. Permissões do usuário para acessar o perfil

### CSRF Protection

Requisições POST, PUT, DELETE e PATCH requerem token CSRF:

```http
X-CSRF-Token: <csrf_token>
```

Obter token CSRF:
```http
GET /api/csrf-token
Authorization: Bearer <jwt_token>
```

---

## Códigos de Erro Comuns

| Código | Descrição | Solução |
|--------|-----------|---------|
| `400 Bad Request` | Dados inválidos ou parâmetros incorretos | Verificar body/parâmetros |
| `401 Unauthorized` | Token JWT inválido ou ausente | Obter novo token |
| `403 Forbidden` | Sem permissão para a operação | Verificar permissões do usuário |
| `404 Not Found` | Recurso não encontrado | Verificar IDs fornecidos |
| `429 Too Many Requests` | Rate limit excedido | Aguardar antes de tentar novamente |

---

## Casos de Uso Comuns

### 1. Listar Perfis da Família

```bash
curl -X GET "https://api.example.com/api/family/profiles" \
  -H "Authorization: Bearer <token>"
```

### 2. Criar Convite

```bash
curl -X POST "https://api.example.com/api/family/invite-adult" \
  -H "Authorization: Bearer <token>" \
  -H "X-CSRF-Token: <csrf_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "invitee_email": "convidado@example.com",
    "permissions": {
      "can_view": true,
      "can_edit": false
    }
  }'
```

### 3. Aceitar Convite

```bash
curl -X POST "https://api.example.com/api/family/accept-invite" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ABC123XYZ"
  }'
```

### 4. Compartilhar Dados

```bash
curl -X POST "https://api.example.com/api/family/data-shares" \
  -H "Authorization: Bearer <token>" \
  -H "X-CSRF-Token: <csrf_token>" \
  -H "X-Profile-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "to_profile_id": 2,
    "permissions": {
      "can_view": true,
      "can_edit": false
    }
  }'
```

---

## Rate Limiting

| Endpoint | Limite |
|----------|--------|
| `GET /api/family/profiles` | 100/min |
| `DELETE /api/family/profiles/{id}` | 10/min |
| `POST /api/family/invite-adult` | 5/min |
| `POST /api/family/invite/{id}/resend` | 5/min |
| Outros | Sem limite específico |

---

## Referências

- [Arquitetura do Sistema](./ARQUITETURA.md)
- [Modelos de Dados](./MODELOS.md)
- [Guia de Segurança](./SEGURANCA.md)

---

**Última atualização:** Janeiro 2026
