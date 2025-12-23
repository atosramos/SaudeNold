import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

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

// ========== HEALTH CHECK ==========
export const healthCheck = () => api.get('/health');

export default api;





