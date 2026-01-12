/**
 * Serviço de extração de dados de exames médicos
 * Adaptação da lógica do backend para JavaScript
 * Funciona totalmente offline
 */

/**
 * Extrai data do exame do texto
 */
export const extractExamDate = (text) => {
  if (!text) return null;

  // Padrões de data comuns em exames médicos
  const datePatterns = [
    /\d{2}[\/\-]\d{2}[\/\-]\d{4}/,  // DD/MM/YYYY ou DD-MM-YYYY
    /\d{4}[\/\-]\d{2}[\/\-]\d{2}/,  // YYYY/MM/DD ou YYYY-MM-DD
    /\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/,  // DD/MM/YY ou DD/MM/YYYY
  ];

  // Palavras-chave que indicam data de exame
  const dateKeywords = ['data', 'data do exame', 'data de realização', 'realizado em', 'coleta'];

  // Buscar padrão próximo a palavras-chave
  for (const keyword of dateKeywords) {
    const pattern = new RegExp(`${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?(\\d{2}[\\/\\-]\\d{2}[\\/\\-]\\d{2,4})`, 'i');
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1];
      const date = parseDate(dateStr);
      if (date) return date;
    }
  }

  // Buscar qualquer data no texto
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const date = parseDate(matches[0]);
      if (date) return date.toISOString();
    }
  }

  return null;
};

/**
 * Parse de data com suporte a diferentes formatos
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;

  // Normalizar separadores
  const normalized = dateStr.replace(/-/g, '/');
  const parts = normalized.split('/');

  if (parts.length !== 3) return null;

  let day, month, year;

  // Tentar DD/MM/YYYY primeiro (formato brasileiro)
  if (parts[0].length <= 2 && parts[1].length <= 2) {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
    year = parseInt(parts[2], 10);
    
    // Se ano tem 2 dígitos, assumir 2000+
    if (year < 100) {
      year += 2000;
    }
  } else {
    // Tentar YYYY/MM/DD
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  }

  const date = new Date(year, month, day);
  
  // Validar data
  if (isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
};

/**
 * Extrai tipo de exame do texto
 */
export const extractExamType = (text) => {
  if (!text) return null;

  const examTypes = {
    'hemograma': ['hemograma', 'hemograma completo', 'cbc', 'complete blood count'],
    'glicemia': ['glicemia', 'glicose', 'glucose', 'glicemia de jejum'],
    'colesterol': ['colesterol', 'lipidograma', 'perfil lipídico'],
    'urina': ['urina', 'urina tipo i', 'eas', 'urina completa'],
    'fezes': ['fezes', 'coprocultura', 'parasitológico'],
    'tsh': ['tsh', 'hormônio tireoestimulante'],
    't4': ['t4', 'tiroxina'],
    'vitamina d': ['vitamina d', '25-oh vitamina d'],
    'creatinina': ['creatinina'],
    'ureia': ['ureia'],
  };

  const textLower = text.toLowerCase();

  for (const [examType, keywords] of Object.entries(examTypes)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        return examType.charAt(0).toUpperCase() + examType.slice(1);
      }
    }
  }

  return null;
};

/**
 * Extrai valor numérico de uma string
 */
export const extractNumericValue = (text) => {
  if (!text) return null;

  // Remove espaços e caracteres não numéricos exceto vírgula e ponto
  let cleaned = text.replace(/[^\d,.]/g, '').replace(/\s/g, '');

  // Substitui vírgula por ponto se houver vírgula
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
};

/**
 * Extrai parâmetro e valor de uma linha do texto
 * 
 * Returns: { name, value, unit, reference_range_min, reference_range_max } ou null
 */
export const extractParameterWithValue = (line) => {
  if (!line) return null;

  // Remove espaços extras
  line = line.replace(/\s+/g, ' ').trim();

  // Padrão 1: Nome: Valor Unidade (min-max)
  // Exemplo: "Hemoglobina: 14.5 g/dL (12.0-16.0)"
  const pattern1 = /([A-Za-zÀ-ÿ\s]+?)\s*[:]\s*([\d,\.]+)\s*([a-zA-Z\/%]+)?\s*(?:\(([\d,\.]+)\s*[-]\s*([\d,\.]+)\))?/i;
  const match1 = line.match(pattern1);
  if (match1) {
    return {
      name: match1[1].trim(),
      value: match1[2].trim(),
      unit: match1[3] ? match1[3].trim() : null,
      reference_range_min: match1[4] ? match1[4].trim() : null,
      reference_range_max: match1[5] ? match1[5].trim() : null,
    };
  }

  // Padrão 2: Nome Valor Unidade
  // Exemplo: "Hemoglobina 14.5 g/dL"
  const pattern2 = /([A-Za-zÀ-ÿ\s]+?)\s+([\d,\.]+)\s+([a-zA-Z\/%]+)/i;
  const match2 = line.match(pattern2);
  if (match2) {
    return {
      name: match2[1].trim(),
      value: match2[2].trim(),
      unit: match2[3].trim(),
      reference_range_min: null,
      reference_range_max: null,
    };
  }

  // Padrão 3: Nome: Valor (mais simples)
  // Exemplo: "Hemoglobina: 14.5"
  const pattern3 = /([A-Za-zÀ-ÿ\s]+?)\s*[:]\s*([\d,\.]+)/i;
  const match3 = line.match(pattern3);
  if (match3) {
    return {
      name: match3[1].trim(),
      value: match3[2].trim(),
      unit: null,
      reference_range_min: null,
      reference_range_max: null,
    };
  }

  return null;
};

/**
 * Extrai dados estruturados do texto OCR
 * 
 * Returns: {
 *   exam_date: string (ISO) ou null,
 *   exam_type: string ou null,
 *   parameters: array de { name, value, numeric_value, unit, reference_range_min, reference_range_max }
 * }
 */
export const extractDataFromOCRText = (text) => {
  if (!text) {
    return {
      exam_date: null,
      exam_type: null,
      parameters: [],
    };
  }

  const result = {
    exam_date: null,
    exam_type: null,
    parameters: [],
  };

  // Extrair data
  const examDate = extractExamDate(text);
  if (examDate) {
    result.exam_date = typeof examDate === 'string' ? examDate : examDate.toISOString();
  }

  // Extrair tipo de exame
  const examType = extractExamType(text);
  if (examType) {
    result.exam_type = examType;
  }

  // Dividir texto em linhas
  const lines = text.split('\n');

  // Processar cada linha
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 3) {
      continue;
    }

    // Tentar extrair parâmetro e valor
    const extracted = extractParameterWithValue(trimmedLine);
    if (extracted) {
      const { name, value, unit, reference_range_min, reference_range_max } = extracted;

      // Filtrar falsos positivos (linhas muito curtas ou valores inválidos)
      if (name.length < 2 || name.length > 100) {
        continue;
      }

      // Tentar converter valor para número
      const numericValue = extractNumericValue(value);

      const parameter = {
        name,
        value,
        numeric_value: numericValue !== null ? String(numericValue) : null,
        unit,
        reference_range_min,
        reference_range_max,
      };

      result.parameters.push(parameter);
    }
  }

  console.log(`Extraídos ${result.parameters.length} parâmetros do texto OCR`);
  return result;
};



