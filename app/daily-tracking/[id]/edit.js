import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTrackingRecordById, saveTrackingRecord, createTrackingRecord, TRACKING_TYPES } from '../../../services/dailyTracking';
import { useCustomAlert } from '../../../hooks/useCustomAlert';
import VoiceTextInput from '../../../components/VoiceTextInput';

const TYPE_LABELS = {
  [TRACKING_TYPES.BLOOD_PRESSURE]: 'Pressão Arterial',
  [TRACKING_TYPES.TEMPERATURE]: 'Temperatura',
  [TRACKING_TYPES.HEART_RATE]: 'Batimentos Cardíacos',
  [TRACKING_TYPES.INSULIN]: 'Insulina',
  [TRACKING_TYPES.WEIGHT]: 'Peso',
  [TRACKING_TYPES.GLUCOSE]: 'Glicose',
  [TRACKING_TYPES.OXYGEN_SATURATION]: 'Saturação de Oxigênio',
  [TRACKING_TYPES.OTHER]: 'Outros',
};

const DEFAULT_UNITS = {
  [TRACKING_TYPES.BLOOD_PRESSURE]: 'mmHg',
  [TRACKING_TYPES.TEMPERATURE]: '°C',
  [TRACKING_TYPES.HEART_RATE]: 'bpm',
  [TRACKING_TYPES.INSULIN]: 'UI',
  [TRACKING_TYPES.WEIGHT]: 'kg',
  [TRACKING_TYPES.GLUCOSE]: 'mg/dL',
  [TRACKING_TYPES.OXYGEN_SATURATION]: '%',
  [TRACKING_TYPES.OTHER]: '',
};

export default function EditDailyTracking() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(TRACKING_TYPES.BLOOD_PRESSURE);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRecord();
  }, [id]);

  const loadRecord = async () => {
    try {
      const record = await getTrackingRecordById(id);
      
      if (!record) {
        showAlert('Erro', 'Registro não encontrado', 'error');
        setTimeout(() => router.back(), 1500);
        return;
      }

      setSelectedType(record.type);
      setValue(record.value);
      setUnit(record.unit || DEFAULT_UNITS[record.type]);
      setDate(new Date(record.date));
      setNotes(record.notes || '');
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar registro:', error);
      showAlert('Erro', 'Não foi possível carregar o registro', 'error');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!value.trim()) {
      showAlert('Erro', 'Por favor, informe o valor', 'error');
      return;
    }

    setSaving(true);
    try {
      const record = createTrackingRecord(
        selectedType,
        value.trim(),
        unit || DEFAULT_UNITS[selectedType],
        date.toISOString(),
        notes.trim()
      );
      
      // Manter o ID original
      record.id = id;

      const result = await saveTrackingRecord(record);
      
      if (result.success) {
        showAlert('Sucesso', 'Registro atualizado com sucesso!', 'success');
        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        showAlert('Erro', result.error || 'Não foi possível atualizar o registro', 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar registro:', error);
      showAlert('Erro', `Erro ao salvar: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (date) => {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Editar Registro</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Tipo de registro */}
        <View style={styles.section}>
          <Text style={styles.label}>Tipo de Dado</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {Object.values(TRACKING_TYPES).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  selectedType === type && styles.typeChipActive,
                ]}
                onPress={() => {
                  setSelectedType(type);
                  setUnit(DEFAULT_UNITS[type]);
                }}
              >
                <Text style={[
                  styles.typeChipText,
                  selectedType === type && styles.typeChipTextActive,
                ]}>
                  {TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Valor e unidade */}
        <View style={styles.section}>
          <Text style={styles.label}>Valor</Text>
          <View style={styles.valueRow}>
            <VoiceTextInput
              value={value}
              onChangeText={setValue}
              placeholder="Ex: 120/80, 36.5, 72..."
              keyboardType="numeric"
              containerStyle={styles.valueInput}
              inputStyle={styles.valueInputText}
            />
            <TextInput
              style={styles.unitInput}
              value={unit}
              onChangeText={setUnit}
              placeholder="Unidade"
            />
          </View>
        </View>

        {/* Data e hora */}
        <View style={styles.section}>
          <Text style={styles.label}>Data e Hora</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#4ECDC4" />
            <Text style={styles.dateText}>{formatDateTime(date)}</Text>
          </TouchableOpacity>
        </View>

        {/* Observações */}
        <View style={styles.section}>
          <Text style={styles.label}>Observações (opcional)</Text>
          <VoiceTextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Adicione observações sobre este registro..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            containerStyle={styles.notesInput}
            inputStyle={styles.notesInputText}
          />
        </View>

        {/* Botão salvar */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date/Time Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDate(selectedDate);
            }
          }}
        />
      )}

      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  typeScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeChipActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  typeChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  valueInputText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  unitInput: {
    width: 100,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  notesInputText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
