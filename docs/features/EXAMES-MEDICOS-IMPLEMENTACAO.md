# 📋 Implementação de Exames Médicos com OCR e Análise Temporal

## ✅ Funcionalidades Implementadas

### 🎯 Visão Geral
Sistema completo para captura, processamento e análise de exames médicos usando OCR, com suporte a **fotos e PDFs**.

---

## 🔧 Backend (FastAPI + PostgreSQL)

### 📦 Dependências Adicionadas
- `pytesseract==0.3.10` - OCR
- `Pillow==10.1.0` - Processamento de imagens
- `PyMuPDF==1.23.8` - Processamento de PDFs
- `aiofiles==23.2.1` - Upload de arquivos
- `python-dateutil==2.8.2` - Parsing de datas

### 🗄️ Modelos de Dados

#### MedicalExam
- `id` - ID único
- `exam_date` - Data do exame (extraída ou informada)
- `exam_type` - Tipo de exame (ex: "Hemograma", "Glicemia")
- `image_base64` - Imagem ou PDF em base64
- `file_type` - Tipo de arquivo: "image" ou "pdf"
- `raw_ocr_text` - Texto bruto extraído pelo OCR
- `extracted_data` - Dados estruturados (JSON com parâmetros)
- `processing_status` - Status: "pending", "processing", "completed", "error"
- `processing_error` - Mensagem de erro se houver
- `created_at`, `updated_at` - Timestamps

#### ExamDataPoint
- `id` - ID único
- `exam_id` - FK para medical_exams
- `parameter_name` - Nome do parâmetro (ex: "hemoglobina")
- `value` - Valor do parâmetro
- `numeric_value` - Valor numérico (para ordenação)
- `unit` - Unidade de medida (ex: "g/dL")
- `reference_range_min` - Valor mínimo de referência
- `reference_range_max` - Valor máximo de referência
- `exam_date` - Data do exame (para queries temporais)
- `created_at` - Timestamp

### 🔌 Endpoints da API

```
POST   /api/medical-exams              - Upload de exame (foto ou PDF)
GET    /api/medical-exams              - Lista todos os exames
GET    /api/medical-exams/{id}         - Detalhes de um exame
PUT    /api/medical-exams/{id}         - Atualizar exame
DELETE /api/medical-exams/{id}         - Deletar exame
GET    /api/medical-exams/{id}/timeline/{parameter} - Dados temporais para gráfico
```

### ⚙️ Processamento

#### OCR Service (`ocr_service.py`)
- Suporta imagens (JPEG, PNG) e PDFs
- Para PDFs: converte primeira página para imagem usando PyMuPDF
- Usa Tesseract OCR com idioma português
- Melhora qualidade da imagem antes do OCR
- Retorna texto extraído

#### Data Extraction (`data_extraction.py`)
- Extrai data do exame usando padrões de data
- Identifica tipo de exame (Hemograma, Glicemia, etc.)
- Extrai parâmetros e valores usando regex
- Identifica unidades de medida
- Extrai faixas de referência
- Processamento genérico (funciona para vários tipos de exame)

#### Processamento Assíncrono
- OCR executado em background usando `BackgroundTasks`
- Status atualizado: pending → processing → completed/error
- Data points salvos automaticamente no banco

### 🐳 Dockerfile
- Tesseract OCR instalado
- Suporte a português (`tesseract-ocr-por`)
- Dependências para PDF (`libmupdf-dev`)

---

## 📱 Frontend (React Native/Expo)

### 📦 Dependências Adicionadas
- `expo-document-picker@14.0.8` - Seleção de PDFs
- `react-native-svg@15.12.1` - Gráficos SVG

### 🖼️ Telas Implementadas

#### 1. Lista de Exames (`app/medical-exams.js`)
- Lista todos os exames cadastrados
- Mostra status de processamento
- Indica quantidade de parâmetros extraídos
- Botão para adicionar novo exame
- Integração com AsyncStorage e backend

#### 2. Novo Exame (`app/medical-exams/new.js`)
- **Suporte a fotos:**
  - Câmera
  - Galeria
- **Suporte a PDFs:**
  - Seleção de arquivo PDF
- Preview do arquivo selecionado
- Envio para backend com processamento assíncrono

#### 3. Detalhes do Exame (`app/medical-exams/[id].js`)
- Visualização da imagem ou indicação de PDF
- Status de processamento em tempo real
- Lista de parâmetros extraídos
- Indicação visual de valores fora da faixa de referência
- Botão "Ver evolução temporal" para cada parâmetro
- Pull-to-refresh para atualizar status

