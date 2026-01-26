import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { getProfileItem, setProfileItem } from '../services/profileStorageManager';
import { cancelVisitAlarms } from '../services/alarm';
import { useCustomModal } from '../hooks/useCustomModal';
import { useTheme } from '../contexts/ThemeContext';

export default function DoctorVisits() {
  const router = useRouter();
  // #region agent log
  try {
    fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'doctor-visits.js:11',message:'DoctorVisits component mounted',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  } catch (e) {}
  // #endregion
  const themeContext = useTheme();
  // #region agent log
  try {
    fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'doctor-visits.js:13',message:'useTheme called',data:{hasTheme:!!themeContext,hasColors:!!themeContext?.colors},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  } catch (e) {}
  // #endregion
  const colors = themeContext?.colors || {
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#e0e0e0',
    primary: '#4ECDC4',
    error: '#FF6B6B',
  };
  // #region agent log
  try {
    fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'doctor-visits.js:24',message:'Colors initialized',data:{hasColors:!!colors},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  } catch (e) {}
  // #endregion
  const { showModal, ModalComponent } = useCustomModal();
  // #region agent log
  try {
    fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'doctor-visits.js:25',message:'useCustomModal called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  } catch (e) {}
  // #endregion
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadVisits = useCallback(async () => {
    try {
      setIsLoading(true);
      const stored = await getProfileItem('doctorVisits');
      if (!stored) {
        setVisits([]);
        return;
      }

      const parsed = JSON.parse(stored);
      // Validar que parsed é um array
      if (!Array.isArray(parsed)) {
        console.warn('doctorVisits não é um array, retornando array vazio');
        setVisits([]);
        return;
      }

      // Filtrar visitas inválidas
      const validVisits = parsed.filter(v => 
        v && 
        typeof v === 'object' && 
        v.id && 
        v.doctorName && 
        v.visitDate
      );

      setVisits(validVisits);
    } catch (error) {
      console.error('Erro ao carregar visitas:', error);
      setVisits([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVisits();
    }, [loadVisits])
  );

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Data não disponível';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  const deleteVisit = async (id) => {
    if (!id) {
      showModal('Erro', 'ID da visita inválido', 'error');
      return;
    }

    showModal(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta visita?',
      'confirm',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancelar alarmes da visita (não bloquear se falhar)
              try {
                await cancelVisitAlarms(id);
              } catch (alarmError) {
                console.warn('Erro ao cancelar alarmes (continuando exclusão):', alarmError);
                // Continuar com a exclusão mesmo se cancelar alarmes falhar
              }
              
              // Garantir que visits é um array antes de filtrar
              const currentVisits = Array.isArray(visits) ? visits : [];
              const updated = currentVisits.filter(v => v && v.id !== id);
              
              // Validar que updated é um array válido antes de salvar
              if (!Array.isArray(updated)) {
                throw new Error('Erro ao filtrar visitas: resultado não é um array');
              }
              
              await setProfileItem('doctorVisits', JSON.stringify(updated));
              setVisits(updated);
            } catch (error) {
              console.error('Erro ao excluir visita:', error);
              showModal('Erro', 'Não foi possível excluir a visita', 'error');
            }
          }
        }
      ]
    );
  };

  const renderVisit = ({ item }) => {
    // Validação de segurança para evitar crashes
    if (!item || !item.id) {
      console.warn('Item inválido no renderVisit:', item);
      return null;
    }

    const doctorName = item.doctorName || 'Nome não disponível';
    const specialty = item.specialty || 'Especialidade não informada';
    const visitDate = item.visitDate || new Date().toISOString();
    const notes = item.notes || '';

    return (
      <View style={[styles.visitCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
        <View style={styles.visitHeader}>
          <View style={styles.visitHeaderText}>
            <Text style={[styles.doctorName, { color: colors.text }]}>{doctorName}</Text>
            <Text style={[styles.specialty, { color: colors.textSecondary }]}>{specialty}</Text>
          </View>
          <View style={styles.visitHeaderRight}>
            <View style={[styles.dateBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="calendar" size={24} color="#fff" />
              <Text style={styles.dateText}>{formatDate(visitDate)}</Text>
            </View>
            <View style={styles.visitActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  if (item.id) {
                    try {
                      router.push({
                        pathname: '/doctor-visits/edit',
                        params: { id: item.id, visit: JSON.stringify(item) }
                      });
                    } catch (error) {
                      console.error('Erro ao navegar para edição:', error);
                    }
                  }
                }}
              >
                <Ionicons name="create-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteVisit(item.id)}
              >
                <Ionicons name="trash-outline" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {notes && (
          <View style={[styles.notesContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.notesLabel, { color: colors.text }]}>Observações:</Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{notes}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={32} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Visitas ao Médico</Text>
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Carregando...</Text>
        </View>
      ) : !visits || !Array.isArray(visits) || visits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical-outline" size={80} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma visita cadastrada</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Toque no botão + para adicionar</Text>
        </View>
      ) : (
        <FlatList
          data={visits}
          renderItem={renderVisit}
          keyExtractor={(item, index) => {
            if (item && item.id) {
              return String(item.id);
            }
            return `visit-${index}`;
          }}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="medical-outline" size={80} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma visita cadastrada</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/doctor-visits/new')}
      >
        <Ionicons name="add" size={40} color="#fff" />
        <Text style={styles.addButtonText}>Nova Visita</Text>
      </TouchableOpacity>
      <ModalComponent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  list: {
    padding: 24,
  },
  visitCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderLeftWidth: 6,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  visitHeaderText: {
    flex: 1,
  },
  visitHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  visitActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  doctorName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  specialty: {
    fontSize: 22,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  notesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  notesLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 20,
    lineHeight: 28,
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
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  addButton: {
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














