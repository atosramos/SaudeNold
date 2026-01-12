import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';
const API_KEY = Constants.expoConfig?.extra?.apiKey || process.env.EXPO_PUBLIC_API_KEY || '';

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
  (config) => {
    if (API_KEY) {
      config.headers.Authorization = `Bearer ${API_KEY}`;
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
  (error) => {
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
};

// ========== HEALTH CHECK ==========
export const healthCheck = () => api.get('/health');

export default api;






