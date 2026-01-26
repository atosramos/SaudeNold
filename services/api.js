import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getAuthToken, getRefreshToken, setStoredAuth, clearStoredAuth } from './authStorage';
import { getDeviceId } from './deviceInfo';
import { getActiveProfileId, getActiveProfileRemoteId } from './profileStorageManager';

const RAW_API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const API_URL = Platform.OS === 'android'
  ? RAW_API_URL
      .replace('http://localhost', 'http://10.0.2.2')
      .replace('http://127.0.0.1', 'http://10.0.2.2')
  : RAW_API_URL;
const API_KEY = Constants.expoConfig?.extra?.apiKey || process.env.EXPO_PUBLIC_API_KEY || '';

// Verificar se está em produção
const isProduction = !__DEV__ && 
  !API_URL.includes('localhost') && 
  !API_URL.includes('127.0.0.1') && 
  !API_URL.includes('10.0.2.2') &&
  !API_URL.includes('192.168.');

// Enforcement de HTTPS em produção
if (isProduction && !API_URL.startsWith('https://')) {
  const errorMsg = 'HTTPS é obrigatório em produção para segurança dos dados médicos. Configure EXPO_PUBLIC_API_URL com https://';
  console.error('[API] ERRO DE SEGURANÇA:', errorMsg);
  throw new Error(errorMsg);
}

if (__DEV__) {
  console.warn('API_URL em runtime:', API_URL);
  if (!API_URL.startsWith('https://') && !API_URL.includes('localhost') && !API_URL.includes('127.0.0.1')) {
    console.warn('[API] AVISO: Usando HTTP. Em produção, HTTPS é obrigatório para segurança dos dados médicos.');
  }
}
const runtimeApiKeyState = {
  value: null,
  inflight: null,
  tried: false,
};

const fetchRuntimeApiKey = async () => {
  if (runtimeApiKeyState.value) {
    return runtimeApiKeyState.value;
  }
  if (runtimeApiKeyState.inflight) {
    return runtimeApiKeyState.inflight;
  }
  if (runtimeApiKeyState.tried) {
    return null;
  }
  runtimeApiKeyState.inflight = axios
    .get(`${API_URL}/debug/api-key-info`, { timeout: 3000 })
    .then((response) => {
      const key = response?.data?.api_key_in_memory;
      if (key) {
        runtimeApiKeyState.value = key;
      }
      return key || null;
    })
    .catch(() => null)
    .finally(() => {
      runtimeApiKeyState.tried = true;
      runtimeApiKeyState.inflight = null;
    });
  return runtimeApiKeyState.inflight;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  },
  timeout: 10000,
});

// Flag para rastrear se logout foi feito (evita usar token após logout)
let logoutFlag = false;

// Função para definir flag de logout (chamada por logoutUser)
api.setLogoutFlag = (value) => {
  logoutFlag = value;
};

// Gerenciamento de token CSRF
let csrfToken = null;
let csrfTokenPromise = null;

// Endpoints que não precisam de token CSRF
const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/revoke',  // Endpoint de logout
  '/api/auth/reset-password',
  '/api/auth/forgot-password',
  '/api/auth/verify-email',
  '/api/auth/biometric/challenge',  // Endpoint de autenticação biométrica
  '/api/auth/biometric',  // Endpoint de autenticação biométrica
  '/api/csrf-token',
  '/health',
  '/debug/',
];

// Função para obter token CSRF
const getCsrfToken = async () => {
  // Se já temos um token, retornar
  if (csrfToken) {
    return csrfToken;
  }
  
  // Se já há uma requisição em andamento, aguardar
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }
  
  // Obter token do backend
  const authToken = await getAuthToken();
  if (!authToken) {
    return null;
  }
  
  csrfTokenPromise = axios
    .get(`${API_URL}/api/csrf-token`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 5000,
    })
    .then((response) => {
      const token = response?.data?.csrf_token;
      if (token) {
        csrfToken = token;
      }
      return token;
    })
    .catch((error) => {
      console.warn('[API] Erro ao obter token CSRF:', error?.message);
      return null;
    })
    .finally(() => {
      csrfTokenPromise = null;
    });
  
  return csrfTokenPromise;
};

// Função para limpar token CSRF (chamada após logout)
const clearCsrfToken = () => {
  csrfToken = null;
  csrfTokenPromise = null;
};

