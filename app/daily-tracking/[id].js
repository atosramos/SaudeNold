import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { getTrackingRecordById, deleteTrackingRecord, TRACKING_TYPES } from '../../services/dailyTracking';
import { useCustomAlert } from '../../hooks/useCustomAlert';

const TYPE_LABELS = {
  [TRACKING_TYPES.BLOOD_PRESSURE]: 'Pressão Arterial',
  [TRACKING_TYPES.TEMPERATURE]: 'Temperatura',
  [TRACKING_TYPES.HEART_RATE]: 'Batimentos Cardíacos',
  [TRACKING_TYPES.INSULIN]: 'Insulina',
  [TRACKING_TYPES.WEIGHT]: 'Peso',
  [TRACKING_TYPES.GLUCOSE]: 'Glicose',
  [TRACKING_TYPES.OXYGEN_SATURATION]: 'Saturação de Oxigênio',
  [TRACKING_TYPES.OTHER]: 'Outros',
};

const TYPE_ICONS = {
  [TRACKING_TYPES.BLOOD_PRESSURE]: 'water',
  [TRACKING_TYPES.TEMPERATURE]: 'thermometer',
  [TRACKING_TYPES.HEART_RATE]: 'heart',
  [TRACKING_TYPES.INSULIN]: 'medical',
  [TRACKING_TYPES.WEIGHT]: 'scale',
  [TRACKING_TYPES.GLUCOSE]: 'flask',
  [TRACKING_TYPES.OXYGEN_SATURATION]: 'airplane',
  [TRACKING_TYPES.OTHER]: 'ellipse',
};

const TYPE_COLORS = {
  [TRACKING_TYPES.BLOOD_PRESSURE]: '#FF6B6B',
  [TRACKING_TYPES.TEMPERATURE]: '#FFA07A',
  [TRACKING_TYPES.HEART_RATE]: '#FF6B6B',
  [TRACKING_TYPES.INSULIN]: '#4ECDC4',
  [TRACKING_TYPES.WEIGHT]: '#95E1D3',
  [TRACKING_TYPES.GLUCOSE]: '#9B59B6',
  [TRACKING_TYPES.OXYGEN_SATURATION]: '#3498DB',
  [TRACKING_TYPES.OTHER]: '#95A5A6',
};

export default function DailyTrackingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { showAlert } = useCustomAlert();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecord();
  }, [id]);

  const loadRecord = async () => {
    try {
      const data = await getTrackingRecordById(id);
      
      if (!data) {
        showAlert('Erro', 'Registro não encontrado', 'error');
        setTimeout(() => router.back(), 1500);
        return;
      }

      setRecord(data);
    } catch (error) {
      console.error('Erro ao carregar registro:', error);
      showAlert('Erro', 'Não foi possível carregar o registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir este registro de ${TYPE_LABELS[record.type]}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteTrackingRecord(id);
            if (result.success) {
              showAlert('Sucesso', 'Registro excluído com sucesso', 'success');
              setTimeout(() => router.back(), 1000);
            } else {
              showAlert('Erro', result.error || 'Não foi possível excluir o registro', 'error');
            }
          },
        },
      ]
    );
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

  if (loading || !record) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const typeColor = TYPE_COLORS[record.type] || '#95A5A6';
  const typeIcon = TYPE_ICONS[record.type] || 'ellipse';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalhes</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.iconContainer, { backgroundColor: typeColor + '20' }]}>
          <Ionicons name={typeIcon} size={64} color={typeColor} />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Tipo</Text>
          <Text style={styles.value}>{TYPE_LABELS[record.type]}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Valor</Text>
          <Text style={[styles.value, styles.valueLarge]}>
            {record.value} {record.unit || ''}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Data e Hora</Text>
          <Text style={styles.value}>{formatDateTime(record.date)}</Text>
        </View>

        {record.notes && (
          <View style={styles.infoCard}>
            <Text style={styles.label}>Observações</Text>
            <Text style={styles.value}>{record.notes}</Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => router.push(`/daily-tracking/${id}/edit`)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.chartButton]}
            onPress={() => router.push(`/daily-tracking/chart?type=${record.type}`)}
          >
            <Ionicons name="bar-chart-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Ver Gráfico</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  valueLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  actionsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  editButton: {
    backgroundColor: '#4ECDC4',
  },
  chartButton: {
    backgroundColor: '#9B59B6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
