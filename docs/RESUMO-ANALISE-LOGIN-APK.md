# 📋 Resumo: Análise do Erro de Login no APK

## 🔴 Problema

**Sintoma:** Ao tentar fazer login no APK instalado no celular, aparece "Erro nao foi possivel entrar" e **não há logs no backend** indicando a tentativa.

**Observação:** O endpoint `/health` funciona, indicando que a conexão básica está OK.

## ⚠️ PROBLEMA CRÍTICO IDENTIFICADO

**Inconsistência entre Proxy de Porta e URL do app.json:**

- **Proxy de porta:** `192.168.15.17:8000 → 127.0.0.1:8000`
- **URL no app.json:** `http://192.168.0.101:8000`

**O celular tenta acessar `192.168.0.101:8000`, mas o proxy só redireciona `192.168.15.17:8000`!**

**Solução:** Alinhar o IP do `app.json` com o IP do proxy de porta, ou configurar proxy para o IP do `app.json`.

## 🔍 Principais Descobertas

### 1. Configuração do app.json

**Arquivo:** `SaudeNold/app.json`
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.0.101:8000",
      "apiKey": ""
    }
  }
}
```

**Problemas:**
- ⚠️ URL pode estar incorreta (documentação menciona `192.168.15.17`)
- ⚠️ API_KEY vazia (OK para login, mas pode causar problemas em outras requisições)

### 2. Fluxo de Autenticação

- **Endpoint de login NÃO requer API key** - É um endpoint público
- O app tenta usar API key se disponível, mas pode funcionar sem ela para login
- A requisição pode estar falhando antes de chegar ao backend

### 3. Possíveis Causas

#### ⚠️ MAIS PROVÁVEL: Requisição não está chegando ao backend

**Razões possíveis:**
1. **URL incorreta no app.json** - IP pode ter mudado ou estar errado
2. **Problema de rede/firewall** - Firewall pode estar bloqueando requisições POST (mas GET `/health` passa)
3. **Port-forward não escutando no IP correto** - Pode estar apenas em `127.0.0.1` e não em `192.168.x.x`
4. **Proxy de porta não configurado** - Necessário para redirecionar de `192.168.x.x` para `127.0.0.1`

## ✅ Soluções Recomendadas

### 1. Verificar e Corrigir Configuração

**Execute o script de diagnóstico:**
```powershell
cd SaudeNold
.\scripts\testing\diagnosticar-login-apk.ps1
```

**Verificar IP atual:**
```powershell
ipconfig
# Procurar por "IPv4 Address"
```

**Atualizar app.json (IP deve corresponder ao proxy de porta):**
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.15.17:8000",  // Usar IP do proxy de porta
      "apiKey": ""
    }
  }
}
```

**OU configurar proxy de porta para o IP do app.json:**
```powershell
# Como Administrador
netsh interface portproxy add v4tov4 listenaddress=192.168.0.101 listenport=8000 connectaddress=127.0.0.1 connectport=8000
```

### 2. Verificar Configuração de Rede

**Garantir port-forward ativo:**
```powershell
kubectl port-forward -n saudenold svc/backend 8000:8000
```

**Configurar proxy de porta (como Administrador):**
```powershell
netsh interface portproxy add v4tov4 `
  listenaddress=[IP_DA_MAQUINA] `
  listenport=8000 `
  connectaddress=127.0.0.1 `
  connectport=8000
```

**Verificar firewall:**
```powershell
Get-NetFirewallRule -DisplayName "*Backend*"
```

### 3. Rebuild do APK

**Após alterar app.json, é OBRIGATÓRIO rebuildar:**
```powershell
cd SaudeNold
.\scripts\build\build-apk.ps1
```

**Importante:** As configurações do `app.json` são compiladas no build. Mudanças não aparecem sem rebuild.

### 4. Testar do Celular

**1. Testar no navegador do celular:**
```
http://[IP_DA_MAQUINA]:8000/health
```
Deve retornar: `{"status":"ok"}`

**2. Se funcionar no navegador mas não no app:**
- Problema está no app (configuração, cache, etc.)
- Desinstalar e reinstalar o APK

**3. Se não funcionar nem no navegador:**
- Problema de rede/firewall
- Verificar port-forward e proxy de porta

### 5. Monitorar Logs

**Durante tentativa de login, monitorar:**
```powershell
# Terminal 1: Logs do backend
kubectl logs -n saudenold deployment/backend -f | Select-String "login|POST.*auth"

# Terminal 2: Logs do app (via ADB)
adb logcat | Select-String "SaudeNold|API|login|error"
```

## 📊 Checklist de Diagnóstico

- [ ] Verificar IP atual da máquina
- [ ] Verificar IP configurado no `app.json`
- [ ] Verificar se port-forward está ativo
- [ ] Verificar se proxy de porta está configurado
- [ ] Verificar regras de firewall
- [ ] Testar `/health` do navegador do celular
- [ ] Rebuild do APK após correções
- [ ] Desinstalar e reinstalar APK no celular
- [ ] Monitorar logs durante tentativa de login

## 🔗 Documentação Completa

Para análise detalhada, consulte:
- `docs/troubleshooting/ANALISE-ERRO-LOGIN-APK.md` - Análise técnica completa
- `CONFIGURAR-BACKEND-MOBILE.md` - Configuração de backend para mobile
- `VERIFICACAO-ACESSO-CELULAR.md` - Verificação de acesso do celular

## 🚨 Pontos Críticos

1. **URL no app.json deve usar IP da máquina, não localhost**
2. **APK deve ser rebuildado após qualquer mudança no app.json**
3. **Port-forward deve estar ativo e escutando no IP correto**
4. **Proxy de porta deve estar configurado (como Administrador)**
5. **Firewall deve permitir conexões na porta 8000**

## 📝 Próximos Passos

1. ✅ Executar script de diagnóstico
2. ✅ Corrigir URL no `app.json` se necessário
3. ✅ Verificar e corrigir configuração de rede
4. ✅ Rebuild do APK
5. ✅ Testar login novamente
6. ✅ Se ainda não funcionar, verificar logs do app via ADB
