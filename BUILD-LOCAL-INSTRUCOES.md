# 📱 Build Local do APK - Instruções

## ✅ Pré-requisitos Atendidos

- ✅ Android Studio instalado
- ✅ Android SDK encontrado em: `C:\Users\lucia\AppData\Local\Android\Sdk`
- ✅ Arquivo `.env` com `EXPO_PUBLIC_GEMINI_API_KEY` configurado
- ✅ Código usando `process.env.EXPO_PUBLIC_GEMINI_API_KEY`

## 🚀 Como Executar

### Opção 1: Script Automatizado (Recomendado)

```powershell
cd C:\Users\lucia\Projetos\Saude\SaudeNold
.\build-local-apk.ps1
```

### Opção 2: Manual

```powershell
# 1. Fazer prebuild (gerar projeto Android)
npx expo prebuild --platform android --clean

# 2. Compilar APK de release
npx expo run:android --variant release
```

## 📍 Onde Encontrar o APK

Após a compilação, o APK estará em:
```
android\app\build\outputs\apk\release\app-release.apk
```

## ⚙️ Variáveis de Ambiente

No build local, o Expo carrega automaticamente o arquivo `.env` da raiz do projeto.

A variável `EXPO_PUBLIC_GEMINI_API_KEY` será incluída automaticamente no APK compilado.

## ⏱️ Tempo Estimado

- **Primeira vez:** 15-20 minutos (baixa dependências, compila tudo)
- **Próximas vezes:** 5-10 minutos (apenas recompilação)

## 🔧 Possíveis Problemas

### 1. Erro: "ANDROID_HOME not set"
**Solução:** O script configura automaticamente. Se persistir:
```powershell
$env:ANDROID_HOME = "C:\Users\lucia\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\lucia\AppData\Local\Android\Sdk"
```

### 2. Erro: "Java not found"
**Solução:** Instale JDK 17 ou 21 e adicione ao PATH:
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
```

### 3. Erro: "SDK tools not found"
**Solução:** Abra Android Studio → SDK Manager → Instale:
- Android SDK Platform-Tools
- Android SDK Build-Tools
- Android SDK Platform (API 33 ou 34)

## ✅ Vantagens do Build Local

- ✅ Não depende do limite do EAS
- ✅ Compilação mais rápida (após primeira vez)
- ✅ Controle total sobre o processo
- ✅ Variáveis do `.env` incluídas automaticamente
- ✅ Gratuito

## 📝 Notas

- O primeiro build pode demorar mais (baixa dependências)
- Certifique-se de ter pelo menos 10GB de espaço livre
- O Android Studio precisa estar instalado (mesmo que não esteja aberto)

