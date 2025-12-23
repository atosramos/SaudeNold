import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

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

export default function NewDoctorVisit() {
  const router = useRouter();
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [visitDate, setVisitDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      
      const newVisit = {
        id: Date.now().toString(),
        doctorName: doctorName.trim(),
        specialty: specialty,
        visitDate: visitDate.toISOString(),
        notes: notes.trim(),
      };

      visits.push(newVisit);
      await AsyncStorage.setItem('doctorVisits', JSON.stringify(visits));
      
      Alert.alert('Sucesso', 'Visita cadastrada com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erro ao salvar visita:', error);
      Alert.alert('Erro', 'Não foi possível salvar a visita');
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
        <Text style={styles.title}>Nova Visita</Text>
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
          <Text style={styles.saveButtonText}>Salvar Visita</Text>
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
});

