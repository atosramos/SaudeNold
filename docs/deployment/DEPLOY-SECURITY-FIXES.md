# 🚀 Deploy das Correções de Segurança

## ✅ Status do PR

O Pull Request foi criado com sucesso no branch `security-audit-fixes`.

**Link do PR:** https://github.com/atosramos/SaudeNold/pull/new/security-audit-fixes

## 📋 Checklist de Deploy

### 1. ✅ Branch Criado e Enviado
- [x] Branch `security-audit-fixes` criado
- [x] Commits realizados
- [x] Branch enviado para o repositório remoto

### 2. ✅ Imagem Docker Construída
- [x] Imagem `saudenold-backend:latest` construída com sucesso
- [x] Dependências de segurança instaladas (slowapi, python-multipart)

### 3. ✅ Configurações Kubernetes Aplicadas
- [x] Secret `backend-secret` criado
- [x] ConfigMap atualizado (credenciais removidas)
- [x] Deployment atualizado para usar Secrets
- [x] Kustomization atualizado

### 4. ⚠️ Deployment Reiniciado
- [x] Deployment reiniciado
- [ ] Aguardando rollout completo (pode levar alguns minutos)

## 🔐 Configuração da API Key

### Gerar API Key

**Windows (PowerShell):**
```powershell
# Se tiver Python instalado
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Ou use o script Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**Linux/Mac:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Atualizar Secret do Kubernetes

```bash
# Substitua YOUR_API_KEY pela chave gerada
kubectl create secret generic backend-secret \
  --from-literal=API_KEY="YOUR_API_KEY" \
  --from-literal=DATABASE_PASSWORD="senha-forte" \
  --namespace=saudenold \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Atualizar Frontend

Atualize o arquivo `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://localhost:8000",
      "apiKey": "YOUR_API_KEY_HERE"
    }
  }
}
```

## 🔄 Comandos para Atualizar

### Rebuild e Deploy Completo

**Windows (PowerShell):**
```powershell
.\update-security-fixes.ps1
```

**Linux/Mac:**
```bash
chmod +x update-k8s-security.sh
./update-k8s-security.sh
```

### Atualização Manual

1. **Rebuild da imagem:**
   ```bash
   cd backend
   docker build -t saudenold-backend:latest .
   cd ..
   ```

2. **Aplicar configurações K8s:**
   ```bash
   cd k8s
   kubectl apply -k .
   cd ..
   ```

3. **Reiniciar deployment:**
   ```bash
   kubectl rollout restart deployment/backend -n saudenold
   kubectl rollout status deployment/backend -n saudenold
   ```

4. **Verificar status:**
   ```bash
   kubectl get pods -n saudenold
   kubectl logs -f deployment/backend -n saudenold
   ```

## 🧪 Testar após Deploy

### 1. Teste sem autenticação (deve falhar)
```bash
curl http://localhost:8000/api/medications
# Esperado: 401 Unauthorized
```

### 2. Teste com autenticação (deve funcionar)
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:8000/api/medications
# Esperado: 200 OK com lista de medicamentos
```

### 3. Teste health check (deve funcionar sem auth)
```bash
curl http://localhost:8000/health
# Esperado: {"status":"ok"}
```

### 4. Teste rate limiting
```bash
# Fazer múltiplas requisições rapidamente
for i in {1..110}; do curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:8000/api/medications; done
# Esperado: Após 100 requisições, retornar 429 Too Many Requests
```

## 📊 Verificar Logs de Segurança

```bash
# Ver logs do backend
kubectl logs -f deployment/backend -n saudenold

# Filtrar por eventos de segurança
kubectl logs -f deployment/backend -n saudenold | grep -i "security\|unauthorized\|warning"
```

## ⚠️ Troubleshooting

### Pods em estado Pending

```bash
# Verificar eventos
kubectl describe pod <pod-name> -n saudenold

# Verificar recursos disponíveis
kubectl top nodes
kubectl top pods -n saudenold
```

### Erro 401 Unauthorized

1. Verificar se a API Key está configurada:
   ```bash
   kubectl get secret backend-secret -n saudenold -o jsonpath='{.data.API_KEY}' | base64 -d
   ```

2. Verificar se o deployment está usando o Secret:
   ```bash
   kubectl describe deployment backend -n saudenold | grep -A 5 "Environment"
   ```

### Erro 429 Too Many Requests

Isso é esperado! O rate limiting está funcionando. Aguarde alguns minutos ou ajuste os limites em `backend/main.py`.

## 📝 Próximos Passos

1. [ ] Fazer merge do PR após revisão
2. [ ] Gerar API Key de produção
3. [ ] Configurar Secrets de produção
4. [ ] Atualizar frontend com API Key
5. [ ] Testar todas as funcionalidades
6. [ ] Monitorar logs de segurança
7. [ ] Configurar HTTPS/TLS (recomendado)

## 🔗 Links Úteis

- [SECURITY-AUDIT.md](./SECURITY-AUDIT.md) - Documentação completa da auditoria
- [SECURITY-SETUP.md](./SECURITY-SETUP.md) - Guia de configuração
- [SECURITY-FIXES-SUMMARY.md](./SECURITY-FIXES-SUMMARY.md) - Resumo das correções

---

**Última atualização:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
















