# 🔧 Correção de Acesso do Celular ao Backend

## ❌ Problema Identificado

**IP do Celular:** `192.168.15.7`  
**Status:** Porta 8000 NÃO acessível do celular

### Causa Raiz

Regras de firewall do **Docker Desktop** estão **BLOQUEANDO** conexões na porta 8000, mesmo tendo uma regra permitindo.

## ✅ Solução Aplicada

### 1. Desabilitar Regras Bloqueando do Docker

```powershell
# Desabilitar regras do Docker que estão bloqueando
Get-NetFirewallRule -DisplayName "*Docker*Backend*" | 
  Where-Object { $_.Action -eq "Block" } | 
  Disable-NetFirewallRule
```

### 2. Verificar Regras de Firewall

**Regras ativas:**
- ✅ `Backend SaudeNold` - **Allow** (permitindo)
- ❌ `Docker Desktop Backend` - **Block** (bloqueando) - **DESABILITADA**

## 🧪 Como Testar

### 1. Do Celular (Navegador)

1. Abrir navegador no celular
2. Acessar: `http://192.168.15.17:8000/health`
3. **Deve retornar:** `{"status":"ok"}`

### 2. Do Celular (App)

1. Abrir app
2. Ir para **Exames Médicos**
3. **Arrastar para baixo** (pull-to-refresh) para sincronizar
4. Tentar fazer upload de um novo PDF/imagem

### 3. Monitorar Logs

```powershell
# Ver logs em tempo real
kubectl logs -n saudenold deployment/backend -f | Select-String "192.168.15.7"
```

## 📊 O Que Esperar Quando Funcionar

### Nos Logs do Backend

```
INFO:     192.168.15.7:xxxxx - "GET /health HTTP/1.1" 200 OK
INFO:     192.168.15.7:xxxxx - "GET /api/medical-exams HTTP/1.1" 200 OK
INFO:     192.168.15.7:xxxxx - "POST /api/medical-exams HTTP/1.1" 201 Created
```

### Nas Conexões de Rede

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Established | 
  Where-Object { $_.RemoteAddress -eq "192.168.15.7" }
```

**Deve mostrar:**
```
LocalAddress    LocalPort RemoteAddress RemotePort    State
192.168.15.17   8000      192.168.15.7  xxxxx        Established
```

## 🔍 Se Ainda Não Funcionar

### Verificar Configuração Completa

Execute o script de diagnóstico:
```powershell
.\diagnosticar-acesso-celular.ps1
```

### Verificar Manualmente

1. **Proxy de porta:**
   ```powershell
   netsh interface portproxy show all
   ```
   Deve mostrar: `192.168.15.17:8000 → 127.0.0.1:8000`

2. **Port-forward:**
   ```powershell
   netstat -ano | Select-String ":8000" | Select-String "LISTENING"
   ```
   Deve mostrar escutando em `127.0.0.1:8000` e `192.168.15.17:8000`

3. **Firewall:**
   ```powershell
   Get-NetFirewallRule -DisplayName "*Backend*" | 
     Where-Object { $_.Enabled -eq $true }
   ```
   Deve ter pelo menos uma regra **Allow** habilitada

4. **Backend respondendo:**
   ```powershell
   Invoke-WebRequest -Uri "http://192.168.15.17:8000/health" -UseBasicParsing
   ```
   Deve retornar status 200

### Outras Possíveis Causas

1. **Roteador bloqueando:**
   - Verificar configurações do roteador
   - Verificar se há firewall no roteador

2. **Celular em rede diferente:**
   - Verificar se celular está na mesma rede Wi-Fi
   - Verificar IP do celular: `192.168.15.7`

3. **App com cache antigo:**
   - Pode precisar rebuild do APK
   - Verificar `app.json` tem o IP correto: `192.168.15.17:8000`

## 📝 Comandos Úteis

### Verificar Status Completo

```powershell
# Diagnóstico completo
.\diagnosticar-acesso-celular.ps1

# Ver logs em tempo real
kubectl logs -n saudenold deployment/backend -f

# Ver conexões estabelecidas
Get-NetTCPConnection -LocalPort 8000 -State Established

# Testar conectividade
Test-NetConnection -ComputerName 192.168.15.7 -Port 8000
```

### Garantir Port-Forward Ativo

```powershell
.\garantir-port-forward.ps1
```

## ✅ Checklist Final

- [x] Proxy de porta configurado
- [x] Port-forward ativo
- [x] Regra de firewall permitindo
- [x] Regras bloqueando do Docker desabilitadas
- [ ] Celular consegue acessar via navegador
- [ ] App consegue sincronizar
- [ ] Exames sendo criados no backend




