# Solução de Problemas - SaudeNold

## Problema: "Falha para download remote update" no Android

### Solução 1: Usar modo Tunnel (Recomendado)

1. Pare o servidor Expo (Ctrl+C)

2. Reinicie com modo Tunnel:
```bash
npm start -- --tunnel --clear
```

3. Aguarde o QR Code aparecer com URL "exp://" diferente

4. No Expo Go do Android:
   - Feche completamente o app (não apenas minimizar)
   - Abra novamente
   - Escaneie o novo QR Code

### Solução 2: Verificar conexão de rede

- Certifique-se de que o celular e o computador estão na mesma rede Wi-Fi
- Ou tente usar dados móveis no celular (desconecte do Wi-Fi)
- Verifique se há firewall bloqueando a conexão

### Solução 3: Limpar cache do Expo Go

No dispositivo Android:
1. Configurações > Apps > Expo Go
2. Armazenamento > Limpar Cache
3. Abra o Expo Go novamente e escaneie o QR Code

### Solução 4: Verificar logs do servidor

Quando tentar abrir no Android, verifique o terminal onde o Expo está rodando. Se houver erros, eles aparecerão lá.




















