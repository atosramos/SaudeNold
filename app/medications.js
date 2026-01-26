import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { getProfileItem, setProfileItem } from '../services/profileStorageManager';
import { cancelMedicationAlarms } from '../services/alarm';
import { useCustomModal } from '../hooks/useCustomModal';
import { useTheme } from '../contexts/ThemeContext';
import { useProfileChange } from '../hooks/useProfileChange';

export default function Medications() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showModal, ModalComponent } = useCustomModal();
  const [medications, setMedications] = useState([]);

  const loadMedications = async () => {
    try {
      // #region agent log
      console.log('[Medications] loadMedications chamado');
      // #endregion
      const stored = await getProfileItem('medications');
      if (stored) {
        const parsed = JSON.parse(stored);
        // #region agent log
        console.log('[Medications] Medicamentos carregados:', parsed.length);
        // #endregion
        setMedications(parsed);
      } else {
        // #region agent log
        console.log('[Medications] Nenhum medicamento encontrado');
        // #endregion
        setMedications([]);
      }
    } catch (error) {
      console.error('Erro ao carregar medicamentos:', error);
      setMedications([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [])
  );

  // CRÍTICO: Recarregar quando o perfil muda
  useProfileChange(() => {
    // #region agent log
    console.log('[Medications] Perfil mudou - recarregando medicamentos');
    // #endregion
    loadMedications();
  });


  const deleteMedication = async (id) => {
    showModal(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este medicamento?',
      'confirm',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancelar alarmes do medicamento
              await cancelMedicationAlarms(id);
              
              const updated = medications.filter(m => m.id !== id);
              await setProfileItem('medications', JSON.stringify(updated));
              setMedications(updated);
            } catch (error) {
              console.error('Erro ao excluir medicamento:', error);
              showModal('Erro', 'Não foi possível excluir o medicamento', 'error');
            }
          }
        }
      ]
    );
  };

  // Função para verificar se medicamento está na hora ou em 15 minutos
  const isMedicationDue = (medication) => {
    if (!medication.schedules || medication.schedules.length === 0) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutos desde meia-noite
    
    for (const schedule of medication.schedules) {
      const [hours, minutes] = schedule.split(':').map(Number);
      const scheduleTime = hours * 60 + minutes;
      
      // Verificar se está na hora (dentro de 5 minutos) ou em até 15 minutos
      const diff = scheduleTime - currentTime;
      if (diff >= 0 && diff <= 15) {
        return true;
      }
      
      // Verificar se já passou da hora mas ainda está dentro de 5 minutos após
      if (diff < 0 && diff >= -5) {
        return true;
      }
    }
    
    return false;
  };

  const renderMedication = ({ item }) => {
    const isDue = isMedicationDue(item);
    
    return (
      <TouchableOpacity 
        style={[
          styles.medicationCard,
          { backgroundColor: colors.surface, borderLeftColor: colors.primary },
          isDue && styles.medicationCardDue
        ]}
        onPress={() => router.push({
          pathname: '/medications/[id]',
          params: { id: item.id, medication: JSON.stringify(item) }
        })}
      >
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.medicationCardImage} />
      )}
      <View style={styles.medicationHeader}>
        <View style={styles.medicationHeaderText}>
          <Text style={[styles.medicationName, { color: colors.text }]}>{item.name}</Text>
          {item.dosage && <Text style={[styles.medicationDosage, { color: colors.textSecondary }]}>{item.dosage}</Text>}
        </View>
        <View style={styles.medicationActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: '/medications/edit',
                params: { id: item.id }
              });
            }}
          >
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              deleteMedication(item.id);
            }}
          >
            <Ionicons name="trash-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.medicationSchedules}>
        <Text style={[styles.schedulesLabel, { color: colors.text }]}>Horários:</Text>
        <View style={styles.schedulesContainer}>
          {item.schedules && item.schedules.map((schedule, index) => (
            <View key={index} style={[styles.scheduleBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.scheduleTime}>{schedule}</Text>
            </View>
          ))}
        </View>
      </View>
      {item.notes && (
        <Text style={[styles.medicationNotes, { color: colors.textSecondary }]} numberOfLines={2}>{item.notes}</Text>
      )}
    </TouchableOpacity>
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
        <Text style={[styles.title, { color: colors.text }]}>Meus Medicamentos</Text>
      </View>

      {medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical-outline" size={80} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum medicamento cadastrado</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Toque no botão + para adicionar</Text>
        </View>
      ) : (
        <FlatList
          data={medications}
          renderItem={renderMedication}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
        />
      )}

      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/medications/new')}
      >
        <Ionicons name="add" size={40} color="#fff" />
        <Text style={styles.addButtonText}>Adicionar Medicamento</Text>
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
  medicationCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderLeftWidth: 6,
  },
  medicationCardDue: {
    backgroundColor: '#FFF9C4', // Amarelo claro (mantido para destaque)
    borderLeftColor: '#FFD700', // Amarelo dourado
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  medicationCardImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  medicationHeaderText: {
    flex: 1,
  },
  medicationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  medicationName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  medicationDosage: {
    fontSize: 24,
  },
  medicationSchedules: {
    marginBottom: 16,
  },
  schedulesLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  schedulesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  scheduleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scheduleTime: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  medicationNotes: {
    fontSize: 20,
    fontStyle: 'italic',
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














