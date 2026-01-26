import * as LocalAuthentication from 'expo-local-authentication';
import { getProfileItem, setProfileItem, removeProfileItem } from './profileStorageManager';
import { verifyProfilePin } from './profileService';
import { isBiometricEnabled } from './biometricService';
import { Platform } from 'react-native';

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

// Log module initialization
logDebug('profileAuth.js:6', 'MODULE INIT', { LocalAuthenticationExists: !!LocalAuthentication, LocalAuthenticationType: typeof LocalAuthentication, hasHasHardwareAsync: !!(LocalAuthentication?.hasHardwareAsync), hasIsEnrolledAsync: !!(LocalAuthentication?.isEnrolledAsync), hasAuthenticateAsync: !!(LocalAuthentication?.authenticateAsync) }, 'A');
// #endregion

export const PROFILE_LAST_AUTH_KEY = 'profileLastAuthAt';
export const PROFILE_LAST_ACTIVITY_KEY = 'profileLastActivityAt';
export const PROFILE_AUTH_TIMEOUT_KEY = 'profile_auth_timeout_minutes';
export const DEFAULT_PROFILE_AUTH_TIMEOUT_MINUTES = 10;

export const recordProfileActivity = async (profileId) => {
  const now = new Date().toISOString();
  await setProfileItem(PROFILE_LAST_ACTIVITY_KEY, now, profileId);
};

export const markProfileAuthenticated = async (profileId) => {
  const now = new Date().toISOString();
  await setProfileItem(PROFILE_LAST_AUTH_KEY, now, profileId);
  await setProfileItem(PROFILE_LAST_ACTIVITY_KEY, now, profileId);
};

export const clearProfileAuthState = async (profileId) => {
  if (!profileId) return;
  await removeProfileItem(PROFILE_LAST_AUTH_KEY, profileId);
  await removeProfileItem(PROFILE_LAST_ACTIVITY_KEY, profileId);
};

export const getProfileAuthTimeout = async (profileId) => {
  try {
    const stored = await getProfileItem(PROFILE_AUTH_TIMEOUT_KEY, profileId);
    if (stored) {
      const minutes = parseInt(stored, 10);
      if (minutes >= 5 && minutes <= 15) {
        return minutes;
      }
    }
  } catch (error) {
    console.warn('[ProfileAuth] Erro ao carregar timeout configurado:', error);
  }
  return DEFAULT_PROFILE_AUTH_TIMEOUT_MINUTES;
};

export const setProfileAuthTimeout = async (profileId, minutes) => {
  if (minutes < 5 || minutes > 15) {
    throw new Error('Timeout deve estar entre 5 e 15 minutos');
  }
  await setProfileItem(PROFILE_AUTH_TIMEOUT_KEY, String(minutes), profileId);
};

export const shouldRequireProfileReauth = async (
  profileId,
  timeoutMinutes = null
) => {
  // Se timeoutMinutes não foi fornecido, usar o configurado ou padrão
  if (timeoutMinutes === null) {
    timeoutMinutes = await getProfileAuthTimeout(profileId);
  }
  
  const lastAuth = await getProfileItem(PROFILE_LAST_AUTH_KEY, profileId);
  if (!lastAuth) return true;
  const lastActivity = await getProfileItem(PROFILE_LAST_ACTIVITY_KEY, profileId);
  const now = Date.now();
  const cutoffMs = timeoutMinutes * 60 * 1000;
  if (lastActivity) {
    const lastActivityMs = new Date(lastActivity).getTime();
    if (!Number.isNaN(lastActivityMs) && now - lastActivityMs > cutoffMs) {
      return true;
    }
  }
  const lastAuthMs = new Date(lastAuth).getTime();
  if (!Number.isNaN(lastAuthMs) && now - lastAuthMs > cutoffMs) {
    return true;
  }
  return false;
};

export const authenticateProfileWithPin = async (profileId, pin) => {
  const ok = await verifyProfilePin(profileId, pin);
  if (ok) {
    await markProfileAuthenticated(profileId);
  }
  return ok;
};

export const authenticateProfileWithBiometrics = async (profileId) => {
  // #region agent log
  logDebug('profileAuth.js:57', 'authenticateProfileWithBiometrics ENTRY', { profileId, LocalAuthExists: !!LocalAuthentication }, 'C');
  // #endregion
  
  const enabled = await isBiometricEnabled(profileId);
  // #region agent log
  logDebug('profileAuth.js:62', 'authenticateProfileWithBiometrics BIOMETRIC ENABLED CHECK', { enabled }, 'C');
  // #endregion
  
  if (!enabled) {
    // #region agent log
    logDebug('profileAuth.js:66', 'authenticateProfileWithBiometrics DISABLED', {}, 'C');
    // #endregion
    return { success: false, error: 'disabled' };
  }
  
  // #region agent log
  logDebug('profileAuth.js:72', 'authenticateProfileWithBiometrics CHECKING HARDWARE', { hasHasHardwareAsync: !!(LocalAuthentication?.hasHardwareAsync) }, 'C');
  // #endregion
  
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  // #region agent log
  logDebug('profileAuth.js:76', 'authenticateProfileWithBiometrics HARDWARE CHECK RESULT', { hasHardware }, 'C');
  // #endregion
  
  if (!hasHardware) {
    // #region agent log
    logDebug('profileAuth.js:80', 'authenticateProfileWithBiometrics NO HARDWARE', {}, 'C');
    // #endregion
    return { success: false, error: 'unavailable' };
  }
  
  // #region agent log
  logDebug('profileAuth.js:85', 'authenticateProfileWithBiometrics CHECKING ENROLLED', { hasIsEnrolledAsync: !!(LocalAuthentication?.isEnrolledAsync) }, 'C');
  // #endregion
  
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  // #region agent log
  logDebug('profileAuth.js:89', 'authenticateProfileWithBiometrics ENROLLED CHECK RESULT', { enrolled }, 'C');
  // #endregion
  
  if (!enrolled) {
    // #region agent log
    logDebug('profileAuth.js:93', 'authenticateProfileWithBiometrics NOT ENROLLED', {}, 'C');
    // #endregion
    return { success: false, error: 'not_enrolled' };
  }
  
  // #region agent log
  logDebug('profileAuth.js:99', 'authenticateProfileWithBiometrics STARTING AUTH', { hasAuthenticateAsync: !!(LocalAuthentication?.authenticateAsync) }, 'C');
  // #endregion
  
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirme sua identidade',
    fallbackLabel: 'Usar PIN do perfil',
  });
  
  // #region agent log
  logDebug('profileAuth.js:107', 'authenticateProfileWithBiometrics AUTH RESULT', { success: result?.success, error: result?.error }, 'C');
  // #endregion
  
  if (result.success) {
    await markProfileAuthenticated(profileId);
    return { success: true };
  }
  return { success: false, error: result.error || 'failed' };
};
