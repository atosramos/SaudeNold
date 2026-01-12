# Passo a Passo - Resolver Conexão do Backend

## 🎯 Objetivo

Fazer o backend acessível em `http://192.168.15.17:8000` para que o app no celular possa se conectar.

## ✅ Passos

### Passo 1: Verificar se Port-Forward está rodando

Abra um terminal PowerShell e execute:

```powershell
kubectl port-forward -n saudenold svc/backend 8000:8000
```

**Deixe este terminal aberto!** O port-forward precisa estar rodando continuamente.

### Passo 2: Configurar Proxy de Porta (Como Administrador)

1. **Abra PowerShell como Administrador:**
   - Clique com botão direito no PowerShell
   - Selecione "Executar como administrador"

2. **Execute os comandos:**

```powershell
# Permitir firewall
New-NetFirewallRule -DisplayName "Backend SaudeNold" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow

# Criar proxy de porta (redirecionar 192.168.15.17:8000 para localhost:8000)
netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000

# Verificar se foi criado
netsh interface portproxy show all
```

Você deve ver algo como:
```
Listen on ipv4:             Connect to ipv4:
Address         Port        Address         Port
--------------- ----------  --------------- ----------
192.168.15.17   8000        127.0.0.1      8000
```

### Passo 3: Testar Conexão

No navegador do celular (na mesma rede Wi-Fi) ou no computador, acesse:

```
http://192.168.15.17:8000/health
```

**Deve retornar:** `{"status": "ok"}`

Se não funcionar:
- Verifique se o port-forward ainda está rodando
- Verifique se o firewall não está bloqueando
- Verifique se celular e computador estão na mesma rede Wi-Fi

### Passo 4: Atualizar app.json

Edite o arquivo `app.json` e altere:

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

### Passo 6: Testar no App

1. Abra o app no celular
2. Vá para a tela de Exames Médicos
3. Os exames pendentes devem ser enviados automaticamente
4. Aguarde alguns segundos para processamento

## 🔧 Verificar CORS (Se necessário)

Se ainda houver problemas de CORS, atualize o ConfigMap:

```powershell
kubectl create configmap backend-config -n saudenold \
  --from-literal=CORS_ORIGINS="http://localhost:8082,exp://*,http://192.168.15.17:8000" \
  --dry-run=client -o yaml | kubectl apply -f -

# Reiniciar o pod
kubectl rollout restart deployment/backend -n saudenold
```

## 🧹 Limpeza (Quando não precisar mais)

```powershell
# Remover proxy de porta
netsh interface portproxy delete v4tov4 listenaddress=192.168.15.17 listenport=8000

# Remover regra de firewall (opcional)
Remove-NetFirewallRule -DisplayName "Backend SaudeNold"
```

## ⚠️ Importante

1. **Port-forward deve estar rodando** - Mantenha o terminal com `kubectl port-forward` aberto
2. **Firewall** - O comando acima configura automaticamente
3. **Rede Wi-Fi** - Celular e computador na mesma rede
4. **IP Correto** - Use o IP da sua rede Wi-Fi (192.168.15.17 no seu caso)

## 📱 Resumo Rápido

1. ✅ Port-forward rodando: `kubectl port-forward -n saudenold svc/backend 8000:8000`
2. ✅ Proxy configurado: `netsh interface portproxy add v4tov4 listenaddress=192.168.15.17 listenport=8000 connectaddress=127.0.0.1 connectport=8000` (como Admin)
3. ✅ Testar: `http://192.168.15.17:8000/health`
4. ✅ Atualizar `app.json` com o IP
5. ✅ Reiniciar Expo




