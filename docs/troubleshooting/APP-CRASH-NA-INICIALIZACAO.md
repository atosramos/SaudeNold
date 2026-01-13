# 🔧 App Crash na Inicialização - Guia de Troubleshooting

## ✅ Correção Aplicada

**Problema:** O app estava crashando na inicialização porque as funções `initGoogleAnalytics()` e `initLogRocket()` estavam sendo chamadas sem serem importadas.

**Correção:**
- ✅ Adicionado import das funções de analytics
- ✅ Adicionado tratamento de erros para evitar crashes silenciosos
- ✅ Criado script para verificar logs do Android

## 🔍 Como Verificar o Problema

### Opção 1: Usar o Script de Debug (Recomendado)

```powershell
cd SaudeNold
.\scripts\debug\verificar-logs-android.ps1
```

Este script irá:
1. Verificar se há dispositivos conectados
2. Limpar logs antigos
3. Capturar logs em tempo real do app

### Opção 2: Verificar Logs Manualmente

1. **Conectar o dispositivo Android via USB**
2. **Ativar depuração USB** no dispositivo
3. **Abrir terminal e executar:**
   ```powershell
   adb logcat | Select-String -Pattern "SaudeNold|ReactNative|FATAL|AndroidRuntime|Error"
   ```
4. **Tentar abrir o app** e observar os erros

### Opção 3: Usar Android Studio

1. Abrir Android Studio
2. Conectar dispositivo
3. Ir em **View → Tool Windows → Logcat**
4. Filtrar por `SaudeNold` ou `ReactNative`
5. Tentar abrir o app e verificar erros

## 🛠️ Próximos Passos

### 1. Recompilar o App

Após a correção, você precisa recompilar:

```powershell
cd SaudeNold
.\scripts\build\build-local-apk.ps1
```

### 2. Reinstalar no Dispositivo

```powershell
# Desinstalar versão antiga
adb uninstall com.atosramos.SaudeNold

# Instalar nova versão
adb install android/app/build/outputs/apk/release/app-release.apk
```

### 3. Verificar se Funcionou

1. Abrir o app
2. Se ainda crashar, verificar logs com o script de debug
3. Procurar por erros específicos nos logs

## 🐛 Erros Comuns e Soluções

### Erro: "Cannot find module"
- **Causa:** Dependência não instalada ou import incorreto
- **Solução:** Verificar se todas as dependências estão instaladas (`npm install`)

### Erro: "undefined is not a function"
- **Causa:** Função chamada antes de ser definida ou import incorreto
- **Solução:** Verificar imports e ordem de inicialização

### Erro: "Network request failed"
- **Causa:** Backend não disponível ou URL incorreta
- **Solução:** Verificar se o backend está rodando e se a URL está correta

### Erro: "Permission denied"
- **Causa:** Permissões não concedidas
- **Solução:** Verificar permissões no AndroidManifest.xml e conceder no dispositivo

## 📋 Checklist de Verificação

Antes de reportar um problema, verifique:

- [ ] App foi recompilado após a correção
- [ ] Versão antiga foi desinstalada
- [ ] Logs foram verificados
- [ ] Backend está rodando (se aplicável)
- [ ] Permissões foram concedidas no dispositivo
- [ ] Dispositivo está conectado e com depuração USB ativa

## 🔗 Arquivos Relacionados

- `app/_layout.js` - Layout raiz do app (onde estava o problema)
- `services/analytics.js` - Serviço de analytics
- `scripts/debug/verificar-logs-android.ps1` - Script de debug

## 📞 Se o Problema Persistir

1. **Capturar logs completos:**
   ```powershell
   adb logcat > logs-android.txt
   # Tentar abrir o app
   # Pressionar Ctrl+C para parar
   ```

2. **Verificar se há outros erros:**
   - Procurar por "FATAL" nos logs
   - Procurar por "Exception" nos logs
   - Procurar por "Error" nos logs

3. **Verificar dependências nativas:**
   - Algumas dependências podem precisar de rebuild após mudanças
   - Tentar `npx expo prebuild --clean`

4. **Verificar configurações do Android:**
   - Verificar `android/app/build.gradle`
   - Verificar `android/app/src/main/AndroidManifest.xml`
