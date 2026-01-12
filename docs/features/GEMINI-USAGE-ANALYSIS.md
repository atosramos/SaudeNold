# Análise: Uso do Gemini AI no SaudeNold

## 📊 Resumo Executivo

O Google Gemini AI está sendo utilizado em **2 funcionalidades principais** do aplicativo, com potencial para expansão em **3 áreas adicionais**.

---

## ✅ Funcionalidades que JÁ utilizam Gemini

### 1. 📋 **Exames Médicos** (`app/medical-exams/new.js`)
**Status:** ✅ **Implementado e Funcionando**

**Como funciona:**
- Usuário tira foto ou seleciona PDF de exame médico
- Gemini analisa diretamente o arquivo (sem OCR intermediário)
- Extrai automaticamente:
  - Data do exame
  - Tipo de exame
  - Parâmetros médicos (nome, valor, unidade, faixa de referência)
  - Status (Normal/Alterado)

**Função utilizada:**
- `extractDataWithGeminiDirect()` em `services/llmDataExtraction.js`

**Características:**
- ✅ Suporta PDFs e imagens
- ✅ Processamento multimodal (análise direta do arquivo)
- ✅ Extração estruturada em JSON
- ✅ Suporta múltiplos exames no mesmo documento
- ✅ Combina dados de múltiplas páginas de PDF

**Configuração necessária:**
- `EXPO_PUBLIC_GEMINI_API_KEY` configurada

---

### 2. 📊 **Acompanhamento Diário** (`app/daily-tracking/new.js`)
**Status:** ✅ **Implementado e Funcionando**

**Como funciona:**
- Usuário tira foto de aparelho médico (pressão, termômetro, glicosímetro, etc.)
- Gemini analisa a imagem e extrai valores automaticamente
- Tipos de dados suportados:
  - Pressão arterial (sistólica/diastólica)
  - Temperatura (°C ou °F)
  - Batimentos cardíacos (bpm)
  - Insulina (UI)
  - Glicose (mg/dL)
  - Peso (kg)
  - Saturação de oxigênio (%)

**Função utilizada:**
- `extractTrackingDataFromImage()` em `services/dailyTrackingOCR.js`

**Características:**
- ✅ Análise de imagens de dispositivos médicos
- ✅ Extração automática de valores numéricos
- ✅ Conversão automática de unidades (Fahrenheit → Celsius)
- ✅ Criação automática de registros estruturados

**Configuração necessária:**
- `EXPO_PUBLIC_GEMINI_API_KEY` configurada

---

## 🔍 Funcionalidades que PODERIAM utilizar Gemini

### 3. 💊 **Medicamentos** (`app/medications/new.js`)
**Status:** ❌ **Não implementado** (apenas foto armazenada)

**Potencial de uso:**
- **Leitura de receita médica:**
  - Extrair nome do medicamento
  - Extrair dosagem
  - Extrair horários de administração
  - Extrair observações (ex: "em jejum", "com alimentos")
  
- **Leitura de bula:**
  - Extrair informações importantes
  - Identificar contraindicações
  - Extrair interações medicamentosas

**Implementação sugerida:**
```javascript
// Adicionar botão "Ler Receita com Gemini" na tela de novo medicamento
const processPrescriptionWithGemini = async (imageUri) => {
  const extractedData = await extractPrescriptionData(imageUri, GEMINI_API_KEY);
  // Preencher automaticamente:
  // - name: extractedData.medicationName
  // - dosage: extractedData.dosage
  // - schedules: extractedData.schedules
  // - notes: extractedData.notes
};
```

**Benefícios:**
- ✅ Reduz erros de digitação
- ✅ Economiza tempo ao cadastrar medicamentos
- ✅ Facilita para idosos (apenas tirar foto da receita)

---

### 4. 🏥 **Anamnese** (`app/anamnesis.js`)
**Status:** ❌ **Não implementado** (apenas formulário manual)

**Potencial de uso:**
- **Leitura de documentos médicos:**
  - Extrair informações de prontuários antigos
  - Extrair histórico médico de documentos
  - Extrair alergias de documentos
  - Extrair cirurgias anteriores
  - Extrair condições médicas

**Implementação sugerida:**
```javascript
// Adicionar opção "Importar de Documento" na tela de anamnese
const importAnamnesisFromDocument = async (imageUri) => {
  const extractedData = await extractAnamnesisData(imageUri, GEMINI_API_KEY);
  // Preencher automaticamente:
  // - age, gender, bloodType
  // - allergies, conditions, surgeries
  // - familyHistory, currentMedications
  // - systemReview
};
```

**Benefícios:**
- ✅ Facilita migração de prontuários físicos para digital
- ✅ Reduz tempo de preenchimento
- ✅ Evita erros de transcrição

