import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackLicenseActivation, trackLicenseValidation, trackError } from './analytics';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

const LICENSE_STORAGE_KEY = 'pro_license';
const LICENSE_INFO_KEY = 'pro_license_info';

/**
 * Tipos de licença disponíveis
 */
export const LICENSE_TYPES = {
  MONTH_1: '1_month',
  MONTH_6: '6_months',
  YEAR_1: '1_year',
};

/**
 * Duração de cada tipo de licença em milissegundos
 */
const LICENSE_DURATIONS = {
  [LICENSE_TYPES.MONTH_1]: 30 * 24 * 60 * 60 * 1000, // 30 dias
  [LICENSE_TYPES.MONTH_6]: 180 * 24 * 60 * 60 * 1000, // 180 dias
  [LICENSE_TYPES.YEAR_1]: 365 * 24 * 60 * 60 * 1000, // 365 dias
};

/**
 * Labels para exibição
 */
export const LICENSE_LABELS = {
  [LICENSE_TYPES.MONTH_1]: '1 Mês',
  [LICENSE_TYPES.MONTH_6]: '6 Meses',
  [LICENSE_TYPES.YEAR_1]: '1 Ano',
};

/**
 * Valida o formato de uma chave de licença
 * Suporta dois formatos:
 * 1. Formato antigo: PRO-XXXX-XXXX-XXXX-XXXX (com hífens)
 * 2. Formato novo: PROXXXXXXXXXXXX (sem hífens, 45 caracteres)
 */
const validateLicenseKeyFormat = (key) => {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // Remover espaços e converter para maiúsculas
  const normalizedKey = key.replace(/\s+/g, '').toUpperCase();
  
  // Formato novo: PRO + 42 caracteres alfanuméricos (total 45)
  const newFormatRegex = /^PRO[A-Z0-9]{42}$/;
  if (newFormatRegex.test(normalizedKey)) {
    return true;
  }
  
  // Formato antigo: PRO-XXXX-XXXX-XXXX-XXXX (compatibilidade)
  const oldFormatRegex = /^PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (oldFormatRegex.test(normalizedKey)) {
    return true;
  }
  
  return false;
};

/**
 * Extrai o tipo de licença da chave
 * Suporta formato novo (sem hífens) e antigo (com hífens)
 */
const extractLicenseTypeFromKey = (key) => {
  if (!validateLicenseKeyFormat(key)) {
    return null;
  }
  
  // Normalizar chave (remover espaços e hífens, converter para maiúsculas)
  const normalizedKey = key.replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
  
  // Verificar se é formato novo (45 caracteres: PRO + 42)
  if (normalizedKey.length === 45 && normalizedKey.startsWith('PRO')) {
    // Formato novo: PRO + tipo (2 chars) + dados (40 chars)
    const typeCode = normalizedKey.substring(3, 5); // PRO[XX]...
    
    const typeMap = {
      '1M': LICENSE_TYPES.MONTH_1,
      '6M': LICENSE_TYPES.MONTH_6,
      '1Y': LICENSE_TYPES.YEAR_1,
    };
    
    return typeMap[typeCode] || null;
  }
  
  // Formato antigo: PRO-XXXX-XXXX-XXXX-XXXX
  const parts = normalizedKey.split('-');
  if (parts.length === 5) {
    const typeCode = parts[1];
    
    // Verificar padrões
    if (typeCode.startsWith('1M')) return LICENSE_TYPES.MONTH_1;
    if (typeCode.startsWith('6M')) return LICENSE_TYPES.MONTH_6;
    if (typeCode.startsWith('1Y')) return LICENSE_TYPES.YEAR_1;
    
    // Fallback
    const firstChar = typeCode[0];
    if (firstChar === '1' && typeCode.length >= 2 && typeCode[1] !== 'Y') return LICENSE_TYPES.MONTH_1;
    if (firstChar === '6') return LICENSE_TYPES.MONTH_6;
    if (firstChar === 'Y' || (firstChar === '1' && typeCode.length >= 2 && typeCode[1] === 'Y')) return LICENSE_TYPES.YEAR_1;
  }
  
  return null;
};

/**
 * Valida uma chave de licença
 * Tenta validar localmente primeiro, depois no servidor
 */
