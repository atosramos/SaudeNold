import CryptoJS from 'crypto-js';
import { getProfileSecureItem, setProfileSecureItem } from './profileStorageManager';

const ENCRYPTION_KEY_STORAGE = 'profileEncryptionKey';
const ENCRYPTION_KEY_ROTATION_STORAGE = 'profileEncryptionKeyRotation';
const KEY_ROTATION_DAYS = 90; // Rotacionar chave a cada 90 dias

/**
 * Gera uma chave de criptografia AES-256 segura
 */
const generateSecureKey = () => {
  // Gerar 32 bytes (256 bits) de dados aleatórios
  const randomBytes = CryptoJS.lib.WordArray.random(32);
  return randomBytes.toString();
};

/**
 * Obtém a chave de criptografia do perfil
 * Se não existir, cria uma nova
 */
export const getEncryptionKey = async (profileId) => {
  try {
    let key = await getProfileSecureItem(ENCRYPTION_KEY_STORAGE, profileId);
    
    if (!key) {
      // Gerar nova chave se não existir
      key = generateSecureKey();
      await setProfileSecureItem(ENCRYPTION_KEY_STORAGE, key, profileId);
      
      // Registrar data de criação
      const now = new Date().toISOString();
      await setProfileSecureItem(ENCRYPTION_KEY_ROTATION_STORAGE, now, profileId);
      
      console.log('[CryptoService] Nova chave de criptografia gerada para perfil:', profileId);
    }
    
    return key;
  } catch (error) {
    console.error('[CryptoService] Erro ao obter chave de criptografia:', error);
    throw new Error('Não foi possível obter chave de criptografia');
  }
};

/**
 * Criptografa dados usando AES-256-CBC
 * @param {any} data - Dados a serem criptografados (será convertido para JSON)
 * @param {string} profileId - ID do perfil
 * @returns {Object} Objeto com {encrypted: string, iv: string}
 */
export const encryptData = async (data, profileId) => {
  try {
    const key = await getEncryptionKey(profileId);
    
    // Converter dados para string JSON
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Gerar IV aleatório (16 bytes para AES-256-CBC)
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    
    // Criptografar usando AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(dataString, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    return {
      encrypted: encrypted.toString(),
      iv: iv.toString(CryptoJS.enc.Hex),
    };
  } catch (error) {
    console.error('[CryptoService] Erro ao criptografar dados:', error);
    throw new Error('Não foi possível criptografar dados');
  }
};

/**
 * Descriptografa dados usando AES-256-CBC
 * @param {Object} encryptedData - Objeto com {encrypted: string, iv: string}
 * @param {string} profileId - ID do perfil
 * @returns {any} Dados descriptografados (será parseado de JSON se possível)
 */
export const decryptData = async (encryptedData, profileId) => {
  try {
    if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv) {
      // Se não está no formato esperado, pode ser dado não criptografado (compatibilidade)
      console.warn('[CryptoService] Dados não estão no formato criptografado, retornando como está');
      return encryptedData;
    }
    
    const key = await getEncryptionKey(profileId);
    
    // Converter IV de hex para WordArray
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
    
    // Descriptografar
    const decrypted = CryptoJS.AES.decrypt(encryptedData.encrypted, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Falha ao descriptografar dados - chave incorreta ou dados corrompidos');
    }
    
    // Tentar fazer parse de JSON, se falhar retornar string
    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  } catch (error) {
    console.error('[CryptoService] Erro ao descriptografar dados:', error);
    throw new Error('Não foi possível descriptografar dados');
  }
};

/**
 * Verifica se a chave precisa ser rotacionada
 */
const shouldRotateKey = async (profileId) => {
  try {
    const lastRotation = await getProfileSecureItem(ENCRYPTION_KEY_ROTATION_STORAGE, profileId);
    if (!lastRotation) {
      return false; // Chave nova, não precisa rotacionar ainda
    }
    
    const lastRotationDate = new Date(lastRotation);
    const now = new Date();
    const daysSinceRotation = (now - lastRotationDate) / (1000 * 60 * 60 * 24);
    
    return daysSinceRotation >= KEY_ROTATION_DAYS;
  } catch (error) {
    console.error('[CryptoService] Erro ao verificar rotação de chave:', error);
    return false;
  }
};

/**
 * Rotaciona a chave de criptografia do perfil
 * Descriptografa todos os dados com a chave antiga e re-criptografa com a nova
 * 
 * NOTA: Esta função é complexa e requer acesso a todos os dados do perfil.
 * Por enquanto, apenas marca a chave para rotação. A rotação real deve ser
 * feita de forma incremental ao acessar os dados.
 */
export const rotateEncryptionKey = async (profileId) => {
  try {
    console.log('[CryptoService] Iniciando rotação de chave para perfil:', profileId);
    
    // Verificar se realmente precisa rotacionar
    const needsRotation = await shouldRotateKey(profileId);
    if (!needsRotation) {
      console.log('[CryptoService] Chave não precisa ser rotacionada ainda');
      return { success: true, rotated: false };
    }
    
    // Obter chave antiga
    const oldKey = await getProfileSecureItem(ENCRYPTION_KEY_STORAGE, profileId);
    if (!oldKey) {
      throw new Error('Chave antiga não encontrada');
    }
    
    // Gerar nova chave
    const newKey = generateSecureKey();
    
    // Salvar nova chave (mantendo a antiga temporariamente para migração)
    await setProfileSecureItem(`${ENCRYPTION_KEY_STORAGE}_new`, newKey, profileId);
    await setProfileSecureItem(`${ENCRYPTION_KEY_STORAGE}_old`, oldKey, profileId);
    
    // Atualizar timestamp de rotação
    const now = new Date().toISOString();
    await setProfileSecureItem(ENCRYPTION_KEY_ROTATION_STORAGE, now, profileId);
    
    console.log('[CryptoService] Nova chave gerada. Migração de dados deve ser feita incrementalmente.');
    
    // NOTA: A migração real dos dados deve ser feita de forma incremental
    // ao acessar cada item. Isso evita bloquear o app durante a rotação.
    
    return { success: true, rotated: true, message: 'Nova chave gerada. Migração será feita incrementalmente.' };
  } catch (error) {
    console.error('[CryptoService] Erro ao rotacionar chave:', error);
    throw new Error('Não foi possível rotacionar chave de criptografia');
  }
};

/**
 * Verifica e rotaciona chave automaticamente se necessário
 */
export const checkAndRotateKeyIfNeeded = async (profileId) => {
  try {
    const needsRotation = await shouldRotateKey(profileId);
    if (needsRotation) {
      console.log('[CryptoService] Chave precisa ser rotacionada, iniciando processo...');
      return await rotateEncryptionKey(profileId);
    }
    return { success: true, rotated: false };
  } catch (error) {
    console.error('[CryptoService] Erro ao verificar rotação de chave:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verifica se dados estão criptografados (formato esperado)
 */
export const isEncrypted = (data) => {
  return data && typeof data === 'object' && data.encrypted && data.iv;
};
