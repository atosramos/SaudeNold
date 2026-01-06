# Verificação de Acesso do Celular ao Backend

## 🔍 Análise Realizada

### Status da Conexão

1. **Port-forward:** ✅ ATIVO
   - Escutando em `localhost:8000` e `192.168.15.17:8000`
   - Conexões estabelecidas detectadas

2. **Proxy de porta:** ✅ CONFIGURADO
   - `192.168.15.17:8000 → 127.0.0.1:8000`

3. **Backend:** ✅ RODANDO
   - Pod em status `Running`
   - Health check respondendo

### ❌ Problema Identificado

**API_KEY no Kubernetes Secret estava VAZIA!**

O secret `backend-secret` tinha:
```yaml
API_KEY: ""  # VAZIO!
```

Isso causava:
- ❌ Todas as requisições do celular sendo rejeitadas com 401 Unauthorized
- ❌ Nenhum exame sendo criado no backend
- ❌ Logs mostrando "Tentativa de acesso com API key inválida"

### ✅ Correção Aplicada

1. **API_KEY atualizada no secret:**
   ```powershell
   kubectl create secret generic backend-secret -n saudenold \
     --from-literal=API_KEY="JDZYc50zDSlsvev8ZzOJXXowHg_iqNJW8fKx49YgcLo" \
     --from-literal=DATABASE_PASSWORD="saudenold123" \
     --dry-run=client -o yaml | kubectl apply -f -
   ```

2. **Backend reiniciado:**
   ```powershell
   kubectl rollout restart deployment/backend -n saudenold
   ```

### 📊 Verificação de Acesso

#### Logs do Backend

**Antes da correção:**
- Apenas requisições de `10.1.0.1` (IP interno do Kubernetes)
- Apenas requisições de `127.0.0.1` (localhost)
- Nenhuma requisição de `192.168.15.x` (celular)
- Erros 401 Unauthorized

**Após a correção:**
- ✅ Backend aceita requisições com a API key correta
- ✅ Pronto para receber requisições do celular

#### Conexões de Rede

- ✅ Porta 8000 escutando em `192.168.15.17`
- ✅ Conexões estabelecidas detectadas
- ⚠️ Nenhuma conexão específica do celular identificada (pode ser que o app ainda não tenha tentado após a correção)

## 🧪 Como Testar Agora

### 1. No Celular

1. **Abrir o app**
2. **Ir para a tela de Exames Médicos**
3. **Arrastar para baixo** (pull-to-refresh) para sincronizar
4. **Tentar fazer upload de um novo PDF/imagem**

### 2. Verificar no Backend

```powershell
# Ver logs em tempo real
kubectl logs -n saudenold deployment/backend -f

# Verificar exames
.\verificar-exames-backend.ps1
```

### 3. Verificar Conexões

```powershell
# Ver conexões estabelecidas
Get-NetTCPConnection -LocalPort 8000 -State Established

# Ver logs com requisições do celular
kubectl logs -n saudenold deployment/backend --since=5m | Select-String "192.168.15"
```

## 📝 O Que Esperar

### Se o Celular Consegue Acessar:

**Nos logs do backend você verá:**
```
INFO:     192.168.15.x:xxxxx - "GET /health HTTP/1.1" 200 OK
INFO:     192.168.15.x:xxxxx - "POST /api/medical-exams HTTP/1.1" 201 Created
```

**Nas conexões de rede:**
- Conexões estabelecidas de IP `192.168.15.x` (diferente de `192.168.15.17`)

**No banco de dados:**
- Novos exames sendo criados
- Status mudando de `pending` para `processing` e depois `completed`

### Se Ainda Não Consegue:

1. **Verificar se o port-forward está rodando:**
   ```powershell
   .\garantir-port-forward.ps1
   ```

2. **Verificar se o proxy de porta está configurado:**
   ```powershell
   netsh interface portproxy show all
   ```

3. **Verificar firewall:**
   ```powershell
   Get-NetFirewallRule -DisplayName "*Backend*"
   ```

4. **Verificar logs do app no celular:**
   - Usar React Native Debugger ou `adb logcat` para ver erros de conexão

## 🔧 Configuração Completa Necessária

Para o celular acessar o backend, você precisa de:

1. ✅ **Port-forward ativo** - `kubectl port-forward -n saudenold svc/backend 8000:8000`
2. ✅ **Proxy de porta configurado** - `netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000`
3. ✅ **Firewall permitindo** - Regra criada para porta 8000
4. ✅ **CORS configurado** - Backend aceita requisições do IP do celular
5. ✅ **API Key configurada** - Tanto no backend (secret) quanto no `app.json` ✅ **CORRIGIDO**

## 📌 Próximos Passos

1. ✅ API Key corrigida no Kubernetes
2. ✅ Backend reiniciado
3. ⏳ **Aguardar teste do celular**
4. ⏳ Verificar logs após tentativa do celular
5. ⏳ Confirmar se exames estão sendo criados



