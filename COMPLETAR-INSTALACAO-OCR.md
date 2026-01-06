# ✅ Instruções para Completar Instalação de OCR Automático

## 📦 Passo 1: Instalar Dependências

Execute no terminal:

```bash
cd SaudeNold
npm install
```

Isso instalará:
- ✅ `expo-text-extractor` - OCR nativo para mobile
- ✅ `react-native-pdf` - Para renderizar PDFs
- ✅ `react-native-view-shot` - Para capturar PDFs como imagem
- ✅ `tesseract.js` - Para OCR no browser

---

## 🔧 Passo 2: Instalar Expo Dev Client (Obrigatório)

O `expo-text-extractor` requer Expo Dev Client (não funciona com Expo Go):

```bash
npx expo install expo-dev-client
```

---

## 🏗️ Passo 3: Gerar Código Nativo

```bash
npx expo prebuild
```

Isso gerará as pastas `android/` e `ios/` com código nativo.

---

## 📱 Passo 4: Rebuild do App

### **Para Desenvolvimento:**

```bash
# Android
npx expo run:android

# iOS (se tiver Mac)
npx expo run:ios
```

### **Para Produção (APK):**

```bash
eas build --platform android --profile preview
```

---

## ⚠️ IMPORTANTE

Após essas mudanças:

1. ❌ **O app NÃO funcionará mais com Expo Go**
2. ✅ **Você precisará usar Expo Dev Client**
3. ✅ **Ou gerar um novo APK**

---

## 🧪 Passo 5: Testar

1. **Instalar app no dispositivo:**
   - Se usar `expo run:android`, o app será instalado automaticamente
   - Se usar `eas build`, baixe e instale o APK gerado

2. **Testar OCR:**
   - Abrir app
   - Ir em "Exames Médicos"
   - Adicionar foto ou PDF
   - Clicar em "Processar Exame"
   - Aguardar OCR processar
   - Verificar se texto foi extraído automaticamente

---

## 🐛 Solução de Problemas

### **Erro: "expo-text-extractor não encontrado"**
- Verifique se instalou: `npm install expo-text-extractor`
- Execute: `npx expo prebuild` novamente
- Rebuild o app

### **Erro: "Module not found"**
- Limpe cache: `npx expo start -c`
- Reinstale dependências: `rm -rf node_modules && npm install`
- Rebuild: `npx expo run:android`

### **OCR não funciona**
- Verifique se está usando Expo Dev Client (não Expo Go)
- Verifique permissões de câmera/storage no app
- Teste em dispositivo físico (melhor que emulador)

---

## 📝 Status da Implementação

✅ **Código completo implementado:**
- ✅ `services/ocr.js` - OCR nativo com expo-text-extractor
- ✅ `services/pdfProcessor.js` - Conversão PDF → Imagem
- ✅ `app/medical-exams/new.js` - Interface atualizada
- ✅ `app.json` - Plugin configurado

⏳ **Aguardando:**
- Instalação de dependências
- Expo Dev Client
- Rebuild do app

---

## 🎯 Próximos Passos

1. ✅ Execute `npm install`
2. ✅ Execute `npx expo install expo-dev-client`
3. ✅ Execute `npx expo prebuild`
4. ✅ Execute `npx expo run:android`
5. ✅ Teste o OCR no dispositivo

---

## 💡 Nota

Se encontrar problemas, a **entrada manual continua funcionando perfeitamente** enquanto você resolve os problemas de instalação!


