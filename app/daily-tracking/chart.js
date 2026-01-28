import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { getTrackingRecordsForChart, TRACKING_TYPES } from '../../services/dailyTracking';
import LineChart from '../../components/LineChart';
import { useAlert } from '../../contexts/AlertContext';

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

// Faixas de referência (podem ser ajustadas)
const REFERENCE_RANGES = {
  [TRACKING_TYPES.BLOOD_PRESSURE]: { min: 90, max: 140 }, // Sistólica
  [TRACKING_TYPES.TEMPERATURE]: { min: 36.0, max: 37.5 },
  [TRACKING_TYPES.HEART_RATE]: { min: 60, max: 100 },
  [TRACKING_TYPES.GLUCOSE]: { min: 70, max: 100 }, // Jejum
  [TRACKING_TYPES.OXYGEN_SATURATION]: { min: 95, max: 100 },
};

export default function DailyTrackingChart() {
  const router = useRouter();
  const { type } = useLocalSearchParams();
  const { showError } = useAlert();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (type) {
      loadChartData();
    } else {
      setLoading(false);
    }
  }, [type]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const data = await getTrackingRecordsForChart(type);
      
      if (data.length === 0) {
        setChartData(null);
        return;
      }

      setChartData({
        data_points: data,
        unit: data[0]?.unit || '',
        reference_range: REFERENCE_RANGES[type] || null,
      });
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error);
      showError('Não foi possível carregar os dados do gráfico');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!type) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Gráfico</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="bar-chart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Tipo não especificado</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Carregando gráfico...</Text>
      </View>
    );
  }

  if (!chartData || chartData.data_points.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Gráfico</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="bar-chart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum dado disponível</Text>
          <Text style={styles.emptySubtext}>
            Adicione registros de {TYPE_LABELS[type]} para ver o gráfico
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{TYPE_LABELS[type]}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData.data_points}
            unit={chartData.unit}
            referenceRange={chartData.reference_range}
          />
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Estatísticas</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total de Registros</Text>
              <Text style={styles.statValue}>{chartData.data_points.length}</Text>
            </View>
            {chartData.reference_range && (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Faixa de Referência</Text>
                <Text style={styles.statValue}>
                  {chartData.reference_range.min} - {chartData.reference_range.max} {chartData.unit}
                </Text>
              </View>
            )}
          </View>
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
    marginTop: 16,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  chartContainer: {
    marginBottom: 16,
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
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
  },
});
