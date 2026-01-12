import AsyncStorage from '@react-native-async-storage/async-storage';

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
 * Formato esperado: PRO-XXXX-XXXX-XXXX-XXXX (20 caracteres + 4 hífens)
 */
const validateLicenseKeyFormat = (key) => {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // Formato: PRO-XXXX-XXXX-XXXX-XXXX
  const formatRegex = /^PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return formatRegex.test(key.toUpperCase());
};

/**
 * Extrai o tipo de licença da chave
 * A chave contém informações codificadas sobre o tipo
 */
const extractLicenseTypeFromKey = (key) => {
  if (!validateLicenseKeyFormat(key)) {
    return null;
  }
  
  // Extrair o segundo bloco da chave (ex: PRO-XXXX-YYYY-XXXX-XXXX)
  const parts = key.toUpperCase().split('-');
  if (parts.length !== 5) {
    return null;
  }
  
  // O segundo bloco contém o tipo codificado
  const typeCode = parts[2];
  
  // Decodificar tipo (simplificado - em produção usar criptografia)
  // Primeiro caractere indica o tipo
  const firstChar = typeCode[0];
  
  if (firstChar === '1') return LICENSE_TYPES.MONTH_1;
  if (firstChar === '6') return LICENSE_TYPES.MONTH_6;
  if (firstChar === 'Y') return LICENSE_TYPES.YEAR_1;
  
  // Fallback: tentar detectar pelo padrão
  if (typeCode.startsWith('1M')) return LICENSE_TYPES.MONTH_1;
  if (typeCode.startsWith('6M')) return LICENSE_TYPES.MONTH_6;
  if (typeCode.startsWith('1Y')) return LICENSE_TYPES.YEAR_1;
  
  return null;
};

/**
 * Valida uma chave de licença
 * Em produção, isso deveria fazer uma chamada ao servidor
 * Por enquanto, validação local simplificada
 */
export const validateLicenseKey = async (key) => {
  try {
    // Validar formato
    if (!validateLicenseKeyFormat(key)) {
      return {
        valid: false,
        error: 'Formato de chave inválido. Use o formato: PRO-XXXX-XXXX-XXXX-XXXX',
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
    
    // Em produção, aqui faria uma chamada ao servidor para validar:
    // const response = await fetch('https://api.saudenold.com/validate-license', {
    //   method: 'POST',
    //   body: JSON.stringify({ key }),
    // });
    // const result = await response.json();
    
    // Por enquanto, validação local simplificada
    // Verificar se a chave tem um checksum válido (simplificado)
    const normalizedKey = key.toUpperCase().replace(/-/g, '');
    const checksum = normalizedKey.slice(-4);
    
    // Validação básica (em produção, usar algoritmo de checksum real)
    if (checksum.length !== 4) {
      return {
        valid: false,
        error: 'Chave de licença inválida',
      };
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
