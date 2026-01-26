import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { getProfileItem, setProfileItem } from '../../services/profileStorageManager';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleVisitAlarms } from '../../services/alarm';
import VoiceTextInput from '../../components/VoiceTextInput';
import { useProfileAuthGuard } from '../../hooks/useProfileAuthGuard';

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
  useProfileAuthGuard({ sensitive: true });
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [visitDate, setVisitDate] = useState(new Date());
  const [visitTime, setVisitTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderBefore, setReminderBefore] = useState('1h'); // 1h antes, 1 dia antes, etc.
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [showCustomSpecialtyForm, setShowCustomSpecialtyForm] = useState(false);

  const handleSpecialtySelect = (spec) => {
    if (spec === 'Outro') {
      setShowCustomSpecialtyForm(true);
      setSpecialty(''); // Limpar seleção anterior
    } else {
      setSpecialty(spec);
      setShowCustomSpecialtyForm(false);
      setCustomSpecialty('');
    }
  };

  const saveCustomSpecialty = () => {
    if (!customSpecialty.trim()) {
      Alert.alert('Erro', 'Por favor, digite a especialidade');
      return;
    }
    setSpecialty(customSpecialty.trim());
    setShowCustomSpecialtyForm(false);
  };

  const saveVisit = async () => {
    if (!doctorName.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome do médico');
      return;
    }

    if (!specialty) {
      Alert.alert('Erro', 'Por favor, selecione ou digite a especialidade');
      return;
    }

    try {
      const stored = await getProfileItem('doctorVisits');
      const visits = stored ? JSON.parse(stored) : [];
      
      // Combinar data e hora
      const combinedDateTime = new Date(visitDate);
      combinedDateTime.setHours(visitTime.getHours());
      combinedDateTime.setMinutes(visitTime.getMinutes());
      combinedDateTime.setSeconds(0);
      combinedDateTime.setMilliseconds(0);

      const newVisit = {
        id: Date.now().toString(),
        doctorName: doctorName.trim(),
        specialty: specialty,
        visitDate: combinedDateTime.toISOString(),
        notes: notes.trim(),
        reminderBefore: reminderBefore,
      };

      visits.push(newVisit);
      await setProfileItem('doctorVisits', JSON.stringify(visits));
      
      // Agendar alarmes para a consulta
      try {
        await scheduleVisitAlarms(newVisit);
      } catch (error) {
        console.error('Erro ao agendar alarmes da consulta:', error);
        // Não bloquear o cadastro se o agendamento falhar
      }
      
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
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
          <VoiceTextInput
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder="Dr. João Silva"
            placeholderTextColor="#999"
            containerStyle={styles.inputRow}
            inputStyle={styles.inputField}
            helperText="Toque no microfone para ditar."
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
                  spec !== 'Outro' && specialty === spec && styles.specialtyButtonActive,
                  spec === 'Outro' && showCustomSpecialtyForm && styles.specialtyButtonActive
                ]}
                onPress={() => handleSpecialtySelect(spec)}
              >
                <Text style={[
                  styles.specialtyText,
                  (spec !== 'Outro' && specialty === spec) || 
                  (spec === 'Outro' && showCustomSpecialtyForm)
                    ? styles.specialtyTextActive
                    : null
                ]}>
                  {spec}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Formulário para especialidade customizada */}
          {showCustomSpecialtyForm && (
            <View style={styles.customSpecialtyForm}>
              <Text style={styles.customSpecialtyLabel}>Digite a especialidade:</Text>
              <View style={styles.customSpecialtyInputContainer}>
                <VoiceTextInput
                  value={customSpecialty}
                  onChangeText={setCustomSpecialty}
                  placeholder="Ex: Geriatra, Urologista"
                  placeholderTextColor="#999"
                  containerStyle={styles.customSpecialtyInputRow}
                  inputStyle={styles.inputField}
                  helperText="Toque no microfone para ditar."
                />
                <TouchableOpacity
                  style={styles.addCustomSpecialtyButton}
                  onPress={saveCustomSpecialty}
                >
                  <Ionicons name="checkmark-circle" size={32} color="#95E1D3" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.cancelCustomSpecialtyButton}
                onPress={() => {
                  setShowCustomSpecialtyForm(false);
                  setCustomSpecialty('');
                  setSpecialty('');
                }}
              >
                <Text style={styles.cancelCustomSpecialtyText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Mostrar especialidade customizada selecionada */}
          {specialty && !specialties.includes(specialty) && (
            <View style={styles.customSpecialtyDisplay}>
              <Text style={styles.customSpecialtyDisplayLabel}>Especialidade selecionada:</Text>
              <View style={styles.customSpecialtyDisplayItem}>
                <Text style={styles.customSpecialtyDisplayText}>{specialty}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setSpecialty('');
                    setCustomSpecialty('');
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
          )}
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
          <VoiceTextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Prescrições, recomendações, etc."
            placeholderTextColor="#999"
            containerStyle={styles.inputRow}
            inputStyle={[styles.inputField, styles.textArea]}
            multiline
            numberOfLines={6}
            helperText="Toque no microfone para ditar."
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveVisit}>
          <Text style={styles.saveButtonText}>Salvar Visita</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  inputRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 22,
    color: '#333',
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
  customSpecialtyForm: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#95E1D3',
  },
  customSpecialtyLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  customSpecialtyInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  customSpecialtyInputRow: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCustomSpecialtyButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelCustomSpecialtyButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  cancelCustomSpecialtyText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  customSpecialtyDisplay: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  customSpecialtyDisplayLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  customSpecialtyDisplayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    gap: 12,
  },
  customSpecialtyDisplayText: {
    fontSize: 22,
    color: '#333',
    flex: 1,
    fontWeight: 'bold',
  },
});

