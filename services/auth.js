import axios from 'axios';
import api from './api';
import { clearStoredAuth, getStoredAuthUser, getAuthToken, getRefreshToken, setStoredAuth } from './authStorage';
import { ensureDefaultProfile, syncProfilesWithServer } from './profileService';
import { getDeviceInfo } from './deviceInfo';

export const registerUser = async (email, password) => {
  const device = await getDeviceInfo();
  const response = await api.post('/api/auth/register', { email, password, device });
  if (response?.data?.access_token) {
    const profiles = await ensureDefaultProfile(response.data.user);
    const profileId = profiles?.[0]?.id || null;
    await setStoredAuth(response.data.access_token, response.data.refresh_token, response.data.user, profileId);
    api.defaults.headers.common.Authorization = `Bearer ${response.data.access_token}`;
    await syncProfilesWithServer();
  }
  return response.data;
};

export const loginUser = async (email, password) => {
  let device = null;
  try {
    // Tentar obter device info, mas não bloquear se falhar
    try {
      device = await getDeviceInfo();
    } catch (deviceError) {
      console.warn('Erro ao obter device info (continuando sem ele):', deviceError);
      device = null;
    }
    
    const response = await api.post('/api/auth/login', { email, password, device });
    
    // CRÍTICO: Se o backend retornou 200 OK, o login DEVE funcionar
    // Não importa o que aconteça depois, o token foi recebido
    if (response?.data?.access_token) {
      // Salvar o token PRIMEIRO (mais importante) - NUNCA lançar exceção aqui
      await setStoredAuth(response.data.access_token, response.data.refresh_token, response.data.user, null);
      api.defaults.headers.common.Authorization = `Bearer ${response.data.access_token}`;
      
      // Processar perfil em background (não crítico para login)
      Promise.resolve().then(async () => {
        try {
          const profiles = await ensureDefaultProfile(response.data.user);
          const profileId = profiles?.[0]?.id || null;
          if (profileId) {
            // Atualizar com profileId se possível
            await setStoredAuth(response.data.access_token, response.data.refresh_token, response.data.user, profileId);
          }
        } catch (profileError) {
          console.error('Erro ao processar perfil (não crítico):', profileError);
        }
      });
      
      // Sincronizar perfis em background (não bloqueia login)
      syncProfilesWithServer().catch(error => {
        console.error('Erro ao sincronizar perfis (não crítico):', error);
      });
    }
    
    // SEMPRE retornar success se o backend retornou 200 OK
    return response.data;
  } catch (error) {
    // Só lançar erro se o backend retornou erro (não 200 OK)
    throw error;
  }
};

export const logoutUser = async () => {
  // CRÍTICO: Marcar flag de logout ANTES de limpar (evita usar token durante limpeza)
  if (api && typeof api.setLogoutFlag === 'function') {
    api.setLogoutFlag(true);
  }
  
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await api.post('/api/auth/revoke', { refresh_token: refreshToken });
    } catch (error) {
      // Ignorar falha de revogacao e seguir limpando localmente
    }
  }
  
  // Limpar header do axios
  delete api.defaults.headers.common.Authorization;
  
  // Limpar token CSRF
  if (api && typeof api.clearCsrfToken === 'function') {
    api.clearCsrfToken();
  }
  
  // Limpar todos os tokens de todos os perfis
  await clearStoredAuth();
  
  // Garantir que flag de logout está ativa
  if (api && typeof api.setLogoutFlag === 'function') {
    api.setLogoutFlag(true);
  }
};

export const getAuthUser = async () => {
  return await getStoredAuthUser();
};

