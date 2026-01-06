# Configuração do Backend para Dispositivos Móveis

## 🔍 Problema Identificado

Quando você usa `http://localhost:8000` no `app.json`, o app funciona apenas no emulador. Em dispositivos móveis reais, `localhost` se refere ao próprio dispositivo, não ao seu computador onde o backend está rodando.

## ✅ Soluções

### Solução 1: Usar IP da Máquina (Recomendado para Desenvolvimento)

1. **Descobrir o IP da sua máquina:**

   **Windows:**
   ```powershell
   ipconfig
   ```
   Procure por "IPv4 Address" na conexão ativa (geralmente começa com 192.168.x.x ou 10.x.x.x)

   **Linux/Mac:**
   ```bash
   ifconfig
   # ou
   ip addr show
   ```

2. **Atualizar `app.json`:**
   ```json
   {
     "expo": {
       "extra": {
         "apiUrl": "http://192.168.1.100:8000",
         "apiKey": "sua-api-key-aqui"
       }
     }
   }
   ```
   ⚠️ **Substitua `192.168.1.100` pelo IP real da sua máquina**

3. **Garantir que o backend aceita conexões externas:**
   - O backend deve estar configurado para aceitar conexões em `0.0.0.0` (não apenas `127.0.0.1`)
   - Verifique o CORS no backend para aceitar requisições do seu IP

4. **Garantir que o dispositivo móvel está na mesma rede Wi-Fi:**
   - O celular e o computador devem estar na mesma rede Wi-Fi
   - Firewall do Windows/Linux deve permitir conexões na porta 8000

### Solução 2: Usar Port Forward do Kubernetes

Se você está usando Kubernetes:

1. **Fazer port-forward:**
   ```bash
   kubectl port-forward -n saudenold svc/backend 8000:8000
   ```

2. **Usar IP da máquina no app.json:**
   ```json
   {
     "expo": {
       "extra": {
         "apiUrl": "http://192.168.1.100:8000"
       }
     }
   }
   ```

### Solução 3: Usar Serviço de Tunelamento (ngrok, localtunnel)

Para desenvolvimento rápido sem configurar rede:

1. **Instalar ngrok:**
   ```bash
   # Windows: baixar de https://ngrok.com
   # Linux/Mac:
   brew install ngrok
   # ou
   npm install -g ngrok
   ```

2. **Criar túnel:**
   ```bash
   ngrok http 8000
   ```

3. **Usar URL do ngrok no app.json:**
   ```json
   {
     "expo": {
       "extra": {
         "apiUrl": "https://abc123.ngrok.io"
       }
     }
   }
   ```

⚠️ **Nota:** URLs do ngrok mudam a cada execução (exceto na versão paga)

### Solução 4: Deploy em Produção

Para produção, use um domínio real:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://api.saudenold.com",
      "apiKey": "sua-api-key-segura"
    }
  }
}
```

## 🔧 Configuração do Backend para Aceitar Conexões Externas

### FastAPI (Python)

No arquivo `main.py`, certifique-se de que o servidor está configurado para aceitar conexões externas:

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### CORS

No `main.py`, configure o CORS para aceitar requisições do seu IP:

```python
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:8082,exp://*,http://192.168.1.100:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)
```

## 📱 Testando a Conexão

1. **No celular, abra o navegador e acesse:**
   ```
   http://192.168.1.100:8000/health
   ```
   Deve retornar: `{"status": "ok"}`

2. **Se não funcionar, verifique:**
   - Firewall do Windows/Linux está bloqueando a porta 8000?
   - Celular e computador estão na mesma rede Wi-Fi?
   - IP está correto?

## 🔄 Após Alterar app.json

Após alterar o `app.json`, você precisa:

1. **Reiniciar o Expo:**
   ```bash
   # Parar o servidor atual (Ctrl+C)
   # Reiniciar
   npx expo start
   ```

2. **Recarregar o app no celular:**
   - No app, pressione `r` para recarregar
   - Ou feche e abra o app novamente

## 📝 Checklist

- [ ] IP da máquina identificado
- [ ] `app.json` atualizado com o IP correto
- [ ] Backend configurado para aceitar conexões em `0.0.0.0`
- [ ] CORS configurado para aceitar o IP do dispositivo
- [ ] Firewall permite conexões na porta 8000
- [ ] Celular e computador na mesma rede Wi-Fi
- [ ] Teste de conexão bem-sucedido (`/health`)
- [ ] App recarregado após alterações

## 🚨 Problemas Comuns

### "Network request failed"
- Verifique se o IP está correto
- Verifique se o backend está rodando
- Verifique se o celular está na mesma rede Wi-Fi

### "CORS error"
- Adicione o IP do dispositivo nas origens permitidas do CORS
- Verifique se o header `Authorization` está sendo enviado

### "Connection refused"
- Backend não está rodando
- Porta 8000 está bloqueada pelo firewall
- IP incorreto