api.clearCsrfToken = clearCsrfToken;

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  async (config) => {
    // Se logout foi feito, NÃO usar token mesmo se encontrar um
    if (logoutFlag) {
      // Limpar flag após usar (permite novo login)
      logoutFlag = false;
      // Não adicionar Authorization header - deixar backend rejeitar
      return config;
    }
    
    const authToken = await getAuthToken();
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
      const deviceId = await getDeviceId();
      if (deviceId) {
        config.headers['X-Device-Id'] = deviceId;
      }
      // CRÍTICO: Backend espera X-Profile-Id como número inteiro (remote_id)
      // NÃO enviar profileId local (ex: "profile_1234567890") pois não é um número
      const remoteProfileId = await getActiveProfileRemoteId();
      if (remoteProfileId && Number.isInteger(Number(remoteProfileId))) {
        config.headers['X-Profile-Id'] = String(remoteProfileId);
        // #region agent log
        console.log('[API] X-Profile-Id header definido:', remoteProfileId);
        // #endregion
      } else {
        // #region agent log
        console.log('[API] X-Profile-Id NÃO definido - remoteProfileId:', remoteProfileId, 'tipo:', typeof remoteProfileId);
        // #endregion
        // Não enviar header se não houver remote_id válido
        // Backend vai usar o perfil padrão do usuário
      }
      
      // Adicionar token CSRF para métodos que modificam dados
      const method = config.method?.toUpperCase();
      const url = config.url || '';
      const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) &&
                       !CSRF_EXEMPT_PATHS.some(path => url.includes(path));
      
      if (needsCsrf) {
        const csrf = await getCsrfToken();
        if (csrf) {
          config.headers['X-CSRF-Token'] = csrf;
        }
      }
    } else if (api.defaults.headers.common.Authorization && !api.defaults.headers.common.Authorization.includes('Bearer ' + API_KEY)) {
      // Só usar header do axios se não for API_KEY (pode ser token JWT válido)
      config.headers.Authorization = api.defaults.headers.common.Authorization;
    } else {
      // CRÍTICO: NÃO enviar API_KEY para endpoints protegidos
      // Se não há token JWT, não adicionar Authorization header
      // Backend deve rejeitar com 401 se não houver token válido
      // API_KEY só deve ser usada para endpoints públicos (como /health)
      const isPublicEndpoint = config.url?.includes('/health') || 
                               config.url?.includes('/debug/') ||
                               config.url?.includes('/api/auth/register') ||
                               config.url?.includes('/api/auth/login');
      
      if (isPublicEndpoint && API_KEY) {
        config.headers.Authorization = `Bearer ${API_KEY}`;
      } else if (__DEV__ && isPublicEndpoint) {
        const runtimeApiKey = await fetchRuntimeApiKey();
        if (runtimeApiKey) {
          config.headers.Authorization = `Bearer ${runtimeApiKey}`;
          console.warn('⚠️ Usando API Key obtida via debug endpoint (apenas para endpoints públicos).');
        }
      }
      // Se não é endpoint público e não há token, não adicionar Authorization
      // Backend vai retornar 401, que é o comportamento correto
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de conexão e autenticação
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    // Log detalhado de erros de conexão
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('❌ Erro de conexão com backend:', {
        code: error.code,
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
    } else if (error.response?.status === 401) {
      console.error('❌ Erro de autenticação: API Key inválida ou ausente');
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) {
            await clearStoredAuth();
            return Promise.reject(error);
          }
          const refreshResponse = await axios.post(`${API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          if (refreshResponse?.data?.access_token) {
            await setStoredAuth(
              refreshResponse.data.access_token,
              refreshResponse.data.refresh_token,
              null
            );
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access_token}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          await clearStoredAuth();
        }
      }
    } else if (error.response?.status >= 500) {
      console.error('❌ Erro do servidor:', error.response?.status, error.response?.data);
    } else if (error.response?.status >= 400) {
      console.error('❌ Erro na requisição:', error.response?.status, error.response?.data);
    }
    return Promise.reject(error);
  }
);

// ========== MEDICAMENTOS ==========
export const medicationsAPI = {
  getAll: () => api.get('/api/medications'),
  create: (data) => api.post('/api/medications', data),
  update: (id, data) => api.put(`/api/medications/${id}`, data),
  delete: (id) => api.delete(`/api/medications/${id}`),
};

// ========== MEDICATION LOGS ==========
export const medicationLogsAPI = {
  getAll: () => api.get('/api/medication-logs'),
  create: (data) => api.post('/api/medication-logs', data),
};

// ========== CONTATOS DE EMERGÊNCIA ==========
export const emergencyContactsAPI = {
  getAll: () => api.get('/api/emergency-contacts'),
  create: (data) => api.post('/api/emergency-contacts', data),
  update: (id, data) => api.put(`/api/emergency-contacts/${id}`, data),
  delete: (id) => api.delete(`/api/emergency-contacts/${id}`),
};

// ========== VISITAS AO MÉDICO ==========
export const doctorVisitsAPI = {
  getAll: () => api.get('/api/doctor-visits'),
  create: (data) => api.post('/api/doctor-visits', data),
  update: (id, data) => api.put(`/api/doctor-visits/${id}`, data),
  delete: (id) => api.delete(`/api/doctor-visits/${id}`),
};

// ========== EXAMES MÉDICOS ==========
export const medicalExamsAPI = {
  getAll: () => api.get('/api/medical-exams'),
  getById: (id) => api.get(`/api/medical-exams/${id}`),
  create: (data) => api.post('/api/medical-exams', data),
  update: (id, data) => api.put(`/api/medical-exams/${id}`, data),
  delete: (id) => api.delete(`/api/medical-exams/${id}`),
  getTimeline: (examId, parameterName) => api.get(`/api/medical-exams/${examId}/timeline/${parameterName}`),
};

// ========== LICENÇAS PRO ==========
export const licensesAPI = {
  validate: (key, deviceId) => api.post('/api/validate-license', { key, device_id: deviceId }),
  generate: (licenseType, userId, purchaseId) => api.post('/api/generate-license', {
    license_type: licenseType,
    user_id: userId,
    purchase_id: purchaseId,
  }),
  getPurchaseStatus: (purchaseId) => api.get(`/api/purchase-status/${purchaseId}`),
  googlePayWebhook: (data) => api.post('/api/webhook/google-pay', data),
};

// ========== HEALTH CHECK ==========
export const healthCheck = () => api.get('/health');

export default api;






