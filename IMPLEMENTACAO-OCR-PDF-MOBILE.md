# 📱 Implementação de OCR Automático para PDFs no Mobile

## 🎯 Objetivo

Implementar processamento automático de PDFs no celular, convertendo PDFs em imagens e realizando OCR automaticamente.

---

## 📦 Bibliotecas Necessárias

### 1. **react-native-pdf** (Para renderizar PDFs)
```bash
npm install react-native-pdf
```

### 2. **react-native-view-shot** (Para capturar PDF renderizado como imagem)
```bash
npm install react-native-view-shot
```

### 3. **Biblioteca de OCR Nativa** (Escolha uma):

#### Opção A: **@react-native-ml-kit/text-recognition** (Recomendado)
```bash
npm install @react-native-ml-kit/text-recognition
```

**Vantagens:**
- ✅ Funciona offline
- ✅ Suporta Android e iOS
- ✅ Boa precisão
- ✅ Mantido ativamente

**Desvantagens:**
- ❌ Requer `expo-dev-client` (bare workflow)
- ❌ Não funciona com Expo Go

#### Opção B: **expo-text-recognition** (Se disponível)
```bash
npx expo install expo-text-recognition
```

**Vantagens:**
- ✅ Funciona com Expo Go
- ✅ Mais fácil de instalar

**Desvantagens:**
- ❌ Pode não estar disponível para SDK 54
- ❌ Pode ter limitações

---

## 🔧 Implementação Passo a Passo

### **Passo 1: Instalar Dependências**

```bash
cd SaudeNold
npm install react-native-pdf react-native-view-shot
```

### **Passo 2: Instalar OCR Nativo**

**Se usar @react-native-ml-kit/text-recognition:**
```bash
npm install @react-native-ml-kit/text-recognition
npx expo install expo-dev-client
npx expo prebuild
```

**⚠️ IMPORTANTE:** Isso requer `expo-dev-client` e pode não funcionar com Expo Go.

### **Passo 3: Atualizar app.json**

Adicionar permissões necessárias:

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

### **Passo 4: Implementar Conversão PDF → Imagem**

O código já está preparado em `services/pdfProcessor.js`, mas precisa ser completado com a renderização real.

### **Passo 5: Implementar OCR Nativo**

O código já está preparado em `services/ocr.js`, mas precisa ser completado com a biblioteca escolhida.

---

## ⚠️ Limitações e Considerações

### **Expo Go vs Expo Dev Client**

- **Expo Go:** Não suporta bibliotecas nativas customizadas
- **Expo Dev Client:** Suporta bibliotecas nativas, mas requer rebuild do app

### **Recomendação**

Para implementação completa, você precisará:

1. **Migrar para Expo Dev Client:**
   ```bash
   npx expo install expo-dev-client
   npx expo prebuild
   ```

2. **Rebuild do app:**
   - Não funcionará mais com Expo Go
   - Precisa gerar novo APK/IPA

3. **Testar em dispositivo físico:**
   - OCR funciona melhor em dispositivos reais
   - Requer permissões de câmera/storage

---

## 🚀 Alternativa Mais Simples (Recomendada para Agora)

Como a implementação completa requer mudanças significativas (bare workflow), recomendo:

### **Manter Entrada Manual (Atual)**
- ✅ Funciona imediatamente
- ✅ Não requer rebuild
- ✅ Processamento de dados funciona perfeitamente
- ✅ Usuário só precisa copiar/colar texto

### **Melhorias na Entrada Manual:**
1. ✅ Adicionar instruções mais claras
2. ✅ Adicionar botão para abrir PDF em outro app
3. ✅ Melhorar feedback visual

---

## 📝 Próximos Passos

**Se quiser implementar OCR automático completo:**

1. Decidir se migra para Expo Dev Client
2. Instalar bibliotecas necessárias
3. Completar implementação em `pdfProcessor.js` e `ocr.js`
4. Testar em dispositivo físico
5. Rebuild do app

**Se quiser manter entrada manual (recomendado por enquanto):**

1. Melhorar UX da entrada manual
2. Adicionar instruções mais claras
3. Adicionar atalhos úteis

---

## ✅ Status Atual

- ✅ Código preparado para suportar PDFs
- ✅ Estrutura criada para conversão PDF → Imagem
- ✅ Estrutura criada para OCR nativo
- ⏳ Aguardando instalação de bibliotecas nativas
- ⏳ Aguardando decisão sobre Expo Dev Client

---

## 🎯 Recomendação Final

**Por enquanto:** Manter entrada manual (funciona perfeitamente)

**Futuro:** Implementar OCR automático quando:
- Projeto migrar para Expo Dev Client
- Houver necessidade real de processamento automático
- Tempo disponível para testes e ajustes

**A entrada manual já funciona muito bem** - o usuário só precisa copiar/colar o texto, e o sistema processa tudo automaticamente!



