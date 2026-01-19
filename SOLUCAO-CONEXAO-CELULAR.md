# Solução: Celular Não Consegue Acessar Backend

## 🔍 Problema Identificado

O celular não está conseguindo se conectar ao backend porque:

1. **❌ Proxy de porta NÃO configurado**
   - Port-forward só escuta em `localhost` (127.0.0.1)
   - Celular não consegue acessar `192.168.15.17:8000`

2. **❌ Nenhuma requisição do celular chegando ao backend**
   - Logs mostram apenas requisições internas do Kubernetes
   - Nenhuma requisição do IP `192.168.15.x`

3. **⚠️ CORS pode não incluir IP do celular**
   - CORS atual: `http://localhost:8082,exp://*`
   - Não inclui explicitamente `http://192.168.15.17:8000`

## ✅ Solução Passo a Passo

### Passo 1: Configurar Proxy de Porta (OBRIGATÓRIO)

**Abra PowerShell como Administrador** e execute:

```powershell
# Permitir firewall
New-NetFirewallRule -DisplayName "Backend SaudeNold" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

# Criar proxy de porta
netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000

# Verificar
netsh interface portproxy show all
```

**Você deve ver:**
```
Listen on ipv4:             Connect to ipv4:
Address         Port        Address         Port
--------------- ----------  --------------- ----------
192.168.15.17   8000        127.0.0.1      8000
```

### Passo 2: Verificar CORS (Já foi atualizado)

O CORS já foi atualizado para incluir o IP do celular. O backend será reiniciado automaticamente.

### Passo 3: Testar Conexão do Celular

No navegador do celular (mesma rede Wi-Fi), acesse:
```
http://192.168.15.17:8000/health
```

**Deve retornar:** `{"status":"ok"}`

Se não funcionar:
- Verifique se o port-forward está rodando
- Verifique se o firewall não está bloqueando
- Verifique se celular e computador estão na mesma rede Wi-Fi

### Passo 4: Verificar no App

1. Abra o app no celular
2. Vá para a tela de detalhes do exame
3. Arraste para baixo (pull to refresh)
4. Agora deve sincronizar corretamente

## 🔧 Melhorias Implementadas

### 1. Pull-to-Refresh Melhorado

O `onRefresh` agora faz:
1. `syncToBackend()` - Envia exames pendentes
2. `syncFromBackend()` - Busca atualizações
3. `loadExam()` - Recarrega o exame atual

### 2. Logs Melhorados

O interceptor do axios agora loga:
- Erros de conexão (ECONNREFUSED, ENOTFOUND, ETIMEDOUT)
- Erros de autenticação (401)
- Erros do servidor (500+)
- URLs e baseURLs para debug

### 3. CORS Atualizado

CORS agora inclui:
- `http://192.168.15.17:8000`
- `http://192.168.15.*` (qualquer IP da rede)

## 📊 Como Verificar se Está Funcionando

### No Backend (PowerShell):

```powershell
# Ver requisições do celular chegando
kubectl logs -n saudenold deployment/backend --tail=50 -f | Select-String "192.168.15"
```

### No Celular:

1. Abra o app
2. Vá para Exames Médicos
3. Arraste para baixo
4. Verifique se o status atualiza

### Verificar Logs do App:

No console do Expo/React Native, você deve ver:
- `❌ Erro de conexão com backend:` (se não conseguir conectar)
- Ou requisições sendo feitas normalmente

## ⚠️ Importante

**O proxy de porta é OBRIGATÓRIO!** Sem ele, o celular não consegue acessar o backend, mesmo que:
- Estejam na mesma rede Wi-Fi
- O port-forward esteja rodando
- O backend esteja funcionando

O port-forward só escuta em `localhost`, não no IP da rede. O proxy redireciona requisições de `192.168.15.17:8000` para `localhost:8000`.

## 🔄 Após Configurar

1. **Teste no navegador do celular:**
   ```
   http://192.168.15.17:8000/health
   ```

2. **Abra o app e teste:**
   - Arraste para baixo na tela de exames
   - Deve sincronizar e atualizar

3. **Verifique logs:**
   ```powershell
   kubectl logs -n saudenold deployment/backend -f
   ```
   Deve ver requisições chegando do IP do celular.

## 🧹 Limpeza (Quando não precisar mais)

```powershell
# Remover proxy
netsh interface portproxy delete v4tov4 listenaddress=192.168.15.17 listenport=8000

# Remover firewall (opcional)
Remove-NetFirewallRule -DisplayName "Backend SaudeNold"
```




