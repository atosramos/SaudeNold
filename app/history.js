import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function History() {
  const router = useRouter();
  const [visits, setVisits] = useState({ upcoming: [], past: [] });
  const [medications, setMedications] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Carregar visitas - apenas passadas (consultas agendadas removidas do histórico)
      const visitsStored = await AsyncStorage.getItem('doctorVisits');
      if (visitsStored) {
        const parsed = JSON.parse(visitsStored);
        // Filtrar apenas visitas passadas
        const now = new Date();
        const pastVisits = parsed.filter(v => new Date(v.visitDate) < now);
        
        // Ordenar por data (mais recentes primeiro)
        const sortedPast = pastVisits.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
        
        setVisits({
          upcoming: [],
          past: sortedPast,
        });
      } else {
        setVisits({ upcoming: [], past: [] });
      }

      // Carregar medicamentos
      const medsStored = await AsyncStorage.getItem('medications');
      if (medsStored) {
        const parsed = JSON.parse(medsStored);
        setMedications(parsed.filter(m => m.active !== false));
      } else {
        setMedications([]);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
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


  const renderPastVisit = (visit) => (
    <TouchableOpacity 
      key={visit.id} 
      style={styles.visitCard}
      onPress={() => router.push({
        pathname: '/doctor-visits/edit',
        params: { id: visit.id, visit: JSON.stringify(visit) }
      })}
      activeOpacity={0.7}
    >
      <View style={styles.visitHeader}>
        <View style={styles.visitHeaderLeft}>
          <Ionicons name="checkmark-circle" size={32} color="#4ECDC4" />
          <View style={styles.visitInfo}>
            <Text style={styles.doctorName}>{visit.doctorName}</Text>
            <Text style={styles.specialty}>{visit.specialty}</Text>
          </View>
        </View>
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{formatDate(visit.visitDate)}</Text>
        </View>
      </View>
      {visit.notes && (
        <View style={styles.visitDetails}>
          <Text style={styles.detailText} numberOfLines={3}>{visit.notes}</Text>
        </View>
      )}
    </TouchableOpacity>
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
        <Text style={styles.title}>Histórico do Paciente</Text>
      </View>

      <View style={styles.content}>
        {/* Consultas Realizadas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#4ECDC4" />
            <Text style={styles.sectionTitle}>Consultas Realizadas</Text>
            {visits.past && visits.past.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{visits.past.length}</Text>
              </View>
            )}
          </View>
          {visits.past && visits.past.length > 0 ? (
            <View style={styles.listContainer}>
              {visits.past.slice(0, 10).map(visit => renderPastVisit(visit))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nenhuma consulta realizada</Text>
            </View>
          )}
        </View>

        {/* Medicamentos Ativos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical-outline" size={28} color="#4ECDC4" />
            <Text style={styles.sectionTitle}>Medicamentos Ativos</Text>
            {medications.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{medications.length}</Text>
              </View>
            )}
          </View>
          {medications.length > 0 ? (
            <View style={styles.listContainer}>
              {medications.map(med => (
                <TouchableOpacity
                  key={med.id}
                  style={styles.medicationCard}
                  onPress={() => router.push(`/medications/${med.id}`)}
                >
                  <View style={styles.medicationHeader}>
                    <Ionicons name="medical" size={32} color="#4ECDC4" />
                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationName}>{med.name}</Text>
                      {med.dosage && (
                        <Text style={styles.medicationDosage}>{med.dosage}</Text>
                      )}
                    </View>
                  </View>
                  {med.fasting && (
                    <View style={styles.fastingBadge}>
                      <Ionicons name="ban" size={16} color="#FF6B6B" />
                      <Text style={styles.fastingText}>Em jejum</Text>
                    </View>
                  )}
                  {med.schedules && med.schedules.length > 0 && (
                    <View style={styles.schedulesContainer}>
                      <Text style={styles.schedulesLabel}>Horários:</Text>
                      <View style={styles.schedulesList}>
                        {med.schedules.slice(0, 3).map((schedule, idx) => (
                          <View key={idx} style={styles.scheduleTag}>
                            <Text style={styles.scheduleText}>{schedule}</Text>
                          </View>
                        ))}
                        {med.schedules.length > 3 && (
                          <Text style={styles.moreSchedules}>+{med.schedules.length - 3}</Text>
                        )}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="medical-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nenhum medicamento ativo</Text>
            </View>
          )}
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
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  badge: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContainer: {
    gap: 12,
  },
  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 6,
    borderLeftColor: '#95E1D3',
    marginBottom: 12,
  },
  visitCardToday: {
    borderLeftColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visitHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  visitHeaderRight: {
    alignItems: 'flex-end',
  },
  visitInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 20,
    color: '#666',
  },
  dateBadge: {
    backgroundColor: '#95E1D3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateBadgeToday: {
    backgroundColor: '#FF6B6B',
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateTextToday: {
    color: '#fff',
  },
  visitDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 18,
    color: '#666',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 22,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  medicationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderLeftWidth: 6,
    borderLeftColor: '#4ECDC4',
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 20,
    color: '#666',
  },
  fastingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
  },
  fastingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  schedulesContainer: {
    marginTop: 8,
  },
  schedulesLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  schedulesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleTag: {
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scheduleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  moreSchedules: {
    fontSize: 16,
    color: '#666',
    alignSelf: 'center',
    marginLeft: 4,
  },
  addButton: {
    backgroundColor: '#95E1D3',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    minHeight: 70,
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
});
