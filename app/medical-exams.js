import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCustomModal } from '../hooks/useCustomModal';

export default function MedicalExams() {
  const router = useRouter();
  const { showModal, ModalComponent } = useCustomModal();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadExams();
    }, [])
  );

  const loadExams = async () => {
    setLoading(true);
    try {
      // Carregar apenas dados locais (sem tentar backend)
      const stored = await AsyncStorage.getItem('medicalExams');
      if (stored) {
        const parsedExams = JSON.parse(stored);
        // Ordenar por data de criação (mais recentes primeiro)
        parsedExams.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA;
        });
        setExams(parsedExams);
      } else {
        setExams([]);
      }
    } catch (error) {
      console.error('Erro ao carregar exames:', error);
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteExam = async (id) => {
    showModal(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este exame?',
      'confirm',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Atualizar localmente
              const updated = exams.filter(e => e.id !== id);
              await AsyncStorage.setItem('medicalExams', JSON.stringify(updated));
              setExams(updated);
            } catch (error) {
              console.error('Erro ao excluir exame:', error);
              showModal('Erro', 'Não foi possível excluir o exame', 'error');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'processing':
        return '#FF9800';
      case 'error':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Processado';
      case 'processing':
        return 'Processando...';
      case 'error':
        return 'Erro';
      default:
        return 'Pendente';
    }
  };

  // Função para limpar o tipo de exame e mostrar apenas o primeiro tipo ou "Exame Médico"
  const getCleanExamType = (examType) => {
    if (!examType) return 'Exame Médico';
    
    // Se o exam_type contém muitos tipos concatenados (tem +), pegar apenas o primeiro
    if (examType.includes(' + ')) {
      const firstType = examType.split(' + ')[0].trim();
      // Se o primeiro tipo ainda for muito longo (mais de 30 caracteres), usar "Exame Médico"
      if (firstType.length > 30) {
        return 'Exame Médico';
      }
      return firstType;
    }
    
    // Se o exam_type for muito longo (mais de 30 caracteres), usar "Exame Médico"
    if (examType.length > 30) {
      return 'Exame Médico';
    }
    
    return examType;
  };

  const renderExam = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.examCard}
        onPress={() => router.push({
          pathname: '/medical-exams/[id]',
          params: { id: item.id, exam: JSON.stringify(item) }
        })}
      >
        <View style={styles.examHeader}>
          <View style={styles.examHeaderText}>
            <Text style={styles.examType}>{getCleanExamType(item.exam_type)}</Text>
            {item.exam_date && (
              <Text style={styles.examDate}>
                {new Date(item.exam_date).toLocaleDateString('pt-BR')}
              </Text>
            )}
            {!item.exam_date && item.created_at && (
              <Text style={styles.examDate}>
                {new Date(item.created_at).toLocaleDateString('pt-BR')}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.processing_status || 'completed') }]}>
            <Text style={styles.statusText}>{getStatusText(item.processing_status || 'completed')}</Text>
          </View>
        </View>
        
        {item.extracted_data && item.extracted_data.parameters && item.extracted_data.parameters.length > 0 && (
          <View style={styles.parametersPreview}>
            <Text style={styles.parametersLabel}>
              {item.extracted_data.parameters.length} parâmetro(s) extraído(s)
            </Text>
          </View>
        )}

        <View style={styles.examActions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: '/medical-exams/[id]',
                params: { id: item.id, exam: JSON.stringify(item) }
              });
            }}
          >
            <Ionicons name="eye-outline" size={24} color="#4ECDC4" />
            <Text style={styles.viewButtonText}>Ver Detalhes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              deleteExam(item.id);
            }}
          >
            <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Carregando exames...</Text>
      </View>
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
        <Text style={styles.title}>Exames Médicos</Text>
      </View>

      {exams.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum exame cadastrado</Text>
          <Text style={styles.emptySubtext}>Toque no botão + para adicionar</Text>
        </View>
      ) : (
        <FlatList
          data={exams}
          renderItem={renderExam}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
        />
      )}

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => router.push('/medical-exams/new')}
      >
        <Ionicons name="add" size={40} color="#fff" />
        <Text style={styles.addButtonText}>Adicionar Exame</Text>
      </TouchableOpacity>
      <ModalComponent />
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
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    marginLeft: -8,
    marginTop: Platform.OS === 'ios' ? -8 : Platform.OS === 'android' ? -8 : 0,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  list: {
    padding: 24,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#9B59B6',
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  examHeaderText: {
    flex: 1,
  },
  examType: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  examDate: {
    fontSize: 22,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  parametersPreview: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  parametersLabel: {
    fontSize: 20,
    color: '#666',
  },
  examActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  viewButtonText: {
    fontSize: 20,
    color: '#4ECDC4',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
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
  addButton: {
    backgroundColor: '#9B59B6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    margin: 24,
    borderRadius: 16,
    minHeight: 80,
  },
  addButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
});
