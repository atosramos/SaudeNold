# 🔍 Diagnóstico de Acesso do Celular ao Backend

## 📱 Informações do Celular

- **IP do Celular:** `192.168.15.7`
- **IP do Backend:** `192.168.15.17:8000`

## ❌ Resultado da Verificação

### Nenhum Acesso Detectado

**Análise dos logs do backend:**
- ❌ **Nenhuma requisição do IP `192.168.15.7` encontrada**
- ✅ Apenas requisições de:
  - `10.1.0.1` (IP interno do Kubernetes - health checks)
  - `127.0.0.1` (localhost - testes do computador)

**Análise de conexões de rede:**
- ❌ **Nenhuma conexão estabelecida do IP `192.168.15.7`**
- ✅ Apenas conexões de `192.168.15.17` (próprio servidor) e `127.0.0.1` (localhost)

## 🔍 Possíveis Causas

### 1. Proxy de Porta Não Funcionando Corretamente

O proxy de porta pode não estar redirecionando corretamente as requisições do celular.

**Verificar:**
```powershell
netsh interface portproxy show all
```

**Deve mostrar:**
```
Listen on ipv4:             Connect to ipv4:
Address         Port        Address         Port
--------------- ----------  --------------- ----------
192.168.15.17   8000        127.0.0.1       8000
```

### 2. Firewall Bloqueando

O firewall do Windows pode estar bloqueando conexões do celular.

**Verificar:**
```powershell
Get-NetFirewallRule -DisplayName "*Backend*"
```

**Criar regra se necessário:**
```powershell
New-NetFirewallRule -DisplayName "Backend SaudeNold" `
  -Direction Inbound `
  -LocalPort 8000 `
  -Protocol TCP `
  -Action Allow
```

### 3. Port-Forward Não Escutando em Todos os Endereços

O port-forward pode estar escutando apenas em `localhost`, não em `192.168.15.17`.

**Verificar:**
```powershell
netstat -ano | Select-String ":8000" | Select-String "LISTENING"
```

**Deve mostrar:**
```
TCP    127.0.0.1:8000         0.0.0.0:0              LISTENING
TCP    192.168.15.17:8000     0.0.0.0:0              LISTENING
```

### 4. Celular Não Consegue Resolver o IP

O celular pode não conseguir alcançar o IP `192.168.15.17`.

**Testar do celular:**
- Abrir navegador no celular
- Acessar: `http://192.168.15.17:8000/health`
- Deve retornar: `{"status":"ok"}`

### 5. App Não Está Tentando Conectar

O app pode estar salvando apenas localmente devido a erros de conexão anteriores.

**Verificar logs do app:**
- Usar React Native Debugger
- Ou `adb logcat` para ver erros de conexão

## 🔧 Soluções

### Solução 1: Verificar e Corrigir Proxy de Porta

```powershell
# Verificar
netsh interface portproxy show all

# Se não estiver configurado, criar (como Administrador)
netsh interface portproxy add v4tov4 `
  listenaddress=192.168.15.17 `
  listenport=8000 `
  connectaddress=127.0.0.1 `
  connectport=8000
```

### Solução 2: Verificar e Corrigir Firewall

```powershell
# Verificar regras existentes
Get-NetFirewallRule -DisplayName "*Backend*"

# Criar regra se não existir (como Administrador)
New-NetFirewallRule -DisplayName "Backend SaudeNold" `
  -Direction Inbound `
  -LocalPort 8000 `
  -Protocol TCP `
  -Action Allow
```

### Solução 3: Reiniciar Port-Forward

```powershell
# Parar port-forwards antigos
Get-Process kubectl -ErrorAction SilentlyContinue | 
  Where-Object { $_.CommandLine -like "*port-forward*" } | 
  Stop-Process -Force

# Iniciar novo port-forward
kubectl port-forward -n saudenold svc/backend 8000:8000
```

### Solução 4: Testar Conectividade do Celular

**No celular:**
1. Abrir navegador
2. Acessar: `http://192.168.15.17:8000/health`
3. Se não funcionar, verificar:
   - Celular está na mesma rede Wi-Fi?
   - Firewall do roteador bloqueando?
   - IP do servidor está correto?

## 📊 Monitoramento em Tempo Real

Para monitorar quando o celular tentar acessar:

```powershell
# Ver logs em tempo real
kubectl logs -n saudenold deployment/backend -f

# Filtrar por IP do celular
kubectl logs -n saudenold deployment/backend -f | Select-String "192.168.15.7"
```

## 🧪 Teste Completo

### Passo 1: Verificar Configuração

```powershell
# 1. Proxy de porta
netsh interface portproxy show all

# 2. Firewall
Get-NetFirewallRule -DisplayName "*Backend*"

# 3. Port-forward
netstat -ano | Select-String ":8000" | Select-String "LISTENING"

# 4. Backend respondendo
Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
```

### Passo 2: Testar do Celular

1. **No navegador do celular:**
   - Acessar: `http://192.168.15.17:8000/health`
   - Deve retornar: `{"status":"ok"}`

2. **No app:**
   - Abrir app
   - Ir para Exames Médicos
   - Arrastar para baixo (pull-to-refresh)

### Passo 3: Monitorar Logs

```powershell
# Em outro terminal
kubectl logs -n saudenold deployment/backend -f | Select-String "192.168.15.7|POST|GET"
```

## 📝 O Que Esperar Quando Funcionar

**Nos logs você verá:**
```
INFO:     192.168.15.7:xxxxx - "GET /health HTTP/1.1" 200 OK
INFO:     192.168.15.7:xxxxx - "GET /api/medical-exams HTTP/1.1" 200 OK
INFO:     192.168.15.7:xxxxx - "POST /api/medical-exams HTTP/1.1" 201 Created
```

**Nas conexões de rede:**
```
LocalAddress    LocalPort RemoteAddress RemotePort    State
192.168.15.17   8000      192.168.15.7  xxxxx        Established
```

## ⚠️ Próximos Passos

1. ✅ Verificar proxy de porta
2. ✅ Verificar firewall
3. ✅ Testar do navegador do celular
4. ⏳ Monitorar logs quando o app tentar conectar
5. ⏳ Verificar se exames são criados no backend




