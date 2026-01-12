import { Platform } from 'react-native';

/**
 * Extrai dados de acompanhamento diário de uma imagem usando Gemini
 * Reutiliza a função extractDataWithGeminiDirect existente e adapta o resultado
 */
export const extractTrackingDataFromImage = async (imageUri, apiKey, addDebugLog = null) => {
  if (!apiKey) {
    const msg = 'Gemini: Chave de API não fornecida para extração de dados de acompanhamento.';
    console.log(msg);
    if (addDebugLog) addDebugLog(msg, 'warning');
    return null;
  }

  try {
    // Importar dinamicamente para evitar problemas de dependência circular
    const { extractDataWithGeminiDirect } = await import('./llmDataExtraction');
    
    const msg = 'Analisando imagem para extrair dados de acompanhamento diário...';
    console.log(msg);
    if (addDebugLog) addDebugLog(msg, 'info');

    // Prompt específico para dados de acompanhamento diário
    // Vamos criar um arquivo temporário com o prompt customizado
    // Mas primeiro, vamos usar a função existente e adaptar o resultado
    
    // Preparar o arquivo para Gemini Direct
    let fileForGemini = imageUri;
    let fileType = 'image';

    // Chamar extractDataWithGeminiDirect com um prompt customizado
    // Como a função existente não aceita prompt customizado, vamos fazer uma chamada direta
    // mas seguindo o padrão do projeto
    
    // Por enquanto, vamos fazer uma implementação simplificada que usa a mesma estrutura
    // mas com prompt específico para acompanhamento diário
    
    // Importar FileSystem se necessário
    let FileSystem;
    if (Platform.OS !== 'web') {
      FileSystem = require('expo-file-system');
    }

    let base64Data;
    let mimeType;

    if (Platform.OS === 'web') {
      if (imageUri instanceof File) {
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result.split(',')[1]);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(imageUri);
        });
        mimeType = imageUri.type;
      } else if (typeof imageUri === 'string' && imageUri.startsWith('data:')) {
        base64Data = imageUri.split(',')[1];
        mimeType = imageUri.split(';')[0].split(':')[1];
      } else {
        throw new Error('Formato de imagem não suportado no browser');
      }
    } else {
      base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      mimeType = 'image/jpeg';
    }

    if (!base64Data || base64Data.length === 0) {
      throw new Error('Imagem vazia ou inválida');
    }

    // Prompt específico para dados de acompanhamento diário
    const prompt = `Você é um especialista em análise de dados de saúde. Analise esta imagem e extraia APENAS informações de acompanhamento diário de saúde.

IMPORTANTE:
- Esta imagem pode ser de um aparelho de medir pressão, termômetro, monitor de glicose, oxímetro, balança, ou outro dispositivo médico
- EXTRAIA apenas valores numéricos de saúde com suas unidades
- IGNORE completamente: telefones, endereços, CPF, RG, nomes, emails, textos irrelevantes

TIPOS DE DADOS QUE PROCURAR:
1. Pressão arterial: valores como "120/80", "120 x 80", "SYS: 120 DIA: 80"
2. Temperatura: valores em Celsius ou Fahrenheit
3. Batimentos cardíacos / Frequência cardíaca: bpm, pulsos
4. Insulina: unidades (UI)
5. Glicose: mg/dL ou mmol/L
6. Peso: kg ou libras
7. Saturação de oxigênio: SpO2, porcentagem

Formato JSON obrigatório:
{
  "blood_pressure_systolic": número ou null,
  "blood_pressure_diastolic": número ou null,
  "temperature": número ou null,
  "temperature_unit": "C" ou "F" ou null,
  "heart_rate": número ou null,
  "insulin": número ou null,
  "glucose": número ou null,
  "weight": número ou null,
  "oxygen_saturation": número ou null,
  "date": "YYYY-MM-DD" ou null,
  "time": "HH:MM" ou null,
  "notes": "observações adicionais se houver" ou null
}

Retorne APENAS o JSON válido, sem markdown, sem explicações:`;

    // Usar a mesma estrutura da API Gemini que o projeto já usa
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API Gemini: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Resposta inválida da API Gemini');
    }

    const responseText = data.candidates[0].content.parts[0].text.trim();
    
    // Limpar resposta (remover markdown se houver)
    let jsonText = responseText;
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    const extractedData = JSON.parse(jsonText);
    
    const successMsg = `✅ Dados extraídos com sucesso: ${Object.keys(extractedData).filter(k => extractedData[k] !== null).length} campos`;
    console.log(successMsg);
    if (addDebugLog) addDebugLog(successMsg, 'success');

    return extractedData;
  } catch (error) {
    const errorMsg = `Erro ao extrair dados da imagem: ${error.message}`;
    console.error(errorMsg, error);
    if (addDebugLog) addDebugLog(errorMsg, 'error');
    return null;
  }
};

