import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

const DEVICE_ID_KEY = 'saudenold_device_id';
const LOCATION_PERMISSION_KEY = 'saudenold_location_permission';
const LOCATION_PERMISSION_DENIED_KEY = 'saudenold_location_permission_denied';

const generateDeviceId = () => {
  const random = Math.random().toString(36).slice(2);
  const timestamp = Date.now().toString(36);
  return `${random}${timestamp}`;
};

export const getDeviceId = async () => {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const getDeviceInfo = async () => {
  const deviceId = await getDeviceId();
  const pushToken = await getPushToken();
  const location = await getApproxLocation();
  return {
    device_id: deviceId,
    device_name: Device.deviceName || Device.modelName || 'Dispositivo',
    device_model: Device.modelName || undefined,
    os_name: Device.osName || undefined,
    os_version: Device.osVersion || undefined,
    app_version: Constants.expoConfig?.version || undefined,
    push_token: pushToken || undefined,
    location_lat: location?.latitude,
    location_lon: location?.longitude,
    location_accuracy_km: location?.accuracyKm,
  };
};

const getProjectId = () => {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.projectId ||
    undefined
  );
};

const getPushToken = async () => {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    const status = permissions?.status === 'granted'
      ? permissions.status
      : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') {
      return null;
    }
    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenResponse?.data || null;
  } catch (error) {
    return null;
  }
};

const getApproxLocation = async () => {
  try {
    // Verificar se já foi negado anteriormente (evitar pedir toda vez)
    const wasDenied = await AsyncStorage.getItem(LOCATION_PERMISSION_DENIED_KEY);
    if (wasDenied === 'true') {
      // Verificar status atual sem solicitar novamente
      const currentStatus = await Location.getForegroundPermissionsAsync();
      if (currentStatus?.status !== 'granted') {
        return null;
      }
      // Se o usuário mudou a permissão manualmente, atualizar cache
      if (currentStatus?.status === 'granted') {
        await AsyncStorage.removeItem(LOCATION_PERMISSION_DENIED_KEY);
      }
    }
    
    // Verificar status atual
    let status = (await Location.getForegroundPermissionsAsync())?.status;
    
    // Se não foi concedido, solicitar apenas uma vez
    if (status !== 'granted') {
      const permissionResult = await Location.requestForegroundPermissionsAsync();
      status = permissionResult?.status;
      
      // Cachear se foi negado para não pedir novamente
      if (status !== 'granted') {
        await AsyncStorage.setItem(LOCATION_PERMISSION_DENIED_KEY, 'true');
        return null;
      }
    }
    
    // Cachear que foi concedido
    await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, 'granted');
    await AsyncStorage.removeItem(LOCATION_PERMISSION_DENIED_KEY);
    
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      maximumAge: 60000, // Aceitar posição com até 1 minuto de idade
    });
    if (!position?.coords) {
      return null;
    }
    const latitude = Number(position.coords.latitude.toFixed(2));
    const longitude = Number(position.coords.longitude.toFixed(2));
    const accuracyKm = position.coords.accuracy
      ? Number((position.coords.accuracy / 1000).toFixed(1))
      : undefined;
    return { latitude, longitude, accuracyKm };
  } catch (error) {
    return null;
  }
};
