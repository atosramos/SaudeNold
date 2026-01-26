import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { listBiometricDevices, revokeBiometricDevice } from '../services/biometricDevices';
import { getDeviceId } from '../services/deviceInfo';

const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch (error) {
    return 'N/A';
  }
};

export default function BiometricDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  useEffect(() => {
    getDeviceId().then(setCurrentDeviceId);
  }, []);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listBiometricDevices();
      setDevices(data || []);
    } catch (error) {
      const message = error?.response?.data?.detail || 'Nao foi possivel carregar dispositivos';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDevices();
    }, [loadDevices])
  );

  const handleRevoke = async (device) => {
    Alert.alert(
      'Revogar biometria',
      'Este dispositivo nao podera usar biometria para entrar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revogar',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeBiometricDevice(device.device_id);
              await loadDevices();
            } catch (error) {
              const message = error?.response?.data?.detail || 'Nao foi possivel revogar';
              Alert.alert('Erro', message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Dispositivos com Biometria</Text>
        <Text style={styles.subtitle}>Gerencie onde a biometria esta ativa.</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4ECDC4" style={styles.loader} />
      ) : (
        <>
          {devices.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>Nenhum dispositivo biometrico cadastrado.</Text>
            </View>
          ) : (
            devices.map((device) => {
              const isCurrent = currentDeviceId && device.device_id === currentDeviceId;
              return (
                <View key={device.id} style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {device.device_name || device.device_id}
                    {isCurrent ? ' (este dispositivo)' : ''}
                  </Text>
                  <Text style={styles.cardInfo}>Device ID: {device.device_id}</Text>
                  <Text style={styles.cardInfo}>Registrado: {formatDate(device.created_at)}</Text>
                  {device.revoked_at ? (
                    <Text style={styles.cardWarning}>Revogado em: {formatDate(device.revoked_at)}</Text>
                  ) : (
                    <TouchableOpacity style={styles.dangerButton} onPress={() => handleRevoke(device)}>
                      <Text style={styles.dangerButtonText}>Revogar biometria</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginTop: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
  loader: {
    marginTop: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  cardInfo: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  cardWarning: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: 'bold',
    marginTop: 6,
  },
  dangerButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    color: '#777',
  },
});
