# Como Testar Endpoints de Licenças PRO

## 🚀 Pré-requisitos

1. Backend rodando (local ou Kubernetes)
2. Variável `LICENSE_SECRET_KEY` configurada
3. API Key configurada

## 📋 Passo a Passo

### 1. Configurar Variáveis de Ambiente

```bash
cd backend

# Criar .env se não existir
cp .env.example .env

# Editar .env e adicionar:
LICENSE_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(64))")
API_KEY=sua-api-key-aqui
```

### 2. Iniciar Backend

```bash
# Local
uvicorn main:app --reload

# Ou com Docker
docker-compose up backend
```

### 3. Executar Testes

```bash
cd backend

# Configurar variáveis
export API_URL=http://localhost:8000
export API_KEY=sua-api-key-aqui

# Executar script de teste
python test_licenses.py
```

## ✅ Resultados Esperados

O script deve:
- ✅ Validar chaves inválidas (retornar erro)
- ✅ Gerar chaves de 1 mês, 6 meses e 1 ano
- ✅ Validar chaves geradas
- ✅ Testar webhook do Google Pay
- ✅ Verificar status de compras

## 🔍 Testar Manualmente

### Gerar Licença

```bash
curl -X POST http://localhost:8000/api/generate-license \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sua-api-key" \
  -d '{"license_type": "1_month", "user_id": "test-123"}'
```

### Validar Licença

```bash
curl -X POST http://localhost:8000/api/validate-license \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sua-api-key" \
  -d '{"key": "PRO1M...", "device_id": "device-123"}'
```

## 🐛 Troubleshooting

### Erro: LICENSE_SECRET_KEY não configurada

Verifique se a variável está no `.env` ou no Kubernetes Secret.

### Erro: 401 Unauthorized

Verifique se a API_KEY está correta no header Authorization.

### Erro: Rate limit exceeded

Aguarde alguns segundos e tente novamente (limite: 10 req/min para validação).
