# 🔧 Solução: Celular Não Consegue Acessar Backend

## ❌ Problema

**Mensagem no celular:** "Não é possível acessar"  
**Causa:** Regras de firewall do Docker Desktop estão bloqueando a porta 8000

## ✅ Solução (Execute como Administrador)

### Passo 1: Abrir PowerShell como Administrador

1. Pressione `Windows + X`
2. Selecione **"Windows PowerShell (Admin)"** ou **"Terminal (Admin)"**
3. Confirme a permissão de Administrador

### Passo 2: Navegar até a pasta do projeto

```powershell
cd C:\Users\lucia\Projetos\Saude\SaudeNold
```

### Passo 3: Executar script de correção

```powershell
.\resolver-acesso-celular.ps1
```

Este script irá:
- ✅ Remover regras bloqueando do Docker
- ✅ Criar regra permitindo porta 8000
- ✅ Verificar port-forward
- ✅ Verificar proxy de porta
- ✅ Testar backend

### Passo 4: Se ainda não funcionar, desabilitar firewall temporariamente

```powershell
.\resolver-acesso-celular.ps1 -DisableFirewall
```

⚠️ **IMPORTANTE:** Reabilite o firewall depois!

```powershell
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

## 🔍 Verificação Manual (Como Administrador)

Se preferir fazer manualmente:

### 1. Remover regras bloqueando do Docker

```powershell
Get-NetFirewallRule -DisplayName "*Docker*Backend*" | 
  Where-Object { $_.Action -eq "Block" } | 
  Remove-NetFirewallRule
```

### 2. Criar regra permitindo

```powershell
New-NetFirewallRule -DisplayName "Backend SaudeNold - Porta 8000" `
  -Direction Inbound `
  -LocalPort 8000 `
  -Protocol TCP `
  -Action Allow `
  -Profile Any
```

### 3. Verificar proxy de porta

```powershell
netsh interface portproxy show all
```

Se não estiver configurado:

```powershell
netsh interface portproxy add v4tov4 `
  listenaddress=192.168.15.17 `
  listenport=8000 `
  connectaddress=127.0.0.1 `
  connectport=8000
```

## 🧪 Testar Após Correção

### 1. Do Celular (Navegador)

1. Abrir navegador no celular
2. Acessar: `http://192.168.15.17:8000/health`
3. **Deve retornar:** `{"status":"ok"}`

### 2. Do Celular (App)

1. Abrir app
2. Ir para **Exames Médicos**
3. **Arrastar para baixo** (pull-to-refresh)
4. Tentar fazer upload de um PDF/imagem

### 3. Monitorar Logs

Em outro terminal (não precisa ser Admin):

```powershell
kubectl logs -n saudenold deployment/backend -f | Select-String "192.168.15.7"
```

Quando o celular acessar, você verá:
```
INFO: 192.168.15.7:xxxxx - "GET /health HTTP/1.1" 200 OK
INFO: 192.168.15.7:xxxxx - "POST /api/medical-exams HTTP/1.1" 201 Created
```

## 📊 Status Atual

- ✅ **Backend:** Respondendo em `192.168.15.17:8000`
- ✅ **Port-forward:** Ativo
- ✅ **Proxy de porta:** Configurado
- ❌ **Firewall:** Regras do Docker bloqueando (precisa Admin para corrigir)

## ⚠️ Importante

**O problema é o firewall bloqueando.** Todas as outras configurações estão corretas:
- Backend está respondendo
- Port-forward está ativo
- Proxy de porta está configurado
- Celular está na rede

**Apenas o firewall precisa ser ajustado como Administrador.**

## 🔄 Se Ainda Não Funcionar

1. **Verificar roteador:**
   - Pode ter firewall bloqueando
   - Verificar configurações de rede

2. **Verificar se celular está na mesma rede:**
   - IP do celular: `192.168.15.7`
   - IP do servidor: `192.168.15.17`
   - Ambos devem estar em `192.168.15.x`

3. **Desabilitar firewall temporariamente:**
   ```powershell
   # Como Administrador
   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
   ```
   ⚠️ **Teste e reabilite depois!**

4. **Verificar logs do backend:**
   ```powershell
   kubectl logs -n saudenold deployment/backend -f
   ```
   Procure por erros ou tentativas de acesso

## 📝 Comandos Rápidos

### Executar correção (como Admin)
```powershell
cd C:\Users\lucia\Projetos\Saude\SaudeNold
.\resolver-acesso-celular.ps1
```

### Monitorar logs
```powershell
kubectl logs -n saudenold deployment/backend -f | Select-String "192.168.15.7"
```

### Verificar status
```powershell
.\diagnosticar-acesso-celular.ps1
```




