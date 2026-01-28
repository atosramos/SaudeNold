/**
 * Audit Logs Screen - LGPD/HIPAA Compliance
 * 
 * Tela para visualizar histórico de auditoria do próprio usuário.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { getActiveProfile } from '../../services/profileService';

export default function AuditLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action_type: null,
    resource_type: null,
    start_date: null,
    end_date: null
  });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, [filter, page]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter.action_type) params.append('action_type', filter.action_type);
      if (filter.resource_type) params.append('resource_type', filter.resource_type);
      if (filter.start_date) params.append('start_date', filter.start_date);
      if (filter.end_date) params.append('end_date', filter.end_date);
      
      params.append('limit', '50');
      params.append('offset', (page * 50).toString());

      const response = await api.get(`/api/compliance/audit-logs?${params.toString()}`);
      
      if (page === 0) {
        setLogs(response.data);
      } else {
        setLogs([...logs, ...response.data]);
      }
      
      setHasMore(response.data.length === 50);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      Alert.alert('Erro', 'Não foi possível carregar os logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const getActionLabel = (actionType) => {
    const labels = {
      'view': 'Visualização',
      'edit': 'Edição',
      'delete': 'Exclusão',
      'create': 'Criação',
      'share': 'Compartilhamento',
      'export': 'Exportação',
      'login': 'Login',
      'logout': 'Logout'
    };
    return labels[actionType] || actionType;
  };

  const getResourceLabel = (resourceType) => {
    const labels = {
      'medication': 'Medicamento',
      'exam': 'Exame',
      'profile': 'Perfil',
      'visit': 'Consulta',
      'contact': 'Contato',
      'user': 'Usuário'
    };
    return labels[resourceType] || resourceType || 'N/A';
  };

  if (loading && logs.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Carregando logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico de Auditoria</Text>
      <Text style={styles.subtitle}>
        Registro de todas as ações realizadas no sistema (LGPD)
      </Text>

      <ScrollView style={styles.logsContainer}>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum log encontrado</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={styles.actionType}>
                  {getActionLabel(log.action_type)}
                </Text>
                <Text style={styles.date}>{formatDate(log.created_at)}</Text>
              </View>
              
              <Text style={styles.resourceType}>
                {getResourceLabel(log.resource_type)}
                {log.resource_id && ` #${log.resource_id}`}
              </Text>
              
              {log.ip_address && (
                <Text style={styles.metadata}>
                  IP: {log.ip_address}
                  {log.device_id && ` | Dispositivo: ${log.device_id.substring(0, 8)}...`}
                </Text>
              )}
              
              {!log.success && (
                <Text style={styles.error}>
                  Erro: {log.error_message || 'Ação falhou'}
                </Text>
              )}
            </View>
          ))
        )}

        {hasMore && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => setPage(page + 1)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#4ECDC4" />
            ) : (
              <Text style={styles.loadMoreText}>Carregar mais</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#666'
  },
  logsContainer: {
    flex: 1
  },
  emptyText: {
    fontSize: 20,
    color: '#999',
    textAlign: 'center',
    marginTop: 50
  },
  logItem: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4'
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  actionType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  date: {
    fontSize: 16,
    color: '#666'
  },
  resourceType: {
    fontSize: 18,
    color: '#555',
    marginBottom: 5
  },
  metadata: {
    fontSize: 16,
    color: '#777',
    marginTop: 5
  },
  error: {
    fontSize: 16,
    color: '#FF6B6B',
    marginTop: 5,
    fontWeight: 'bold'
  },
  loadMoreButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10
  },
  loadMoreText: {
    fontSize: 18,
    color: '#4ECDC4',
    fontWeight: 'bold'
  }
});
