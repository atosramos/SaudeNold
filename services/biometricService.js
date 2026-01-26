import { Platform } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import api from './api';
import { getDeviceId } from './deviceInfo';
import { biometricLogin, getBiometricChallenge } from './auth';
import { getAuthToken } from './authStorage';
import { getActiveProfileId, getProfileSecureItem, removeProfileSecureItem, setProfileSecureItem } from './profileStorageManager';

// #region agent log
const DEBUG_LOG_ENDPOINT = 'http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0';
const logDebug = (location, message, data, hypothesisId) => {
  fetch(DEBUG_LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data: { ...data, platform: Platform.OS },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId
    })
  }).catch(() => {});
};
// #endregion

const BIOMETRIC_ENABLED_KEY = 'biometricEnabled';

// #region agent log
logDebug('biometricService.js:9', 'MODULE INIT', { ReactNativeBiometricsExists: !!ReactNativeBiometrics, ReactNativeBiometricsType: typeof ReactNativeBiometrics }, 'A');
// #endregion

const rnBiometrics = new ReactNativeBiometrics();

// #region agent log
logDebug('biometricService.js:12', 'RNBIOMETRICS INSTANCE CREATED', { rnBiometricsExists: !!rnBiometrics, rnBiometricsType: typeof rnBiometrics, hasIsSensorAvailable: !!(rnBiometrics?.isSensorAvailable), hasCreateKeys: !!(rnBiometrics?.createKeys) }, 'A');
// #endregion
export const isBiometricSupported = async () => {
  // #region agent log
  logDebug('biometricService.js:11', 'isBiometricSupported ENTRY', { PlatformOS: Platform.OS }, 'C');
  // #endregion
  
  if (Platform.OS === 'web') {
    // #region agent log
    logDebug('biometricService.js:15', 'isBiometricSupported WEB DETECTED', {}, 'D');
    // #endregion
    return false;
  }
  
  // #region agent log
  logDebug('biometricService.js:19', 'isBiometricSupported CHECKING MODULE', { rnBiometricsExists: !!rnBiometrics, hasIsSensorAvailable: !!(rnBiometrics?.isSensorAvailable) }, 'C');
  // #endregion
  
  try {
    const { available } = await rnBiometrics.isSensorAvailable();
    // #region agent log
    logDebug('biometricService.js:24', 'isBiometricSupported RESULT', { available, result: !!available }, 'C');
    // #endregion
    return !!available;
  } catch (error) {
    // #region agent log
    logDebug('biometricService.js:29', 'isBiometricSupported ERROR', { error: error?.message, errorType: error?.constructor?.name }, 'C');
    // #endregion
    return false;
  }
};

export const isBiometricEnabled = async (profileId = null) => {
  // Primeiro tentar com profileId fornecido ou activeProfileId
  let value = await getProfileSecureItem(BIOMETRIC_ENABLED_KEY, profileId);
  
  // Se não encontrou e não foi fornecido profileId, tentar buscar em todos os perfis
  if (!value && !profileId) {
    try {
      const { loadProfiles } = await import('./profileService');
      const profiles = await loadProfiles();
      
      // Buscar em todos os perfis
      for (const profile of profiles) {
        const profileValue = await getProfileSecureItem(BIOMETRIC_ENABLED_KEY, profile.id);
        if (profileValue === 'true') {
          value = profileValue;
          break; // Encontrou, parar busca
        }
      }
    } catch (error) {
      console.warn('Erro ao buscar biometria em todos os perfis:', error);
    }
  }
  
  return value === 'true';
};

export const setBiometricEnabled = async (enabled, profileId = null) => {
  if (enabled) {
    await setProfileSecureItem(BIOMETRIC_ENABLED_KEY, 'true', profileId);
  } else {
    // CRÍTICO: Remover de todos os perfis se profileId não foi fornecido
    // Isso garante que a biometria seja desativada mesmo se não houver activeProfileId
    if (!profileId) {
      try {
        const { loadProfiles } = await import('./profileService');
        const profiles = await loadProfiles();
        
        // Remover de todos os perfis conhecidos
        for (const profile of profiles) {
          try {
            await removeProfileSecureItem(BIOMETRIC_ENABLED_KEY, profile.id);
          } catch (profileError) {
            console.warn(`Erro ao remover biometria do perfil ${profile.id}:`, profileError);
          }
        }
      } catch (profilesError) {
        console.warn('Erro ao carregar perfis para desativar biometria:', profilesError);
      }
    }
    
    // Também remover do perfil ativo (se houver)
    await removeProfileSecureItem(BIOMETRIC_ENABLED_KEY, profileId);
  }
};

