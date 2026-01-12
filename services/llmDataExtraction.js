/**
 * Serviço de extração de dados usando LLM gratuita
 * Usa Hugging Face Inference API (gratuita) para melhorar extração de dados
 * 
 * NOTA: No browser, LLMs têm problemas de CORS, então usamos apenas método tradicional (regex)
 * No mobile, tentamos LLM primeiro e fazemos fallback para regex se necessário
 */

import { Platform } from 'react-native';

/**
 * Lista modelos disponíveis do Gemini
 * @param {string} apiKey - Chave de API do Gemini
 * @returns {Promise<Array>} Lista de modelos disponíveis
 */
export const listAvailableGeminiModels = async (apiKey) => {
  try {
    console.log('Listando modelos disponíveis do Gemini...');
    
    // Tentar v1beta primeiro
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      // Tentar v1 se v1beta falhar
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
      );
    }
    
    if (!response.ok) {
      throw new Error(`Erro ao listar modelos: ${response.status}`);
    }
    
    const data = await response.json();
    const models = data.models || [];
    
    console.log(`Encontrados ${models.length} modelos disponíveis`);
    
    // Filtrar modelos que suportam generateContent e processamento de documentos
    const supportedModels = models.filter(model => {
      const supportsGenerateContent = model.supportedGenerationMethods?.includes('generateContent');
      const name = model.name || '';
      // Modelos que suportam documentos: gemini-1.5, gemini-2.0, gemini-2.5, gemini-3.0, etc
      const supportsDocuments = name.includes('gemini-1.5') || 
                                name.includes('gemini-2.0') || 
                                name.includes('gemini-2.5') || 
                                name.includes('gemini-3.0') || 
                                name.includes('gemini-pro');
      return supportsGenerateContent && supportsDocuments;
    });
    
    console.log(`${supportedModels.length} modelos suportam processamento de documentos`);
    
    return supportedModels.map(model => ({
      name: model.name?.split('/').pop() || model.name,
      fullName: model.name,
      displayName: model.displayName || model.name,
      version: model.name?.includes('v1beta') ? 'v1beta' : 'v1'
    }));
  } catch (error) {
    console.error('Erro ao listar modelos Gemini:', error);
    return [];
  }
};

/**
 * Extrai dados estruturados usando LLM gratuita
 * @param {string} ocrText - Texto extraído do OCR
 * @returns {Promise<Object>} Dados estruturados do exame
 */
export const extractDataWithLLM = async (ocrText) => {
  try {
    console.log('Tentando extrair dados usando LLM...');
    
    // Prompt estruturado para a LLM
    const prompt = `Você é um especialista em análise de exames médicos. Analise o seguinte texto de um exame médico e extraia APENAS informações relevantes para exames médicos.

IMPORTANTE:
- IGNORE telefones, endereços, nomes de pessoas, CPF, RG
- EXTRAIA apenas: data do exame, tipo de exame, parâmetros médicos com valores, unidades e faixas de referência
- Retorne APENAS um JSON válido, sem texto adicional

Formato esperado:
{
  "exam_date": "YYYY-MM-DD" ou null,
  "exam_type": "tipo do exame" ou null,
  "parameters": [
    {
      "name": "nome do parâmetro",
      "value": "valor original",
      "numeric_value": "valor numérico" ou null,
      "unit": "unidade" ou null,
      "reference_range_min": "valor mínimo" ou null,
      "reference_range_max": "valor máximo" ou null
    }
  ]
}

Texto do exame:
${ocrText.substring(0, 3000)}${ocrText.length > 3000 ? '...' : ''}

Retorne APENAS o JSON, sem markdown, sem explicações:`;

    // Tentar usar Hugging Face Inference API (gratuita)
    const response = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.1, // Baixa temperatura para respostas mais determinísticas
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    
    // Extrair JSON da resposta
    let jsonText = '';
    if (Array.isArray(data) && data[0]?.generated_text) {
      jsonText = data[0].generated_text;
    } else if (data.generated_text) {
      jsonText = data.generated_text;
    } else if (typeof data === 'string') {
      jsonText = data;
    }

    // Limpar o texto para extrair apenas JSON
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Tentar encontrar JSON no texto
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      console.log('Dados extraídos pela LLM:', extracted);
      return extracted;
    }

    throw new Error('Não foi possível extrair JSON da resposta da LLM');
  } catch (error) {
    console.error('Erro ao usar LLM para extração:', error);
    return null; // Retornar null para usar fallback
  }
};

/**
 * Extrai dados usando Groq API (gratuita, rápida)
 * Requer chave de API (mas tem tier gratuito generoso)
 */
