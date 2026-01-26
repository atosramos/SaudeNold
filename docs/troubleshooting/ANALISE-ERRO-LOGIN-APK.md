# 🔍 Análise: Erro de Login no APK Instalado

## 📋 Problema Reportado

**Sintoma:** Ao tentar fazer login no sistema usando o APK instalado no celular, aparece a mensagem "Erro nao foi possivel entrar" e **não há logs no backend** indicando a tentativa.

**Observação:** O endpoint `/health` indica OK, o que significa que a conexão básica funciona.

## 🔎 Análise Técnica

### 1. Configuração Atual do App

**Arquivo:** `app.json`
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

**Problemas Identificados:**
- ⚠️ **API_KEY está vazia** (`""`)
- ⚠️ **URL pode estar incorreta** - Documentação menciona `192.168.15.17` mas app.json tem `192.168.0.101`

### 2. Fluxo de Autenticação

#### No App (Frontend)

1. **Arquivo:** `services/api.js`
   - Lê `API_URL` de `Constants.expoConfig?.extra?.apiUrl` ou `process.env.EXPO_PUBLIC_API_URL`
   - Lê `API_KEY` de `Constants.expoConfig?.extra?.apiKey` ou `process.env.EXPO_PUBLIC_API_KEY`
   - Para Android, substitui `localhost` por `10.0.2.2` (apenas para emulador)
   - Se `API_KEY` estiver vazia e estiver em modo DEV, tenta buscar do backend via `/debug/api-key-info`

2. **Interceptor de Requisições:**
   - Adiciona header `Authorization: Bearer ${token}` se houver token de autenticação
   - Se não houver token, usa `API_KEY` se disponível
   - Se `API_KEY` estiver vazia e estiver em DEV, tenta buscar runtime API key

3. **Arquivo:** `app/auth/login.js`
   - Chama `loginUser(email, password)` de `services/auth.js`
   - `loginUser` faz `api.post('/api/auth/login', { email, password, device })`
   - Em caso de erro, mostra mensagem via `resolveAuthError()`
   - Mensagem padrão: "Nao foi possivel entrar"

#### No Backend

1. **Endpoint:** `POST /api/auth/login`
   - **NÃO requer API key** (não tem `Depends(verify_api_key)`)
   - Requer apenas email e senha válidos
   - Tem rate limiting: `5/15minute`
   - Retorna JWT token se login for bem-sucedido

2. **CORS:**
   - Permite origens via regex: `^https?://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$`
   - Isso deveria permitir qualquer IP `192.168.x.x`

### 3. Possíveis Causas do Problema

#### Causa 1: Requisição Não Está Chegando ao Backend ⚠️ MAIS PROVÁVEL

**Sintomas:**
- Nenhum log no backend
- `/health` funciona (conexão básica OK)
- Login falha silenciosamente

**Possíveis Razões:**
1. **URL incorreta no app.json**
   - App está tentando conectar em `192.168.0.101:8000`
   - Mas o backend pode estar em `192.168.15.17:8000` (conforme documentação)
   - Ou o IP mudou

2. **Problema de rede/firewall**
   - Firewall bloqueando requisições POST (mas GET `/health` passa)
   - Port-forward não está escutando em todos os endereços
   - Proxy de porta não configurado corretamente

3. **Timeout na requisição**
   - Requisição de login pode estar demorando mais que o timeout (10s)
   - Backend pode estar lento para processar

4. **Erro antes de enviar a requisição**
   - Erro de validação no app antes de enviar
   - Problema com `getDeviceInfo()` que é enviado no body

#### Causa 2: Erro de CORS

**Sintomas:**
- Requisição é bloqueada pelo navegador/app antes de chegar ao backend
- Não aparece nos logs do backend

**Análise:**
- CORS tem regex que permite `192.168.x.x`, então deveria funcionar
- Mas pode haver problema se o app estiver usando origem diferente

#### Causa 3: Erro de Autenticação Silencioso

**Sintomas:**
- Requisição chega mas falha antes de logar
- Backend pode estar rejeitando por algum motivo

**Análise:**
- Endpoint de login não requer API key, então não deveria ser isso
- Mas pode haver problema com headers ou formato da requisição

## ⚠️ PROBLEMA CRÍTICO IDENTIFICADO

**Inconsistência entre Proxy de Porta e URL do app.json:**

- **Proxy de porta configurado:** `192.168.15.17:8000 → 127.0.0.1:8000`
- **URL no app.json:** `http://192.168.0.101:8000`

**Isso significa que:**
- O celular tenta acessar `192.168.0.101:8000`
- Mas o proxy só redireciona requisições para `192.168.15.17:8000`
- Resultado: requisições do celular não chegam ao backend

**Solução:** O proxy de porta precisa estar configurado para o mesmo IP que está no `app.json`, ou o `app.json` precisa usar o IP do proxy.

## 🔧 Soluções Propostas

### Solução 1: Verificar e Corrigir URL no app.json

1. **Verificar IP atual da máquina:**
   ```powershell
   ipconfig
   # Procurar por "IPv4 Address" na conexão ativa
   ```

2. **Verificar qual IP o backend está escutando:**
   ```powershell
   netstat -ano | Select-String ":8000" | Select-String "LISTENING"
   ```

3. **Atualizar app.json com IP correto (deve corresponder ao proxy de porta):**
   ```json
   {
     "expo": {
       "extra": {
         "apiUrl": "http://192.168.15.17:8000",  // Deve corresponder ao IP do proxy de porta
         "apiKey": ""  // Pode ficar vazio para login
       }
     }
   }
   ```
   
   **OU configurar proxy de porta para o IP do app.json:**
   ```powershell
   # Como Administrador
   netsh interface portproxy add v4tov4 listenaddress=192.168.0.101 listenport=8000 connectaddress=127.0.0.1 connectport=8000
   ```