const getAuthTokenWithRetry = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = await getAuthToken();
    if (token) {
      return token;
    }
    // Aumentar delay progressivamente
    await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
  }
  return null;
};

const ensureBiometricKeys = async () => {
  // #region agent log
  logDebug('biometricService.js:86', 'ensureBiometricKeys ENTRY', {}, 'C');
  // #endregion
  
  try {
    // #region agent log
    logDebug('biometricService.js:90', 'ensureBiometricKeys CHECKING SENSOR', { rnBiometricsExists: !!rnBiometrics, hasIsSensorAvailable: !!(rnBiometrics?.isSensorAvailable) }, 'C');
    // #endregion
    
    const { available } = await rnBiometrics.isSensorAvailable();
    
    // #region agent log
    logDebug('biometricService.js:95', 'ensureBiometricKeys SENSOR CHECK RESULT', { available }, 'C');
    // #endregion
    
    if (!available) {
      // #region agent log
      logDebug('biometricService.js:99', 'ensureBiometricKeys SENSOR UNAVAILABLE', {}, 'C');
      // #endregion
      return { success: false, error: 'unavailable' };
    }
    
    // #region agent log
    logDebug('biometricService.js:105', 'ensureBiometricKeys CREATING KEYS', { hasCreateKeys: !!(rnBiometrics?.createKeys) }, 'C');
    // #endregion
    
    const { publicKey } = await rnBiometrics.createKeys();
    
    // #region agent log
    logDebug('biometricService.js:110', 'ensureBiometricKeys KEYS CREATED', { publicKeyExists: !!publicKey, publicKeyLength: publicKey?.length }, 'C');
    // #endregion
    
    return { success: true, publicKey };
  } catch (error) {
    // #region agent log
    logDebug('biometricService.js:115', 'ensureBiometricKeys ERROR', { error: error?.message, errorType: error?.constructor?.name, stack: error?.stack }, 'C');
    // #endregion
    return { success: false, error: error?.message || 'unknown' };
  }
};