export const extractDataWithGroq = async (ocrText, apiKey = null) => {
  if (!apiKey) {
    return null; // Requer chave
  }

  try {
    console.log('Tentando extrair dados usando Groq API...');
    
    const prompt = `Analise este texto de exame médico. Extraia APENAS dados médicos. IGNORE telefones, endereços, CPF, RG, nomes.

Retorne APENAS JSON:
{
  "exam_date": "YYYY-MM-DD" ou null,
  "exam_type": "tipo" ou null,
  "parameters": [{"name": "...", "value": "...", "numeric_value": "...", "unit": "...", "reference_range_min": "...", "reference_range_max": "..."}]
}

Texto: ${ocrText.substring(0, 3000)}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Você é um especialista em extrair dados de exames médicos. Retorne APENAS JSON válido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const jsonText = data.choices[0]?.message?.content || '';
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      if (extracted.parameters && extracted.parameters.length > 0) {
        return extracted;
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao usar Groq:', error);
    return null;
  }
};

/**
 * Extrai dados usando Hugging Face com modelo adequado para extração
 */
export const extractDataWithHuggingFace = async (ocrText) => {
  try {
    console.log('Tentando extrair dados usando Hugging Face...');
    
    const prompt = `Analise este texto de exame médico. Extraia APENAS dados médicos (parâmetros, valores, unidades, faixas de referência, data, tipo). IGNORE telefones, endereços, CPF, RG, nomes.

Retorne APENAS JSON:
{
  "exam_date": "YYYY-MM-DD" ou null,
  "exam_type": "tipo" ou null,
  "parameters": [{"name": "...", "value": "...", "numeric_value": "...", "unit": "...", "reference_range_min": "...", "reference_range_max": "..."}]
}

Texto: ${ocrText.substring(0, 2000)}`;

    // Usar modelo de texto adequado do Hugging Face
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 1500,
            temperature: 0.1,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      // Se o modelo estiver carregando, aguardar
      if (response.status === 503) {
        const data = await response.json();
        const waitTime = data.estimated_time || 10;
        console.log(`Modelo carregando, aguardando ${waitTime}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        // Tentar novamente
        return await extractDataWithHuggingFace(ocrText);
      }
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    
    // Extrair JSON da resposta
    let jsonText = '';
    if (Array.isArray(data) && data[0]?.generated_text) {
      jsonText = data[0].generated_text;
    } else if (data.generated_text) {
      jsonText = data.generated_text;
    } else if (typeof data === 'string') {
      jsonText = data;
    }

    // Limpar e extrair JSON
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      if (extracted.parameters && extracted.parameters.length > 0) {
        console.log('Dados extraídos pela LLM:', extracted);
        return extracted;
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao usar Hugging Face:', error);
    return null;
  }
};

/**
 * Extrai dados usando Google Gemini (gratuita)
 */
export const extractDataWithGemini = async (ocrText, apiKey = null) => {
  // Se não tiver chave, retornar null (pular para próxima LLM)
  if (!apiKey) {
    console.log('Gemini: Chave de API não fornecida. Pule para próxima LLM.');
    return null;
  }

  try {
    console.log('Tentando extrair dados usando Google Gemini...');
    
    const prompt = `Você é um especialista em análise de exames médicos. Analise o texto abaixo e extraia APENAS informações médicas relevantes.

REGRAS IMPORTANTES:
- IGNORE completamente: telefones, endereços, CPF, RG, nomes de pessoas, emails
- EXTRAIA apenas: data do exame, tipo de exame, parâmetros médicos com valores numéricos, unidades e faixas de referência
- Se um parâmetro não tiver valor numérico, NÃO inclua
- Retorne APENAS um JSON válido, sem markdown, sem explicações

Formato JSON obrigatório:
{
  "exam_date": "YYYY-MM-DD" ou null,
  "exam_type": "tipo do exame" ou null,
  "parameters": [
    {
      "name": "nome do parâmetro médico",
      "value": "valor original completo",
      "numeric_value": "apenas o número" ou null,
      "unit": "unidade (g/dL, mg/dL, etc)" ou null,
      "reference_range_min": "valor mínimo" ou null,
      "reference_range_max": "valor máximo" ou null
    }
  ]
}

Texto do exame:
${ocrText.substring(0, 30000)}${ocrText.length > 30000 ? '...' : ''}

Retorne APENAS o JSON:`;

    // Gemini API - tentar múltiplas combinações de versões e modelos
    // A API do Gemini mudou, vamos tentar várias combinações conhecidas
    // Primeiro, tentar listar modelos disponíveis
    let availableModels = [];
    try {
      availableModels = await listAvailableGeminiModels(apiKey);
      console.log(`Encontrados ${availableModels.length} modelos Gemini disponíveis`);
    } catch (error) {
      console.log('Não foi possível listar modelos, usando lista padrão');
    }

    // Se encontrou modelos, usar eles; senão, usar lista padrão
    const attempts = availableModels.length > 0
      ? availableModels.map(m => ({ version: m.version, model: m.name }))
      : [
          { version: 'v1', model: 'gemini-1.5-flash' },
          { version: 'v1', model: 'gemini-1.5-pro' },
          { version: 'v1beta', model: 'gemini-pro' },
        ];
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2000,
      }
    };
    
    let response = null;
    let lastError = null;
    let successfulAttempt = null;
    
    // Tentar cada combinação até uma funcionar
    for (const attempt of attempts) {
      const url = `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${apiKey}`;
      console.log(`Tentando Gemini ${attempt.version}/${attempt.model}...`);
      
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (response.ok) {
          console.log(`✅ Gemini ${attempt.version}/${attempt.model} funcionou!`);
          successfulAttempt = attempt;
          break;
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = `Erro ${response.status}: ${JSON.stringify(errorData)}`;
          console.log(`❌ Gemini ${attempt.version}/${attempt.model} falhou: ${lastError}`);
          response = null;
        }
      } catch (error) {
        lastError = error.message;
        console.log(`❌ Gemini ${attempt.version}/${attempt.model} erro: ${lastError}`);
        response = null;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Todos os modelos Gemini falharam. Último erro: ${lastError}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      console.log('Gemini: Resposta vazia');
      return null;
    }

    // Extrair JSON da resposta
    let jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      if (extracted.parameters && Array.isArray(extracted.parameters) && extracted.parameters.length > 0) {
        console.log(`✅ Gemini extraiu ${extracted.parameters.length} parâmetros`);
        return extracted;
      }
    }

    console.log('Gemini: Não foi possível extrair JSON válido da resposta');
    return null;
  } catch (error) {
    console.error('Erro ao usar Gemini:', error);
    return null;
  }
};

/**
 * Extrai dados usando Google Gemini diretamente de um arquivo (PDF ou imagem)
 * @param {File|string} fileInput - File object (browser) ou URI (mobile)
 * @param {string} fileType - Tipo de arquivo ('image' ou 'pdf')
 * @param {string} apiKey - Chave de API do Gemini
 * @returns {Promise<Object|null>} Dados estruturados do exame ou null
 */
