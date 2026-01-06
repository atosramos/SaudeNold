import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelMedicationAlarms } from '../services/alarm';
import { useCustomModal } from '../hooks/useCustomModal';

export default function Medications() {
  const router = useRouter();
  const { showModal, ModalComponent } = useCustomModal();
  const [medications, setMedications] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [])
  );

  const loadMedications = async () => {
    try {
      const stored = await AsyncStorage.getItem('medications');
      if (stored) {
        setMedications(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erro ao carregar medicamentos:', error);
    }
  };

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
              await AsyncStorage.setItem('medications', JSON.stringify(updated));
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
          <Text style={styles.medicationName}>{item.name}</Text>
          {item.dosage && <Text style={styles.medicationDosage}>{item.dosage}</Text>}
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
            <Ionicons name="create-outline" size={24} color="#4ECDC4" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              deleteMedication(item.id);
            }}
          >
            <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.medicationSchedules}>
        <Text style={styles.schedulesLabel}>Horários:</Text>
        <View style={styles.schedulesContainer}>
          {item.schedules && item.schedules.map((schedule, index) => (
            <View key={index} style={styles.scheduleBadge}>
              <Text style={styles.scheduleTime}>{schedule}</Text>
            </View>
          ))}
        </View>
      </View>
      {item.notes && (
        <Text style={styles.medicationNotes} numberOfLines={2}>{item.notes}</Text>
      )}
    </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={32} color="#4ECDC4" />
        </TouchableOpacity>
        <Text style={styles.title}>Meus Medicamentos</Text>
      </View>

      {medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum medicamento cadastrado</Text>
          <Text style={styles.emptySubtext}>Toque no botão + para adicionar</Text>
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
        style={styles.addButton}
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
    backgroundColor: '#f5f5f5',
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
  list: {
    padding: 24,
  },
  medicationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#4ECDC4',
  },
  medicationCardDue: {
    backgroundColor: '#FFF9C4', // Amarelo claro
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
    color: '#333',
    marginBottom: 8,
  },
  medicationDosage: {
    fontSize: 24,
    color: '#666',
  },
  medicationSchedules: {
    marginBottom: 16,
  },
  schedulesLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  schedulesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  scheduleBadge: {
    backgroundColor: '#4ECDC4',
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
    color: '#666',
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
    backgroundColor: '#4ECDC4',
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














