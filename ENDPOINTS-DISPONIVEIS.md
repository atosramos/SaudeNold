# Endpoints Disponíveis - Backend SaudeNold

## ✅ Endpoints Funcionais

### 1. Health Check (Sem autenticação)
```
GET http://localhost:8000/health
```
**Response:**
```json
{"status":"ok"}
```

### 2. Documentação Swagger UI
```
GET http://localhost:8000/docs
```
Interface visual para testar todos os endpoints da API.

### 3. Documentação ReDoc
```
GET http://localhost:8000/redoc
```
Documentação alternativa em formato ReDoc.

## 🔐 Endpoints da API (Requerem API Key)

Todos os endpoints abaixo requerem header de autenticação:
```
Authorization: Bearer <API_KEY>
```

### Exames Médicos

#### Listar Exames
```
GET http://localhost:8000/api/medical-exams
```

#### Obter Exame por ID
```
GET http://localhost:8000/api/medical-exams/{id}
```

#### Criar Exame
```
POST http://localhost:8000/api/medical-exams
Content-Type: application/json

{
  "image_base64": "...",
  "file_type": "image" ou "pdf",
  "exam_date": null (opcional),
  "exam_type": null (opcional)
}
```

#### Atualizar Exame
```
PUT http://localhost:8000/api/medical-exams/{id}
```

#### Deletar Exame
```
DELETE http://localhost:8000/api/medical-exams/{id}
```

#### Timeline de Parâmetro
```
GET http://localhost:8000/api/medical-exams/{exam_id}/timeline/{parameter_name}
```

### Medicamentos

```
GET    http://localhost:8000/api/medications
POST   http://localhost:8000/api/medications
PUT    http://localhost:8000/api/medications/{id}
DELETE http://localhost:8000/api/medications/{id}
```

### Logs de Medicamentos

```
GET  http://localhost:8000/api/medication-logs
POST http://localhost:8000/api/medication-logs
```

### Contatos de Emergência

```
GET    http://localhost:8000/api/emergency-contacts
POST   http://localhost:8000/api/emergency-contacts
PUT    http://localhost:8000/api/emergency-contacts/{id}
DELETE http://localhost:8000/api/emergency-contacts/{id}
```

### Visitas ao Médico

```
GET    http://localhost:8000/api/doctor-visits
POST   http://localhost:8000/api/doctor-visits
PUT    http://localhost:8000/api/doctor-visits/{id}
DELETE http://localhost:8000/api/doctor-visits/{id}
```

## ❌ Endpoints que NÃO Existem

### Rota Raiz
```
GET http://localhost:8000/
```
**Response:** `{"detail":"Not Found"}`

Isso é **normal e esperado**. O FastAPI não define uma rota na raiz por padrão.

## 🧪 Como Testar

### 1. No Navegador (Sem autenticação)
- ✅ `http://localhost:8000/health` - Deve retornar `{"status":"ok"}`
- ✅ `http://localhost:8000/docs` - Interface Swagger
- ❌ `http://localhost:8000/` - Retorna 404 (normal)

### 2. No Celular (Após configurar proxy)
- ✅ `http://192.168.15.17:8000/health` - Deve retornar `{"status":"ok"}`
- ✅ `http://192.168.15.17:8000/docs` - Interface Swagger

### 3. Com API Key (PowerShell)
```powershell
$apiKey = "JDZYc50zDSlsvev8ZzOJXXowHg_iqNJW8fKx49YgcLo"
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

# Listar exames
Invoke-WebRequest -Uri "http://localhost:8000/api/medical-exams" -Headers $headers

# Criar exame
$body = @{
    image_base64 = "iVBORw0KGgo..."
    file_type = "image"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/medical-exams" -Method POST -Headers $headers -Body $body
```

## 📝 Notas Importantes

1. **Rota raiz (`/`) não existe** - Isso é normal no FastAPI
2. **Use `/health`** para verificar se o backend está funcionando
3. **Use `/docs`** para ver todas as rotas disponíveis
4. **API Key é obrigatória** para endpoints `/api/*`
5. **CORS está configurado** para aceitar requisições do IP da rede

## 🔍 Verificar se Backend está Funcionando

Se você acessar `http://localhost:8000/` e receber `{"detail":"Not Found"}`, isso significa:
- ✅ Backend está rodando
- ✅ Port-forward está funcionando
- ✅ Backend está respondendo

Apenas a rota específica não existe, o que é esperado.

Para confirmar que está tudo OK, acesse:
- `http://localhost:8000/health` - Deve retornar `{"status":"ok"}`



