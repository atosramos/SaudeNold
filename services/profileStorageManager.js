import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { encryptData, decryptData, isEncrypted, checkAndRotateKeyIfNeeded } from './cryptoService';

export const ACTIVE_PROFILE_KEY = 'active_profile_id';
export const PROFILES_KEY = 'family_profiles';
export const PROFILE_PREFIX = 'profile';

const canUseSecureStore = Platform.OS !== 'web';

/**
 * Sanitiza uma chave para uso no SecureStore
 * SecureStore requer que as chaves contenham apenas:
 * - Caracteres alfanuméricos (a-z, A-Z, 0-9)
 * - Pontos (.)
 * - Hífens (-)
 * - Underscores (_)
 */
const sanitizeKey = (key) => {
  if (!key) return '';
  // Substituir caracteres inválidos por underscore
  return String(key)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^[^a-zA-Z0-9]/, 'a') // Garantir que comece com alfanumérico
    .replace(/[^a-zA-Z0-9]$/, 'a'); // Garantir que termine com alfanumérico
};

export const getProfileKey = (key, profileId) => {
  if (!key || !profileId) {
    throw new Error('Key and profileId are required');
  }
  // Sanitizar tanto o profileId quanto a key antes de combinar
  const sanitizedProfileId = sanitizeKey(String(profileId));
  const sanitizedKey = sanitizeKey(String(key));
  // Usar underscore em vez de dois pontos para separar (mais seguro para SecureStore)
  return `${PROFILE_PREFIX}_${sanitizedProfileId}_${sanitizedKey}`;
};

export const getActiveProfileId = async () => {
  return await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
};

export const setActiveProfile = async (profileId) => {
  if (!profileId) {
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
    return;
  }
  await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
};

export const getProfileRemoteId = async (profileId) => {
  if (!profileId) return null;
  const raw = await AsyncStorage.getItem(PROFILES_KEY);
  if (!raw) return null;
  try {
    const profiles = JSON.parse(raw);
    const profile = profiles.find((item) => String(item.id) === String(profileId));
    return profile?.remote_id ?? null;
  } catch {
    return null;
  }
};

export const getActiveProfileRemoteId = async () => {
  const activeId = await getActiveProfileId();
  if (!activeId) return null;
  return await getProfileRemoteId(activeId);
};

// Lista de chaves que contêm dados sensíveis e devem ser criptografadas
const SENSITIVE_DATA_KEYS = [
  'medications',
  'medicalExams',
  'doctorVisits',
  'emergencyContacts',
  'medicationLogs',
  'anamnesis',
  'dailyTracking',
  'vaccineRecords',
  'customVaccines',
];

export const getProfileItem = async (key, profileId = null) => {
  const activeId = profileId || (await getActiveProfileId());
  if (!activeId) return null;
  
  const storageKey = getProfileKey(key, activeId);
  const rawValue = await AsyncStorage.getItem(storageKey);
  
  if (!rawValue) return null;
  
  // Se é uma chave sensível, tentar descriptografar
  if (SENSITIVE_DATA_KEYS.includes(key)) {
    try {
      // Verificar se está criptografado
      const parsed = JSON.parse(rawValue);
      if (isEncrypted(parsed)) {
        // Descriptografar
        const decrypted = await decryptData(parsed, activeId);
        return JSON.stringify(decrypted);
      }
      // Se não está criptografado, retornar como está (compatibilidade com dados antigos)
      // Mas criptografar na próxima escrita
      return rawValue;
    } catch (error) {
      // Se falhar ao descriptografar, pode ser dado não criptografado (compatibilidade)
      console.warn(`[ProfileStorage] Erro ao descriptografar ${key}, retornando como está:`, error);
      return rawValue;
    }
  }
  
  return rawValue;
};

