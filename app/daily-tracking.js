import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { getAllTrackingRecords, deleteTrackingRecord, TRACKING_TYPES } from '../services/dailyTracking';
import { useCustomModal } from '../hooks/useCustomModal';

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

export default function DailyTracking() {
  const router = useRouter();
  const { showModal, ModalComponent } = useCustomModal();
  const [records, setRecords] = useState([]);
  const [selectedType, setSelectedType] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    try {
      const allRecords = await getAllTrackingRecords(selectedType);
      setRecords(allRecords);
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
      Alert.alert('Erro', 'Não foi possível carregar os registros');
    }
  };

  const handleDelete = (record) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir este registro de ${TYPE_LABELS[record.type]}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteTrackingRecord(record.id);
            if (result.success) {
              loadRecords();
              Alert.alert('Sucesso', 'Registro excluído com sucesso');
            } else {
              Alert.alert('Erro', result.error || 'Não foi possível excluir o registro');
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

  const renderRecord = ({ item }) => {
    const typeLabel = TYPE_LABELS[item.type] || 'Desconhecido';
    const typeIcon = TYPE_ICONS[item.type] || 'ellipse';
    const typeColor = TYPE_COLORS[item.type] || '#95A5A6';

    return (
      <TouchableOpacity
        style={[styles.recordCard, { borderLeftColor: typeColor }]}
        onPress={() => router.push(`/daily-tracking/${item.id}`)}
        onLongPress={() => {
          Alert.alert(
            'Ações',
            'Escolha uma ação:',
            [
              { text: 'Ver Gráfico', onPress: () => router.push(`/daily-tracking/chart?type=${item.type}`) },
              { text: 'Editar', onPress: () => router.push(`/daily-tracking/${item.id}/edit`) },
              { text: 'Excluir', style: 'destructive', onPress: () => handleDelete(item) },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        }}
      >
        <View style={styles.recordHeader}>
          <View style={[styles.iconContainer, { backgroundColor: typeColor + '20' }]}>
            <Ionicons name={typeIcon} size={24} color={typeColor} />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordType}>{typeLabel}</Text>
            <Text style={styles.recordValue}>
              {item.value} {item.unit || ''}
            </Text>
            <Text style={styles.recordDate}>{formatDateTime(item.date)}</Text>
          </View>
        </View>
        {item.notes && (
          <Text style={styles.recordNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderTypeFilter = () => {
    const types = Object.values(TRACKING_TYPES);
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, !selectedType && styles.filterChipActive]}
          onPress={() => {
            setSelectedType(null);
            loadRecords();
          }}
        >
          <Text style={[styles.filterText, !selectedType && styles.filterTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        {types.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterChip,
              selectedType === type && styles.filterChipActive,
              { borderColor: TYPE_COLORS[type] },
              selectedType === type && { backgroundColor: TYPE_COLORS[type] + '20' },
            ]}
            onPress={() => {
              setSelectedType(type);
              loadRecords();
            }}
          >
            <Ionicons 
              name={TYPE_ICONS[type]} 
              size={16} 
              color={selectedType === type ? TYPE_COLORS[type] : '#666'} 
              style={styles.filterIcon}
            />
            <Text style={[
              styles.filterText,
              selectedType === type && styles.filterTextActive,
              selectedType === type && { color: TYPE_COLORS[type] },
            ]}>
              {TYPE_LABELS[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Acompanhamento Diário</Text>
        <TouchableOpacity 
          onPress={() => router.push('/daily-tracking/new')}
          style={styles.addButton}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {renderTypeFilter()}

      {records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
          <Text style={styles.emptySubtext}>
            Toque no botão + para adicionar um novo registro
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/daily-tracking/new')}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.emptyButtonText}>Adicionar Registro</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderRecord}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={false}
          onRefresh={loadRecords}
        />
      )}

      <ModalComponent />
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
    flex: 1,
    marginLeft: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  filterChipActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recordValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: '#999',
  },
  recordNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
