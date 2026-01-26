import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { getAllTrackingRecords, deleteTrackingRecord, TRACKING_TYPES } from '../services/dailyTracking';
import { useCustomModal } from '../hooks/useCustomModal';
import { useTheme } from '../contexts/ThemeContext';

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
  const themeContext = useTheme();
  const colors = themeContext?.colors || {
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#e0e0e0',
    primary: '#4ECDC4',
  };
  const [records, setRecords] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const allRecords = await getAllTrackingRecords(selectedType);
      // Filtrar registros inválidos para evitar crashes
      const validRecords = (allRecords || []).filter(record => 
        record && 
        typeof record === 'object' &&
        record.id && 
        record.type && 
        record.value !== undefined && 
        record.value !== null
      );
      setRecords(validRecords);
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
      setRecords([]); // Garantir que records seja sempre um array
      Alert.alert('Erro', 'Não foi possível carregar os registros');
    } finally {
      setIsLoading(false);
    }
  }, [selectedType]);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  const handleDelete = (record) => {
    if (!record || !record.id) {
      Alert.alert('Erro', 'Registro inválido');
      return;
    }

    const typeLabel = TYPE_LABELS[record.type] || 'este registro';
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir este registro de ${typeLabel}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteTrackingRecord(record.id);
              if (result.success) {
                loadRecords();
                Alert.alert('Sucesso', 'Registro excluído com sucesso');
              } else {
                Alert.alert('Erro', result.error || 'Não foi possível excluir o registro');
              }
            } catch (error) {
              console.error('Erro ao excluir registro:', error);
              Alert.alert('Erro', 'Não foi possível excluir o registro');
            }
          },
        },
      ]
    );
  };

  const formatDateTime = (dateString) => {
    try {
      if (!dateString) return 'Data não disponível';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  const renderRecord = ({ item }) => {
    // Validação de segurança para evitar crashes
    if (!item || !item.id) {
      console.warn('Item inválido no renderRecord:', item);
      return null;
    }

    const typeLabel = TYPE_LABELS[item.type] || 'Desconhecido';
    const typeIcon = TYPE_ICONS[item.type] || 'ellipse';
    const typeColor = TYPE_COLORS[item.type] || '#95A5A6';
    const itemValue = item.value || 'N/A';
    const itemUnit = item.unit || '';
    const itemDate = item.date || new Date().toISOString();

    return (
      <TouchableOpacity
        style={[styles.recordCard, { backgroundColor: colors.surface, borderLeftColor: typeColor }]}
        onPress={() => {
          if (item.id) {
            router.push(`/daily-tracking/${item.id}`);
          }
        }}
        onLongPress={() => {
          Alert.alert(
            'Ações',
            'Escolha uma ação:',
            [
              { text: 'Ver Gráfico', onPress: () => {
                if (item.type) {
                  router.push(`/daily-tracking/chart?type=${item.type}`);
                }
              }},
              { text: 'Editar', onPress: () => {
                if (item.id) {
                  router.push(`/daily-tracking/${item.id}/edit`);
                }
              }},
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
            <Text style={[styles.recordType, { color: colors.text }]}>{typeLabel}</Text>
            <Text style={[styles.recordValue, { color: colors.text }]}>
              {itemValue} {itemUnit}
            </Text>
            <Text style={[styles.recordDate, { color: colors.textSecondary }]}>{formatDateTime(itemDate)}</Text>
          </View>
        </View>
        {item.notes && (
          <Text style={[styles.recordNotes, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderTypeFilter = () => {
    try {
      if (!TRACKING_TYPES) {
        console.warn('TRACKING_TYPES não está definido');
        return null;
      }

      const types = Object.values(TRACKING_TYPES);
      if (!Array.isArray(types) || types.length === 0) {
        console.warn('TRACKING_TYPES não retornou um array válido');
        return null;
      }
      
      return (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={[styles.filterContainer, { borderBottomColor: colors.border }]}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.surface, borderColor: colors.border || '#e0e0e0' }, !selectedType && styles.filterChipActive]}
            onPress={() => {
              setSelectedType(null);
              loadRecords();
            }}
          >
            <Text style={[styles.filterText, { color: colors.text }, !selectedType && styles.filterTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          {types.map((type) => {
            if (!type) return null;
            const typeColor = TYPE_COLORS[type] || '#95A5A6';
            const typeIcon = TYPE_ICONS[type] || 'ellipse';
            const typeLabel = TYPE_LABELS[type] || 'Desconhecido';
            
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.surface, borderColor: typeColor },
                  selectedType === type && styles.filterChipActive,
                  selectedType === type && { backgroundColor: typeColor + '20' },
                ]}
                onPress={() => {
                  setSelectedType(type);
                  loadRecords();
                }}
              >
                <Ionicons 
                  name={typeIcon} 
                  size={16} 
                  color={selectedType === type ? typeColor : (colors.textSecondary || '#666666')} 
                  style={styles.filterIcon}
                />
                <Text style={[
                  styles.filterText,
                  { color: colors.text },
                  selectedType === type && styles.filterTextActive,
                  selectedType === type && { color: typeColor },
                ]}>
                  {typeLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      );
    } catch (error) {
      console.error('Erro ao renderizar filtro de tipos:', error);
      return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Acompanhamento Diário</Text>
        <TouchableOpacity 
          onPress={() => router.push('/daily-tracking/new')}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {renderTypeFilter()}

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Carregando...</Text>
        </View>
      ) : !records || records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={80} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum registro encontrado</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Toque no botão + para adicionar um novo registro
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
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
          keyExtractor={(item, index) => {
            if (item && item.id) {
              return String(item.id);
            }
            return `record-${index}`;
          }}
          contentContainerStyle={styles.listContent}
          refreshing={false}
          onRefresh={loadRecords}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="stats-chart-outline" size={80} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum registro encontrado</Text>
            </View>
          }
        />
      )}

      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    borderBottomWidth: 1,
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
    marginRight: 8,
  },
  filterChipActive: {
    // backgroundColor aplicado inline
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
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
    marginBottom: 4,
  },
  recordValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
  },
  recordNotes: {
    fontSize: 14,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
