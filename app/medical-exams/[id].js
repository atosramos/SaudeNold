import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator, FlatList, RefreshControl, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { getProfileItem } from '../../services/profileStorageManager';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import PdfViewer from '../../components/PdfViewer';

export default function MedicalExamDetail() {
  const router = useRouter();
  const { id, exam: examParam } = useLocalSearchParams();
  const { showAlert } = useCustomAlert();
  const [exam, setExam] = useState(examParam ? JSON.parse(examParam) : null);
  const [loading, setLoading] = useState(!exam);
  const [refreshing, setRefreshing] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!exam) {
        loadExam();
      }
    }, [id])
  );

  const loadExam = async () => {
    setLoading(true);
    try {
      // Buscar localmente
      const stored = await getProfileItem('medicalExams');
      if (stored) {
        const exams = JSON.parse(stored);
        const found = exams.find(e => e.id === parseInt(id));
        if (found) {
          setExam(found);
        } else {
          showAlert('Erro', 'Exame não encontrado', 'error');
        }
      } else {
        showAlert('Erro', 'Exame não encontrado', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar exame:', error);
      showAlert('Erro', 'Não foi possível carregar o exame', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExam();
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

  const renderParameter = ({ item }) => {
    const isOutOfRange = () => {
      if (!item.reference_range_min || !item.reference_range_max || !item.numeric_value) {
        return false;
      }
      const value = parseFloat(item.numeric_value);
      const min = parseFloat(item.reference_range_min);
      const max = parseFloat(item.reference_range_max);
      return value < min || value > max;
    };

    return (
      <TouchableOpacity
        style={[styles.parameterCard, isOutOfRange() && styles.parameterCardWarning]}
        onPress={() => {
          router.push({
            pathname: '/medical-exams/parameter-timeline',
            params: {
              parameterName: item.name,
              examId: id,
            },
          });
        }}
      >
        <View style={styles.parameterHeader}>
          <Text style={styles.parameterName}>{item.name}</Text>
          {isOutOfRange() && (
            <Ionicons name="warning" size={24} color="#F44336" />
          )}
        </View>
        <View style={styles.parameterValueContainer}>
          <Text style={styles.parameterValue}>{item.value}</Text>
          {item.unit && (
            <Text style={styles.parameterUnit}>{item.unit}</Text>
          )}
        </View>
        {(item.reference_range_min || item.reference_range_max) && (
          <Text style={styles.parameterReference}>
            Referência: {item.reference_range_min || '?'} - {item.reference_range_max || '?'} {item.unit || ''}
          </Text>
        )}
        <View style={styles.parameterAction}>
          <Ionicons name="trending-up" size={20} color="#9B59B6" />
          <Text style={styles.parameterActionText}>Ver evolução temporal</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9B59B6" />
        <Text style={styles.loadingText}>Carregando exame...</Text>
      </View>
    );
  }

  if (!exam) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#F44336" />
        <Text style={styles.errorText}>Exame não encontrado</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const parameters = exam.extracted_data?.parameters || [];
  const status = exam.processing_status || 'completed';

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButtonIcon}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={32} color="#4ECDC4" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalhes do Exame</Text>
      </View>

      <View style={styles.content}>
        {/* Status do processamento */}
        <View style={[styles.statusCard, { borderLeftColor: getStatusColor(status) }]}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
              <Text style={styles.statusText}>{getStatusText(status)}</Text>
            </View>
          </View>
          {exam.processing_error && (
            <View style={styles.errorMessageContainer}>
              <Text style={styles.errorLabel}>Erro:</Text>
              <Text style={styles.errorMessageText}>{exam.processing_error}</Text>
            </View>
          )}
        </View>

        {/* Informações do exame */}
        <View style={styles.infoCard}>
          {exam.exam_type && (
            <View style={styles.infoRow}>
              <Ionicons name="medical-outline" size={24} color="#9B59B6" />
              <Text style={styles.infoLabel}>Tipo:</Text>
              <Text style={styles.infoValue}>{exam.exam_type}</Text>
            </View>
          )}
          {exam.exam_date && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={24} color="#9B59B6" />
              <Text style={styles.infoLabel}>Data:</Text>
              <Text style={styles.infoValue}>
                {new Date(exam.exam_date).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={24} color="#9B59B6" />
            <Text style={styles.infoLabel}>Cadastrado em:</Text>
            <Text style={styles.infoValue}>
              {new Date(exam.created_at).toLocaleDateString('pt-BR')} {new Date(exam.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Imagem ou PDF do exame */}
        {exam.image_base64 && (
          <View style={styles.imageCard}>
            <Text style={styles.sectionTitle}>
              {exam.file_type === 'pdf' ? 'PDF do Exame' : 'Imagem do Exame'}
            </Text>
            {exam.file_type === 'pdf' ? (
              <View>
                <View style={styles.pdfView}>
                  <Ionicons name="document-text" size={120} color="#9B59B6" />
                  <Text style={styles.pdfViewText}>PDF</Text>
                  <Text style={styles.pdfViewSubtext}>Arquivo processado com sucesso</Text>
                </View>
                {exam.file_uri && (
                  <TouchableOpacity 
                    style={styles.viewPdfButton}
                    onPress={() => setShowPdfModal(true)}
                  >
                    <Ionicons name="document-text-outline" size={20} color="#9B59B6" />
                    <Text style={styles.viewPdfButtonText}>Visualizar PDF Original</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Image 
                source={{ uri: `data:image/jpeg;base64,${exam.image_base64}` }}
                style={styles.examImage}
                resizeMode="contain"
              />
            )}
          </View>
        )}

        {/* Modal para visualizar PDF */}
        <Modal
          visible={showPdfModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowPdfModal(false)}
        >
          <View style={styles.pdfModalContainer}>
            <View style={styles.pdfModalHeader}>
              <Text style={styles.pdfModalTitle}>PDF do Exame</Text>
              <TouchableOpacity 
                style={styles.pdfModalCloseButton}
                onPress={() => setShowPdfModal(false)}
              >
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            {exam.file_uri && (
              <View style={styles.pdfViewerContainer}>
                {Platform.OS === 'web' ? (
                  <View style={{ flex: 1 }}>
                    {/* eslint-disable-next-line react/no-unknown-property */}
                    <object 
                      data={exam.file_uri} 
                      type="application/pdf"
                      style={styles.pdfWebViewer}
                    >
                      <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                        <Text style={{ color: '#fff', marginBottom: 10, textAlign: 'center' }}>
                          Seu navegador não suporta visualização de PDF.
                        </Text>
                        <TouchableOpacity 
                          onPress={() => window.open(exam.file_uri, '_blank')}
                          style={{ padding: 10, backgroundColor: '#4ECDC4', borderRadius: 8 }}
                        >
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                            Abrir PDF em nova aba
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </object>
                  </View>
                ) : (
                  <PdfViewer
                    source={{ uri: exam.file_uri, cache: true }}
                    onLoadComplete={(numberOfPages) => {
                      console.log(`PDF carregado: ${numberOfPages} páginas`);
                    }}
                    onPageChanged={(page, numberOfPages) => {
                      console.log(`Página ${page} de ${numberOfPages}`);
                    }}
                    onError={(error) => {
                      console.error('Erro ao carregar PDF:', error);
                      showAlert('Erro', 'Não foi possível carregar o PDF.', 'error');
                    }}
                    style={styles.pdfViewer}
                  />
                )}
              </View>
            )}
          </View>
        </Modal>

        {/* Parâmetros extraídos */}
        {status === 'completed' && parameters.length > 0 && (
          <View style={styles.parametersSection}>
            <Text style={styles.sectionTitle}>Parâmetros Extraídos ({parameters.length})</Text>
            <FlatList
              data={parameters}
              renderItem={renderParameter}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Texto OCR (para debug) */}
        {exam.raw_ocr_text && (
          <View style={styles.ocrSection}>
            <Text style={styles.sectionTitle}>Texto Extraído (OCR)</Text>
            <ScrollView style={styles.ocrTextContainer}>
              <Text style={styles.ocrText}>{exam.raw_ocr_text}</Text>
            </ScrollView>
          </View>
        )}

        {parameters.length === 0 && status === 'completed' && (
          <View style={styles.waitingCard}>
            <Ionicons name="information-circle-outline" size={48} color="#4ECDC4" />
            <Text style={styles.waitingText}>
              Nenhum parâmetro foi extraído deste exame.{'\n'}
              Verifique o texto OCR ou adicione os dados manualmente.
            </Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 48,
  },
  errorText: {
    fontSize: 24,
    color: '#F44336',
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  backButtonIcon: {
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
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 6,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  errorMessageContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  errorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 4,
  },
  errorMessageText: {
    fontSize: 16,
    color: '#F44336',
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 12,
    marginRight: 8,
  },
  infoValue: {
    flex: 1,
    fontSize: 20,
    color: '#333',
  },
  imageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  examImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  pdfView: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9B59B6',
    borderStyle: 'dashed',
  },
  pdfViewText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#9B59B6',
    marginTop: 16,
  },
  pdfViewSubtext: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  parametersSection: {
    marginBottom: 16,
  },
  parameterCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  parameterCardWarning: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  parameterAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  parameterActionText: {
    fontSize: 18,
    color: '#9B59B6',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  parameterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parameterName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  parameterValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  parameterValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  parameterUnit: {
    fontSize: 20,
    color: '#666',
  },
  parameterReference: {
    fontSize: 18,
    color: '#666',
    fontStyle: 'italic',
  },
  ocrSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  ocrTextContainer: {
    maxHeight: 300,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  ocrText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'monospace',
  },
  waitingCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  waitingText: {
    fontSize: 20,
    color: '#1976D2',
    textAlign: 'center',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#9B59B6',
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  viewPdfButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#9B59B6',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewPdfButtonText: {
    color: '#9B59B6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pdfModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdfModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  pdfModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  pdfModalCloseButton: {
    padding: 8,
  },
  pdfViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  pdfViewer: {
    flex: 1,
    width: '100%',
  },
  pdfWebViewer: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
});
