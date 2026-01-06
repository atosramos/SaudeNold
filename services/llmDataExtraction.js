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
      // Modelos que suportam documentos: gemini-1.5, gemini-2.5, etc
      const supportsDocuments = name.includes('gemini-1.5') || 
                                name.includes('gemini-2.5') || 
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
export const extractDataWithGeminiDirect = async (fileInput, fileType, apiKey) => {
  if (!apiKey) {
    console.log('Gemini Direct: Chave de API não fornecida. Pule.');
    return null;
  }

  try {
    console.log('Tentando extrair dados diretamente com Google Gemini (multimodal)...');

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
      console.log('Gemini Direct: Lendo URI para base64 (mobile)...');
      console.log('📱 URI do arquivo:', fileInput?.substring?.(0, 100) || fileInput);
      
      try {
        let FileSystem;
        try {
          FileSystem = require('expo-file-system');
          console.log('✅ FileSystem importado com sucesso');
        } catch (importError) {
          console.error('❌ Erro ao importar FileSystem:', importError);
          throw new Error(`Não foi possível importar expo-file-system: ${importError.message}`);
        }
        
        if (!fileInput || typeof fileInput !== 'string') {
          throw new Error(`URI inválida: ${typeof fileInput}`);
        }
        
        console.log('📖 Lendo arquivo do sistema de arquivos...');
        base64Data = await FileSystem.readAsStringAsync(fileInput, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log('✅ Arquivo lido, tamanho base64:', base64Data?.length || 0);
        
        if (!base64Data || base64Data.length === 0) {
          throw new Error('Arquivo lido está vazio');
        }
        
        mimeType = fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'; // Assumir para mobile
        console.log('✅ MIME type definido:', mimeType);
      } catch (readError) {
        console.error('❌ Erro ao ler arquivo no mobile:', readError);
        console.error('❌ Stack trace:', readError.stack);
        throw new Error(`Erro ao ler arquivo no mobile: ${readError.message}`);
      }
    } else {
      throw new Error('Formato de arquivo não suportado no browser');
    }

    if (!base64Data || base64Data.length === 0) {
      throw new Error('Dados do arquivo vazios para Gemini Direct.');
    }
    
    console.log('✅ Base64 preparado, tamanho:', base64Data.length, 'bytes');

    const prompt = `Você é um especialista em análise de exames médicos. Analise o documento abaixo (imagem ou PDF) e extraia APENAS informações médicas relevantes.

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

Retorne APENAS o JSON:`;

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
        maxOutputTokens: 2000,
      }
    };

    // Tentar modelos conhecidos que suportam multimodal
    const attempts = [
      { version: 'v1', model: 'gemini-1.5-flash' }, // Mais rápido, geralmente bom
      { version: 'v1', model: 'gemini-1.5-pro' },   // Mais capaz, mas mais lento
      { version: 'v1beta', model: 'gemini-pro-vision' }, // Modelo multimodal antigo
    ];

    let response = null;
    let lastError = null;
    let successfulAttempt = null;

    for (const attempt of attempts) {
      const url = `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${apiKey}`;
      console.log(`Tentando Gemini Direct ${attempt.version}/${attempt.model}...`);

      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          console.log(`✅ Gemini Direct ${attempt.version}/${attempt.model} funcionou!`);
          successfulAttempt = attempt;
          break;
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = `Erro ${response.status}: ${JSON.stringify(errorData)}`;
          console.log(`❌ Gemini Direct ${attempt.version}/${attempt.model} falhou: ${lastError}`);
          response = null;
        }
      } catch (error) {
        lastError = error.message;
        console.log(`❌ Gemini Direct ${attempt.version}/${attempt.model} erro: ${lastError}`);
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
      return null;
    }

    let jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      if (extracted.parameters && Array.isArray(extracted.parameters) && extracted.parameters.length > 0) {
        console.log(`✅ Gemini Direct extraiu ${extracted.parameters.length} parâmetros`);
        return extracted;
      }
    }

    console.log('Gemini Direct: Não foi possível extrair JSON válido da resposta');
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

