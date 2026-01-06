# Extração de Dados com LLM Gratuita

## Visão Geral

Implementamos integração com LLMs gratuitas para melhorar a extração de dados de exames médicos. A LLM é mais inteligente que regex e consegue:
- ✅ **IGNORAR** dados irrelevantes (telefones, endereços, CPF, RG, nomes)
- ✅ **EXTRAIR** apenas informações médicas relevantes
- ✅ **ENTENDER** contexto e formatos variados de exames

## Como Funciona

1. **OCR extrai texto** do PDF/imagem
2. **LLM analisa o texto** e extrai dados estruturados em JSON
3. **Fallback automático**: Se LLM falhar, usa método tradicional (regex)

## LLMs Implementadas

### 1. Hugging Face Inference API (Gratuita, sem chave)
- **Modelo**: Mistral-7B-Instruct
- **Vantagem**: Não requer chave de API
- **Limitação**: Pode estar lenta se o modelo não estiver carregado

### 2. Google Gemini (Gratuita, requer chave)
- **Vantagem**: Muito rápida e precisa
- **Limitação**: Requer chave de API (mas tier gratuito generoso)

### 3. Groq API (Gratuita, requer chave)
- **Vantagem**: Extremamente rápida
- **Limitação**: Requer chave de API

## Estrutura de Dados Retornada

```json
{
  "exam_date": "2025-01-15",
  "exam_type": "Hemograma Completo",
  "parameters": [
    {
      "name": "Hemoglobina",
      "value": "14.5",
      "numeric_value": "14.5",
      "unit": "g/dL",
      "reference_range_min": "12.0",
      "reference_range_max": "16.0"
    }
  ]
}
```

## Configuração

### Para usar Groq (recomendado - mais rápido):

1. Obtenha chave gratuita em: https://console.groq.com/
2. Adicione no código (ou variável de ambiente):

```javascript
// Em llmDataExtraction.js, descomente e adicione:
const GROQ_API_KEY = 'sua-chave-aqui';
```

### Para usar Gemini:

1. Obtenha chave gratuita em: https://makersuite.google.com/app/apikey
2. Adicione no código

## Fluxo de Processamento

```
OCR Text → LLM → JSON Estruturado → Banco de Dados
              ↓ (se falhar)
         Regex Tradicional → Banco de Dados
```

## Vantagens da LLM

1. **Inteligência Contextual**: Entende que "Telefone: (11) 99999-9999" não é parâmetro médico
2. **Flexibilidade**: Funciona com formatos variados de exames
3. **Precisão**: Extrai apenas dados médicos relevantes
4. **Fallback Automático**: Se falhar, usa método tradicional

## Logs

O sistema mostra logs claros:
- ✅ `LLM extraiu X parâmetros` - Sucesso
- ⚠️ `LLM falhou, usando método tradicional` - Fallback
- ❌ `Todas as LLMs falharam` - Usa regex

## Próximos Passos

1. Testar com diferentes tipos de exames
2. Ajustar prompts se necessário
3. Adicionar mais LLMs se quiser (Together AI, OpenRouter, etc)


