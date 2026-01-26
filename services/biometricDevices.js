import api from './api';

export const listBiometricDevices = async () => {
  const response = await api.get('/api/user/biometric/devices');
  return response.data;
};

export const revokeBiometricDevice = async (deviceId) => {
  const response = await api.delete(`/api/user/biometric/device/${deviceId}`);
  return response.data;
};