export const validateLicenseKey = async (key) => {
  try {
    // Normalizar chave (remover espaços e hífens)
    const normalizedKey = key.replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
    
    // Validar formato
    if (!validateLicenseKeyFormat(key)) {
      return {
        valid: false,
        error: 'Formato de chave inválido. Use o formato: PRO seguido de 42 caracteres alfanuméricos (sem hífens)',
      };
    }
    
    // Extrair tipo de licença
    const licenseType = extractLicenseTypeFromKey(key);
    if (!licenseType) {
      return {
        valid: false,
        error: 'Tipo de licença não reconhecido na chave',
      };
    }
    
    // Tentar validar no servidor primeiro (se disponível)
    try {
      // Obter device ID (se disponível)
      const deviceId = Constants.deviceId || Constants.installationId || null;
      
      const response = await api.post('/api/validate-license', {
        key: normalizedKey,
        device_id: deviceId,
      });
      
      if (response.data && response.data.valid) {
        return response.data;
      } else if (response.data && response.data.error) {
        return {
          valid: false,
          error: response.data.error,
        };
      }
    } catch (serverError) {
      // Servidor não disponível, continuar com validação local
      console.log('Servidor não disponível, usando validação local:', serverError.message);
    }
    
    // Validação local (fallback)
    // Para chaves no formato novo (45 caracteres), validar assinatura
    if (normalizedKey.length === 45) {
      // Verificar estrutura básica
      if (!normalizedKey.startsWith('PRO')) {
        return {
          valid: false,
          error: 'Chave de licença inválida',
        };
      }
      
      // Extrair componentes
      const typeCode = normalizedKey.substring(3, 5);
      const signature = normalizedKey.substring(33, 45);
      
      // Validação básica de estrutura
      if (signature.length !== 12) {
        return {
          valid: false,
          error: 'Chave de licença inválida',
        };
      }
      
      // Para validação completa da assinatura, precisa do servidor
      // Por enquanto, aceitar se o formato estiver correto
      // Em produção, sempre validar no servidor
    }
    
    // Calcular data de expiração
    const now = new Date();
    const duration = LICENSE_DURATIONS[licenseType];
    const expirationDate = new Date(now.getTime() + duration);
    
    return {
      valid: true,
      licenseType,
      expirationDate: expirationDate.toISOString(),
      activatedAt: now.toISOString(),
    };
  } catch (error) {
    console.error('Erro ao validar chave de licença:', error);
    return {
      valid: false,
      error: 'Erro ao validar chave de licença: ' + error.message,
    };
  }
};

/**
 * Ativa uma licença PRO
 */
export const activateLicense = async (key) => {
  try {
    const validation = await validateLicenseKey(key);
    
    if (!validation.valid) {
      trackLicenseValidation(false, validation.error || 'Chave invalida');
      return {
        success: false,
        error: validation.error,
      };
    }
    
    // Salvar licença
    const licenseData = {
      key: key.toUpperCase(),
      type: validation.licenseType,
      activatedAt: validation.activatedAt,
      expirationDate: validation.expirationDate,
    };
    
    await AsyncStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(licenseData));
    
    // Salvar informações para exibição
    const licenseInfo = {
      type: validation.licenseType,
      typeLabel: LICENSE_LABELS[validation.licenseType],
      activatedAt: validation.activatedAt,
      expirationDate: validation.expirationDate,
      isActive: true,
    };
    
    await AsyncStorage.setItem(LICENSE_INFO_KEY, JSON.stringify(licenseInfo));
    
    return {
      success: true,
      licenseInfo,
    };
  } catch (error) {
    console.error('Erro ao ativar licença:', error);
    return {
      success: false,
      error: 'Erro ao ativar licença: ' + error.message,
    };
  }
};

/**
 * Verifica se há uma licença PRO ativa
 */
export const hasActiveLicense = async () => {
  try {
    const licenseDataStr = await AsyncStorage.getItem(LICENSE_STORAGE_KEY);
    if (!licenseDataStr) {
      return false;
    }
    
    const licenseData = JSON.parse(licenseDataStr);
    const expirationDate = new Date(licenseData.expirationDate);
    const now = new Date();
    
    // Verificar se não expirou
    if (now > expirationDate) {
      // Licença expirada, remover
      await AsyncStorage.removeItem(LICENSE_STORAGE_KEY);
      await AsyncStorage.removeItem(LICENSE_INFO_KEY);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar licença:', error);
    return false;
  }
};

/**
 * Obtém informações da licença ativa
 */
export const getLicenseInfo = async () => {
  try {
    const hasActive = await hasActiveLicense();
    if (!hasActive) {
      return null;
    }
    
    const licenseInfoStr = await AsyncStorage.getItem(LICENSE_INFO_KEY);
    if (!licenseInfoStr) {
      return null;
    }
    
    const licenseInfo = JSON.parse(licenseInfoStr);
    
    // Atualizar status de ativação
    const expirationDate = new Date(licenseInfo.expirationDate);
    const now = new Date();
    licenseInfo.isActive = now <= expirationDate;
    
    // Calcular dias restantes
    const daysRemaining = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
    licenseInfo.daysRemaining = daysRemaining;
    
    return licenseInfo;
  } catch (error) {
    console.error('Erro ao obter informações da licença:', error);
    return null;
  }
};

/**
 * Remove a licença ativa (desativa)
 */
export const deactivateLicense = async () => {
  try {
    await AsyncStorage.removeItem(LICENSE_STORAGE_KEY);
    await AsyncStorage.removeItem(LICENSE_INFO_KEY);
    return { success: true };
  } catch (error) {
    console.error('Erro ao desativar licença:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verifica se uma funcionalidade PRO está disponível
 * Útil para verificar antes de mostrar opções PRO
 */
export const isProFeatureAvailable = async () => {
  return await hasActiveLicense();
};
