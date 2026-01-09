# Guia de Configuração de Segurança - SaudeNold

## 🔐 Configuração Inicial

### 1. Gerar API Key Segura

A API Key é necessária para autenticar todas as requisições à API. Gere uma chave segura:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Exemplo de saída:
```
xK9mP2qR7vT4wY8zA1bC3dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5zA6bC7dE8f
```

### 2. Configurar Backend (Docker Compose)

Crie um arquivo `.env` na pasta `backend/`:

```bash
cd SaudeNold/backend
cat > .env << EOF
DATABASE_URL=postgresql://saudenold:saudenold123@postgres:5432/saudenold
API_KEY=xK9mP2qR7vT4wY8zA1bC3dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5zA6bC7dE8f
CORS_ORIGINS=http://localhost:8082,exp://*
EOF
```

**⚠️ IMPORTANTE:** 
- Substitua `xK9mP2qR7vT4wY8zA1bC3dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5zA6bC7dE8f` pela sua API Key gerada
- Use uma senha forte para o banco de dados em produção
- Adicione `.env` ao `.gitignore` para não commitar credenciais

### 3. Configurar Frontend (React Native/Expo)

Atualize o arquivo `app.json` com a API Key:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://localhost:8000",
      "apiKey": "xK9mP2qR7vT4wY8zA1bC3dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5zA6bC7dE8f"
    }
  }
}
```

**⚠️ ATENÇÃO:** 
- Para produção, use variáveis de ambiente do Expo
- Não commite a API Key no código
- Use `EXPO_PUBLIC_API_KEY` em variáveis de ambiente

### 4. Configurar Kubernetes

#### 4.1. Gerar Secret do Backend

```bash
# Gerar API Key
API_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")

# Criar Secret
kubectl create secret generic backend-secret \
  --from-literal=API_KEY="$API_KEY" \
  --from-literal=DATABASE_PASSWORD='senha-forte-aqui' \
  --namespace=saudenold
```

#### 4.2. Verificar Secrets

```bash
kubectl get secrets -n saudenold
kubectl describe secret backend-secret -n saudenold
```

#### 4.3. Atualizar ConfigMap de CORS (se necessário)

```bash
kubectl edit configmap backend-config -n saudenold
```

Adicione os domínios permitidos em `CORS_ORIGINS`:
```yaml
data:
  CORS_ORIGINS: "https://seu-dominio.com,exp://*"
```

## 🧪 Testar Autenticação

### Teste Manual com cURL

```bash
# Sem API Key (deve falhar)
curl -X GET http://localhost:8000/api/medications

# Com API Key (deve funcionar)
curl -X GET http://localhost:8000/api/medications \
  -H "Authorization: Bearer sua-api-key-aqui"
```

### Teste no Frontend

O frontend deve incluir automaticamente o header `Authorization` em todas as requisições. Verifique no console do navegador se não há erros 401 (Unauthorized).

## 🔄 Rotação de API Key

### Quando Rotacionar

- A cada 90 dias (recomendado)
- Após suspeita de comprometimento
- Após saída de desenvolvedores

### Como Rotacionar

1. **Gerar nova API Key:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Atualizar Backend:**
   - Docker Compose: Atualizar `.env`
   - Kubernetes: Atualizar Secret
     ```bash
     kubectl create secret generic backend-secret \
       --from-literal=API_KEY="nova-api-key" \
       --namespace=saudenold \
       --dry-run=client -o yaml | kubectl apply -f -
     ```

3. **Atualizar Frontend:**
   - Atualizar `app.json` ou variáveis de ambiente
   - Rebuild do app

4. **Reiniciar serviços:**
   ```bash
   # Docker Compose
   docker-compose restart backend
   
   # Kubernetes
   kubectl rollout restart deployment/backend -n saudenold
   ```

## 🛡️ Boas Práticas

### Desenvolvimento

- ✅ Use `.env` para credenciais locais
- ✅ Adicione `.env` ao `.gitignore`
- ✅ Use API Keys diferentes para dev/staging/prod
- ✅ Não commite credenciais no código

### Produção

- ✅ Use gerenciador de secrets (Vault, AWS Secrets Manager)
- ✅ Rotacione API Keys regularmente
- ✅ Monitore tentativas de acesso não autorizado
- ✅ Use HTTPS/TLS em todas as conexões
- ✅ Implemente rate limiting adequado
- ✅ Configure CORS apenas para domínios necessários

## 📝 Checklist de Segurança

Antes de fazer deploy em produção, verifique:

- [ ] API Key gerada e configurada
- [ ] Senha do banco de dados alterada
- [ ] CORS configurado apenas para domínios permitidos
- [ ] HTTPS/TLS configurado
- [ ] Secrets do Kubernetes criados
- [ ] `.env` não está no repositório
- [ ] Logs de segurança configurados
- [ ] Monitoramento de segurança ativo
- [ ] Backup do banco de dados configurado

## 🆘 Troubleshooting

### Erro 401 (Unauthorized)

**Causa:** API Key ausente ou inválida

**Solução:**
1. Verificar se a API Key está configurada no backend
2. Verificar se o header `Authorization: Bearer <key>` está sendo enviado
3. Verificar logs do backend para ver tentativas de acesso

### Erro 429 (Too Many Requests)

**Causa:** Rate limiting ativo

**Solução:**
- Aguardar alguns minutos
- Verificar limites configurados em `backend/main.py`
- Ajustar limites se necessário para seu caso de uso

### CORS Error no Frontend

**Causa:** Origin não permitida

**Solução:**
1. Verificar `CORS_ORIGINS` no backend
2. Adicionar o domínio/origin necessário
3. Reiniciar o backend

## 📚 Referências

- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)















