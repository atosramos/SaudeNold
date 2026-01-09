# ✅ Problema de Conexão Resolvido

## 🔍 Problema Identificado

O celular estava recebendo o erro **"ERR_CONNECTION_RESET"** ao tentar acessar `http://192.168.15.17:8000/health`.

### Causa Raiz

O **port-forward do Kubernetes não estava rodando**. Mesmo com o proxy de porta configurado (`192.168.15.17:8000 → localhost:8000`), não havia nada escutando em `localhost:8000` para receber as conexões.

## ✅ Solução Aplicada

1. **Port-forward reiniciado** - O comando `kubectl port-forward -n saudenold svc/backend 8000:8000` foi executado
2. **Conexão testada** - Ambos `localhost:8000` e `192.168.15.17:8000` estão funcionando
3. **Script criado** - `garantir-port-forward.ps1` para verificar e iniciar automaticamente

## 🚀 Como Usar Agora

### Opção 1: Script Automático (Recomendado)

```powershell
cd C:\Users\lucia\Projetos\Saude\SaudeNold
.\garantir-port-forward.ps1
```

Este script:
- ✅ Verifica se o port-forward já está rodando
- ✅ Testa se o backend está respondendo
- ✅ Inicia automaticamente se necessário
- ✅ Abre em uma nova janela do PowerShell (não bloqueia)

### Opção 2: Manual

```powershell
# Em um terminal dedicado (deixe aberto)
kubectl port-forward -n saudenold svc/backend 8000:8000
```

## 📱 Teste no Celular

Agora você pode testar:

1. **No navegador do celular:**
   - `http://192.168.15.17:8000/health`
   - Deve retornar: `{"status":"ok"}`

2. **No app:**
   - Abra a tela de exames médicos
   - Arraste para baixo para atualizar
   - O app deve conseguir sincronizar com o backend

## ⚠️ Importante

O **port-forward precisa estar rodando** sempre que você quiser acessar o backend do celular ou do computador.

### Se o port-forward parar:

1. Execute novamente: `.\garantir-port-forward.ps1`
2. Ou manualmente: `kubectl port-forward -n saudenold svc/backend 8000:8000`

### Verificar se está rodando:

```powershell
# Ver se a porta está escutando
netstat -ano | Select-String ":8000" | Select-String "LISTENING"

# Testar conexão
Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
```

## 🔧 Configuração Completa

Para o celular acessar o backend, você precisa de:

1. ✅ **Port-forward ativo** - `kubectl port-forward -n saudenold svc/backend 8000:8000`
2. ✅ **Proxy de porta configurado** - `netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000`
3. ✅ **Firewall permitindo** - Regra criada para porta 8000
4. ✅ **CORS configurado** - Backend aceita requisições do IP do celular
5. ✅ **API Key configurada** - Tanto no backend quanto no `app.json`

## 📊 Status Atual

- ✅ Port-forward: **ATIVO**
- ✅ Proxy de porta: **CONFIGURADO**
- ✅ Backend: **RESPONDENDO**
- ✅ `localhost:8000`: **FUNCIONANDO**
- ✅ `192.168.15.17:8000`: **FUNCIONANDO**

## 🎯 Próximos Passos

1. Teste no celular o acesso ao backend
2. Faça upload de um PDF pelo app
3. Verifique se o PDF chegou no backend: `.\verificar-exames-backend.ps1`
4. Monitore os logs: `kubectl logs -n saudenold deployment/backend -f`



