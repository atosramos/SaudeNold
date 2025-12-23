# Como Iniciar Port-Forward Corretamente

## ⚠️ Problema: ERR_CONNECTION_REFUSED

Isso significa que o port-forward não está ativo ou parou.

## ✅ Solução Passo a Passo

### 1. Verificar se o Pod está rodando

```powershell
kubectl get pods -n saudenold -l app=backend
```

Deve mostrar: `STATUS: Running`

### 2. Abrir um Terminal SEPARADO para o Port-Forward

**IMPORTANTE:** O port-forward precisa ficar rodando em um terminal dedicado!

#### Opção A: Usar Script

```powershell
cd C:\Users\lucia\Projetos\Saude\SaudeNold
.\start-port-forward.ps1
```

#### Opção B: Comando Direto

```powershell
kubectl port-forward -n saudenold svc/backend 8000:8000
```

### 3. Deixar o Terminal ABERTO

**NÃO FECHE O TERMINAL** onde o port-forward está rodando!

Você deve ver uma mensagem como:
```
Forwarding from 127.0.0.1:8000 -> 8000
Forwarding from [::1]:8000 -> 8000
```

### 4. Testar em Outro Terminal ou Navegador

Depois que o port-forward estiver rodando, teste:

```
http://localhost:8000/health
http://localhost:8000/docs
```

## 🔄 Se o Port-Forward Parar

O port-forward pode parar se:
- Você fechar o terminal
- O terminal travar
- Você pressionar Ctrl+C

**Solução:** Basta executar novamente o comando do passo 2.

## 💡 Dica: Abrir Terminal Dedicado

Para ter um terminal dedicado só para o port-forward:

1. Abra um **NOVO** terminal PowerShell
2. Execute: `cd C:\Users\lucia\Projetos\Saude\SaudeNold`
3. Execute: `kubectl port-forward -n saudenold svc/backend 8000:8000`
4. Deixe esse terminal aberto e use outro para rodar o app

## 🐛 Troubleshooting

### Porta 8000 já em uso?

```powershell
# Ver o que está usando a porta
netstat -ano | findstr ":8000"

# Matar o processo se necessário
taskkill /PID <PID> /F
```

### Port-forward não conecta?

```powershell
# Verificar se o pod está pronto
kubectl get pods -n saudenold

# Ver logs do pod
kubectl logs -n saudenold -l app=backend

# Tentar conectar diretamente ao pod (teste interno)
kubectl exec -n saudenold -it deployment/backend -- curl http://localhost:8000/health
```





