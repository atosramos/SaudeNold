import { getProfileItem, setProfileItem } from './profileStorageManager';

const STORAGE_KEY = 'dailyTracking';

// Tipos de dados de acompanhamento diário
export const TRACKING_TYPES = {
  BLOOD_PRESSURE: 'blood_pressure', // Pressão arterial (sistólica/diastólica)
  TEMPERATURE: 'temperature', // Temperatura
  HEART_RATE: 'heart_rate', // Batimentos cardíacos
  INSULIN: 'insulin', // Insulina
  WEIGHT: 'weight', // Peso
  GLUCOSE: 'glucose', // Glicose
  OXYGEN_SATURATION: 'oxygen_saturation', // Saturação de oxigênio
  OTHER: 'other', // Outros
};

// Estrutura de um registro
export const createTrackingRecord = (type, value, unit = null, date = null, notes = '') => {
  return {
    id: `tracking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    value,
    unit,
    numeric_value: parseFloat(value) || null,
    date: date || new Date().toISOString(),
    notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

// Salvar registro
export const saveTrackingRecord = async (record) => {
  try {
    const stored = await getProfileItem(STORAGE_KEY);
    const records = stored ? JSON.parse(stored) : [];
    
    // Se já existe (edição), atualizar; senão, adicionar
    const existingIndex = records.findIndex(r => r.id === record.id);
    if (existingIndex >= 0) {
      records[existingIndex] = {
        ...record,
        updated_at: new Date().toISOString(),
      };
    } else {
      records.push(record);
    }
    
    // Ordenar por data (mais recente primeiro)
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    await setProfileItem(STORAGE_KEY, JSON.stringify(records));
    return { success: true, record: existingIndex >= 0 ? records[existingIndex] : record };
  } catch (error) {
    console.error('Erro ao salvar registro de acompanhamento:', error);
    return { success: false, error: error.message };
  }
};

// Buscar todos os registros
export const getAllTrackingRecords = async (type = null) => {
  try {
    const stored = await getProfileItem(STORAGE_KEY);
    if (!stored) return [];
    
    const records = JSON.parse(stored);
    
    // Validar que records é um array
    if (!Array.isArray(records)) {
      console.warn('Registros não são um array, retornando array vazio');
      return [];
    }
    
    // Filtrar registros inválidos
    const validRecords = records.filter(r => 
      r && 
      typeof r === 'object' && 
      r.id && 
      r.type && 
      r.value !== undefined && 
      r.value !== null
    );
    
    if (type) {
      return validRecords.filter(r => r.type === type);
    }
    
    return validRecords;
  } catch (error) {
    console.error('Erro ao buscar registros de acompanhamento:', error);
    return [];
  }
};

// Buscar registro por ID
export const getTrackingRecordById = async (id) => {
  try {
    const records = await getAllTrackingRecords();
    return records.find(r => r.id === id) || null;
  } catch (error) {
    console.error('Erro ao buscar registro por ID:', error);
    return null;
  }
};

// Deletar registro
export const deleteTrackingRecord = async (id) => {
  try {
    const stored = await getProfileItem(STORAGE_KEY);
    if (!stored) return { success: false, error: 'Nenhum registro encontrado' };
    
    const records = JSON.parse(stored);
    const filtered = records.filter(r => r.id !== id);
    
    if (filtered.length === records.length) {
      return { success: false, error: 'Registro não encontrado' };
    }
    
    await setProfileItem(STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar registro:', error);
    return { success: false, error: error.message };
  }
};

// Buscar registros por tipo para gráfico
export const getTrackingRecordsForChart = async (type) => {
  try {
    const records = await getAllTrackingRecords(type);
    
    // Ordenar por data (mais antigo primeiro para gráfico)
    return records
      .map(r => ({
        exam_date: r.date,
        value: r.value,
        numeric_value: r.numeric_value,
        unit: r.unit,
        notes: r.notes,
      }))
      .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
  } catch (error) {
    console.error('Erro ao buscar registros para gráfico:', error);
    return [];
  }
};

// Obter estatísticas de um tipo
export const getTrackingStats = async (type) => {
  try {
    const records = await getAllTrackingRecords(type);
    
    if (records.length === 0) {
      return {
        count: 0,
        min: null,
        max: null,
        avg: null,
        latest: null,
      };
    }
    
    const numericValues = records
      .map(r => r.numeric_value)
      .filter(v => v !== null && !isNaN(v));
    
    if (numericValues.length === 0) {
      return {
        count: records.length,
        min: null,
        max: null,
        avg: null,
        latest: records[0] || null,
      };
    }
    
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    
    return {
      count: records.length,
      min,
      max,
      avg,
      latest: records[0] || null,
    };
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    return {
      count: 0,
      min: null,
      max: null,
      avg: null,
      latest: null,
    };
  }
};

// Sincronizar com backend (se necessário)
export const syncTrackingRecords = async (apiUrl, apiKey) => {
  try {
    const records = await getAllTrackingRecords();
    
    // TODO: Implementar sincronização com backend
    // Por enquanto, apenas retorna os registros locais
    
    return { success: true, records };
  } catch (error) {
    console.error('Erro ao sincronizar registros:', error);
    return { success: false, error: error.message };
  }
};
