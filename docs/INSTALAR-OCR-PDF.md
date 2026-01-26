# 📦 Instruções para Instalar OCR Automático de PDFs

## ⚠️ Importante

A implementação completa de OCR automático para PDFs no mobile requer **bibliotecas nativas** que não funcionam com **Expo Go**. Você precisará usar **Expo Dev Client**.

---

## 🚀 Opção 1: Implementação Completa (Requer Expo Dev Client)

### **Passo 1: Instalar Expo Dev Client**

```bash
cd SaudeNold
npx expo install expo-dev-client
```

### **Passo 2: Instalar Bibliotecas**

```bash
# Para renderizar PDFs
npm install react-native-pdf react-native-view-shot

# Para OCR nativo (escolha uma opção)
npm install @react-native-ml-kit/text-recognition
# OU
npm install react-native-vision-camera
```

### **Passo 3: Configurar Projeto**

```bash
# Gerar código nativo
npx expo prebuild

# Para Android
cd android && ./gradlew clean && cd ..

# Para iOS (se tiver Mac)
cd ios && pod install && cd ..
```

### **Passo 4: Atualizar app.json**

Adicionar plugin:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "@react-native-community/datetimepicker",
      [
        "@react-native-ml-kit/text-recognition",
        {
          "cameraPermission": "O app precisa acessar a câmera para processar documentos."
        }
      ]
    ]
  }
}
```

### **Passo 5: Rebuild do App**

```bash
# Desenvolvimento
npx expo run:android
# ou
npx expo run:ios

# Produção (APK)
eas build --platform android
```

**⚠️ IMPORTANTE:** Após isso, o app **não funcionará mais com Expo Go**. Você precisará gerar um novo APK.

---

## 🎯 Opção 2: Manter Entrada Manual (Recomendado)

A entrada manual **já funciona perfeitamente** e não requer mudanças:

1. ✅ Selecionar PDF
2. ✅ Clicar em "Processar Exame"
3. ✅ Modal aparece automaticamente
4. ✅ Copiar texto do PDF
5. ✅ Colar no app
6. ✅ Sistema processa automaticamente

**Vantagens:**
- ✅ Funciona imediatamente
- ✅ Não requer rebuild
- ✅ Funciona com Expo Go
- ✅ Processamento de dados é automático

---

## 📝 Status Atual

✅ **Código preparado** para suportar OCR automático
✅ **Estrutura criada** para conversão PDF → Imagem
✅ **Estrutura criada** para OCR nativo
✅ **Entrada manual melhorada** com instruções claras

⏳ **Aguardando:**
- Decisão sobre migrar para Expo Dev Client
- Instalação de bibliotecas nativas
- Rebuild do app

---

## 🎯 Recomendação

**Por enquanto:** Use a entrada manual (funciona perfeitamente)

**Futuro:** Implemente OCR automático quando:
- Projeto estiver pronto para Expo Dev Client
- Houver necessidade real de processamento automático
- Tiver tempo para testes e ajustes

---

## ✅ Próximos Passos

**Se quiser implementar OCR automático:**
1. Siga a Opção 1 acima
2. Complete a implementação em `services/pdfProcessor.js`
3. Complete a implementação em `services/ocr.js`
4. Teste em dispositivo físico
5. Rebuild do app

**Se quiser manter entrada manual:**
1. Use o app normalmente
2. A entrada manual já está otimizada
3. Funciona perfeitamente!

---

## 💡 Dica

A entrada manual é **muito rápida** - você só precisa:
1. Abrir PDF em outro app
2. Copiar texto (Ctrl+A, Ctrl+C)
3. Colar no app
4. Pronto! Sistema processa automaticamente

O processamento de dados (extração de parâmetros, valores, etc.) é **totalmente automático** após colar o texto!



