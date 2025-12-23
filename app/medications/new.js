import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

export default function NewMedication() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [customTime, setCustomTime] = useState('');

  const quickTimes = ['08:00', '12:00', '18:00', '22:00'];

  const addQuickTime = (time) => {
    if (!schedules.includes(time)) {
      setSchedules([...schedules, time]);
    }
  };

  const removeSchedule = (time) => {
    setSchedules(schedules.filter(s => s !== time));
  };

  const validateTime = (time) => {
    // Validar formato HH:MM (24 horas)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const addCustomTime = () => {
    const time = customTime.trim();
    
    if (!time) {
      Alert.alert('Erro', 'Por favor, digite um horário');
      return;
    }

    if (!validateTime(time)) {
      Alert.alert('Erro', 'Horário inválido. Use o formato HH:MM (ex: 09:00 ou 09:15)');
      return;
    }

    // Formatar para garantir dois dígitos na hora
    const [hours, minutes] = time.split(':');
    const formattedTime = `${hours.padStart(2, '0')}:${minutes}`;

    if (schedules.includes(formattedTime)) {
      Alert.alert('Aviso', 'Este horário já foi adicionado');
      return;
    }

    setSchedules([...schedules, formattedTime]);
    setCustomTime('');
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Adicionar Foto',
      'Escolha uma opção',
      [
        { text: 'Câmera', onPress: takePhoto },
        { text: 'Galeria', onPress: pickImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const saveMedication = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome do medicamento');
      return;
    }

    if (schedules.length === 0) {
      Alert.alert('Erro', 'Por favor, adicione pelo menos um horário');
      return;
    }

    try {
      const stored = await AsyncStorage.getItem('medications');
      const medications = stored ? JSON.parse(stored) : [];
      
      const newMedication = {
        id: Date.now().toString(),
        name: name.trim(),
        dosage: dosage.trim(),
        schedules: schedules.sort(),
        notes: notes.trim(),
        image: image,
        active: true,
      };

      medications.push(newMedication);
      await AsyncStorage.setItem('medications', JSON.stringify(medications));
      
      Alert.alert('Sucesso', 'Medicamento cadastrado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erro ao salvar medicamento:', error);
      Alert.alert('Erro', 'Não foi possível salvar o medicamento');
    }
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
        <Text style={styles.title}>Novo Medicamento</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome do Medicamento *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Paracetamol"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dosagem</Text>
          <TextInput
            style={styles.input}
            value={dosage}
            onChangeText={setDosage}
            placeholder="Ex: 500mg"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Horários Rápidos</Text>
          <View style={styles.quickTimesContainer}>
            {quickTimes.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.quickTimeButton,
                  schedules.includes(time) && styles.quickTimeButtonActive
                ]}
                onPress={() => schedules.includes(time) ? removeSchedule(time) : addQuickTime(time)}
              >
                <Text style={[
                  styles.quickTimeText,
                  schedules.includes(time) && styles.quickTimeTextActive
                ]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adicionar Horário Personalizado</Text>
          <View style={styles.customTimeContainer}>
            <TextInput
              style={styles.customTimeInput}
              value={customTime}
              onChangeText={setCustomTime}
              placeholder="Ex: 09:00 ou 09:15"
              placeholderTextColor="#999"
              keyboardType="default"
              maxLength={5}
            />
            <TouchableOpacity 
              style={styles.addCustomTimeButton}
              onPress={addCustomTime}
            >
              <Ionicons name="add" size={28} color="#fff" />
              <Text style={styles.addCustomTimeButtonText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Digite o horário no formato HH:MM (ex: 09:00, 09:15, 14:30)</Text>
        </View>

        {schedules.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Horários Selecionados</Text>
            <View style={styles.schedulesContainer}>
              {schedules.map((time, index) => (
                <View key={index} style={styles.scheduleTag}>
                  <Text style={styles.scheduleTagText}>{time}</Text>
                  <TouchableOpacity onPress={() => removeSchedule(time)}>
                    <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Foto do Medicamento</Text>
          <TouchableOpacity style={styles.imageButton} onPress={showImageOptions}>
            {image ? (
              <Text style={styles.imageButtonText}>Foto selecionada</Text>
            ) : (
              <>
                <Ionicons name="camera" size={32} color="#4ECDC4" />
                <Text style={styles.imageButtonText}>Adicionar Foto</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Informações adicionais..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveMedication}>
          <Text style={styles.saveButtonText}>Salvar Medicamento</Text>
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
    height: 120,
    textAlignVertical: 'top',
  },
  quickTimesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickTimeButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    minWidth: 100,
    alignItems: 'center',
  },
  quickTimeButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  quickTimeText: {
    fontSize: 22,
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
  quickTimeTextActive: {
    color: '#fff',
  },
  schedulesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  scheduleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  scheduleTagText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  customTimeContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  customTimeInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    fontSize: 22,
    color: '#333',
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  addCustomTimeButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 140,
    justifyContent: 'center',
  },
  addCustomTimeButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  helperText: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  imageButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  imageButtonText: {
    fontSize: 22,
    color: '#4ECDC4',
    marginTop: 12,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
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

