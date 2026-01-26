import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { getSessions, revokeOtherSessions, revokeSession, revokeAllSessions } from '../services/sessionService';
import { getDeviceId } from '../services/deviceInfo';
import { logoutUser } from '../services/auth';
import { useTheme } from '../contexts/ThemeContext';

const formatDate = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch (error) {
    return 'N/A';
  }
};

const SESSIONS_PAGE_SIZE = 20;

export default function Sessions() {
  const router = useRouter();
  const { colors } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsOffset, setSessionsOffset] = useState(0);
  const [sessionsHasMore, setSessionsHasMore] = useState(true);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  useEffect(() => {
    getDeviceId().then(setCurrentDeviceId);
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const sessionData = await getSessions(SESSIONS_PAGE_SIZE, 0);
      setSessions(sessionData || []);
      setSessionsOffset((sessionData || []).length);
      setSessionsHasMore((sessionData || []).length === SESSIONS_PAGE_SIZE);
    } catch (error) {
      const message = error?.response?.data?.detail || 'Nao foi possivel carregar dispositivos';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const handleRevoke = async (session) => {
    try {
      await revokeSession({ sessionId: session.id, deviceId: session.device_id });
      await loadSessions();
    } catch (error) {
      const message = error?.response?.data?.detail || 'Nao foi possivel desconectar';
      Alert.alert('Erro', message);
    }
  };

  const handleRevokeOthers = async () => {
    if (!currentDeviceId) {
      Alert.alert('Erro', 'Dispositivo atual nao identificado');
      return;
    }
    try {
      await revokeOtherSessions(currentDeviceId);
      await loadSessions();
    } catch (error) {
      const message = error?.response?.data?.detail || 'Nao foi possivel desconectar outros dispositivos';
      Alert.alert('Erro', message);
    }
  };

  const handleRevokeAll = async () => {
    Alert.alert(
      'Desconectar todos',
      'Isso vai encerrar todas as sessões e você precisará entrar novamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeAllSessions();
            } catch (error) {
              // Continuar com logout local mesmo se falhar
            }
            await logoutUser();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const handleLoadMoreSessions = async () => {
    if (sessionsLoading || !sessionsHasMore) return;
    setSessionsLoading(true);
    try {
      const nextPage = await getSessions(SESSIONS_PAGE_SIZE, sessionsOffset);
      const nextItems = nextPage || [];
      setSessions((prev) => [...prev, ...nextItems]);
      setSessionsOffset((prev) => prev + nextItems.length);
      setSessionsHasMore(nextItems.length === SESSIONS_PAGE_SIZE);
    } catch (error) {
      const message = error?.response?.data?.detail || 'Nao foi possivel carregar dispositivos';
      Alert.alert('Erro', message);
    } finally {
      setSessionsLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Dispositivos Logados</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Gerencie dispositivos conectados e encerre acessos.</Text>
      </View>

      {sessions.length > 1 && (
        <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.primary }]} onPress={handleRevokeOthers} disabled={loading}>
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Desconectar outros dispositivos</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[styles.dangerButtonLarge, { backgroundColor: colors.error }]} onPress={handleRevokeAll} disabled={loading}>
        <Text style={styles.dangerButtonText}>Desconectar todos</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <>
          {sessions.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum dispositivo logado.</Text>
            </View>
          ) : (
            <>
              {sessions.map((session) => {
                const isCurrent = currentDeviceId && session.device_id === currentDeviceId;
                return (
                  <View key={session.id} style={[styles.card, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {session.device_name || session.device_model || 'Dispositivo'}
                      {isCurrent ? ' (este dispositivo)' : ''}
                    </Text>
                    <Text style={[styles.cardInfo, { color: colors.textSecondary }]}>SO: {session.os_name || 'N/A'} {session.os_version || ''}</Text>
                    <Text style={[styles.cardInfo, { color: colors.textSecondary }]}>IP: {session.ip_address || 'N/A'}</Text>
                    {session.blocked && (
                      <Text style={[styles.cardWarning, { color: colors.error }]}>Dispositivo bloqueado</Text>
                    )}
                    <Text style={[styles.cardInfo, { color: colors.textSecondary }]}>Última atividade: {formatDate(session.last_activity_at)}</Text>
                    <Text style={[styles.cardInfo, { color: colors.textSecondary }]}>Conectado em: {formatDate(session.created_at)}</Text>

                    <View style={styles.actions}>
                      {!isCurrent && (
                        <TouchableOpacity style={[styles.dangerButton, { backgroundColor: colors.error }]} onPress={() => handleRevoke(session)}>
                          <Text style={styles.dangerButtonText}>Desconectar</Text>
                        </TouchableOpacity>
                      )}
                      {isCurrent && (
                        <Text style={[styles.currentDeviceText, { color: colors.primary }]}>Você está usando este dispositivo</Text>
                      )}
                    </View>
                  </View>
                );
              })}
              {sessionsHasMore && (
                <TouchableOpacity
                  style={[styles.sessionsMoreButton, { borderColor: colors.primary }]}
                  onPress={handleLoadMoreSessions}
                  disabled={sessionsLoading}
                >
                  {sessionsLoading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={[styles.sessionsMoreText, { color: colors.primary }]}>Carregar mais dispositivos</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 26,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  secondaryButton: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 32,
  },
  card: {
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
    marginBottom: 6,
  },
  cardInfo: {
    fontSize: 13,
    marginBottom: 4,
  },
  cardWarning: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  actions: {
    marginTop: 12,
  },
  dangerButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dangerButtonLarge: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  currentDeviceText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  sessionsMoreButton: {
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sessionsMoreText: {
    fontWeight: 'bold',
  },
});