/**
 * Converte dados extraídos do Gemini para registros de acompanhamento
 */
export const convertExtractedDataToRecords = (extractedData) => {
  const records = [];
  const now = new Date();

  // Pressão arterial
  if (extractedData.blood_pressure_systolic && extractedData.blood_pressure_diastolic) {
    records.push({
      type: 'blood_pressure',
      value: `${extractedData.blood_pressure_systolic}/${extractedData.blood_pressure_diastolic}`,
      numeric_value: extractedData.blood_pressure_systolic, // Usar sistólica como valor principal
      unit: 'mmHg',
      date: extractedData.date ? `${extractedData.date}T${extractedData.time || '12:00'}:00` : now.toISOString(),
      notes: extractedData.notes || '',
    });
  }

  // Temperatura
  if (extractedData.temperature) {
    let tempValue = extractedData.temperature;
    let tempUnit = extractedData.temperature_unit || 'C';
    
    // Converter Fahrenheit para Celsius se necessário
    if (tempUnit === 'F') {
      tempValue = (tempValue - 32) * 5/9;
      tempUnit = 'C';
    }
    
    records.push({
      type: 'temperature',
      value: tempValue.toString(),
      numeric_value: tempValue,
      unit: `°${tempUnit}`,
      date: extractedData.date ? `${extractedData.date}T${extractedData.time || '12:00'}:00` : now.toISOString(),
      notes: extractedData.notes || '',
    });
  }

  // Batimentos cardíacos
  if (extractedData.heart_rate) {
    records.push({
      type: 'heart_rate',
      value: extractedData.heart_rate.toString(),
      numeric_value: extractedData.heart_rate,
      unit: 'bpm',
      date: extractedData.date ? `${extractedData.date}T${extractedData.time || '12:00'}:00` : now.toISOString(),
      notes: extractedData.notes || '',
    });
  }

  // Insulina
  if (extractedData.insulin) {
    records.push({
      type: 'insulin',
      value: extractedData.insulin.toString(),
      numeric_value: extractedData.insulin,
      unit: 'UI',
      date: extractedData.date ? `${extractedData.date}T${extractedData.time || '12:00'}:00` : now.toISOString(),
      notes: extractedData.notes || '',
    });
  }

  // Glicose
  if (extractedData.glucose) {
    records.push({
      type: 'glucose',
      value: extractedData.glucose.toString(),
      numeric_value: extractedData.glucose,
      unit: 'mg/dL',
      date: extractedData.date ? `${extractedData.date}T${extractedData.time || '12:00'}:00` : now.toISOString(),
      notes: extractedData.notes || '',
    });
  }

  // Peso
  if (extractedData.weight) {
    records.push({
      type: 'weight',
      value: extractedData.weight.toString(),
      numeric_value: extractedData.weight,
      unit: 'kg',
      date: extractedData.date ? `${extractedData.date}T${extractedData.time || '12:00'}:00` : now.toISOString(),
      notes: extractedData.notes || '',
    });
  }

  // Saturação de oxigênio
  if (extractedData.oxygen_saturation) {
    records.push({
      type: 'oxygen_saturation',
      value: extractedData.oxygen_saturation.toString(),
      numeric_value: extractedData.oxygen_saturation,
      unit: '%',
      date: extractedData.date ? `${extractedData.date}T${extractedData.time || '12:00'}:00` : now.toISOString(),
      notes: extractedData.notes || '',
    });
  }

  return records;
};