export const hasAuthToken = async () => {
  // Verificar token no storage primeiro
  const token = await getAuthToken();
  
  // #region agent log
  console.log('[Auth] hasAuthToken CHECK', { hasToken: !!token, tokenLength: token?.length, hasHeaderAuth: !!(api.defaults.headers.common.Authorization) });
  // #endregion
  
  if (token) {
    // #region agent log
    console.log('[Auth] hasAuthToken TOKEN EXISTS - returning true (validation will happen on API calls)');
    // #endregion
    return true;
  }
  
  // Fallback: verificar se há token no header do axios (caso tenha sido salvo mas não encontrado no storage)
  if (api.defaults.headers.common.Authorization) {
    const headerAuth = api.defaults.headers.common.Authorization;
    if (headerAuth && headerAuth.startsWith('Bearer ')) {
      // #region agent log
      console.log('[Auth] hasAuthToken FOUND IN HEADER - returning true');
      // #endregion
      return true;
    }
  }
  
  // #region agent log
  console.log('[Auth] hasAuthToken NO TOKEN FOUND - returning false');
  // #endregion
  
  return false;
};

export const refreshAccessToken = async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return null;
  }
  try {
    const baseURL = api.defaults.baseURL || '';
    const response = await axios.post(`${baseURL}/api/auth/refresh`, { refresh_token: refreshToken });
    if (response?.data?.access_token) {
      await setStoredAuth(response.data.access_token, response.data.refresh_token, null);
      api.defaults.headers.common.Authorization = `Bearer ${response.data.access_token}`;
      return response.data.access_token;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const getBiometricChallenge = async (deviceId) => {
  // #region agent log
  try {
    fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:156',message:'getBiometricChallenge ENTRY',data:{deviceId,deviceIdLength:deviceId?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  } catch (e) {}
  // #endregion
  
  try {
    const response = await api.post('/api/auth/biometric/challenge', { device_id: deviceId });
    
    // #region agent log
    try {
      fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:162',message:'getBiometricChallenge SUCCESS',data:{hasChallenge:!!response?.data?.challenge,challengeLength:response?.data?.challenge?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    } catch (e) {}
    // #endregion
    
    return response.data;
  } catch (error) {
    // #region agent log
    try {
      fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:170',message:'getBiometricChallenge ERROR',data:{error:error?.message,status:error?.response?.status,statusText:error?.response?.statusText,data:error?.response?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    } catch (e) {}
    // #endregion
    throw error;
  }
};

export const biometricLogin = async (deviceId, challenge, signature) => {
  try {
    const response = await api.post('/api/auth/biometric', {
      device_id: deviceId,
      challenge,
      signature,
    });
    
    if (response?.data?.access_token) {
      // CRÍTICO: Salvar o token PRIMEIRO (mais importante) - NUNCA lançar exceção aqui
      // Salvar sem profileId primeiro para garantir que o token esteja disponível
      await setStoredAuth(response.data.access_token, response.data.refresh_token, response.data.user, null);
      api.defaults.headers.common.Authorization = `Bearer ${response.data.access_token}`;
      
      // Processar perfil em background (não crítico para login)
      Promise.resolve().then(async () => {
        try {
          const profiles = await ensureDefaultProfile(response.data.user);
          const profileId = profiles?.[0]?.id || null;
          
          if (profileId) {
            // Atualizar com profileId se possível
            await setStoredAuth(response.data.access_token, response.data.refresh_token, response.data.user, profileId);
          }
        } catch (profileError) {
          console.error('Erro ao processar perfil (não crítico):', profileError);
        }
      });
      
      // Sincronizar perfis em background (não bloqueia login)
      syncProfilesWithServer().catch(error => {
        console.error('Erro ao sincronizar perfis (não crítico):', error);
      });
    }
    return response.data;
  } catch (error) {
    // #region agent log
    try {
      fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:207',message:'biometricLogin ERROR',data:{error:error?.message,status:error?.response?.status,statusText:error?.response?.statusText,data:error?.response?.data,detail:error?.response?.data?.detail},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    } catch (e) {}
    // #endregion
    throw error;
  }
};

export const verifyEmail = async (email, token) => {
  const response = await api.post('/api/auth/verify-email', { email, token });
  return response.data;
};

export const resendVerification = async (email) => {
  const response = await api.post('/api/auth/resend-verification', { email });
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post('/api/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (email, token, newPassword) => {
  const response = await api.post('/api/auth/reset-password', {
    email,
    token,
    new_password: newPassword,
  });
  return response.data;
};
