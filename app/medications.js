import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Medications() {
  const router = useRouter();
  const [medications, setMedications] = useState([]);

  useEffect(() => {
    loadMedications();
  }, []);

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

  const renderMedication = ({ item }) => (
    <View style={styles.medicationCard}>
      <View style={styles.medicationHeader}>
        <Text style={styles.medicationName}>{item.name}</Text>
        <Text style={styles.medicationDosage}>{item.dosage}</Text>
      </View>
      <View style={styles.medicationSchedules}>
        <Text style={styles.schedulesLabel}>Horários:</Text>
        {item.schedules && item.schedules.map((schedule, index) => (
          <Text key={index} style={styles.scheduleTime}>{schedule}</Text>
        ))}
      </View>
      {item.notes && (
        <Text style={styles.medicationNotes}>{item.notes}</Text>
      )}
    </View>
  );

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
  medicationHeader: {
    marginBottom: 16,
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
  scheduleTime: {
    fontSize: 20,
    color: '#4ECDC4',
    marginLeft: 16,
    marginBottom: 4,
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





