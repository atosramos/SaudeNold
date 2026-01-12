/**
 * Gerador de Chaves de Licença PRO - Servidor
 * 
 * Este arquivo contém funções para gerar chaves de licença seguras.
 * Deve ser usado apenas no servidor/backend, nunca no cliente.
 * 
 * Em produção, este código deve rodar em um servidor seguro.
 */

import crypto from 'crypto';

const LICENSE_TYPES = {
  MONTH_1: '1_month',
  MONTH_6: '6_months',
  YEAR_1: '1_year',
};

/**
 * Gera uma chave de licença segura
 * @param {string} licenseType - Tipo de licença (1_month, 6_months, 1_year)
 * @param {string} userId - ID do usuário (opcional, para rastreamento)
 * @param {string} secretKey - Chave secreta do servidor (deve ser mantida em segredo)
 * @returns {string} Chave de licença no formato: PROXXXXXXXXXXXX (sem hífens)
 */
export const generateLicenseKey = (licenseType, userId = null, secretKey = null) => {
  // Em produção, secretKey deve vir de variável de ambiente segura
  const SECRET_KEY = secretKey || process.env.LICENSE_SECRET_KEY || 'DEFAULT_SECRET_CHANGE_IN_PRODUCTION';
  
  // Mapear tipo para código
  const typeCodes = {
    [LICENSE_TYPES.MONTH_1]: '1M',
    [LICENSE_TYPES.MONTH_6]: '6M',
    [LICENSE_TYPES.YEAR_1]: '1Y',
  };
  
  const typeCode = typeCodes[licenseType] || '1M';
  
  // Gerar timestamp e dados únicos
  const timestamp = Date.now();
  const randomData = crypto.randomBytes(8).toString('hex').toUpperCase();
  const userData = userId ? crypto.createHash('sha256').update(userId).digest('hex').substring(0, 4).toUpperCase() : '0000';
  
  // Criar payload para assinatura
  const payload = `${typeCode}${timestamp}${randomData}${userData}`;
  
  // Gerar HMAC-SHA256 para assinatura digital
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(payload);
  const signature = hmac.digest('hex').toUpperCase().substring(0, 12); // 12 caracteres hex
  
  // Montar chave: PRO + tipo + timestamp (últimos 8 dígitos) + random + user + signature
  // Formato: PRO + 2 chars tipo + 8 chars timestamp + 16 chars random + 4 chars user + 12 chars signature
  // Total: 3 + 2 + 8 + 16 + 4 + 12 = 45 caracteres
  const timestampShort = timestamp.toString().slice(-8); // Últimos 8 dígitos
  const key = `PRO${typeCode}${timestampShort}${randomData}${userData}${signature}`;
  
  return key;
};

/**
 * Valida uma chave de licença gerada por este sistema
 * @param {string} key - Chave de licença
 * @param {string} secretKey - Chave secreta do servidor
 * @returns {Object} Resultado da validação
 */
export const validateGeneratedLicenseKey = (key, secretKey = null) => {
  const SECRET_KEY = secretKey || process.env.LICENSE_SECRET_KEY || 'DEFAULT_SECRET_CHANGE_IN_PRODUCTION';
  
  // Remover espaços e converter para maiúsculas
  key = key.replace(/\s+/g, '').toUpperCase();
  
  // Verificar formato básico: PRO + 42 caracteres alfanuméricos
  if (!key.startsWith('PRO') || key.length !== 45) {
    return {
      valid: false,
      error: 'Formato de chave inválido',
    };
  }
  
  // Extrair componentes
  const typeCode = key.substring(3, 5); // PRO[XX]...
  const timestampShort = key.substring(5, 13);
  const randomData = key.substring(13, 29);
  const userData = key.substring(29, 33);
  const signature = key.substring(33, 45);
  
  // Verificar tipo
  const typeMap = {
    '1M': LICENSE_TYPES.MONTH_1,
    '6M': LICENSE_TYPES.MONTH_6,
    '1Y': LICENSE_TYPES.YEAR_1,
  };
  
  const licenseType = typeMap[typeCode];
  if (!licenseType) {
    return {
      valid: false,
      error: 'Tipo de licença inválido',
    };
  }
  
  // Reconstruir payload e verificar assinatura
  const payload = `${typeCode}${timestampShort}${randomData}${userData}`;
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex').toUpperCase().substring(0, 12);
  
  // Verificar assinatura usando comparação segura (timing-safe)
  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )) {
    return {
      valid: false,
      error: 'Chave de licença inválida ou corrompida',
    };
  }
  
  // Calcular data de expiração baseada no tipo
  const LICENSE_DURATIONS = {
    [LICENSE_TYPES.MONTH_1]: 30 * 24 * 60 * 60 * 1000,
    [LICENSE_TYPES.MONTH_6]: 180 * 24 * 60 * 60 * 1000,
    [LICENSE_TYPES.YEAR_1]: 365 * 24 * 60 * 60 * 1000,
  };
  
  // Reconstruir timestamp completo (aproximado)
  const now = new Date();
  const year = now.getFullYear();
  const timestampFull = parseInt(`${year}${timestampShort}`);
  const activationDate = new Date(timestampFull);
  
  // Se o timestamp parece ser do futuro ou muito antigo, usar data atual
  const maxAge = 10 * 365 * 24 * 60 * 60 * 1000; // 10 anos
  if (isNaN(activationDate.getTime()) || 
      activationDate > now || 
      (now - activationDate) > maxAge) {
    // Usar data atual como fallback
    const expirationDate = new Date(now.getTime() + LICENSE_DURATIONS[licenseType]);
    return {
      valid: true,
      licenseType,
      expirationDate: expirationDate.toISOString(),
      activatedAt: now.toISOString(),
    };
  }
  
  const expirationDate = new Date(activationDate.getTime() + LICENSE_DURATIONS[licenseType]);
  
  return {
    valid: true,
    licenseType,
    expirationDate: expirationDate.toISOString(),
    activatedAt: activationDate.toISOString(),
  };
};

/**
 * Gera múltiplas chaves de licença (útil para distribuição)
 */
export const generateBatchLicenseKeys = (licenseType, quantity = 1, secretKey = null) => {
  const keys = [];
  for (let i = 0; i < quantity; i++) {
    keys.push(generateLicenseKey(licenseType, null, secretKey));
  }
  return keys;
};
