# 📱 Como Gerar APK para Android

## ✅ Resposta Rápida

**Sim!** Um APK pode ser instalado diretamente no celular Android sem necessidade de mais recursos. Basta:

1. Gerar o arquivo APK
2. Transferir para o celular (USB, email, nuvem, etc.)
3. Ativar "Instalar apps de fontes desconhecidas" nas configurações
4. Abrir o arquivo APK e instalar

---

## 🚀 Opção 1: EAS Build (Recomendado - Mais Fácil)

### Pré-requisitos:
- Conta Expo (gratuita): https://expo.dev
- EAS CLI instalado: `npm install -g eas-cli`

### Passos:

1. **Instalar EAS CLI:**
```bash
npm install -g eas-cli
```

2. **Fazer login:**
```bash
eas login
```

3. **Configurar o projeto:**
```bash
cd SaudeNold
eas build:configure
```

4. **Gerar APK de desenvolvimento (debug):**
```bash
eas build --platform android --profile development
```

5. **Gerar APK de produção (release):**
```bash
eas build --platform android --profile production
```

6. **Baixar o APK:**
   - O build será feito na nuvem
   - Você receberá um link para download
   - Baixe o arquivo `.apk`

7. **Instalar no celular:**
   - Transfira o APK para o celular
   - Ative "Fontes desconhecidas" nas configurações
   - Toque no arquivo para instalar

---

## 🔧 Opção 2: Build Local (Mais Controle)

### Pré-requisitos:
- Android Studio instalado
- Android SDK configurado
- Java JDK instalado

### Passos:

1. **Instalar dependências:**
```bash
cd SaudeNold
npm install
```

2. **Gerar build local:**
```bash
# Instalar expo-dev-client (se necessário)
npx expo install expo-dev-client

# Gerar APK de desenvolvimento
npx expo run:android --variant debug

# Ou gerar APK de produção (requer keystore)
npx expo run:android --variant release
```

3. **Localizar o APK:**
   - O APK será gerado em: `android/app/build/outputs/apk/`
   - Arquivo: `app-debug.apk` ou `app-release.apk`

4. **Instalar no celular:**
   - Conecte o celular via USB
   - Ou transfira o arquivo manualmente
   - Ative "Fontes desconhecidas" se necessário
   - Instale o APK

---

## 📋 Opção 3: Expo Prebuild + Android Studio

### Passos:

1. **Gerar projeto nativo:**
```bash
cd SaudeNold
npx expo prebuild
```

2. **Abrir no Android Studio:**
```bash
# Abra a pasta android/ no Android Studio
```

3. **Build no Android Studio:**
   - Build > Build Bundle(s) / APK(s) > Build APK(s)
   - Ou: Build > Generate Signed Bundle / APK

4. **Localizar o APK:**
   - `android/app/build/outputs/apk/debug/app-debug.apk`

---

## ⚙️ Configurações Importantes

### 1. Atualizar `app.json` para produção:

```json
{
  "expo": {
    "android": {
      "package": "com.saudenold.app",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECEIVE_BOOT_COMPLETED"
      ]
    }
  }
}
```

### 2. Configurar URL do Backend:

Se o backend não estiver em `localhost:8000`, atualize em `app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://seu-backend.com"
    }
  }
}
```

---

## 📲 Instalação no Celular Android

### Método 1: USB (ADB)
```bash
# Conectar celular via USB
# Ativar "Depuração USB" nas opções de desenvolvedor
adb install app-debug.apk
```

### Método 2: Transferência Manual
1. Envie o APK por email, WhatsApp, ou nuvem
2. No celular, baixe o arquivo
3. Vá em Configurações > Segurança > Ativar "Fontes desconhecidas"
4. Abra o arquivo APK e instale

### Método 3: QR Code (EAS Build)
- Após o build, o EAS gera um QR Code
- Escaneie com o celular para baixar diretamente

---

## ⚠️ Considerações Importantes

### APK de Debug vs Release:

- **Debug APK:**
  - ✅ Mais fácil de gerar
  - ✅ Não precisa assinatura
  - ❌ Maior tamanho
  - ❌ Não pode publicar na Play Store

- **Release APK:**
  - ✅ Otimizado
  - ✅ Menor tamanho
  - ✅ Pode publicar na Play Store
  - ❌ Requer keystore (assinatura digital)

### Permissões no Android:

O Android pode pedir permissão para:
- Instalar apps de fontes desconhecidas
- Acessar câmera (para fotos de medicamentos)
- Acessar armazenamento (para salvar imagens)

---

## 🔐 Assinatura Digital (Para Release)

Para gerar APK de produção assinado:

1. **Gerar keystore:**
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore saudenold-key.jks -alias saudenold -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configurar no `app.json`:**
```json
{
  "expo": {
    "android": {
      "package": "com.saudenold.app"
    }
  }
}
```

3. **Ou usar EAS Build (recomendado):**
   - O EAS gerencia a assinatura automaticamente

---

## 📝 Resumo

| Método | Dificuldade | Requer Conta | Tempo |
|--------|-------------|--------------|-------|
| EAS Build | ⭐ Fácil | Sim (gratuita) | ~15-20 min |
| Build Local | ⭐⭐ Média | Não | ~30-60 min |
| Android Studio | ⭐⭐⭐ Avançado | Não | ~1-2 horas |

**Recomendação:** Use EAS Build para a primeira vez. É o mais simples e confiável.

---

## 🆘 Troubleshooting

### Erro: "App não instalado"
- Verifique se ativou "Fontes desconhecidas"
- Tente desinstalar versão anterior primeiro
- Verifique se há espaço suficiente no celular

### Erro: "Package name já existe"
- Desinstale versão anterior do app
- Ou mude o `package` em `app.json`

### Erro no build: "SDK não encontrado"
- Instale Android SDK via Android Studio
- Configure `ANDROID_HOME` nas variáveis de ambiente

---

## 📚 Referências

- [Expo EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Expo Build Local](https://docs.expo.dev/build-reference/local-builds/)
- [Android APK Installation](https://developer.android.com/studio/publish)








