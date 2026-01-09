# Comparação: Acesso ao Gemini - Mobile vs Browser

Este documento detalha as diferenças entre como o Gemini é acessado no **mobile** (React Native) e no **browser** (web).

## 📱 Mobile (React Native)

### 1. **Tipo de Entrada do Arquivo**
```javascript
// Mobile recebe uma URI (string) do sistema de arquivos
fileInput = "file:///data/user/0/com.saudenold/cache/DocumentPicker/abc123.pdf"
```

### 2. **Leitura do Arquivo**
```javascript
// Usa expo-file-system para ler o arquivo
let FileSystem = require('expo-file-system');
base64Data = await FileSystem.readAsStringAsync(fileInput, {
  encoding: FileSystem.EncodingType.Base64,
});
```

**Características:**
- ✅ Lê arquivo do sistema de arquivos do dispositivo
- ✅ Converte diretamente para base64
- ✅ Requer permissões de leitura de arquivo
- ⚠️ Pode falhar se o arquivo não existir ou não for acessível

### 3. **Preparação do Arquivo**
```javascript
// No new.js (linha 450-457)
if (Platform.OS === 'web' && originalFile && originalFile instanceof File && originalFile.size > 0) {
  fileForGemini = originalFile;  // Browser usa File object
} else {
  fileForGemini = file;  // Mobile usa URI string
}
```

### 4. **MIME Type**
```javascript
// Mobile: MIME type é assumido baseado no fileType
mimeType = fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';
```

### 5. **Logs e Debug**
```javascript
// Mobile tem painel visual de debug
addDebugLog('📖 Lendo arquivo do sistema de arquivos...', 'info');
addDebugLog('✅ Arquivo lido, tamanho base64: 123456', 'success');
addDebugLog('✅ MIME type definido: application/pdf', 'success');
```

**Características:**
- ✅ Logs visuais no painel de debug
- ✅ Logs também no console
- ✅ Feedback em tempo real para o usuário

---

## 🌐 Browser (Web)

### 1. **Tipo de Entrada do Arquivo**
```javascript
// Browser recebe um File object (nativo do browser)
fileInput = File {
  name: "exame.pdf",
  size: 123456,
  type: "application/pdf",
  lastModified: 1234567890
}
```

### 2. **Leitura do Arquivo**
```javascript
// Usa FileReader API do browser
base64Data = await new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => resolve(event.target.result.split(',')[1]);
  reader.onerror = (error) => reject(error);
  reader.readAsDataURL(fileInput);
});
```

**Características:**
- ✅ API nativa do browser
- ✅ Converte File object para base64
- ✅ Não requer permissões especiais
- ✅ Mais rápido (opera em memória)

### 3. **Preparação do Arquivo**
```javascript
// No new.js (linha 450-457)
if (Platform.OS === 'web' && originalFile && originalFile instanceof File && originalFile.size > 0) {
  fileForGemini = originalFile;  // Browser SEMPRE usa originalFile (File object)
  console.log('✅ Usando originalFile para Gemini Direct, tamanho:', originalFile.size);
} else {
  fileForGemini = file;  // Fallback (não usado no browser)
}
```

### 4. **MIME Type**
```javascript
// Browser: MIME type vem do File object
mimeType = fileInput.type;  // Ex: "application/pdf" ou "image/jpeg"
```

### 5. **Logs e Debug**
```javascript
// Browser: apenas console.log
console.log('Gemini Direct: Lendo File object para base64...');
console.log('✅ Base64 preparado, tamanho:', base64Data.length, 'bytes');
```

**Características:**
- ✅ Logs apenas no console do navegador
- ✅ Sem painel visual de debug
- ✅ Pode usar DevTools do navegador

---

## 🔄 Fluxo Completo Comparado

### Mobile (React Native)
```
1. Usuário seleciona PDF → DocumentPicker retorna URI
2. URI armazenada em `file` (string)
3. `saveExam()` chama `extractDataWithGeminiDirect(file, fileType, apiKey, addDebugLog)`
4. `extractDataWithGeminiDirect` detecta Platform.OS !== 'web'
5. Importa `expo-file-system`
6. Lê arquivo: `FileSystem.readAsStringAsync(uri, { encoding: Base64 })`
7. Assume MIME type baseado em `fileType`
8. Cria requestBody com base64 + prompt
9. Envia para Gemini API
10. Processa resposta e normaliza dados
```

### Browser (Web)
```
1. Usuário seleciona PDF → input[type=file] retorna File object
2. File object armazenado em `originalFile`
3. `saveExam()` chama `extractDataWithGeminiDirect(originalFile, fileType, apiKey, addDebugLog)`
4. `extractDataWithGeminiDirect` detecta `fileInput instanceof File`
5. Usa `FileReader` API nativa
6. Lê arquivo: `reader.readAsDataURL(fileInput)`
7. Extrai base64 e MIME type do data URL
8. Cria requestBody com base64 + prompt
9. Envia para Gemini API
10. Processa resposta e normaliza dados
```

---

## 🔍 Código Relevante

### Função Principal: `extractDataWithGeminiDirect`

**Localização:** `SaudeNold/services/llmDataExtraction.js` (linha 446-715)

**Diferenças chave:**

```javascript
// Browser (linhas 462-471)
if (fileInput instanceof File) {
  // Browser: ler File object para base64
  base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(fileInput);
  });
  mimeType = fileInput.type;  // MIME type vem do File object
}

// Mobile (linhas 477-528)
else if (Platform.OS !== 'web') {
  // Mobile: ler URI para base64
  let FileSystem = require('expo-file-system');
  base64Data = await FileSystem.readAsStringAsync(fileInput, {
    encoding: FileSystem.EncodingType.Base64,
  });
  mimeType = fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';  // MIME type assumido
}
```

---

## ⚠️ Pontos de Atenção

### Mobile
1. **Permissões:** Requer permissões de leitura de arquivo
2. **URI válida:** A URI deve existir e ser acessível
3. **FileSystem:** Depende de `expo-file-system` estar instalado
4. **MIME type:** Precisa ser assumido (não vem do arquivo)

### Browser
1. **File object:** Deve ser um File object válido (não string)
2. **FileReader:** API nativa, mas pode ter limitações de tamanho
3. **MIME type:** Vem automaticamente do File object
4. **CORS:** Gemini API tem CORS habilitado, então funciona no browser

---

## 📊 Resumo das Diferenças

| Aspecto | Mobile | Browser |
|---------|--------|---------|
| **Tipo de entrada** | URI (string) | File object |
| **API de leitura** | `expo-file-system` | `FileReader` |
| **MIME type** | Assumido | Do File object |
| **Debug** | Painel visual + console | Apenas console |
| **Permissões** | Requer permissões | Não requer |
| **Performance** | Mais lento (I/O de arquivo) | Mais rápido (memória) |
| **Dependências** | `expo-file-system` | Nenhuma (nativo) |

---

## 🔧 Como Testar

### Mobile
1. Abrir app no dispositivo/emulador
2. Selecionar PDF
3. Verificar painel de debug (botão "Debug")
4. Verificar logs no console (via ADB ou Expo)

### Browser
1. Abrir app no navegador
2. Selecionar PDF
3. Abrir DevTools (F12)
4. Verificar logs no Console

---

## 📝 Notas Finais

- **Ambos os caminhos** convergem para o mesmo formato: base64 + MIME type
- **A requisição para Gemini** é idêntica em ambos os casos
- **A diferença principal** está na forma de ler o arquivo e obter o base64
- **O prompt e processamento** são idênticos em ambas as plataformas