export const setProfileItem = async (key, value, profileId = null) => {
  const activeId = profileId || (await getActiveProfileId());
  if (!activeId || !value) return;
  
  const storageKey = getProfileKey(key, activeId);
  
  // Se é uma chave sensível, criptografar antes de salvar
  if (SENSITIVE_DATA_KEYS.includes(key)) {
    try {
      // Verificar e rotacionar chave se necessário (em background)
      checkAndRotateKeyIfNeeded(activeId).catch(err => {
        console.warn('[ProfileStorage] Erro ao verificar rotação de chave:', err);
      });
      
      // Parse do valor se for string JSON
      let dataToEncrypt;
      try {
        dataToEncrypt = typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        dataToEncrypt = value;
      }
      
      // Criptografar
      const encrypted = await encryptData(dataToEncrypt, activeId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(encrypted));
      return;
    } catch (error) {
      console.error(`[ProfileStorage] Erro ao criptografar ${key}:`, error);
      // Em caso de erro, salvar sem criptografia (fallback para compatibilidade)
      // Mas logar o erro para investigação
      console.warn(`[ProfileStorage] Salvando ${key} sem criptografia devido a erro`);
    }
  }
  
  // Salvar normalmente (não sensível ou erro na criptografia)
  await AsyncStorage.setItem(storageKey, value);
};

export const removeProfileItem = async (key, profileId = null) => {
  const activeId = profileId || (await getActiveProfileId());
  if (!activeId) return;
  await AsyncStorage.removeItem(getProfileKey(key, activeId));
};

export const setProfileSecureItem = async (key, value, profileId = null) => {
  const activeId = profileId || (await getActiveProfileId());
  if (!activeId || !value) return;
  const secureKey = getProfileKey(key, activeId);
  if (canUseSecureStore) {
    await SecureStore.setItemAsync(secureKey, value);
  } else {
    await AsyncStorage.setItem(secureKey, value);
  }
};

export const getProfileSecureItem = async (key, profileId = null) => {
  const activeId = profileId || (await getActiveProfileId());
  if (!activeId) {
    // Fallback: tentar buscar em todos os perfis se não houver activeId
    // Isso resolve o problema de "conta não conectada" após login
    if (key === 'authToken' || key === 'refreshToken') {
      // Buscar token em qualquer perfil disponível
      const profiles = await AsyncStorage.getItem('family_profiles');
      if (profiles) {
        try {
          const profilesList = JSON.parse(profiles);
          for (const profile of profilesList) {
            const secureKey = getProfileKey(key, profile.id);
            let token = null;
            if (canUseSecureStore) {
              token = await SecureStore.getItemAsync(secureKey);
            } else {
              token = await AsyncStorage.getItem(secureKey);
            }
            if (token) {
              // Encontrar token, definir como activeProfile
              await setActiveProfile(profile.id);
              return token;
            }
          }
        } catch (e) {
          // Ignorar erro de parsing
        }
      }
    }
    return null;
  }
  const secureKey = getProfileKey(key, activeId);
  if (canUseSecureStore) {
    return await SecureStore.getItemAsync(secureKey);
  }
  return await AsyncStorage.getItem(secureKey);
};

export const removeProfileSecureItem = async (key, profileId = null) => {
  const activeId = profileId || (await getActiveProfileId());
  if (!activeId) return;
  const secureKey = getProfileKey(key, activeId);
  if (canUseSecureStore) {
    await SecureStore.deleteItemAsync(secureKey);
  } else {
    await AsyncStorage.removeItem(secureKey);
  }
};

const generateEncryptionKey = () => {
  const randomPart = Math.random().toString(36).slice(2);
  const timePart = Date.now().toString(36);
  return `key_${timePart}_${randomPart}`;
};

export const ensureProfileEncryptionKey = async (profileId = null) => {
  const existing = await getProfileSecureItem('profileEncryptionKey', profileId);
  if (existing) return existing;
  const key = generateEncryptionKey();
  await setProfileSecureItem('profileEncryptionKey', key, profileId);
  return key;
};

export const clearProfileData = async (profileId = null) => {
  const activeId = profileId || (await getActiveProfileId());
  if (!activeId) return;
  // Usar o formato sanitizado para buscar chaves
  const sanitizedProfileId = sanitizeKey(String(activeId));
  const prefix = `${PROFILE_PREFIX}_${sanitizedProfileId}_`;
  const keys = await AsyncStorage.getAllKeys();
  const profileKeys = keys.filter((key) => key.startsWith(prefix));
  if (profileKeys.length > 0) {
    await AsyncStorage.multiRemove(profileKeys);
  }
  await removeProfileSecureItem('authToken', activeId);
  await removeProfileSecureItem('refreshToken', activeId);
  await removeProfileSecureItem('profilePin', activeId);
};
