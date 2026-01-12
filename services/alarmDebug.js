import AsyncStorage from '@react-native-async-storage/async-storage';

// Armazenar logs de debug em memória e AsyncStorage
const DEBUG_LOG_KEY = 'alarm_debug_logs';
const MAX_LOGS = 100; // Manter apenas os últimos 100 logs

let debugLogs = [];

/**
 * Adiciona um log de debug
 */
export const addDebugLog = async (message, type = 'info') => {
  const timestamp = new Date().toLocaleString('pt-BR');
  const logEntry = {
    id: Date.now(),
    timestamp,
    message,
    type, // 'info', 'success', 'warning', 'error'
  };
  
  debugLogs.unshift(logEntry); // Adicionar no início
  debugLogs = debugLogs.slice(0, MAX_LOGS); // Manter apenas os últimos MAX_LOGS
  
  // Salvar no AsyncStorage
  try {
    await AsyncStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(debugLogs));
  } catch (error) {
    console.error('Erro ao salvar logs de debug:', error);
  }
  
  // Também logar no console
  const emoji = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️';
  console.log(`${emoji} [${timestamp}] ${message}`);
};

/**
 * Obtém todos os logs de debug
 */
export const getDebugLogs = async () => {
  try {
    const stored = await AsyncStorage.getItem(DEBUG_LOG_KEY);
    if (stored) {
      debugLogs = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erro ao carregar logs de debug:', error);
  }
  
  return debugLogs;
};

/**
 * Limpa todos os logs de debug
 */
export const clearDebugLogs = async () => {
  debugLogs = [];
  try {
    await AsyncStorage.removeItem(DEBUG_LOG_KEY);
  } catch (error) {
    console.error('Erro ao limpar logs de debug:', error);
  }
};

/**
 * Obtém logs filtrados por tipo
 */
export const getDebugLogsByType = async (type) => {
  const logs = await getDebugLogs();
  return logs.filter(log => log.type === type);
};
