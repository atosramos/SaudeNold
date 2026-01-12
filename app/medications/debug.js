import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { getDebugLogs, clearDebugLogs } from '../../services/alarmDebug';
import { Alert } from 'react-native';

export default function AlarmDebugScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  const loadLogs = async () => {
    try {
      const debugLogs = await getDebugLogs();
      setLogs(debugLogs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Limpar Logs',
      'Tem certeza que deseja limpar todos os logs de debug?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await clearDebugLogs();
            setLogs([]);
          }
        }
      ]
    );
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return '#4ECDC4';
      case 'warning': return '#FFA500';
      case 'error': return '#FF6B6B';
      default: return '#666';
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'error': return 'close-circle';
      default: return 'information-circle';
    }
  };

  const renderLog = ({ item }) => {
    const color = getLogColor(item.type);
    const icon = getLogIcon(item.type);

    return (
      <View style={styles.logItem}>
        <View style={styles.logHeader}>
          <Ionicons name={icon} size={16} color={color} />
          <Text style={[styles.logTimestamp, { color }]}>{item.timestamp}</Text>
          <Text style={[styles.logType, { color }]}>{item.type.toUpperCase()}</Text>
        </View>
        <Text style={styles.logMessage}>{item.message}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={32} color="#4ECDC4" />
        </TouchableOpacity>
        <Text style={styles.title}>Logs de Debug - Alarmes</Text>
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={handleClearLogs}
        >
          <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum log de debug ainda</Text>
          <Text style={styles.emptySubtext}>
            Os logs aparecerão aqui quando você agendar medicamentos
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLog}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshing={false}
          onRefresh={loadLogs}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  list: {
    padding: 16,
  },
  logItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  logTimestamp: {
    fontSize: 12,
    fontWeight: '600',
  },
  logType: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 'auto',
  },
  logMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
