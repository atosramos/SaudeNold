import api from './api';

export const getSessions = async (limit = 20, offset = 0) => {
  const response = await api.get('/api/auth/sessions', {
    params: { limit, offset },
  });
  return response.data;
};

export const revokeSession = async ({ sessionId, deviceId }) => {
  const response = await api.post('/api/auth/sessions/revoke', {
    session_id: sessionId,
    device_id: deviceId,
  });
  return response.data;
};

export const revokeOtherSessions = async (deviceId) => {
  const response = await api.post('/api/auth/sessions/revoke-others', {
    device_id: deviceId,
  });
  return response.data;
};

export const revokeAllSessions = async () => {
  const response = await api.post('/api/auth/revoke-all');
  return response.data;
};

export const trustSession = async ({ sessionId, deviceId, trusted }) => {
  const response = await api.post('/api/auth/sessions/trust', {
    session_id: sessionId,
    device_id: deviceId,
    trusted,
  });
  return response.data;
};

export const blockSession = async ({ sessionId, deviceId, blocked }) => {
  const response = await api.post('/api/auth/sessions/block', {
    session_id: sessionId,
    device_id: deviceId,
    blocked,
  });
  return response.data;
};

export const getSessionHistory = async (days = 90, limit = 20, offset = 0) => {
  const response = await api.get('/api/auth/sessions/history', {
    params: { days, limit, offset },
  });
  return response.data;
};
