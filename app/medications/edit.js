import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { getProfileItem, setProfileItem } from '../../services/profileStorageManager';
import * as ImagePicker from 'expo-image-picker';
import { rescheduleMedicationAlarms } from '../../services/alarm';
import VoiceTextInput from '../../components/VoiceTextInput';
import { useProfileAuthGuard } from '../../hooks/useProfileAuthGuard';

export default function EditMedication() {
  const router = useRouter();
  const { id, medication: medicationParam } = useLocalSearchParams();
  useProfileAuthGuard({ sensitive: true });
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [customTime, setCustomTime] = useState('');
  const [intervalStartTime, setIntervalStartTime] = useState('08:00');
  const [customInterval, setCustomInterval] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState([0, 1, 2, 3, 4, 5, 6]); // 0 = Domingo, 6 = Sábado
  const [fasting, setFasting] = useState(false);
  const [repeatMode, setRepeatMode] = useState('daily'); // daily | weekly | interval
  const [intervalDays, setIntervalDays] = useState('2');
  
  // Estados para submenus colapsáveis
  const [showQuickTimes, setShowQuickTimes] = useState(false);
  const [showIntervalSchedule, setShowIntervalSchedule] = useState(false);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [showDaysOfWeek, setShowDaysOfWeek] = useState(false);

  const weekDays = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
  ];

  const toggleDay = (dayValue) => {
    if (daysOfWeek.includes(dayValue)) {
      setDaysOfWeek(daysOfWeek.filter(day => day !== dayValue));
    } else {
      setDaysOfWeek([...daysOfWeek, dayValue].sort());
    }
  };

  const selectRepeatMode = (mode) => {
    setRepeatMode(mode);
    if (mode === 'daily') {
      setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
    }
  };

  // Recarregar dados sempre que a tela receber foco
  useFocusEffect(
    useCallback(() => {
      loadMedication();
    }, [id])
  );

  const loadMedication = async () => {
    try {
      // Sempre buscar do AsyncStorage para ter os dados mais recentes
      const stored = await getProfileItem('medications');
      if (stored) {
        const medications = JSON.parse(stored);
        const medicationData = medications.find(m => m.id === id);
        
        if (medicationData) {
          setName(medicationData.name || '');
          setDosage(medicationData.dosage || '');
          setSchedules(medicationData.schedules || []);
          setNotes(medicationData.notes || '');
          setImage(medicationData.image || null);
          const loadedDays = medicationData.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
          setDaysOfWeek(loadedDays);
          if (medicationData.intervalDays && medicationData.intervalDays >= 2) {
            setRepeatMode('interval');
            setIntervalDays(String(medicationData.intervalDays));
          } else if (loadedDays.length < 7) {
            setRepeatMode('weekly');
          } else {
            setRepeatMode('daily');
          }
          setFasting(medicationData.fasting || false);
          return;
        }
      }
      
      // Se não encontrou no AsyncStorage, tentar usar o param (fallback)
      if (medicationParam) {
        try {
          const medicationData = JSON.parse(medicationParam);
          setName(medicationData.name || '');
          setDosage(medicationData.dosage || '');
          setSchedules(medicationData.schedules || []);
          setNotes(medicationData.notes || '');
          setImage(medicationData.image || null);
        } catch (e) {
          console.error('Erro ao parsear medicationParam:', e);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar medicamento:', error);
    }
  };

  // Gerar todos os horários do dia (de hora em hora)
  const generateQuickTimes = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return times;
  };

  const quickTimes = generateQuickTimes();

  const addQuickTime = (time) => {
    if (!schedules.includes(time)) {
      setSchedules([...schedules, time]);
    }
  };

  // Gerar horários baseado em intervalo
  const generateIntervalSchedules = (intervalHours, startTime) => {
    const schedules = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    
    // Gerar horários para as próximas 24 horas a partir do horário inicial
    let currentHour = startHour;
    let iterations = 0;
    const maxIterations = 24; // Limitar para evitar loop infinito
    
    while (iterations < maxIterations) {
      const time = `${currentHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      if (!schedules.includes(time)) {
        schedules.push(time);
      }
      
      currentHour = (currentHour + intervalHours) % 24;
      iterations++;
      
      // Se voltou ao horário inicial, parar
      if (currentHour === startHour && iterations > 0) {
        break;
      }
    }
    
    return schedules.sort();
  };

  const addIntervalSchedules = (intervalHours) => {
    if (!intervalStartTime || !validateTime(intervalStartTime)) {
      Alert.alert('Erro', 'Por favor, selecione um horário inicial válido');
      return;
    }

    const newSchedules = generateIntervalSchedules(intervalHours, intervalStartTime);
    const updatedSchedules = [...schedules];
    
    newSchedules.forEach(time => {
      if (!updatedSchedules.includes(time)) {
        updatedSchedules.push(time);
      }
    });
    
    setSchedules(updatedSchedules.sort());
    Alert.alert('Sucesso', `Horários adicionados a cada ${intervalHours} horas a partir de ${intervalStartTime}`);
  };

  const addCustomIntervalSchedules = () => {
    // Validar intervalo customizado
    const intervalHours = parseInt(customInterval);
    
    if (!customInterval || isNaN(intervalHours) || intervalHours < 1 || intervalHours > 24) {
      Alert.alert('Erro', 'Por favor, digite um intervalo válido entre 1 e 24 horas');
      return;
    }

    if (!intervalStartTime || !validateTime(intervalStartTime)) {
      Alert.alert('Erro', 'Por favor, selecione um horário inicial válido');
      return;
    }

    const newSchedules = generateIntervalSchedules(intervalHours, intervalStartTime);
    const updatedSchedules = [...schedules];
    
    newSchedules.forEach(time => {
      if (!updatedSchedules.includes(time)) {
        updatedSchedules.push(time);
      }
    });
    
    setSchedules(updatedSchedules.sort());
    Alert.alert('Sucesso', `Horários adicionados a cada ${intervalHours} horas a partir de ${intervalStartTime}`);
    setCustomInterval(''); // Limpar campo após adicionar
  };

  const removeSchedule = (time) => {
    setSchedules(schedules.filter(s => s !== time));
  };

  const validateTime = (time) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const formatTimeInput = (text) => {
    const numbers = text.replace(/\D/g, '');
    const limitedNumbers = numbers.slice(0, 4);
    
    if (limitedNumbers.length === 0) {
      return '';
    }
    
    if (limitedNumbers.length === 1) {
      return `${limitedNumbers}:`;
    }
    
    if (limitedNumbers.length === 2) {
      const hour = parseInt(limitedNumbers);
      if (hour > 23) {
        return `${limitedNumbers[0]}:${limitedNumbers[1]}`;
      }
      return `${limitedNumbers}:`;
    }
    
    if (limitedNumbers.length === 3) {
      const hour = limitedNumbers.slice(0, 2);
      const minute = limitedNumbers.slice(2, 3);
      const hourInt = parseInt(hour);
      
      if (hourInt > 23) {
        return `${hour[0]}:${hour[1]}${minute}`;
      }
      
      const minuteInt = parseInt(minute);
      if (minuteInt > 5) {
        return `${hour}:5`;
      }
      
      return `${hour}:${minute}`;
    }
    
    if (limitedNumbers.length === 4) {
      const hour = limitedNumbers.slice(0, 2);
      const minute = limitedNumbers.slice(2, 4);
      const hourInt = parseInt(hour);
      const minuteInt = parseInt(minute);
      
      if (hourInt > 23) {
        return `${hour[0]}:${hour[1]}${minute}`;
      }
      
      if (minuteInt > 59) {
        return `${hour}:59`;
      }
      
      return `${hour}:${minute}`;
    }
    
    return text;
  };

  const handleTimeChange = (text) => {
    const formatted = formatTimeInput(text);
    setCustomTime(formatted);
  };

  const handleIntervalTimeChange = (text) => {
    const formatted = formatTimeInput(text);
    setIntervalStartTime(formatted);
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
    
    if (repeatMode === 'weekly' && daysOfWeek.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um dia da semana');
      return;
    }
    
    let intervalDaysValue = null;
    if (repeatMode === 'interval') {
      const parsedInterval = parseInt(intervalDays, 10);
      if (isNaN(parsedInterval) || parsedInterval < 2 || parsedInterval > 30) {
        Alert.alert('Erro', 'Digite um intervalo válido entre 2 e 30 dias');
        return;
      }
      intervalDaysValue = parsedInterval;
    }

    try {
      const stored = await getProfileItem('medications');
      const medications = stored ? JSON.parse(stored) : [];
      
      const updatedMedications = medications.map(m => 
        m.id === id 
          ? {
              ...m,
              name: name.trim(),
              dosage: dosage.trim(),
              schedules: schedules.sort(),
              notes: notes.trim(),
              image: image,
              daysOfWeek: (repeatMode === 'weekly' ? daysOfWeek : [0, 1, 2, 3, 4, 5, 6]),
              intervalDays: intervalDaysValue,
              fasting: fasting,
            }
          : m
      );

      await setProfileItem('medications', JSON.stringify(updatedMedications));
      
      // Reagendar alarmes para o medicamento atualizado
      const updatedMedication = updatedMedications.find(m => m.id === id);
      if (updatedMedication) {
        try {
          await rescheduleMedicationAlarms(updatedMedication);
        } catch (error) {
          console.error('Erro ao reagendar alarmes:', error);
          // Não bloquear a atualização se o reagendamento falhar
        }
      }
      
      Alert.alert('Sucesso', 'Medicamento atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erro ao atualizar medicamento:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o medicamento');
    }
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
          <Ionicons name="arrow-back" size={32} color="#4ECDC4" />
        </TouchableOpacity>
        <Text style={styles.title}>Editar Medicamento</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome do Medicamento *</Text>
          <VoiceTextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: Paracetamol"
            placeholderTextColor="#999"
            containerStyle={styles.inputRow}
            inputStyle={styles.inputField}
            helperText="Toque no microfone para ditar."
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dosagem</Text>
          <VoiceTextInput
            value={dosage}
            onChangeText={setDosage}
            placeholder="Ex: 500mg"
            placeholderTextColor="#999"
            containerStyle={styles.inputRow}
            inputStyle={styles.inputField}
            helperText="Toque no microfone para ditar."
          />
        </View>

        {/* Horários Rápidos - Submenu Colapsável */}
        <View style={styles.inputGroup}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setShowQuickTimes(!showQuickTimes)}
          >
            <View style={styles.collapsibleHeaderLeft}>
              <Ionicons name="time-outline" size={28} color="#4ECDC4" />
              <Text style={styles.collapsibleHeaderText}>Horários Rápidos</Text>
            </View>
            <Ionicons 
              name={showQuickTimes ? "chevron-up" : "chevron-down"} 
              size={28} 
              color="#4ECDC4" 
            />
          </TouchableOpacity>
          {showQuickTimes && (
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
          )}
        </View>

        {/* Agendamento por Intervalo - Submenu Colapsável */}
        <View style={styles.inputGroup}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setShowIntervalSchedule(!showIntervalSchedule)}
          >
            <View style={styles.collapsibleHeaderLeft}>
              <Ionicons name="repeat-outline" size={28} color="#4ECDC4" />
              <Text style={styles.collapsibleHeaderText}>Agendamento por Intervalo</Text>
            </View>
            <Ionicons 
              name={showIntervalSchedule ? "chevron-up" : "chevron-down"} 
              size={28} 
              color="#4ECDC4" 
            />
          </TouchableOpacity>
          {showIntervalSchedule && (
          <View style={styles.intervalContainer}>
            <Text style={styles.intervalLabel}>Horário Inicial:</Text>
            <View style={styles.intervalTimeContainer}>
              <TextInput
                style={styles.intervalTimeInput}
                value={intervalStartTime}
                onChangeText={handleIntervalTimeChange}
                placeholder="08:00"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={styles.intervalButtonsContainer}>
              <TouchableOpacity
                style={styles.intervalButton}
                onPress={() => addIntervalSchedules(4)}
              >
                <Ionicons name="time-outline" size={24} color="#4ECDC4" />
                <Text style={styles.intervalButtonText}>4h</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.intervalButton}
                onPress={() => addIntervalSchedules(8)}
              >
                <Ionicons name="time-outline" size={24} color="#4ECDC4" />
                <Text style={styles.intervalButtonText}>8h</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.intervalButton}
                onPress={() => addIntervalSchedules(12)}
              >
                <Ionicons name="time-outline" size={24} color="#4ECDC4" />
                <Text style={styles.intervalButtonText}>12h</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.intervalButton}
                onPress={() => addIntervalSchedules(24)}
              >
                <Ionicons name="time-outline" size={24} color="#4ECDC4" />
                <Text style={styles.intervalButtonText}>24h</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.customIntervalContainer}>
              <Text style={styles.intervalLabel}>Ou digite um intervalo customizado:</Text>
              <View style={styles.customIntervalInputContainer}>
                <TextInput
                  style={styles.customIntervalInput}
                  value={customInterval}
                  onChangeText={(text) => setCustomInterval(text.replace(/\D/g, ''))}
                  placeholder="Ex: 3"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.customIntervalLabel}>horas</Text>
                <TouchableOpacity
                  style={styles.customIntervalButton}
                  onPress={addCustomIntervalSchedules}
                >
                  <Ionicons name="add-circle" size={28} color="#4ECDC4" />
                  <Text style={styles.customIntervalButtonText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.helperText}>Selecione o horário inicial e escolha o intervalo desejado (1 a 24 horas)</Text>
          </View>
          )}
        </View>

        {/* Horário Personalizado - Submenu Colapsável */}
        <View style={styles.inputGroup}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setShowCustomTime(!showCustomTime)}
          >
            <View style={styles.collapsibleHeaderLeft}>
              <Ionicons name="add-circle-outline" size={28} color="#4ECDC4" />
              <Text style={styles.collapsibleHeaderText}>Adicionar Horário Personalizado</Text>
            </View>
            <Ionicons 
              name={showCustomTime ? "chevron-up" : "chevron-down"} 
              size={28} 
              color="#4ECDC4" 
            />
          </TouchableOpacity>
          {showCustomTime && (
            <>
              <View style={styles.customTimeContainer}>
                <TextInput
                  style={styles.customTimeInput}
                  value={customTime}
                  onChangeText={handleTimeChange}
                  placeholder="Ex: 09:00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
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
              <Text style={styles.helperText}>Digite apenas os números, os dois pontos serão inseridos automaticamente</Text>
            </>
          )}
        </View>

        {/* Dias de uso - Submenu Colapsável */}
        <View style={styles.inputGroup}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setShowDaysOfWeek(!showDaysOfWeek)}
          >
            <View style={styles.collapsibleHeaderLeft}>
              <Ionicons name="calendar-outline" size={28} color="#4ECDC4" />
              <Text style={styles.collapsibleHeaderText}>Dias de Uso</Text>
            </View>
            <Ionicons 
              name={showDaysOfWeek ? "chevron-up" : "chevron-down"} 
              size={28} 
              color="#4ECDC4" 
            />
          </TouchableOpacity>
          {showDaysOfWeek && (
            <View style={styles.daysOfWeekContainer}>
              <View style={styles.repeatModeContainer}>
                <TouchableOpacity
                  style={[styles.repeatModeButton, repeatMode === 'daily' && styles.repeatModeButtonActive]}
                  onPress={() => selectRepeatMode('daily')}
                >
                  <Text style={[styles.repeatModeText, repeatMode === 'daily' && styles.repeatModeTextActive]}>
                    Todos os dias
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.repeatModeButton, repeatMode === 'weekly' && styles.repeatModeButtonActive]}
                  onPress={() => selectRepeatMode('weekly')}
                >
                  <Text style={[styles.repeatModeText, repeatMode === 'weekly' && styles.repeatModeTextActive]}>
                    Dias específicos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.repeatModeButton, repeatMode === 'interval' && styles.repeatModeButtonActive]}
                  onPress={() => selectRepeatMode('interval')}
                >
                  <Text style={[styles.repeatModeText, repeatMode === 'interval' && styles.repeatModeTextActive]}>
                    Intervalo (dia sim/dia não)
                  </Text>
                </TouchableOpacity>
              </View>
              
              {repeatMode === 'weekly' && (
                <View style={styles.daysOfWeekGrid}>
                  {weekDays.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayButton,
                        daysOfWeek.includes(day.value) && styles.dayButtonActive
                      ]}
                      onPress={() => toggleDay(day.value)}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        daysOfWeek.includes(day.value) && styles.dayButtonTextActive
                      ]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {repeatMode === 'interval' && (
                <View style={styles.intervalDaysContainer}>
                  <Text style={styles.intervalLabel}>Intervalo em dias:</Text>
                  <View style={styles.customIntervalInputContainer}>
                    <TextInput
                      style={styles.customIntervalInput}
                      value={intervalDays}
                      onChangeText={(text) => setIntervalDays(text.replace(/\D/g, ''))}
                      placeholder="2"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.customIntervalLabel}>dias</Text>
                  </View>
                  <Text style={styles.helperText}>Ex: 2 = dia sim, dia não</Text>
                </View>
              )}
            </View>
          )}
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
              <Image 
                source={{ uri: image }} 
                style={styles.medicationImage}
              />
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
          <VoiceTextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Informações adicionais..."
            placeholderTextColor="#999"
            containerStyle={styles.inputRow}
            inputStyle={[styles.inputField, styles.textArea]}
            multiline
            numberOfLines={4}
            helperText="Toque no microfone para ditar."
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveMedication}>
          <Text style={styles.saveButtonText}>Salvar Alterações</Text>
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
  intervalContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  intervalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  intervalTimeContainer: {
    marginBottom: 16,
  },
  intervalTimeInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 22,
    color: '#333',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    textAlign: 'center',
  },
  intervalButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  intervalButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  intervalButtonText: {
    fontSize: 20,
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
  customIntervalContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  customIntervalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  customIntervalInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 22,
    color: '#333',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    textAlign: 'center',
    minWidth: 80,
  },
  customIntervalLabel: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  customIntervalButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    minWidth: 140,
  },
  customIntervalButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
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
  medicationImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
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
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    marginBottom: 12,
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collapsibleHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  fastingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    gap: 16,
  },
  fastingIconContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateIcon: {
    position: 'absolute',
    bottom: -5,
    right: -5,
  },
  fastingTextContainer: {
    flex: 1,
  },
  fastingLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  fastingLabelActive: {
    color: '#FF6B6B',
  },
  fastingSubtext: {
    fontSize: 18,
    color: '#666',
  },
  daysOfWeekContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  repeatModeContainer: {
    gap: 12,
  },
  repeatModeButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    alignItems: 'center',
  },
  repeatModeButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  repeatModeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  repeatModeTextActive: {
    color: '#fff',
  },
  daysOfWeekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  intervalDaysContainer: {
    marginTop: 12,
  },
  dayButton: {
    flex: 1,
    minWidth: '12%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  dayButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
});

