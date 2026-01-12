# Testar Conexão com Backend

## 🔍 Erro: ERR_CONNECTION_REFUSED

Este erro significa que o port-forward não está rodando ou parou.

## ✅ Solução Rápida

### Passo 1: Verificar se o pod está rodando

```bash
kubectl get pods -n saudenold -l app=backend
```

Deve mostrar: `STATUS: Running`

### Passo 2: Iniciar Port Forward

**Opção A - PowerShell:**
```powershell
cd C:\Users\lucia\Projetos\Saude\SaudeNold
.\start-port-forward.ps1
```

**Opção B - Terminal direto:**
```bash
kubectl port-forward -n saudenold svc/backend 8000:8000
```

### Passo 3: Deixar Rodando

**IMPORTANTE:** Deixe o port-forward rodando em um terminal separado! Não feche esse terminal.

### Passo 4: Testar

Em outro terminal ou no navegador:
- http://localhost:8000/health
- http://localhost:8000/docs

## 🔄 Se o Port-Forward Parar

1. O port-forward para se você fechar o terminal ou ele travar
2. Basta executar novamente: `kubectl port-forward -n saudenold svc/backend 8000:8000`

## 💡 Dica: Usar em Background (Windows)

Para rodar em background no PowerShell:

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "kubectl port-forward -n saudenold svc/backend 8000:8000"
```

Isso abrirá uma nova janela do PowerShell que ficará rodando o port-forward.





