export const enrollBiometricLogin = async (profileId = null) => {
  if (Platform.OS === 'web') {
    return { success: false, error: 'unsupported' };
  }
  // Aguardar mais tempo para garantir que o token foi salvo
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Tentar múltiplas vezes com delays progressivos
  let authToken = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    authToken = await getAuthToken();
    if (authToken) {
      break;
    }
    // Delay progressivo: 200ms, 400ms, 600ms...
    await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
  }
  
  // FALLBACK CRÍTICO: Se não encontrou no storage, usar do header do axios
  if (!authToken && api?.defaults?.headers?.common?.Authorization) {
    const headerAuth = api.defaults.headers.common.Authorization;
    if (headerAuth && headerAuth.startsWith('Bearer ')) {
      authToken = headerAuth.substring(7); // Remove "Bearer "
      console.log('Token encontrado no header do axios (fallback)');
    }
  }
  
  if (!authToken) {
    console.error('Token não encontrado após múltiplas tentativas e fallbacks');
    return { success: false, error: 'missing_token' };
  }
  const result = await ensureBiometricKeys();
  if (!result.success) {
    return result;
  }
  const deviceId = await getDeviceId();
  try {
    const response = await api.post(
      '/api/user/biometric/register',
      {
        device_id: deviceId,
        public_key: result.publicKey,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    // Se chegou aqui, a API retornou 200 OK - SUCESSO!
    // Tentar salvar o estado de biometria habilitada (não crítico se falhar)
    try {
      const resolvedProfileId = profileId || (await getActiveProfileId());
      if (resolvedProfileId) {
        await setBiometricEnabled(true, resolvedProfileId);
      } else {
        // Se não há profileId, tentar salvar mesmo assim (pode funcionar)
        try {
          await setBiometricEnabled(true, null);
        } catch (e) {
          console.warn('Não foi possível salvar estado de biometria, mas registro foi bem-sucedido:', e);
        }
      }
    } catch (saveError) {
      // Não crítico - o registro foi bem-sucedido no backend
      console.warn('Erro ao salvar estado de biometria (não crítico):', saveError);
    }
    
    // SEMPRE retornar sucesso se a API retornou 200 OK
    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar biometria:', error);
    if (error?.response?.status === 401) {
      return { success: false, error: 'unauthorized' };
    }
    // Se não é 401, pode ser erro de rede ou outro problema
    const errorMessage = error?.response?.data?.detail || error?.message || 'Erro desconhecido';
    console.error('Detalhes do erro:', errorMessage);
    return { success: false, error: 'register_failed' };
  }
};

export const authenticateBiometricLogin = async () => {
  // #region agent log
  logDebug('biometricService.js:259', 'authenticateBiometricLogin ENTRY', { PlatformOS: Platform.OS }, 'D');
  // #endregion
  
  if (Platform.OS === 'web') {
    // #region agent log
    logDebug('biometricService.js:262', 'authenticateBiometricLogin WEB DETECTED', {}, 'D');
    // #endregion
    return { success: false, error: 'unsupported' };
  }
  try {
    // #region agent log
    logDebug('biometricService.js:267', 'authenticateBiometricLogin GETTING DEVICE ID', {}, 'D');
    // #endregion
    
    const deviceId = await getDeviceId();
    
    // #region agent log
    logDebug('biometricService.js:272', 'authenticateBiometricLogin DEVICE ID OBTAINED', { deviceId, deviceIdLength: deviceId?.length }, 'D');
    // #endregion
    
    // #region agent log
    logDebug('biometricService.js:276', 'authenticateBiometricLogin GETTING CHALLENGE', { deviceId }, 'D');
    // #endregion
    
    const challengeResponse = await getBiometricChallenge(deviceId);
    
    // #region agent log
    logDebug('biometricService.js:281', 'authenticateBiometricLogin CHALLENGE RECEIVED', { hasChallenge: !!challengeResponse?.challenge, challengeLength: challengeResponse?.challenge?.length }, 'D');
    // #endregion
    
    // #region agent log
    logDebug('biometricService.js:285', 'authenticateBiometricLogin CREATING SIGNATURE', { hasRnBiometrics: !!rnBiometrics, hasCreateSignature: !!(rnBiometrics?.createSignature), challenge: challengeResponse?.challenge?.substring(0, 20) }, 'D');
    // #endregion
    
    const signatureResult = await rnBiometrics.createSignature({
      promptMessage: 'Entrar com biometria',
      payload: challengeResponse.challenge,
    });
    
    // #region agent log
    logDebug('biometricService.js:293', 'authenticateBiometricLogin SIGNATURE RESULT', { success: signatureResult?.success, hasSignature: !!signatureResult?.signature, signatureLength: signatureResult?.signature?.length, error: signatureResult?.error }, 'D');
    // #endregion
    
    if (!signatureResult.success) {
      // #region agent log
      logDebug('biometricService.js:298', 'authenticateBiometricLogin SIGNATURE FAILED', { error: signatureResult?.error }, 'D');
      // #endregion
      return { success: false, error: 'cancelled' };
    }
    
    // #region agent log
    logDebug('biometricService.js:304', 'authenticateBiometricLogin CALLING BIOMETRIC LOGIN', { deviceId, hasChallenge: !!challengeResponse?.challenge, hasSignature: !!signatureResult?.signature }, 'D');
    // #endregion
    
    await biometricLogin(deviceId, challengeResponse.challenge, signatureResult.signature);
    
    // #region agent log
    logDebug('biometricService.js:310', 'authenticateBiometricLogin SUCCESS', {}, 'D');
    // #endregion
    
    return { success: true };
  } catch (error) {
    // #region agent log
    logDebug('biometricService.js:315', 'authenticateBiometricLogin EXCEPTION', { error: error?.message, errorType: error?.constructor?.name, status: error?.response?.status, statusText: error?.response?.statusText, data: error?.response?.data, stack: error?.stack?.substring(0, 500) }, 'D');
    // #endregion
    
    console.error('Erro ao autenticar com biometria:', error);
    // Se for erro de autenticação (401), retornar erro específico
    if (error?.response?.status === 401) {
      // #region agent log
      logDebug('biometricService.js:322', 'authenticateBiometricLogin UNAUTHORIZED', { status: 401 }, 'D');
      // #endregion
      return { success: false, error: 'unauthorized' };
    }
    // Se for erro de rede ou outro, retornar erro genérico
    // #region agent log
    logDebug('biometricService.js:328', 'authenticateBiometricLogin GENERIC ERROR', { error: 'failed' }, 'D');
    // #endregion
    return { success: false, error: 'failed' };
  }
};
