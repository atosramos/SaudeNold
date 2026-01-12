# Status da Conexão - Backend SaudeNold

## ✅ O que já foi feito:

1. **Port-forward iniciado** ✅
   - Processo anterior encerrado (PID 14436)
   - Novo port-forward iniciado (PID 31060)
   - Porta 8000 está ativa em `localhost:8000`

2. **Sincronização de exames implementada** ✅
   - Exames pendentes serão enviados automaticamente quando backend ficar acessível
   - Verificação periódica de status a cada 30 segundos

## 🔧 O que falta fazer:

### Passo 1: Configurar Proxy de Porta (Como Administrador)

Abra PowerShell como Administrador e execute:

```powershell
# Permitir firewall
New-NetFirewallRule -DisplayName "Backend SaudeNold" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow

# Criar proxy (redireciona 192.168.15.17:8000 → localhost:8000)
netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000

# Verificar
netsh interface portproxy show all
```

### Passo 2: Testar Conexão

No navegador do celular (mesma rede Wi-Fi), acesse:
```
http://192.168.15.17:8000/health
```

Deve retornar: `{"status": "ok"}`

### Passo 3: Atualizar app.json

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

### Passo 4: Reiniciar Expo

```powershell
# Parar Expo atual (Ctrl+C)
npx expo start
```

## 📱 Após configurar:

1. Os exames pendentes serão enviados automaticamente
2. O app verificará o status a cada 30 segundos
3. Quando processados, os parâmetros aparecerão na tela
4. Os gráficos (timeline) funcionarão com os dados processados

## ⚠️ Importante:

- **Mantenha o port-forward rodando** - Não feche a janela do kubectl
- **Execute o proxy como Administrador** - Necessário para configurar o redirecionamento
- **Mesma rede Wi-Fi** - Celular e computador devem estar na mesma rede

## 🔍 Verificar Status:

```powershell
# Ver se port-forward está rodando
netstat -ano | Select-String ":8000" | Select-String "LISTENING"

# Ver processos kubectl
Get-Process kubectl

# Ver proxy configurado
netsh interface portproxy show all
```

## 🧹 Se precisar encerrar:

```powershell
# Encontrar PID do port-forward
netstat -ano | Select-String ":8000" | Select-String "LISTENING"

# Encerrar (substitua PID pelo número encontrado)
Stop-Process -Id <PID> -Force

# Remover proxy
netsh interface portproxy delete v4tov4 listenaddress=192.168.15.17 listenport=8000
```




