import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { getProfileItem } from '../../services/profileStorageManager';

export default function MedicationDetails() {
  const router = useRouter();
  const { id, medication: medicationParam } = useLocalSearchParams();
  const [medication, setMedication] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadMedication();
    }, [id])
  );

  const loadMedication = async () => {
    try {
      if (medicationParam) {
        setMedication(JSON.parse(medicationParam));
      } else {
        const stored = await getProfileItem('medications');
        if (stored) {
          const medications = JSON.parse(stored);
          const found = medications.find(m => m.id === id);
          if (found) {
            setMedication(found);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar medicamento:', error);
    }
  };

  if (!medication) {
    return (
      <View style={styles.container}>
        <Text>Carregando...</Text>
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
        <Text style={styles.title}>Detalhes do Medicamento</Text>
      </View>

      <View style={styles.content}>
        {medication.image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: medication.image }} style={styles.medicationImage} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Nome do Medicamento</Text>
          <Text style={styles.value}>{medication.name}</Text>
        </View>

        {medication.dosage && (
          <View style={styles.section}>
            <Text style={styles.label}>Dosagem</Text>
            <Text style={styles.value}>{medication.dosage}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Horários</Text>
          <View style={styles.schedulesContainer}>
            {medication.schedules && medication.schedules.map((schedule, index) => (
              <View key={index} style={styles.scheduleBadge}>
                <Ionicons name="time-outline" size={20} color="#fff" />
                <Text style={styles.scheduleTime}>{schedule}</Text>
              </View>
            ))}
          </View>
        </View>

        {medication.notes && (
          <View style={styles.section}>
            <Text style={styles.label}>Observações</Text>
            <Text style={styles.notesValue}>{medication.notes}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push({
              pathname: '/medications/edit',
              params: { id: medication.id }
            })}
          >
            <Ionicons name="create" size={24} color="#fff" />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    flexWrap: 'wrap',
  },
  content: {
    padding: 24,
  },
  imageContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  medicationImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    color: '#333',
    fontWeight: '600',
  },
  schedulesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  scheduleBadge: {
    backgroundColor: '#4ECDC4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  scheduleTime: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  notesValue: {
    fontSize: 20,
    color: '#333',
    lineHeight: 28,
  },
  actions: {
    marginTop: 24,
  },
  editButton: {
    backgroundColor: '#4ECDC4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  editButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
});

