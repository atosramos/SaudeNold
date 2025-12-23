import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function History() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const stored = await AsyncStorage.getItem('medicationLogs');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ordenar por data mais recente primeiro
        const sorted = parsed.sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt));
        setLogs(sorted);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'taken':
        return { name: 'checkmark-circle', color: '#4ECDC4' };
      case 'skipped':
        return { name: 'close-circle', color: '#FF6B6B' };
      case 'postponed':
        return { name: 'time', color: '#F38181' };
      default:
        return { name: 'help-circle', color: '#999' };
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'taken':
        return 'Tomado';
      case 'skipped':
        return 'Pulado';
      case 'postponed':
        return 'Adiado';
      default:
        return 'Desconhecido';
    }
  };

  const renderLog = ({ item }) => {
    const statusIcon = getStatusIcon(item.status);
    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <Ionicons name={statusIcon.name} size={32} color={statusIcon.color} />
          <View style={styles.logInfo}>
            <Text style={styles.medicationName}>{item.medicationName}</Text>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        <View style={styles.logDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Horário agendado:</Text>
            <Text style={styles.detailValue}>{item.scheduledTime}</Text>
          </View>
          {item.takenAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tomado em:</Text>
              <Text style={styles.detailValue}>{formatDateTime(item.takenAt)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={32} color="#F38181" />
        </TouchableOpacity>
        <Text style={styles.title}>Histórico</Text>
        <Text style={styles.subtitle}>Registro de medicamentos</Text>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum registro ainda</Text>
          <Text style={styles.emptySubtext}>Os medicamentos tomados aparecerão aqui</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLog}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#666',
  },
  list: {
    padding: 24,
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#F38181',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logInfo: {
    marginLeft: 16,
    flex: 1,
  },
  medicationName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 20,
    color: '#666',
  },
  logDetails: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 20,
    color: '#666',
  },
  detailValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 22,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
});