---

### 5. 📞 **Contatos de Emergência** (`app/emergency-contacts/new.js`)
**Status:** ❌ **Não implementado** (apenas cadastro manual)

**Potencial de uso:**
- **Leitura de cartão de visita médico:**
  - Extrair nome do médico
  - Extrair telefone
  - Extrair especialidade
  - Extrair endereço (opcional)

- **Leitura de documento de identidade:**
  - Extrair nome do contato
  - Extrair telefone (se visível)
  - Extrair parentesco (se mencionado)

**Implementação sugerida:**
```javascript
// Adicionar botão "Ler Cartão/Documento" na tela de novo contato
const processContactCardWithGemini = async (imageUri) => {
  const extractedData = await extractContactData(imageUri, GEMINI_API_KEY);
  // Preencher automaticamente:
  // - name: extractedData.name
  // - phone: extractedData.phone
  // - relationship: extractedData.relationship
};
```

**Benefícios:**
- ✅ Facilita cadastro de contatos
- ✅ Reduz erros de digitação
- ✅ Útil para cadastrar médicos e profissionais de saúde

---

## 📝 Resumo das Funções Gemini Disponíveis

### Funções Implementadas

1. **`extractDataWithGeminiDirect(fileInput, fileType, apiKey, addDebugLog)`**
   - **Uso:** Exames médicos (PDFs e imagens)
   - **Localização:** `services/llmDataExtraction.js`
   - **Retorna:** Objeto com `exam_date`, `exam_type`, `parameters[]`

2. **`extractTrackingDataFromImage(imageUri, apiKey, addDebugLog)`**
   - **Uso:** Acompanhamento diário (imagens de dispositivos)
   - **Localização:** `services/dailyTrackingOCR.js`
   - **Retorna:** Objeto com valores de saúde (pressão, temperatura, etc.)

3. **`extractDataWithGemini(ocrText, apiKey)`**
   - **Uso:** Extração de dados de texto OCR (fallback)
   - **Localização:** `services/llmDataExtraction.js`
   - **Retorna:** Objeto estruturado de exame médico

### Funções que Poderiam ser Criadas

1. **`extractPrescriptionData(imageUri, apiKey)`**
   - **Uso:** Leitura de receitas médicas
   - **Retornaria:** `{ medicationName, dosage, schedules[], notes }`

2. **`extractAnamnesisData(imageUri, apiKey)`**
   - **Uso:** Leitura de prontuários/documentos médicos
   - **Retornaria:** Objeto completo de anamnese

3. **`extractContactData(imageUri, apiKey)`**
   - **Uso:** Leitura de cartões de visita/documentos
   - **Retornaria:** `{ name, phone, relationship, address? }`

---

## 🎯 Recomendações de Implementação

### Prioridade Alta
1. **Medicamentos - Leitura de Receita** ⭐⭐⭐
   - Alto impacto na usabilidade
   - Facilita muito o cadastro para idosos
   - Reduz erros de digitação

### Prioridade Média
2. **Anamnese - Importação de Documentos** ⭐⭐
   - Útil para migração de dados
   - Facilita preenchimento inicial
   - Menos frequente que receitas

### Prioridade Baixa
3. **Contatos - Leitura de Cartões** ⭐
   - Funcionalidade menos crítica
   - Cadastro manual já é simples
   - Benefício menor

---

## 🔧 Configuração Necessária

Todas as funcionalidades que usam Gemini requerem:

```env
EXPO_PUBLIC_GEMINI_API_KEY=sua-chave-aqui
```

**Para desenvolvimento local:**
- Criar arquivo `.env` na raiz do projeto
- Adicionar a chave acima
- Fazer rebuild do app (`npm run android` ou `npm run ios`)

**Para produção:**
- Configurar via EAS Secrets:
  ```bash
  eas secret:create --scope project --name EXPO_PUBLIC_GEMINI_API_KEY --value sua-chave
  ```

---

## 📊 Estatísticas de Uso Atual

- **Funcionalidades com Gemini:** 2 de 8 principais
- **Taxa de utilização:** 25%
- **Potencial de expansão:** +3 funcionalidades (37.5% adicional)

---

## 🔗 Arquivos Relacionados

- `services/llmDataExtraction.js` - Funções principais do Gemini
- `services/dailyTrackingOCR.js` - Extração de dados de acompanhamento
- `app/medical-exams/new.js` - Tela de exames médicos
- `app/daily-tracking/new.js` - Tela de acompanhamento diário
- `docs/features/LLM-EXTRACAO-DADOS.md` - Documentação técnica

---

**Última atualização:** Janeiro 2025
