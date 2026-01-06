# Resolver Conexão do Backend - ERR_CONNECTION_REFUSED

## 🔍 Problema Identificado

O backend está rodando no Kubernetes, mas o `kubectl port-forward` por padrão só escuta em `localhost` (127.0.0.1), não no IP da rede (192.168.15.17).

## ✅ Soluções

### Solução 1: Usar Port-Forward + Proxy Reverso (Recomendado)

O port-forward já está rodando. Agora precisamos expor ele na rede:

#### Opção A: Usar netsh (Windows) para redirecionar porta

```powershell
# Parar o port-forward atual (Ctrl+C no terminal onde está rodando)

# Criar regra de firewall para permitir conexões na porta 8000
New-NetFirewallRule -DisplayName "Backend SaudeNold" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow

# Usar netsh para criar port proxy (redirecionar 192.168.15.17:8000 para localhost:8000)
netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000

# Verificar se foi criado
netsh interface portproxy show all
```

**Depois disso:**
- O backend estará acessível em `http://192.168.15.17:8000`
- Atualize o `app.json` com: `"apiUrl": "http://192.168.15.17:8000"`

**Para remover depois:**
```powershell
netsh interface portproxy delete v4tov4 listenaddress=192.168.15.17 listenport=8000
```

#### Opção B: Usar SSH Tunnel (se tiver SSH configurado)

Não aplicável para Windows local.

### Solução 2: Mudar Service para NodePort (Permanente)

Se você quer uma solução mais permanente:

```powershell
# Verificar o service atual
kubectl get svc -n saudenold backend -o yaml

# Criar/atualizar service como NodePort
kubectl patch svc backend -n saudenold -p '{"spec":{"type":"NodePort"}}'

# Ver qual porta foi atribuída
kubectl get svc -n saudenold backend
```

Depois use o IP do nó Kubernetes + a porta NodePort.

### Solução 3: Usar Ingress (Já configurado)

Você já tem um Ingress configurado. Verifique:

```powershell
kubectl get ingress -n saudenold
kubectl describe ingress backend-ingress -n saudenold
```

Se o Ingress estiver funcionando, você pode usar o hostname configurado.

## 🚀 Solução Rápida (Recomendada para Agora)

### Passo 1: Verificar se port-forward está rodando

```powershell
# Verificar processos kubectl
Get-Process | Where-Object {$_.ProcessName -like "*kubectl*"}
```

Se não estiver rodando, execute:
```powershell
kubectl port-forward -n saudenold svc/backend 8000:8000
```

### Passo 2: Configurar proxy de porta (netsh)

```powershell
# Permitir firewall
New-NetFirewallRule -DisplayName "Backend SaudeNold" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

# Criar proxy de porta
netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000

# Verificar
netsh interface portproxy show all
```

### Passo 3: Testar conexão

No navegador do celular ou computador na mesma rede:
```
http://192.168.15.17:8000/health
```

Deve retornar: `{"status": "ok"}`

### Passo 4: Atualizar app.json

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.15.17:8000",
      "apiKey": "sua-api-key-aqui"
    }
  }
}
```

### Passo 5: Reiniciar Expo

```powershell
# Parar o Expo atual (Ctrl+C)
# Reiniciar
npx expo start
```

## 📝 Script Automatizado

Crie um arquivo `expor-backend.ps1`:

```powershell
# Expor Backend do Kubernetes na Rede Local
Write-Host "Configurando acesso ao backend..." -ForegroundColor Cyan

# 1. Verificar se port-forward está rodando
$portForward = Get-Process | Where-Object {$_.CommandLine -like "*port-forward*backend*"}
if (-not $portForward) {
    Write-Host "Iniciando port-forward..." -ForegroundColor Yellow
    Start-Process kubectl -ArgumentList "port-forward", "-n", "saudenold", "svc/backend", "8000:8000" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# 2. Configurar firewall
Write-Host "Configurando firewall..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Backend SaudeNold" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

# 3. Obter IP da máquina
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"} | Select-Object -First 1).IPAddress

if ($ip) {
    Write-Host "IP da máquina: $ip" -ForegroundColor Green
    
    # 4. Remover proxy anterior se existir
    netsh interface portproxy delete v4tov4 listenaddress=$ip listenport=8000 2>$null
    
    # 5. Criar novo proxy
    netsh interface portproxy add v4tov4 listenaddress=$ip listenport=8000 connectaddress=127.0.0.1 connectport=8000
    
    Write-Host ""
    Write-Host "Backend acessível em: http://$ip:8000" -ForegroundColor Green
    Write-Host "Teste no navegador: http://$ip:8000/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Atualize o app.json com:" -ForegroundColor Yellow
    Write-Host "  `"apiUrl`": `"http://$ip:8000`"" -ForegroundColor White
} else {
    Write-Host "Não foi possível detectar o IP da rede local" -ForegroundColor Red
}
```

Execute:
```powershell
.\expor-backend.ps1
```

## ⚠️ Importante

1. **Port-forward deve estar rodando** - Deixe o terminal com `kubectl port-forward` aberto
2. **Firewall** - Windows pode bloquear conexões, o script acima configura automaticamente
3. **Rede Wi-Fi** - Celular e computador devem estar na mesma rede Wi-Fi
4. **CORS** - O backend precisa aceitar requisições do IP. Verifique a variável `CORS_ORIGINS` no ConfigMap

## 🔧 Verificar CORS

```powershell
# Ver configuração atual do CORS
kubectl get configmap backend-config -n saudenold -o yaml

# Se precisar atualizar para incluir seu IP:
kubectl create configmap backend-config -n saudenold \
  --from-literal=CORS_ORIGINS="http://localhost:8082,exp://*,http://192.168.15.17:8000" \
  --dry-run=client -o yaml | kubectl apply -f -

# Reiniciar o pod do backend para aplicar mudanças
kubectl rollout restart deployment/backend -n saudenold
```

## 🧹 Limpeza

Quando não precisar mais:

```powershell
# Remover proxy de porta
netsh interface portproxy delete v4tov4 listenaddress=192.168.15.17 listenport=8000

# Remover regra de firewall (opcional)
Remove-NetFirewallRule -DisplayName "Backend SaudeNold"
```