export const extractDataWithGeminiDirect = async (fileInput, fileType, apiKey, addDebugLog = null) => {
  if (!apiKey) {
    const msg = 'Gemini Direct: Chave de API não fornecida. Pule.';
    console.log(msg);
    if (addDebugLog) addDebugLog(msg, 'warning');
    return null;
  }

  try {
    const msg = 'Tentando extrair dados diretamente com Google Gemini (multimodal)...';
    console.log(msg);
    if (addDebugLog) addDebugLog(msg, 'info');

    let base64Data;
    let mimeType;

    if (fileInput instanceof File) {
      // Browser: ler File object para base64
      console.log('Gemini Direct: Lendo File object para base64...');
      base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(fileInput);
      });
      mimeType = fileInput.type;
    } else if (typeof fileInput === 'string' && fileInput.startsWith('data:')) {
      // Browser: já é data URL
      console.log('Gemini Direct: Extraindo base64 de data URL...');
      base64Data = fileInput.split(',')[1];
      mimeType = fileInput.split(';')[0].split(':')[1];
    } else if (Platform.OS !== 'web') {
      // Mobile: ler URI para base64
      const msg = 'Gemini Direct: Lendo URI para base64 (mobile)...';
      console.log(msg);
      if (addDebugLog) addDebugLog(msg, 'info');
      console.log('📱 URI do arquivo:', fileInput?.substring?.(0, 100) || fileInput);
      
      try {
        let FileSystem;
        try {
          FileSystem = require('expo-file-system');
          const successMsg = '✅ FileSystem importado com sucesso';
          console.log(successMsg);
          if (addDebugLog) addDebugLog(successMsg, 'success');
        } catch (importError) {
          const errorMsg = `❌ Erro ao importar FileSystem: ${importError.message}`;
          console.error(errorMsg, importError);
          if (addDebugLog) addDebugLog(errorMsg, 'error');
          throw new Error(`Não foi possível importar expo-file-system: ${importError.message}`);
        }
        
        if (!fileInput || typeof fileInput !== 'string') {
          throw new Error(`URI inválida: ${typeof fileInput}`);
        }
        
        const readingMsg = '📖 Lendo arquivo do sistema de arquivos...';
        console.log(readingMsg);
        if (addDebugLog) addDebugLog(readingMsg, 'info');
        
        base64Data = await FileSystem.readAsStringAsync(fileInput, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const readSuccessMsg = `✅ Arquivo lido, tamanho base64: ${base64Data?.length || 0}`;
        console.log(readSuccessMsg);
        if (addDebugLog) addDebugLog(readSuccessMsg, 'success');
        
        if (!base64Data || base64Data.length === 0) {
          throw new Error('Arquivo lido está vazio');
        }
        
        mimeType = fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'; // Assumir para mobile
        const mimeMsg = `✅ MIME type definido: ${mimeType}`;
        console.log(mimeMsg);
        if (addDebugLog) addDebugLog(mimeMsg, 'success');
      } catch (readError) {
        const errorMsg = `❌ Erro ao ler arquivo no mobile: ${readError.message}`;
        console.error(errorMsg, readError);
        console.error('❌ Stack trace:', readError.stack);
        if (addDebugLog) addDebugLog(errorMsg, 'error');
        throw new Error(`Erro ao ler arquivo no mobile: ${readError.message}`);
      }
    } else {
      throw new Error('Formato de arquivo não suportado no browser');
    }

    if (!base64Data || base64Data.length === 0) {
      throw new Error('Dados do arquivo vazios para Gemini Direct.');
    }
    
    console.log('✅ Base64 preparado, tamanho:', base64Data.length, 'bytes');

    // Prompt específico para PDFs (processar página por página)
    const isPdf = fileType === 'pdf' || mimeType === 'application/pdf';
    const pdfInstructions = isPdf ? `
CRÍTICO PARA PDFs: Este é um documento PDF que pode ter múltiplas páginas. 
- Processe CADA PÁGINA separadamente
- Extraia TODOS os dados de TODAS as páginas
- Combine todos os parâmetros de todas as páginas em uma única lista
- Se houver múltiplos exames em páginas diferentes, combine-os todos
- NÃO ignore nenhuma página do PDF
- Se o PDF tiver muitas páginas, processe todas elas e inclua todos os dados
` : '';

    const prompt = `Atue como um extrator de dados de saúde especializado em estruturação de laudos laboratoriais. Analise o documento fornecido para a paciente e retorne os dados estritamente no formato JSON, seguindo a estrutura abaixo.

${pdfInstructions}

IMPORTANTE: Se o documento contiver MÚLTIPLOS exames (ex: Hemograma + Vitamina B12, ou vários exames diferentes), combine TODOS em um único objeto JSON com todos os parâmetros na mesma lista.

Para os valores ideais, utilize o 'Valor de Referência' indicado no laudo que seja compatível com o perfil da paciente.

Estrutura JSON esperada (ÚNICO objeto JSON, mesmo com múltiplos exames):
{
  "paciente": "Nome da Paciente" ou null,
  "data_coleta": "YYYY-MM-DD" ou null,
  "exam_date": "YYYY-MM-DD" ou null,
  "exam_type": "tipo do exame" ou "tipo1 + tipo2" se houver múltiplos exames,
  "parameters": [
    {
      "name": "Nome do Exame/Analito",
      "value": "Valor numérico ou textual",
      "numeric_value": "apenas o número" ou null,
      "unit": "Unidade de medida" ou null,
      "reference_range_min": "Limite inferior (se houver)" ou null,
      "reference_range_max": "Limite superior (se houver)" ou null,
      "valor_referencia_min": "Limite inferior (se houver)" ou null,
      "valor_referencia_max": "Limite superior (se houver)" ou null,
      "status": "Normal/Alterado (baseado na referência)" ou null
    }
  ]
}

Diretrizes Adicionais:
1. Converta vírgulas decimais em pontos para facilitar o processamento numérico (ex: 34,5 vira 34.5)
2. No caso do Hemograma, extraia cada item (Hemácias, Hemoglobina, Leucócitos, etc.) como um objeto individual na lista de parâmetros
3. Para o Perfil Lipídico, utilize as metas de risco cardiovascular como referência para o LDL e Não-HDL
4. Ignore notas de rodapé e textos informativos, focando apenas nos dados quantitativos
5. IGNORE completamente: telefones, endereços, CPF, RG, emails
6. Se um parâmetro não tiver valor numérico, NÃO inclua
7. Se houver múltiplos exames no documento, combine todos os parâmetros em uma única lista "parameters"
8. Se houver múltiplos tipos de exame, combine-os no campo "exam_type" separados por " + " (ex: "HEMOGRAMA + VITAMINA B12")

FORMATO DE RESPOSTA CRÍTICO:
- Retorne APENAS UM objeto JSON válido, mesmo que o documento tenha múltiplos exames
- NÃO retorne múltiplos objetos JSON separados
- Combine todos os parâmetros de todos os exames em uma única lista "parameters"
- O JSON deve estar 100% completo, não truncado
- Fechar todos os arrays com ]
- Fechar todos os objetos com }
- Incluir TODOS os parâmetros de TODOS os exames
- NÃO use markdown code blocks, retorne APENAS o JSON puro
- Se o documento tiver muitos parâmetros, inclua TODOS eles no JSON

IMPORTANTE: Retorne um único JSON válido e completo, sem markdown, sem explicações, sem texto adicional. Se houver múltiplos exames, combine-os em um único objeto JSON.

CRÍTICO: O JSON DEVE ESTAR 100% COMPLETO:
- Todos os arrays devem ser fechados com ]
- Todos os objetos devem ser fechados com }
- Todos os parâmetros devem ser incluídos, mesmo que sejam muitos
- NÃO trunque o JSON no meio de um objeto ou array
- Se o documento tiver muitos parâmetros, inclua TODOS eles, mesmo que o JSON fique grande
- O JSON deve terminar com } (fechamento do objeto principal)`;

    const requestBody = {
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 16384, // Máximo para garantir JSON completo mesmo com muitos parâmetros
      }
    };

    // Tentar listar modelos disponíveis dinamicamente primeiro
    let availableModels = [];
    try {
      availableModels = await listAvailableGeminiModels(apiKey);
      if (addDebugLog) addDebugLog(`Encontrados ${availableModels.length} modelos Gemini disponíveis`, 'info');
      console.log(`Encontrados ${availableModels.length} modelos Gemini disponíveis`);
    } catch (error) {
      console.log('Não foi possível listar modelos dinamicamente, usando lista padrão');
      if (addDebugLog) addDebugLog('Usando lista padrão de modelos', 'warning');
    }

    // Se encontrou modelos dinamicamente, usar eles (priorizando versões mais recentes)
    // Caso contrário, usar lista padrão
    let attempts;
    if (availableModels.length > 0) {
      // Ordenar modelos: versões mais recentes primeiro (3.0 > 2.5 > 2.0 > 1.5)
      // Priorizar Flash sobre Pro (mais rápido)
      const sortedModels = availableModels.sort((a, b) => {
        const getVersion = (name) => {
          if (name.includes('gemini-3.0')) {
            // Priorizar Flash sobre Pro
            return name.includes('flash') ? 3.1 : 3.0;
          }
          if (name.includes('gemini-2.5')) {
            return name.includes('flash') ? 2.6 : 2.5;
          }
          if (name.includes('gemini-2.0')) {
            return name.includes('flash') ? 2.1 : 2.0;
          }
          if (name.includes('gemini-1.5')) {
            return name.includes('flash') ? 1.6 : 1.5;
          }
          return 0;
        };
        return getVersion(b.name) - getVersion(a.name);
      });
      
      attempts = sortedModels.map(m => ({ version: m.version, model: m.name }));
      console.log('Usando modelos dinâmicos (ordenados por versão):', attempts.map(a => `${a.version}/${a.model}`));
    } else {
      // Lista padrão: tentar versões mais recentes primeiro
      // Gemini 3.0 foi lançado em novembro de 2025
      attempts = [
        { version: 'v1', model: 'gemini-3.0-flash' },      // Gemini 3.0 Flash - Mais recente e rápido
        { version: 'v1', model: 'gemini-3.0-pro' },        // Gemini 3.0 Pro - Mais preciso
        { version: 'v1', model: 'gemini-2.0-flash-exp' },  // Gemini 2.0 Flash (experimental)
        { version: 'v1', model: 'gemini-1.5-flash' },      // Gemini 1.5 Flash - Fallback rápido
        { version: 'v1', model: 'gemini-1.5-pro' },        // Gemini 1.5 Pro - Fallback preciso
      ];
      console.log('Usando lista padrão de modelos (incluindo Gemini 3.0)');
    }

    let response = null;
    let lastError = null;
    let successfulAttempt = null;

    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      const url = `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${apiKey}`;
      const attemptMsg = `[${i + 1}/${attempts.length}] Tentando Gemini Direct ${attempt.version}/${attempt.model}...`;
      console.log(attemptMsg);
      if (addDebugLog) addDebugLog(attemptMsg, 'info');

      try {
        if (addDebugLog) addDebugLog(`Enviando requisição para ${attempt.model}...`, 'info');
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const successMsg = `✅ Gemini Direct ${attempt.version}/${attempt.model} funcionou!`;
          console.log(successMsg);
          if (addDebugLog) addDebugLog(successMsg, 'success');
          successfulAttempt = attempt;
          break;
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = `Erro ${response.status}: ${JSON.stringify(errorData)}`;
          const failMsg = `❌ [${i + 1}/${attempts.length}] Gemini Direct ${attempt.version}/${attempt.model} falhou: ${lastError}`;
          console.error(failMsg);
          if (addDebugLog) addDebugLog(failMsg, 'error');
          
          // Se não for o último modelo, informar que vai tentar o próximo
          if (i < attempts.length - 1) {
            const nextMsg = `⚠️ Tentando próximo modelo...`;
            console.log(nextMsg);
            if (addDebugLog) addDebugLog(nextMsg, 'warning');
          }
          response = null;
        }
      } catch (error) {
        lastError = error.message;
        const errorMsg = `❌ [${i + 1}/${attempts.length}] Gemini Direct ${attempt.version}/${attempt.model} erro: ${lastError}`;
        console.error(errorMsg);
        if (addDebugLog) addDebugLog(errorMsg, 'error');
        
        // Se não for o último modelo, informar que vai tentar o próximo
        if (i < attempts.length - 1) {
          const nextMsg = `⚠️ Tentando próximo modelo...`;
          console.log(nextMsg);
          if (addDebugLog) addDebugLog(nextMsg, 'warning');
        }
        response = null;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Todos os modelos Gemini Direct falharam. Último erro: ${lastError}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      console.log('Gemini Direct: Resposta vazia');
      if (addDebugLog) addDebugLog('Gemini Direct: Resposta vazia', 'warning');
      return null;
    }

    // Log da resposta completa para debug
    console.log('Gemini Direct: Resposta completa recebida, tamanho:', text.length);
    if (addDebugLog) {
      addDebugLog(`Resposta recebida: ${text.length} caracteres`, 'info');
      // Mostrar primeiros 500 chars para debug
      addDebugLog(`Primeiros 500 chars: ${text.substring(0, 500)}`, 'info');
    }

    // Tentar múltiplas estratégias para extrair JSON
    let extracted = null;
    
    // Estratégia 1: Tentar parse direto (caso o texto seja JSON puro)
    try {
      extracted = JSON.parse(text.trim());
      console.log('✅ Parse direto funcionou!');
      if (addDebugLog) addDebugLog('✅ Parse direto do JSON funcionou!', 'success');
    } catch (directParseError) {
      // Estratégia 2: Remover markdown code blocks e tentar parse
      // Primeiro, limpar markdown
      let jsonText = text
        .replace(/```json\s*/gi, '')  // Remove ```json
        .replace(/```\s*/g, '')       // Remove ```
        .trim();
      
      // Tentar encontrar TODOS os objetos JSON na resposta
      // Se houver múltiplos exames no PDF, extrair todos e combinar
      function extractAllJsonObjects(text) {
        const objects = [];
        let braceCount = 0;
        let currentStart = -1;
        let inString = false;
        let escapeNext = false;
        
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }
          
          if (inString) continue;
          
          if (char === '{') {
            if (braceCount === 0) {
              currentStart = i; // Início de um novo objeto
            }
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0 && currentStart !== -1) {
              // Encontrou um objeto JSON completo
              const jsonObj = text.substring(currentStart, i + 1);
              objects.push(jsonObj);
              currentStart = -1;
            }
          }
        }
        
        return objects;
      }
      
      // Extrair todos os objetos JSON
      const allJsonObjects = extractAllJsonObjects(jsonText);
      
      if (allJsonObjects.length === 0) {
        // Fallback: tentar encontrar pelo menos um JSON
        const jsonMatch = jsonText.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        } else {
          const firstBraceFallback = jsonText.indexOf('{');
          const lastBraceFallback = jsonText.lastIndexOf('}');
          if (firstBraceFallback !== -1 && lastBraceFallback !== -1 && lastBraceFallback > firstBraceFallback) {
            jsonText = jsonText.substring(firstBraceFallback, lastBraceFallback + 1);
          } else {
            jsonText = text;
            const fallbackMatch = jsonText.match(/\{[\s\S]*?\}/);
            if (fallbackMatch) {
              jsonText = fallbackMatch[0];
            }
          }
        }
      } else if (allJsonObjects.length === 1) {
        // Apenas um objeto JSON
        jsonText = allJsonObjects[0];
        console.log('✅ Extraído 1 objeto JSON da resposta');
        if (addDebugLog) addDebugLog('✅ 1 objeto JSON encontrado', 'info');
      } else {
        // Múltiplos objetos JSON - combinar em um único objeto
        console.log(`✅ Encontrados ${allJsonObjects.length} objetos JSON, combinando...`);
        if (addDebugLog) addDebugLog(`✅ ${allJsonObjects.length} objetos JSON encontrados, combinando parâmetros...`, 'info');
        
        try {
          // Tentar fazer parse de cada objeto
          const parsedObjects = [];
          for (const objStr of allJsonObjects) {
            try {
              const parsed = JSON.parse(objStr);
              parsedObjects.push(parsed);
            } catch (parseError) {
              console.warn('⚠️ Erro ao fazer parse de um objeto JSON:', parseError.message);
              if (addDebugLog) addDebugLog(`⚠️ Erro ao fazer parse de um objeto: ${parseError.message}`, 'warning');
            }
          }
          
          if (parsedObjects.length > 0) {
            // Combinar todos os objetos em um único
            const combined = {
              paciente: parsedObjects[0].paciente || null,
              data_coleta: parsedObjects[0].data_coleta || null,
              exam_date: parsedObjects[0].exam_date || parsedObjects[0].data_coleta || null,
              exam_type: parsedObjects.map(obj => obj.exam_type).filter(Boolean).join(' + ') || parsedObjects[0].exam_type || null,
              parameters: []
            };
            
            // Combinar todos os parâmetros
            for (const obj of parsedObjects) {
              if (obj.parameters && Array.isArray(obj.parameters)) {
                combined.parameters.push(...obj.parameters);
              }
            }
            
            // Converter o objeto combinado de volta para JSON string para processamento posterior
            jsonText = JSON.stringify(combined);
            console.log(`✅ Combinados ${parsedObjects.length} exames em um único objeto com ${combined.parameters.length} parâmetros`);
            if (addDebugLog) addDebugLog(`✅ Combinados ${parsedObjects.length} exames: ${combined.parameters.length} parâmetros totais`, 'success');
          } else {
            // Se não conseguiu fazer parse de nenhum, usar o primeiro
            jsonText = allJsonObjects[0];
            console.warn('⚠️ Não foi possível fazer parse dos objetos, usando o primeiro');
            if (addDebugLog) addDebugLog('⚠️ Usando primeiro objeto JSON (erro ao combinar)', 'warning');
          }
        } catch (combineError) {
          // Se der erro ao combinar, usar o primeiro objeto
          jsonText = allJsonObjects[0];
          console.warn('⚠️ Erro ao combinar objetos JSON, usando o primeiro:', combineError.message);
          if (addDebugLog) addDebugLog(`⚠️ Erro ao combinar: ${combineError.message}, usando primeiro objeto`, 'warning');
        }
      }
      
      if (jsonText && jsonText.startsWith('{')) {
        // Verificar se o JSON está completo antes de tentar parse
        let trimmedJson = jsonText.trim();
        const isComplete = trimmedJson.endsWith('}');
        
        if (!isComplete) {
          console.log('⚠️ JSON parece estar incompleto, tentando completar...');
          if (addDebugLog) addDebugLog('⚠️ JSON incompleto detectado, tentando completar...', 'warning');
          
          // Função auxiliar para completar JSON truncado de forma mais inteligente
          const completeJson = (json) => {
            let result = json.trim();
            
            // Remover vírgulas finais que podem estar causando problemas
            result = result.replace(/,\s*$/, '');
            
            // Contar chaves e colchetes de forma mais precisa
            let depth = 0;
            let inString = false;
            let escapeNext = false;
            let openBraces = 0;
            let closeBraces = 0;
            let openBrackets = 0;
            let closeBrackets = 0;
            
            let lastChar = '';
            for (let i = 0; i < result.length; i++) {
              const char = result[i];
              lastChar = char;
              
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              
              if (char === '\\') {
                escapeNext = true;
                continue;
              }
              
              if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
              }
              
              if (inString) continue;
              
              if (char === '{') openBraces++;
              if (char === '}') closeBraces++;
              if (char === '[') openBrackets++;
              if (char === ']') closeBrackets++;
            }
            
            // Verificar se está no meio de uma string (JSON truncado dentro de string)
            // Se o último caractere não fechado é uma string, fechar ela primeiro
            if (inString) {
              // Está no meio de uma string, fechar a string
              // Se a string não termina com ", adicionar
              if (lastChar !== '"') {
                result += '"';
                if (addDebugLog) addDebugLog('✅ String incompleta fechada', 'info');
              }
            }
            
            // Fechar propriedades incompletas
            // Se termina com vírgula ou está no meio de uma propriedade, tentar fechar
            const trimmed = result.trim();
            const lastNonWhitespace = trimmed.slice(-1);
            
            // Verificar se está no meio de uma propriedade (termina com " ou : ou ,)
            // Se termina com ", pode estar no meio de um valor de string ou no final de uma propriedade
            if (lastNonWhitespace === '"') {
              // Verificar se há um : antes (propriedade completa) ou não (valor incompleto)
              const lastColonIndex = trimmed.lastIndexOf(':');
              const lastQuoteIndex = trimmed.lastIndexOf('"');
              if (lastColonIndex > -1 && lastQuoteIndex > lastColonIndex) {
                // Parece ser um valor de string completo, mas pode estar faltando vírgula ou fechamento
                // Verificar se há mais propriedades esperadas ou se é o final do objeto
                const lastBraceBeforeQuote = trimmed.substring(0, lastQuoteIndex).lastIndexOf('{');
                if (lastBraceBeforeQuote > -1) {
                  // Estamos dentro de um objeto, verificar se precisa fechar
                  const openBracesBefore = (trimmed.substring(0, lastQuoteIndex).match(/\{/g) || []).length;
                  const closeBracesBefore = (trimmed.substring(0, lastQuoteIndex).match(/\}/g) || []).length;
                  if (openBracesBefore > closeBracesBefore) {
                    // Ainda há objetos abertos, mas a propriedade parece completa
                    // Não fazer nada ainda, deixar o fechamento de objetos abaixo tratar
                  }
                }
              }
            }
            
            // Se termina com dois pontos, está no meio de um valor
            if (lastNonWhitespace === ':') {
              // Valor incompleto, adicionar null
              result = result.replace(/:\s*$/, ': null');
              if (addDebugLog) addDebugLog('✅ Valor incompleto completado com null', 'info');
            }
            
            // Se termina com vírgula, pode estar no meio de um objeto dentro de um array
            // Nesse caso, precisamos fechar o objeto atual antes de fechar o array
            if (lastNonWhitespace === ',') {
              // Verificar se estamos dentro de um objeto (há mais { do que })
              // Se sim, fechar o objeto atual primeiro
              const currentOpenBraces = (result.match(/\{/g) || []).length;
              const currentCloseBraces = (result.match(/\}/g) || []).length;
              const currentOpenBrackets = (result.match(/\[/g) || []).length;
              const currentCloseBrackets = (result.match(/\]/g) || []).length;
              
              // Se há mais objetos abertos do que fechados E estamos dentro de um array
              if (currentOpenBraces > currentCloseBraces && currentOpenBrackets > currentCloseBrackets) {
                // Remover a vírgula final e fechar o objeto atual
                result = result.replace(/,\s*$/, '');
                result += '}';
                if (addDebugLog) addDebugLog('✅ Objeto incompleto dentro do array fechado', 'info');
              } else {
                // Caso contrário, apenas remover a vírgula
                result = result.replace(/,\s*$/, '');
              }
            }
            
            // Se não termina com nenhum caractere de fechamento e está dentro de um objeto/array
            // Pode estar truncado no meio de uma propriedade
            if (!['}', ']', ',', '"'].includes(lastNonWhitespace)) {
              const currentOpenBraces = (result.match(/\{/g) || []).length;
              const currentCloseBraces = (result.match(/\}/g) || []).length;
              const currentOpenBrackets = (result.match(/\[/g) || []).length;
              const currentCloseBrackets = (result.match(/\]/g) || []).length;
              
              // Se estamos dentro de um objeto dentro de um array
              if (currentOpenBraces > currentCloseBraces && currentOpenBrackets > currentCloseBrackets) {
                // Verificar se a última linha parece ser uma propriedade incompleta
                const lines = result.split('\n');
                const lastLine = lines[lines.length - 1].trim();
                
                // Se a última linha tem "name": mas não tem valor completo, completar
                if (lastLine.includes('"name"') && !lastLine.includes(',') && !lastLine.endsWith('"')) {
                  // Parece estar no meio de uma propriedade name, fechar o objeto
                  result += '}';
                  if (addDebugLog) addDebugLog('✅ Objeto incompleto (propriedade name) fechado', 'info');
                } else if (lastLine.includes(':') && !lastLine.endsWith('"') && !lastLine.endsWith('}') && !lastLine.endsWith(']')) {
                  // Propriedade incompleta, fechar com null
                  result = result.replace(/:\s*$/, ': null');
                  if (addDebugLog) addDebugLog('✅ Propriedade incompleta completada', 'info');
                }
              }
            }
            
            // Recontar após as modificações
            const finalTrimmed = result.trim();
            const finalOpenBraces = (result.match(/\{/g) || []).length;
            const finalCloseBraces = (result.match(/\}/g) || []).length;
            const finalOpenBrackets = (result.match(/\[/g) || []).length;
            const finalCloseBrackets = (result.match(/\]/g) || []).length;
            
            // Fechar arrays abertos primeiro (dentro de objetos)
            if (finalOpenBrackets > finalCloseBrackets) {
              const missingBrackets = finalOpenBrackets - finalCloseBrackets;
              // Se o último caractere não é ], adicionar fechamento
              if (!finalTrimmed.endsWith(']')) {
                result += ']'.repeat(missingBrackets);
                console.log(`✅ Fechados ${missingBrackets} array(s) aberto(s)`);
                if (addDebugLog) addDebugLog(`✅ Fechados ${missingBrackets} array(s)`, 'info');
              }
            }
            
            // Fechar objetos abertos
            if (finalOpenBraces > finalCloseBraces) {
              const missingBraces = finalOpenBraces - finalCloseBraces;
              // Se o último caractere não é }, adicionar fechamento
              if (!finalTrimmed.endsWith('}')) {
                result += '}'.repeat(missingBraces);
                console.log(`✅ Fechados ${missingBraces} objeto(s) aberto(s)`);
                if (addDebugLog) addDebugLog(`✅ Fechados ${missingBraces} objeto(s)`, 'info');
              }
            }
            
            return result;
          };
          
          trimmedJson = completeJson(trimmedJson);
          jsonText = trimmedJson;
        }
        
        try {
          extracted = JSON.parse(jsonText);
          console.log('✅ Parse após limpeza funcionou!');
          if (addDebugLog) addDebugLog('✅ Parse após limpeza do JSON funcionou!', 'success');
        } catch (cleanParseError) {
          console.error('❌ Erro no parse após limpeza:', cleanParseError.message);
          console.error('❌ Posição do erro:', cleanParseError.message.includes('position') ? cleanParseError.message : 'desconhecida');
          
          // Tentar uma última estratégia: extrair apenas o que está completo
          if (addDebugLog) {
            addDebugLog(`❌ Erro no parse: ${cleanParseError.message}`, 'error');
            
            // Tentar extrair JSON parcial válido
            try {
              // Procurar por um objeto JSON válido dentro do texto
              let partialJson = jsonText;
              
              // Se o erro menciona uma posição, tentar cortar até lá
              const positionMatch = cleanParseError.message.match(/position (\d+)/);
              if (positionMatch) {
                const errorPos = parseInt(positionMatch[1]);
                partialJson = jsonText.substring(0, errorPos);
                // Tentar fechar o JSON parcial
                const openCount = (partialJson.match(/\{/g) || []).length;
                const closeCount = (partialJson.match(/\}/g) || []).length;
                const openBracketCount = (partialJson.match(/\[/g) || []).length;
                const closeBracketCount = (partialJson.match(/\]/g) || []).length;
                
                // Fechar arrays primeiro
                if (openBracketCount > closeBracketCount) {
                  partialJson += ']'.repeat(openBracketCount - closeBracketCount);
                }
                // Fechar objetos
                if (openCount > closeCount) {
                  partialJson += '}'.repeat(openCount - closeCount);
                }
                
                try {
                  extracted = JSON.parse(partialJson);
                  console.log('✅ Parse parcial funcionou após correção!');
                  if (addDebugLog) addDebugLog('✅ Parse parcial funcionou após correção!', 'success');
                } catch (partialError) {
                  console.error('❌ Parse parcial também falhou:', partialError.message);
                }
              }
            } catch (extractError) {
              console.error('❌ Erro ao tentar extrair JSON parcial:', extractError);
            }
            
            // Mostrar mais contexto do JSON tentado
            const previewStart = Math.max(0, jsonText.length - 500);
            addDebugLog(`JSON tentado (últimos 500 chars): ${jsonText.substring(previewStart)}`, 'info');
            // Verificar se o JSON está completo (tem } no final)
            if (!jsonText.trim().endsWith('}')) {
              addDebugLog('⚠️ JSON pode estar incompleto (não termina com })', 'warning');
            }
          }
        }
      } else {
        console.error('❌ Não foi possível encontrar JSON na resposta');
        if (addDebugLog) {
          addDebugLog('❌ Não foi possível encontrar JSON na resposta', 'error');
          addDebugLog(`Texto processado (primeiros 200 chars): ${jsonText.substring(0, 200)}`, 'info');
        }
      }
    }

    // Se conseguiu extrair, processar e normalizar
    if (extracted) {
      // Normalizar dados: usar data_coleta se exam_date não estiver disponível
      if (!extracted.exam_date && extracted.data_coleta) {
        extracted.exam_date = extracted.data_coleta;
      }
      
      // Normalizar campos de referência: usar valor_referencia_* se reference_range_* não estiver disponível
      if (extracted.parameters && Array.isArray(extracted.parameters)) {
        extracted.parameters = extracted.parameters.map(param => {
          if (!param.reference_range_min && param.valor_referencia_min) {
            param.reference_range_min = param.valor_referencia_min;
          }
          if (!param.reference_range_max && param.valor_referencia_max) {
            param.reference_range_max = param.valor_referencia_max;
          }
          // Converter vírgulas em pontos para numeric_value (se necessário)
          if (param.numeric_value && typeof param.numeric_value === 'string') {
            param.numeric_value = param.numeric_value.replace(',', '.');
          }
          return param;
        });
      }
      
      if (extracted.parameters && Array.isArray(extracted.parameters) && extracted.parameters.length > 0) {
        const successMsg = `✅ Gemini Direct extraiu ${extracted.parameters.length} parâmetros`;
        console.log(successMsg);
        if (addDebugLog) addDebugLog(successMsg, 'success');
        if (addDebugLog && extracted.paciente) {
          addDebugLog(`Paciente: ${extracted.paciente}`, 'info');
        }
        if (addDebugLog && extracted.exam_date) {
          addDebugLog(`Data do exame: ${extracted.exam_date}`, 'info');
        }
        return extracted;
      } else {
        const warningMsg = `⚠️ Gemini Direct retornou JSON, mas sem parâmetros válidos. Parâmetros encontrados: ${extracted.parameters?.length || 0}`;
        console.log(warningMsg);
        if (addDebugLog) addDebugLog(warningMsg, 'warning');
        if (addDebugLog && extracted) {
          addDebugLog(`Estrutura recebida: ${JSON.stringify(extracted).substring(0, 200)}`, 'info');
        }
      }
    }

    // Se chegou aqui, não conseguiu extrair JSON válido
    const noJsonMsg = 'Gemini Direct: Não foi possível extrair JSON válido da resposta';
    console.log(noJsonMsg);
    if (addDebugLog) addDebugLog(noJsonMsg, 'warning');
    if (addDebugLog && text) {
      // Mostrar mais da resposta para debug
      const previewLength = Math.min(500, text.length);
      addDebugLog(`Resposta completa (${text.length} chars, primeiros ${previewLength}): ${text.substring(0, previewLength)}`, 'info');
    }
    return null;
  } catch (error) {
    console.error('Erro ao usar Gemini Direct:', error);
    return null;
  }
};

