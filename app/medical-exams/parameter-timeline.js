import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { getProfileItem } from '../../services/profileStorageManager';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import LineChart from '../../components/LineChart';

export default function ParameterTimeline() {
  const router = useRouter();
  const { parameterName, examId } = useLocalSearchParams();
  const { showAlert } = useCustomAlert();
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState(null);

  useEffect(() => {
    loadTimelineData();
  }, []);

  const loadTimelineData = async () => {
    setLoading(true);
    try {
      // Buscar todos os exames localmente
      const stored = await getProfileItem('medicalExams');
      if (!stored) {
        setTimelineData(null);
        return;
      }

      const exams = JSON.parse(stored);
      
      // Filtrar exames que têm o parâmetro procurado
      const dataPoints = [];
      let unit = null;
      let referenceRangeMin = null;
      let referenceRangeMax = null;

      for (const exam of exams) {
        if (!exam.extracted_data || !exam.extracted_data.parameters) {
          continue;
        }

        // Procurar o parâmetro neste exame
        const parameter = exam.extracted_data.parameters.find(
          p => p.name && p.name.toLowerCase() === parameterName.toLowerCase()
        );

        if (parameter) {
          // Usar a data do exame ou a data de criação
          const examDate = exam.exam_date || exam.created_at;

          dataPoints.push({
            exam_date: examDate,
            value: parameter.value,
            numeric_value: parameter.numeric_value || parameter.value,
          });

          // Capturar unidade e faixa de referência do primeiro encontrado
          if (!unit && parameter.unit) {
            unit = parameter.unit;
          }
          if (!referenceRangeMin && parameter.reference_range_min) {
            referenceRangeMin = parameter.reference_range_min;
          }
          if (!referenceRangeMax && parameter.reference_range_max) {
            referenceRangeMax = parameter.reference_range_max;
          }
        }
      }

      // Ordenar por data
      dataPoints.sort((a, b) => {
        const dateA = new Date(a.exam_date);
        const dateB = new Date(b.exam_date);
        return dateA - dateB;
      });

      if (dataPoints.length === 0) {
        setTimelineData(null);
        return;
      }

      setTimelineData({
        parameter_name: parameterName,
        unit,
        reference_range_min: referenceRangeMin,
        reference_range_max: referenceRangeMax,
        data_points: dataPoints,
      });
    } catch (error) {
      console.error('Erro ao carregar dados do timeline:', error);
      showAlert('Erro', 'Não foi possível carregar os dados do gráfico', 'error');
      setTimelineData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9B59B6" />
        <Text style={styles.loadingText}>Carregando gráfico...</Text>
      </View>
    );
  }

  if (!timelineData || !timelineData.data_points || timelineData.data_points.length === 0) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={32} color="#4ECDC4" />
          </TouchableOpacity>
          <Text style={styles.title}>Histórico</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="bar-chart-outline" size={80} color="#ccc" />
          <Text style={styles.errorText}>Dados insuficientes para gráfico</Text>
          <Text style={styles.errorSubtext}>
            É necessário ter pelo menos 1 exame com este parâmetro para visualizar o gráfico
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={32} color="#4ECDC4" />
        </TouchableOpacity>
        <Text style={styles.title}>Evolução Temporal</Text>
      </View>

      <View style={styles.content}>
        {/* Cabeçalho do parâmetro */}
        <View style={styles.parameterHeader}>
          <Text style={styles.parameterName}>{timelineData.parameter_name}</Text>
          {timelineData.unit && (
            <Text style={styles.parameterUnit}>({timelineData.unit})</Text>
          )}
        </View>

        {/* Gráfico */}
        <LineChart
          data={timelineData.data_points}
          unit={timelineData.unit}
          referenceRange={{
            min: timelineData.reference_range_min,
            max: timelineData.reference_range_max,
          }}
        />

        {/* Lista de valores */}
        <View style={styles.valuesList}>
          <Text style={styles.valuesListTitle}>Valores Registrados</Text>
          {timelineData.data_points.map((point, index) => (
            <View key={index} style={styles.valueItem}>
              <View style={styles.valueItemLeft}>
                <Text style={styles.valueItemDate}>
                  {new Date(point.exam_date).toLocaleDateString('pt-BR')}
                </Text>
                <Text style={styles.valueItemTime}>
                  {new Date(point.exam_date).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
              <View style={styles.valueItemRight}>
                <Text style={styles.valueItemValue}>
                  {point.value} {timelineData.unit || ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Informação sobre faixa de referência */}
        {(timelineData.reference_range_min || timelineData.reference_range_max) && (
          <View style={styles.referenceCard}>
            <Ionicons name="information-circle-outline" size={24} color="#4ECDC4" />
            <View style={styles.referenceCardContent}>
              <Text style={styles.referenceCardTitle}>Faixa de Referência</Text>
              <Text style={styles.referenceCardText}>
                {timelineData.reference_range_min || '?'} - {timelineData.reference_range_max || '?'} {timelineData.unit || ''}
              </Text>
              <Text style={styles.referenceCardSubtext}>
                Valores dentro desta faixa são considerados normais
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 20,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 24,
  },
  parameterHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  parameterName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  parameterUnit: {
    fontSize: 20,
    color: '#666',
    marginTop: 8,
  },
  valuesList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  valuesListTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  valueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  valueItemLeft: {
    flex: 1,
  },
  valueItemDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  valueItemTime: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  valueItemRight: {
    alignItems: 'flex-end',
  },
  valueItemValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#9B59B6',
  },
  referenceCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  referenceCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  referenceCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  referenceCardText: {
    fontSize: 18,
    color: '#1976D2',
    marginBottom: 8,
  },
  referenceCardSubtext: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 100,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 24,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 18,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
});
