# 🔧 Usar ADB sem Configurar PATH

## ✅ Solução Implementada

Criados scripts que **detectam automaticamente** o Android SDK e encontram o ADB, sem precisar configurar o PATH.

## 📋 Scripts Disponíveis

### 1. Instalar/Desinstalar App

```powershell
cd SaudeNold

# Desinstalar app
.\scripts\utils\instalar-app.ps1 -Action uninstall

# Instalar app (após compilar)
.\scripts\utils\instalar-app.ps1 -Action install

# Reinstalar (desinstala e instala)
.\scripts\utils\instalar-app.ps1 -Action reinstall
```

### 2. Verificar Logs do Android

```powershell
cd SaudeNold
.\scripts\debug\verificar-logs-android.ps1
```

Este script:
- ✅ Detecta automaticamente o ADB
- ✅ Verifica se há dispositivo conectado
- ✅ Limpa logs antigos
- ✅ Captura logs em tempo real

## 🔍 Como Funciona

Os scripts verificam automaticamente estes locais:

1. `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`
2. `%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe`
3. Variáveis de ambiente `ANDROID_HOME` e `ANDROID_SDK_ROOT`
4. ADB no PATH do sistema

## 🚀 Exemplo de Uso Completo

### Passo 1: Compilar o App

```powershell
cd SaudeNold
.\scripts\build\build-local-apk.ps1
```

### Passo 2: Reinstalar no Dispositivo

```powershell
.\scripts\utils\instalar-app.ps1 -Action reinstall
```

### Passo 3: Verificar Logs (se necessário)

```powershell
.\scripts\debug\verificar-logs-android.ps1
```

## ⚠️ Se o ADB Não For Encontrado

Se os scripts não encontrarem o ADB, você pode:

### Opção 1: Adicionar ao PATH Temporariamente

```powershell
$env:PATH += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
```

### Opção 2: Usar Caminho Completo

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

### Opção 3: Instalar Android SDK Platform Tools

1. Abrir Android Studio
2. Ir em **Tools → SDK Manager**
3. Aba **SDK Tools**
4. Marcar **Android SDK Platform-Tools**
5. Clicar **Apply**

## 📝 Comandos ADB Úteis (usando os scripts)

Todos os comandos abaixo podem ser executados diretamente se você adicionar o ADB ao PATH, ou usando o caminho completo:

```powershell
# Verificar dispositivos
adb devices

# Desinstalar app
adb uninstall com.atosramos.SaudeNold

# Instalar app
adb install android\app\build\outputs\apk\release\app-release.apk

# Ver logs
adb logcat | Select-String -Pattern "SaudeNold|Error|FATAL"

# Limpar logs
adb logcat -c
```

## 🔗 Arquivos Relacionados

- `scripts/utils/instalar-app.ps1` - Script principal para instalar/desinstalar
- `scripts/utils/adb-helper.ps1` - Helper para encontrar ADB
- `scripts/debug/verificar-logs-android.ps1` - Script de debug com detecção automática
