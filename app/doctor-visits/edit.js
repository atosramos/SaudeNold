import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { cancelVisitAlarms, scheduleVisitAlarms } from '../../services/alarm';

const specialties = [
  'Cardiologista',
  'Clínico Geral',
  'Oftalmologista',
  'Ortopedista',
  'Dermatologista',
  'Neurologista',
  'Pediatra',
  'Ginecologista',
  'Outro',
];

export default function EditDoctorVisit() {
  const router = useRouter();
  const { id, visit: visitParam } = useLocalSearchParams();
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [visitDate, setVisitDate] = useState(new Date());
  const [visitTime, setVisitTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderBefore, setReminderBefore] = useState('1h');

  useEffect(() => {
    loadVisit();
  }, []);

  const loadVisit = async () => {
    try {
      let visitData;
      if (visitParam) {
        visitData = JSON.parse(visitParam);
      } else {
        const stored = await AsyncStorage.getItem('doctorVisits');
        if (stored) {
          const visits = JSON.parse(stored);
          visitData = visits.find(v => v.id === id);
        }
      }
      
      if (visitData) {
        setDoctorName(visitData.doctorName || '');
        setSpecialty(visitData.specialty || '');
        const date = visitData.visitDate ? new Date(visitData.visitDate) : new Date();
        setVisitDate(date);
        setVisitTime(date);
        setNotes(visitData.notes || '');
        setReminderBefore(visitData.reminderBefore || '1h');
      }
    } catch (error) {
      console.error('Erro ao carregar visita:', error);
    }
  };

  const saveVisit = async () => {
    if (!doctorName.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome do médico');
      return;
    }

    if (!specialty) {
      Alert.alert('Erro', 'Por favor, selecione a especialidade');
      return;
    }

    try {
      const stored = await AsyncStorage.getItem('doctorVisits');
      const visits = stored ? JSON.parse(stored) : [];
      
      // Combinar data e hora
      const combinedDateTime = new Date(visitDate);
      combinedDateTime.setHours(visitTime.getHours());
      combinedDateTime.setMinutes(visitTime.getMinutes());
      combinedDateTime.setSeconds(0);
      combinedDateTime.setMilliseconds(0);

      const updatedVisits = visits.map(v => 
        v.id === id
          ? {
              ...v,
              doctorName: doctorName.trim(),
              specialty: specialty,
              visitDate: combinedDateTime.toISOString(),
              notes: notes.trim(),
              reminderBefore: reminderBefore,
            }
          : v
      );

      await AsyncStorage.setItem('doctorVisits', JSON.stringify(updatedVisits));
      
      // Cancelar alarmes antigos e agendar novos
      try {
        await cancelVisitAlarms(id);
        const updatedVisit = updatedVisits.find(v => v.id === id);
        if (updatedVisit) {
          await scheduleVisitAlarms(updatedVisit);
        }
      } catch (error) {
        console.error('Erro ao atualizar alarmes da consulta:', error);
        // Não bloquear a atualização se o reagendamento falhar
      }
      
      Alert.alert('Sucesso', 'Visita atualizada com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erro ao atualizar visita:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a visita');
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={32} color="#95E1D3" />
        </TouchableOpacity>
        <Text style={styles.title}>Editar Visita</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome do Médico *</Text>
          <TextInput
            style={styles.input}
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder="Dr. João Silva"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Especialidade *</Text>
          <View style={styles.specialtiesContainer}>
            {specialties.map((spec) => (
              <TouchableOpacity
                key={spec}
                style={[
                  styles.specialtyButton,
                  specialty === spec && styles.specialtyButtonActive
                ]}
                onPress={() => setSpecialty(spec)}
              >
                <Text style={[
                  styles.specialtyText,
                  specialty === spec && styles.specialtyTextActive
                ]}>
                  {spec}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Data da Consulta *</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={28} color="#95E1D3" />
            <Text style={styles.dateButtonText}>{formatDate(visitDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={visitDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setVisitDate(selectedDate);
                }
              }}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hora da Consulta *</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time" size={28} color="#95E1D3" />
            <Text style={styles.dateButtonText}>
              {visitTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={visitTime}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) {
                  setVisitTime(selectedTime);
                }
              }}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lembrete</Text>
          <View style={styles.reminderContainer}>
            {['1h', '2h', '1 dia', '2 dias'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.reminderButton,
                  reminderBefore === option && styles.reminderButtonActive
                ]}
                onPress={() => setReminderBefore(option)}
              >
                <Text style={[
                  styles.reminderText,
                  reminderBefore === option && styles.reminderTextActive
                ]}>
                  {option} antes
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.helperText}>O alarme será disparado no horário selecionado antes da consulta</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Prescrições, recomendações, etc."
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveVisit}>
          <Text style={styles.saveButtonText}>Salvar Alterações</Text>
        </TouchableOpacity>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 32,
  },
  label: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    fontSize: 22,
    color: '#333',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specialtyButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#95E1D3',
    minWidth: 140,
    alignItems: 'center',
  },
  specialtyButtonActive: {
    backgroundColor: '#95E1D3',
  },
  specialtyText: {
    fontSize: 20,
    color: '#95E1D3',
    fontWeight: 'bold',
  },
  specialtyTextActive: {
    color: '#fff',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#95E1D3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButtonText: {
    fontSize: 22,
    color: '#333',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#95E1D3',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
    minHeight: 80,
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  reminderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  reminderButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#95E1D3',
    minWidth: 100,
    alignItems: 'center',
  },
  reminderButtonActive: {
    backgroundColor: '#95E1D3',
  },
  reminderText: {
    fontSize: 20,
    color: '#95E1D3',
    fontWeight: 'bold',
  },
  reminderTextActive: {
    color: '#fff',
  },
  helperText: {
    fontSize: 18,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
});


