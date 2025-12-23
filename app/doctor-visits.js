import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DoctorVisits() {
  const router = useRouter();
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    try {
      const stored = await AsyncStorage.getItem('doctorVisits');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ordenar por data mais recente primeiro
        const sorted = parsed.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
        setVisits(sorted);
      }
    } catch (error) {
      console.error('Erro ao carregar visitas:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderVisit = ({ item }) => (
    <View style={styles.visitCard}>
      <View style={styles.visitHeader}>
        <View>
          <Text style={styles.doctorName}>{item.doctorName}</Text>
          <Text style={styles.specialty}>{item.specialty}</Text>
        </View>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar" size={24} color="#95E1D3" />
          <Text style={styles.dateText}>{formatDate(item.visitDate)}</Text>
        </View>
      </View>
      {item.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Observações:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
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
          <Ionicons name="arrow-back" size={32} color="#95E1D3" />
        </TouchableOpacity>
        <Text style={styles.title}>Visitas ao Médico</Text>
      </View>

      {visits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma visita cadastrada</Text>
          <Text style={styles.emptySubtext}>Toque no botão + para adicionar</Text>
        </View>
      ) : (
        <FlatList
          data={visits}
          renderItem={renderVisit}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
        />
      )}

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => router.push('/doctor-visits/new')}
      >
        <Ionicons name="add" size={40} color="#fff" />
        <Text style={styles.addButtonText}>Nova Visita</Text>
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
  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#95E1D3',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  doctorName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  specialty: {
    fontSize: 22,
    color: '#666',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#95E1D3',
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
    borderTopColor: '#e0e0e0',
  },
  notesLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 20,
    color: '#666',
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
    backgroundColor: '#95E1D3',
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