4. **Rebuild do APK:**
   ```powershell
   cd SaudeNold
   .\scripts\build\build-apk.ps1
   ```

### Solução 2: Verificar Configuração de Rede

1. **Verificar port-forward:**
   ```powershell
   .\scripts\deployment\garantir-port-forward.ps1
   ```

2. **Verificar proxy de porta:**
   ```powershell
   netsh interface portproxy show all
   ```
   
   Deve mostrar:
   ```
   Listen on ipv4:             Connect to ipv4:
   Address         Port        Address         Port
   --------------- ----------  --------------- ----------
   192.168.15.17   8000        127.0.0.1       8000
   ```

3. **Verificar firewall:**
   ```powershell
   Get-NetFirewallRule -DisplayName "*Backend*"
   ```

### Solução 3: Adicionar Logs de Debug no App

**Arquivo:** `services/api.js`

Adicionar logs mais detalhados no interceptor de resposta:

```javascript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log detalhado de erros de conexão
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('❌ Erro de conexão com backend:', {
        code: error.code,
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
        data: error.config?.data,
      });
    }
    // ... resto do código
  }
);
```

### Solução 4: Testar Conexão Diretamente do Celular

1. **No navegador do celular, acessar:**
   ```
   http://192.168.15.17:8000/health
   ```
   Deve retornar: `{"status":"ok"}`

2. **Testar endpoint de login (via curl ou Postman do celular):**
   ```bash
   curl -X POST http://192.168.15.17:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test","device":{"device_id":"test"}}'
   ```

3. **Se funcionar no navegador mas não no app:**
   - Problema está no app (configuração, cache, etc.)
   - Se não funcionar nem no navegador:
     - Problema de rede/firewall

### Solução 5: Verificar Logs do App no Celular

**Usando ADB:**
```powershell
.\scripts\debug\verificar-logs-android.ps1
```

Ou manualmente:
```powershell
adb logcat | Select-String "SaudeNold|API|login|error"
```

## 📊 Checklist de Diagnóstico

- [ ] Verificar IP atual da máquina (`ipconfig`)
- [ ] Verificar IP configurado no `app.json`
- [ ] Verificar se port-forward está ativo e escutando no IP correto
- [ ] Verificar se proxy de porta está configurado
- [ ] Verificar regras de firewall
- [ ] Testar `/health` do navegador do celular
- [ ] Testar endpoint de login do navegador/Postman do celular
- [ ] Verificar logs do backend em tempo real durante tentativa de login
- [ ] Verificar logs do app no celular (via ADB)
- [ ] Verificar se o APK foi rebuildado após mudanças no `app.json`

## 🧪 Teste Passo a Passo

### 1. Preparação

```powershell
# Terminal 1: Monitorar logs do backend
kubectl logs -n saudenold deployment/backend -f

# Terminal 2: Verificar conexões de rede
Get-NetTCPConnection -LocalPort 8000 -State Established | Format-Table
```

### 2. Verificar Configuração

```powershell
# Verificar IP da máquina
ipconfig | Select-String "IPv4"

# Verificar app.json
Get-Content SaudeNold\app.json | Select-String "apiUrl"

# Verificar port-forward
netstat -ano | Select-String ":8000" | Select-String "LISTENING"
```

### 3. Testar do Celular

1. Abrir navegador no celular
2. Acessar: `http://[IP_DA_MAQUINA]:8000/health`
3. Tentar fazer login no app
4. Observar logs no Terminal 1

### 4. Analisar Resultados

**Se `/health` funcionar mas login não:**
- Problema específico do endpoint de login
- Verificar formato da requisição
- Verificar logs do app

**Se nem `/health` funcionar:**
- Problema de rede/firewall
- Verificar port-forward e proxy de porta

**Se aparecer nos logs do backend:**
- Problema de autenticação/validação
- Verificar formato dos dados enviados

## 🔍 Pontos de Atenção Específicos

### 1. API_KEY Vazia

Embora o endpoint de login não requeira API key, o interceptor do axios pode estar tentando usar uma API key vazia, o que pode causar problemas. 

**Solução:** Deixar vazio está OK para login, mas após login o token JWT será usado.

### 2. URL no app.json vs Documentação

- `app.json`: `192.168.0.101:8000`
- Documentação: `192.168.15.17:8000`

**Ação:** Verificar qual é o IP correto e atualizar.

### 3. Rebuild Necessário

Após alterar `app.json`, é **necessário rebuildar o APK**. As configurações do `app.json` são compiladas no build.

### 4. Cache do App

O app pode estar usando configurações antigas em cache. Após rebuild, desinstalar e reinstalar o APK.

## 📝 Próximos Passos Recomendados

1. ✅ Verificar e corrigir URL no `app.json`
2. ✅ Verificar configuração de rede (port-forward, proxy, firewall)
3. ✅ Testar `/health` do navegador do celular
4. ✅ Rebuild do APK com configurações corretas
5. ✅ Testar login novamente
6. ✅ Se ainda não funcionar, adicionar logs de debug no app
7. ✅ Verificar logs do app via ADB durante tentativa de login

## 🔗 Referências

- `SaudeNold/CONFIGURAR-BACKEND-MOBILE.md` - Configuração de backend para mobile
- `SaudeNold/VERIFICACAO-ACESSO-CELULAR.md` - Verificação de acesso do celular
- `SaudeNold/RESUMO-FINAL-ACESSO-CELULAR.md` - Resumo de problemas de acesso
- `SaudeNold/docs/troubleshooting/VERIFICACAO-ACESSO-CELULAR.md` - Troubleshooting de acesso
