import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getAuthToken, getRefreshToken, setStoredAuth, clearStoredAuth } from './authStorage';
import { getDeviceId } from './deviceInfo';
import { getActiveProfileId } from './profileStorageManager';

const RAW_API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const API_URL = Platform.OS === 'android'
  ? RAW_API_URL
      .replace('http://localhost', 'http://10.0.2.2')
      .replace('http://127.0.0.1', 'http://10.0.2.2')
  : RAW_API_URL;
const API_KEY = Constants.expoConfig?.extra?.apiKey || process.env.EXPO_PUBLIC_API_KEY || '';
if (__DEV__) {
  console.warn('API_URL em runtime:', API_URL);
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

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  async (config) => {
    const authToken = await getAuthToken();
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
      const deviceId = await getDeviceId();
      if (deviceId) {
        config.headers['X-Device-Id'] = deviceId;
      }
      const profileId = await getActiveProfileId();
      if (profileId) {
        config.headers['X-Profile-Id'] = profileId;
      }
    } else if (API_KEY) {
      config.headers.Authorization = `Bearer ${API_KEY}`;
    } else if (__DEV__) {
      const runtimeApiKey = await fetchRuntimeApiKey();
      if (runtimeApiKey) {
        config.headers.Authorization = `Bearer ${runtimeApiKey}`;
        console.warn('⚠️ Usando API Key obtida via debug endpoint.');
      }
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