/**
 * Extrai dados usando OpenRouter (agrega várias APIs, algumas gratuitas)
 * Usa modelos gratuitos disponíveis
 */
export const extractDataWithOpenRouter = async (ocrText) => {
  try {
    console.log('Tentando extrair dados usando OpenRouter...');
    
    // OpenRouter tem alguns modelos gratuitos
    // Implementar se necessário
    return null;
  } catch (error) {
    console.error('Erro ao usar OpenRouter:', error);
    return null;
  }
};

/**
 * Tenta extrair dados usando qualquer LLM disponível
 * Retorna null se todas falharem (usa fallback para método tradicional)
 */
export const extractDataWithLLMFallback = async (ocrText) => {
  if (!ocrText || ocrText.trim().length < 50) {
    return null; // Texto muito curto, não vale a pena usar LLM
  }

  // Tentar obter chave de API do ambiente ou configuração
  // No Expo, variáveis de ambiente começam com EXPO_PUBLIC_ são expostas
  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || null;
  const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || null;
  
  console.log('🔍 Tentando LLMs disponíveis...', {
    hasGeminiKey: !!GEMINI_API_KEY,
    hasGroqKey: !!GROQ_API_KEY,
    platform: Platform.OS,
    geminiKeyPreview: GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'não configurada',
    geminiKeyLength: GEMINI_API_KEY ? GEMINI_API_KEY.length : 0
  });
  
  // Verificar se a chave está sendo lida corretamente
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY não encontrada em process.env.EXPO_PUBLIC_GEMINI_API_KEY');
    console.log('Variáveis de ambiente disponíveis:', Object.keys(process.env).filter(k => k.includes('GEMINI')));
  }
  
  // Gemini e Groq funcionam no browser (têm CORS habilitado)
  // Hugging Face pode ter problemas de CORS no browser
  const llmFunctions = [
    // Groq é mais rápida, tentar primeiro se tiver chave (funciona no browser)
    ...(GROQ_API_KEY ? [async () => {
      console.log('🚀 Tentando Groq...');
      return await extractDataWithGroq(ocrText, GROQ_API_KEY);
    }] : []),
    // Gemini é muito boa, tentar se tiver chave (funciona no browser)
    ...(GEMINI_API_KEY ? [async () => {
      console.log('🚀 Tentando Gemini...');
      return await extractDataWithGemini(ocrText, GEMINI_API_KEY);
    }] : []),
    // Hugging Face é gratuita sem chave, mas pode ter CORS
    // No browser, pular Hugging Face se tiver outras opções
    ...(Platform.OS !== 'web' ? [async () => {
      console.log('🚀 Tentando Hugging Face...');
      return await extractDataWithHuggingFace(ocrText);
    }] : []),
  ];

  for (const llmFunc of llmFunctions) {
    try {
      const result = await llmFunc();
      if (result && result.parameters && Array.isArray(result.parameters) && result.parameters.length > 0) {
        console.log(`✅ LLM extraiu ${result.parameters.length} parâmetros`);
        return result;
      }
    } catch (error) {
      console.log(`⚠️ LLM falhou:`, error.message);
      continue;
    }
  }

  console.log('❌ Todas as LLMs falharam, usando método tradicional');
  return null; // Todas falharam, usar fallback tradicional
};