#### 4. Gráfico de Linha do Tempo (`app/medical-exams/parameter-timeline.js`)
- Gráfico de evolução temporal do parâmetro
- Mostra todos os valores históricos
- Linhas de referência (faixa normal)
- Lista de valores registrados
- Informações sobre faixa de referência

#### 5. Componente LineChart (`components/LineChart.js`)
- Gráfico SVG nativo (sem dependências pesadas)
- Suporta múltiplos pontos de dados
- Linhas de referência opcionais
- Formatação de datas e valores
- Responsivo

### 🎨 Interface
- Design consistente com o resto do app
- Botões grandes para fácil acesso
- Cores distintas para identificação
- Feedback visual claro
- Suporte offline (AsyncStorage)

---

## 🔄 Fluxo Completo

```
1. Usuário abre "Exames Médicos" na tela principal
   ↓
2. Tela de lista mostra exames cadastrados
   ↓
3. Usuário clica em "+ Adicionar Exame"
   ↓
4. Escolhe: Foto (Câmera/Galeria) ou PDF
   ↓
5. Preview do arquivo selecionado
   ↓
6. Clica em "Enviar Exame"
   ↓
7. App envia para backend (base64)
   ↓
8. Backend recebe e salva no PostgreSQL
   ↓
9. Processamento assíncrono:
   - Se PDF: converte primeira página para imagem
   - Executa OCR (Tesseract)
   - Extrai dados com regex
   - Salva parâmetros como ExamDataPoint
   ↓
10. Status atualizado: processing → completed
    ↓
11. Usuário vê detalhes do exame com parâmetros extraídos
    ↓
12. Usuário clica em "Ver evolução temporal" de um parâmetro
    ↓
13. Gráfico mostra histórico completo do parâmetro
```

---

## 📊 Características Técnicas

### OCR
- **Ferramenta:** Tesseract OCR
- **Idioma:** Português (por)
- **Processamento:**
  - Redimensionamento para melhor qualidade
  - Conversão para escala de cinza
  - Configuração otimizada (--psm 6)

### Extração de Dados
- **Método:** Regex + regras
- **Genérico:** Funciona para vários tipos de exame
- **Extrai:**
  - Data do exame
  - Tipo de exame
  - Parâmetros e valores
  - Unidades de medida
  - Faixas de referência

### Análise Temporal
- Armazena histórico de cada parâmetro
- Gráfico de linha do tempo
- Identifica valores fora da faixa normal
- Visualização clara da evolução

---

## 🚀 Como Usar

### 1. Backend

#### Instalar dependências:
```bash
cd backend
pip install -r requirements.txt
```

#### Executar:
```bash
# Com Docker
docker-compose up -d

# Ou diretamente
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend

#### Instalar dependências:
```bash
cd SaudeNold
npm install
```

#### Executar:
```bash
npm start
```

### 3. Uso no App

1. **Adicionar Exame:**
   - Menu principal → "Exames Médicos"
   - Clique em "+ Adicionar Exame"
   - Escolha: Foto ou PDF
   - Selecione/tire a foto ou escolha o PDF
   - Clique em "Enviar Exame"

2. **Ver Exames:**
   - Lista mostra todos os exames
   - Status de processamento visível
   - Clique em um exame para ver detalhes

3. **Ver Evolução:**
   - Na tela de detalhes
   - Clique em "Ver evolução temporal" de um parâmetro
   - Gráfico mostra histórico completo

---

## 📝 Notas Importantes

### PDFs
- Apenas a primeira página é processada
- Conversão para imagem com zoom 2x (melhor qualidade OCR)
- Funciona com PDFs de laboratórios

### Performance
- OCR pode levar alguns segundos (processamento assíncrono)
- Imagens são comprimidas antes do envio
- Gráficos renderizados localmente (SVG nativo)

### Compatibilidade
- Funciona offline (AsyncStorage)
- Sincroniza com backend quando disponível
- Suporta celulares comuns (otimizado)

---

## 🔮 Melhorias Futuras Possíveis

1. **Processar múltiplas páginas de PDF**
2. **Melhorar extração com ML específico**
3. **Suporte a mais tipos de exame**
4. **Notificações quando processamento completar**
5. **Exportar gráficos como imagem**
6. **Comparação entre diferentes parâmetros**
7. **Alertas automáticos para valores críticos**

---

## ✅ Status

- ✅ Backend completo
- ✅ Frontend completo
- ✅ Suporte a fotos
- ✅ Suporte a PDFs
- ✅ OCR funcional
- ✅ Extração de dados
- ✅ Gráficos de linha do tempo
- ✅ Interface amigável
- ✅ Funciona offline

**Sistema pronto para uso!** 🎉







