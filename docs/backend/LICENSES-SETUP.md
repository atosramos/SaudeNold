# Configuração de Licenças PRO - Backend

## 🔐 Configuração da Chave Secreta

A chave secreta (`LICENSE_SECRET_KEY`) é usada para gerar e validar chaves de licença usando HMAC-SHA256.

### Gerar Chave Secreta

```bash
# Python
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Ou Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

**Recomendação:** Use pelo menos 64 caracteres.

### Configurar no Backend

#### Opção 1: Arquivo .env (Desenvolvimento)

Crie `backend/.env`:

```env
LICENSE_SECRET_KEY=sua_chave_secreta_muito_forte_aqui_minimo_64_caracteres
```

#### Opção 2: Kubernetes Secret (Produção)

```bash
# Gerar chave
LICENSE_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(64))")

# Criar Secret
kubectl create secret generic backend-secret \
  --from-literal=LICENSE_SECRET_KEY="$LICENSE_SECRET_KEY" \
  --namespace=saudenold \
  --dry-run=client -o yaml | kubectl apply -f -
```

Atualizar `k8s/backend-deployment.yaml` para incluir:

```yaml
env:
  - name: LICENSE_SECRET_KEY
    valueFrom:
      secretKeyRef:
        name: backend-secret
        key: LICENSE_SECRET_KEY
```

## 🧪 Testar Endpoints

### Usar Script de Teste

```bash
cd backend

# Configurar variáveis
export API_URL=http://localhost:8000
export API_KEY=sua-api-key-aqui

# Executar testes
python test_licenses.py
```

### Testar Manualmente

#### 1. Health Check

```bash
curl http://localhost:8000/health
```

#### 2. Gerar Licença

```bash
curl -X POST http://localhost:8000/api/generate-license \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sua-api-key" \
  -d '{
    "license_type": "1_month",
    "user_id": "test-user-1"
  }'
```

#### 3. Validar Licença

```bash
curl -X POST http://localhost:8000/api/validate-license \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sua-api-key" \
  -d '{
    "key": "PRO1M1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
    "device_id": "test-device-123"
  }'
```

## 📝 Notas Importantes

1. **Nunca commite LICENSE_SECRET_KEY no código**
2. **Use chaves diferentes para desenvolvimento e produção**
3. **Mantenha backup seguro da chave secreta**
4. **Rotacione a chave periodicamente em produção**
