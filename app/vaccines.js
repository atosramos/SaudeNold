import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Modal, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleVaccineAlarms, calculateNextVaccineDate, cancelVaccineAlarms } from '../services/alarm';

// Calendário Nacional de Vacinação - Criança (0 a 9 anos, 11 meses e 29 dias)
// Fonte: https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca
const NATIONAL_VACCINE_CALENDAR = [
  { id: 'nat-1', age: 'Ao nascer', vaccine: 'BCG', dose: '1 dose', diseases: 'formas graves e disseminadas da tuberculose e, também, com efeito protetor contra a hanseníase' },
  { id: 'nat-2', age: 'Ao nascer', vaccine: 'Hepatite B', dose: '1 dose', diseases: 'hepatite B, hepatite D' },
  { id: 'nat-3', age: '2 meses', vaccine: 'Penta (DTP+Hib+HB)', dose: '1ª dose', diseases: 'difteria, tétano, coqueluche, infecções pelo H. influenzae tipo b, hepatite B' },
  { id: 'nat-4', age: '2 meses', vaccine: 'Poliomielite inativada VIP', dose: '1ª dose', diseases: 'poliomielite ou paralisia infantil' },
  { id: 'nat-5', age: '2 meses', vaccine: 'Pneumocócica 10-valente', dose: '1ª dose', diseases: 'doenças pneumocócicas invasivas (pelos sorogrupos contidos na vacina)' },
  { id: 'nat-6', age: '2 meses', vaccine: 'Rotavírus humano', dose: '1ª dose', diseases: 'gastrenterite viral (diarréia, vômito)' },
  { id: 'nat-7', age: '3 meses', vaccine: 'Meningocócica C', dose: '1ª dose', diseases: 'doenças meningocócicas (meningite, encefalite, meningoencefalite) pelo meningococo tipo C' },
  { id: 'nat-8', age: '4 meses', vaccine: 'Penta (DTP+Hib+HB)', dose: '2ª dose', diseases: 'difteria, tétano, coqueluche, infecções pelo H. influenzae tipo b, hepatite B' },
  { id: 'nat-9', age: '4 meses', vaccine: 'Poliomielite inativada VIP', dose: '2ª dose', diseases: 'poliomielite ou paralisia infantil' },
  { id: 'nat-10', age: '4 meses', vaccine: 'Pneumocócica 10-valente', dose: '2ª dose', diseases: 'doenças pneumocócicas invasivas (pelos sorogrupos contidos na vacina)' },
  { id: 'nat-11', age: '4 meses', vaccine: 'Rotavírus humano', dose: '2ª dose', diseases: 'gastrenterite viral (diarréia, vômito)' },
  { id: 'nat-12', age: '5 meses', vaccine: 'Meningocócica C', dose: '2ª dose', diseases: 'doenças meningocócicas (meningite, encefalite, meningoencefalite) pelo meningococo tipo C' },
  { id: 'nat-13', age: '6 meses', vaccine: 'Penta (DTP+Hib+HB)', dose: '3ª dose', diseases: 'difteria, tétano, coqueluche, infecções pelo H. influenzae tipo b, hepatite B' },
  { id: 'nat-14', age: '6 meses', vaccine: 'Poliomielite inativada VIP', dose: '3ª dose', diseases: 'poliomielite ou paralisia infantil' },
  { id: 'nat-15', age: '6 meses', vaccine: 'Influenza trivalente', dose: '1ª dose', diseases: 'influenza (gripe)' },
  { id: 'nat-16', age: '6 meses', vaccine: 'COVID-19', dose: '1ª dose', diseases: 'formas graves da covid-19 e óbitos causados pelo vírus SARS-CoV-2' },
  { id: 'nat-17', age: '6 a 8 meses', vaccine: 'Febre amarela', dose: '1 dose (casos excepcionais)', diseases: 'febre amarela' },
  { id: 'nat-18', age: '7 meses', vaccine: 'COVID-19', dose: '2ª dose', diseases: 'formas graves da covid-19 e óbitos causados pelo vírus SARS-CoV-2' },
  { id: 'nat-19', age: '9 meses', vaccine: 'COVID-19', dose: '3ª dose', diseases: 'formas graves da covid-19 e óbitos causados pelo vírus SARS-CoV-2' },
  { id: 'nat-20', age: '9 meses', vaccine: 'Febre amarela', dose: '1 dose', diseases: 'febre amarela' },
  { id: 'nat-21', age: '12 meses', vaccine: 'Pneumocócica 10-valente', dose: '1 dose reforço', diseases: 'doenças pneumocócicas invasivas (pelos sorogrupos contidos na vacina)' },
  { id: 'nat-22', age: '12 meses', vaccine: 'Meningocócica ACWY', dose: '1 dose', diseases: 'doenças meningocócicas (meningite, encefalite, meningoencefalite) por meningococos do tipo A, C, W, Y' },
  { id: 'nat-23', age: '12 meses', vaccine: 'Tríplice viral SCR', dose: '1 dose', diseases: 'sarampo, caxumba, rubéola, síndrome da rubéola congênita (futuramente na gravidez)' },
  { id: 'nat-24', age: '15 meses', vaccine: 'DTP', dose: '1ª dose reforço', diseases: 'difteria, tétano, coqueluche' },
  { id: 'nat-25', age: '15 meses', vaccine: 'Poliomielite inativada VIP', dose: '1 dose reforço', diseases: 'poliomielite ou paralisia infantil' },
  { id: 'nat-26', age: '15 meses', vaccine: 'Tetraviral SCRV', dose: '1 dose', diseases: 'sarampo, caxumba, rubéola e síndrome da rubéola congênita (futuramente, na gravidez), varicela' },
  { id: 'nat-27', age: '15 meses', vaccine: 'Hepatite A', dose: '1 dose', diseases: 'hepatite A' },
  { id: 'nat-28', age: '4 anos', vaccine: 'DTP', dose: '2ª dose reforço', diseases: 'difteria, tétano, coqueluche' },
  { id: 'nat-29', age: '4 anos', vaccine: 'Febre amarela', dose: '1 dose reforço', diseases: 'febre amarela' },
  { id: 'nat-30', age: '4 anos', vaccine: 'Varicela', dose: '1 dose', diseases: 'varicela ou catapora' },
  { id: 'nat-31', age: '5 anos (somente indígena)', vaccine: 'Pneumocócica 23-valente', dose: '1 dose', diseases: 'doenças pneumocócicas invasivas (pelos sorogrupos contidos na vacina)' },
  { id: 'nat-32', age: 'A partir de 7 anos', vaccine: 'dT', dose: '3 doses, conforme histórico vacinal', diseases: 'difteria, tétano' },
  { id: 'nat-33', age: '9 a 14 anos', vaccine: 'HPV4', dose: '1 dose', diseases: 'infecções causadas pelo papilomavírus humano' },
];

// Outras vacinas recomendadas
const RECOMMENDED_VACCINES = [
  { id: 'rec-1', name: 'Gripe (Influenza)', description: 'Recomendada anualmente para todas as idades', frequency: 'Anual' },
  { id: 'rec-2', name: 'Hepatite A', description: 'Recomendada para crianças e adultos não vacinados', frequency: '2 doses com intervalo de 6 meses' },
  { id: 'rec-3', name: 'Hepatite B', description: 'Recomendada para todas as idades não vacinadas', frequency: '3 doses (0, 1 e 6 meses)' },
  { id: 'rec-4', name: 'Tríplice bacteriana (dT)', description: 'Reforço a cada 10 anos', frequency: 'A cada 10 anos' },
  { id: 'rec-5', name: 'Febre amarela', description: 'Recomendada para áreas de risco', frequency: '1 dose (reforço a cada 10 anos)' },
  { id: 'rec-6', name: 'Meningocócica ACWY', description: 'Recomendada para adolescentes e adultos jovens', frequency: '1 dose' },
  { id: 'rec-7', name: 'Pneumocócica 23-valente', description: 'Recomendada para idosos e grupos de risco', frequency: '1 dose (reforço após 5 anos)' },
];

// Status possíveis: 'scheduled' (Agendada), 'applied' (Aplicada), 'pending' (Pendente)
const VACCINE_STATUS = {
  SCHEDULED: 'scheduled',
  APPLIED: 'applied',
  PENDING: 'pending',
};

export default function Vaccines() {
  const router = useRouter();
  const [customVaccines, setCustomVaccines] = useState([]);
  const [vaccineRecords, setVaccineRecords] = useState({}); // Registros das vacinas do calendário
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [editingCalendarVaccine, setEditingCalendarVaccine] = useState(null); // Vacina do calendário sendo editada
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    status: VACCINE_STATUS.PENDING,
    scheduledDate: null,
    scheduledTime: null, // Hora do agendamento
    appliedDate: null,
    dose: '',
    lot: '', // Lote da vacina
    manufacturer: '', // Fabricante
    location: '', // Local de aplicação
    professional: '', // Profissional que aplicou
    adverseReactions: '', // Reações adversas
    notes: '',
  });

  // Estados para os date pickers
  const [showScheduledDatePicker, setShowScheduledDatePicker] = useState(false);
  const [showScheduledTimePicker, setShowScheduledTimePicker] = useState(false);
  const [showAppliedDatePicker, setShowAppliedDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCustomVaccines();
      loadVaccineRecords();
    }, [])
  );

  const loadCustomVaccines = async () => {
    try {
      const stored = await AsyncStorage.getItem('customVaccines');
      if (stored) {
        const vaccines = JSON.parse(stored);
        vaccines.sort((a, b) => {
          const dateA = a.appliedDate || a.scheduledDate || '';
          const dateB = b.appliedDate || b.scheduledDate || '';
          return dateB.localeCompare(dateA);
        });
        setCustomVaccines(vaccines);
      }
    } catch (error) {
      console.error('Erro ao carregar vacinas customizadas:', error);
    }
  };

  const loadVaccineRecords = async () => {
    try {
      const stored = await AsyncStorage.getItem('vaccineRecords');
      if (stored) {
        setVaccineRecords(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erro ao carregar registros de vacinas:', error);
    }
  };

  const saveVaccineRecords = async (records) => {
    try {
      await AsyncStorage.setItem('vaccineRecords', JSON.stringify(records));
      setVaccineRecords(records);
    } catch (error) {
      console.error('Erro ao salvar registros de vacinas:', error);
      Alert.alert('Erro', 'Não foi possível salvar o registro.');
    }
  };

  const saveCustomVaccines = async (vaccines) => {
    try {
      await AsyncStorage.setItem('customVaccines', JSON.stringify(vaccines));
      setCustomVaccines(vaccines);
    } catch (error) {
      console.error('Erro ao salvar vacinas customizadas:', error);
      Alert.alert('Erro', 'Não foi possível salvar a vacina.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      status: VACCINE_STATUS.PENDING,
      scheduledDate: null,
      scheduledTime: null,
      appliedDate: null,
      dose: '',
      lot: '',
      manufacturer: '',
      location: '',
      professional: '',
      adverseReactions: '',
      notes: '',
    });
    setEditingVaccine(null);
    setEditingCalendarVaccine(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (vaccine) => {
    const scheduledDateTime = vaccine.scheduledDate ? new Date(vaccine.scheduledDate) : null;
    setFormData({
      name: vaccine.name || '',
      status: vaccine.status || VACCINE_STATUS.PENDING,
      scheduledDate: scheduledDateTime,
      scheduledTime: scheduledDateTime,
      appliedDate: vaccine.appliedDate ? new Date(vaccine.appliedDate) : null,
      dose: vaccine.dose || '',
      lot: vaccine.lot || '',
      manufacturer: vaccine.manufacturer || '',
      location: vaccine.location || '',
      professional: vaccine.professional || '',
      adverseReactions: vaccine.adverseReactions || '',
      notes: vaccine.notes || '',
    });
    setEditingVaccine(vaccine);
    setEditingCalendarVaccine(null);
    setShowAddModal(true);
  };

  const openCalendarVaccineModal = (vaccine) => {
    const record = vaccineRecords[vaccine.id] || {};
    const scheduledDateTime = record.scheduledDate ? new Date(record.scheduledDate) : null;
    setFormData({
      name: vaccine.vaccine || vaccine.name || '',
      status: record.status || VACCINE_STATUS.PENDING,
      scheduledDate: scheduledDateTime,
      scheduledTime: scheduledDateTime,
      appliedDate: record.appliedDate ? new Date(record.appliedDate) : null,
      dose: record.dose || vaccine.dose || '',
      lot: record.lot || '',
      manufacturer: record.manufacturer || '',
      location: record.location || '',
      professional: record.professional || '',
      adverseReactions: record.adverseReactions || '',
      notes: record.notes || '',
    });
    setEditingCalendarVaccine(vaccine);
    setEditingVaccine(null);
    setShowAddModal(true);
  };

  const handleSaveVaccine = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Atenção', 'Por favor, informe o nome da vacina.');
      return;
    }

    // Validações baseadas no status
    if (formData.status === VACCINE_STATUS.SCHEDULED && !formData.scheduledDate) {
      Alert.alert('Atenção', 'Por favor, informe a data de agendamento.');
      return;
    }

    if (formData.status === VACCINE_STATUS.APPLIED && !formData.appliedDate) {
      Alert.alert('Atenção', 'Por favor, informe a data de aplicação.');
      return;
    }

    // Se está editando uma vacina do calendário
    if (editingCalendarVaccine) {
      // Combinar data e hora do agendamento
      let scheduledDateTime = null;
      if (formData.scheduledDate) {
        scheduledDateTime = new Date(formData.scheduledDate);
        if (formData.scheduledTime) {
          scheduledDateTime.setHours(formData.scheduledTime.getHours());
          scheduledDateTime.setMinutes(formData.scheduledTime.getMinutes());
        }
      }

      const vaccineData = {
        status: formData.status,
        scheduledDate: scheduledDateTime ? scheduledDateTime.toISOString() : null,
        appliedDate: formData.appliedDate ? formData.appliedDate.toISOString() : null,
        dose: formData.dose.trim(),
        lot: formData.lot.trim(),
        manufacturer: formData.manufacturer.trim(),
        location: formData.location.trim(),
        professional: formData.professional.trim(),
        adverseReactions: formData.adverseReactions.trim(),
        notes: formData.notes.trim(),
        updatedAt: new Date().toISOString(),
      };

      const updated = { ...vaccineRecords, [editingCalendarVaccine.id]: vaccineData };
      saveVaccineRecords(updated);
      
      // Agendar alarmes se aplicada e tem periodicidade
      if (vaccineData.status === 'applied' && vaccineData.appliedDate && editingCalendarVaccine.frequency) {
        try {
          await scheduleVaccineAlarms(vaccineData, editingCalendarVaccine);
        } catch (error) {
          console.error('Erro ao agendar alarmes da vacina:', error);
        }
      } else {
        // Cancelar alarmes se não aplicada mais
        try {
          await cancelVaccineAlarms(editingCalendarVaccine.id);
        } catch (error) {
          console.error('Erro ao cancelar alarmes da vacina:', error);
        }
      }
      
      Alert.alert('Sucesso', 'Registro de vacina atualizado com sucesso!');
      resetForm();
      setShowAddModal(false);
      return;
    }

    // Se está editando/criando vacina customizada
    // Combinar data e hora do agendamento
    let scheduledDateTime = null;
    if (formData.scheduledDate) {
      scheduledDateTime = new Date(formData.scheduledDate);
      if (formData.scheduledTime) {
        scheduledDateTime.setHours(formData.scheduledTime.getHours());
        scheduledDateTime.setMinutes(formData.scheduledTime.getMinutes());
      }
    }

    const vaccineData = {
      id: editingVaccine ? editingVaccine.id : Date.now().toString(),
      name: formData.name.trim(),
      status: formData.status,
      scheduledDate: scheduledDateTime ? scheduledDateTime.toISOString() : null,
      appliedDate: formData.appliedDate ? formData.appliedDate.toISOString() : null,
      dose: formData.dose.trim(),
      lot: formData.lot.trim(),
      manufacturer: formData.manufacturer.trim(),
      location: formData.location.trim(),
      professional: formData.professional.trim(),
      adverseReactions: formData.adverseReactions.trim(),
      notes: formData.notes.trim(),
      createdAt: editingVaccine ? editingVaccine.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updated;
    if (editingVaccine) {
      updated = customVaccines.map(v => v.id === editingVaccine.id ? vaccineData : v);
      Alert.alert('Sucesso', 'Vacina atualizada com sucesso!');
    } else {
      updated = [...customVaccines, vaccineData];
      Alert.alert('Sucesso', 'Vacina adicionada com sucesso!');
    }

    saveCustomVaccines(updated);
    resetForm();
    setShowAddModal(false);
  };

  const handleDeleteVaccine = (id) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta vacina?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            const updated = customVaccines.filter(v => v.id !== id);
            saveCustomVaccines(updated);
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getNextVaccineDate = (vaccine, record) => {
    if (!record || record.status !== 'applied' || !record.appliedDate || !vaccine.frequency) {
      return null;
    }
    return calculateNextVaccineDate(vaccine.frequency, record.appliedDate);
  };

  const getNextVaccineDateColor = (nextDate) => {
    if (!nextDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(nextDate);
    next.setHours(0, 0, 0, 0);
    const diffTime = next - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return '#FF6B6B'; // Vermelho: hoje ou atrasada
    } else if (diffDays <= 30) {
      return '#F39C12'; // Amarelo: menos de 30 dias
    }
    return null; // Sem cor especial
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case VACCINE_STATUS.SCHEDULED:
        return { label: 'Agendada', color: '#F39C12', icon: 'calendar-outline' };
      case VACCINE_STATUS.APPLIED:
        return { label: 'Aplicada', color: '#2ECC71', icon: 'checkmark-circle' };
      case VACCINE_STATUS.PENDING:
      default:
        return { label: 'Pendente', color: '#95A5A6', icon: 'time-outline' };
    }
  };

  const filteredVaccines = filterStatus === 'all' 
    ? customVaccines 
    : customVaccines.filter(v => v.status === filterStatus);

  const renderVaccineCard = (vaccine, isCustom = false) => {
    // Se é vacina do calendário, verificar se tem registro
    if (!isCustom && vaccine.id) {
      const record = vaccineRecords[vaccine.id];
      const statusInfo = record ? getStatusInfo(record.status) : null;
      const nextDate = getNextVaccineDate(vaccine, record);
      const nextDateColor = getNextVaccineDateColor(nextDate);
      
      return (
        <TouchableOpacity
          key={vaccine.id}
          style={[
            styles.vaccineCard, 
            record && styles.vaccineCardWithRecord,
            nextDateColor && { borderLeftColor: nextDateColor }
          ]}
          onPress={() => openCalendarVaccineModal(vaccine)}
          activeOpacity={0.7}
        >
          <View style={styles.vaccineHeader}>
            <View style={styles.vaccineInfo}>
              <View style={styles.vaccineTitleRow}>
                <Text style={styles.vaccineName}>{vaccine.vaccine || vaccine.name}</Text>
                {statusInfo && (
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                    <Ionicons name={statusInfo.icon} size={14} color="#fff" />
                    <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
                  </View>
                )}
              </View>
              {vaccine.age && <Text style={styles.vaccineAge}>Idade: {vaccine.age}</Text>}
              {record?.dose && <Text style={styles.vaccineDose}>Dose: {record.dose}</Text>}
              {!record?.dose && vaccine.dose && <Text style={styles.vaccineDose}>Dose: {vaccine.dose}</Text>}
              {record?.scheduledDate && (
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={16} color="#F39C12" />
                  <Text style={styles.vaccineDate}>
                    Agendada para: {formatDateTime(record.scheduledDate)}
                  </Text>
                </View>
              )}
              {record?.appliedDate && (
                <View style={styles.dateRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#2ECC71" />
                  <Text style={styles.vaccineDateApplied}>Aplicada em: {formatDate(record.appliedDate)}</Text>
                </View>
              )}
              {nextDate && (
                <View style={styles.dateRow}>
                  <Ionicons 
                    name="alarm-outline" 
                    size={16} 
                    color={nextDateColor || '#3498DB'} 
                  />
                  <Text style={[styles.nextVaccineDate, nextDateColor && { color: nextDateColor, fontWeight: 'bold' }]}>
                    Próxima dose: {formatDate(nextDate.toISOString())}
                    {nextDateColor === '#FF6B6B' && ' ⚠️ URGENTE'}
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </View>
          {vaccine.diseases && (
            <Text style={styles.vaccineDiseases}>Protege contra: {vaccine.diseases}</Text>
          )}
          {vaccine.description && (
            <Text style={styles.vaccineDiseases}>{vaccine.description}</Text>
          )}
          {vaccine.frequency && (
            <Text style={styles.vaccineFrequency}>Frequência: {vaccine.frequency}</Text>
          )}
          {record && (
            <View style={styles.tapHint}>
              <Ionicons name="information-circle-outline" size={14} color="#3498DB" />
              <Text style={styles.tapHintText}>Toque para ver/editar registro completo</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // Vacinas customizadas
    if (isCustom) {
      const statusInfo = getStatusInfo(vaccine.status);
      
      return (
        <View key={vaccine.id} style={[styles.vaccineCard, styles.customVaccineCard]}>
          <View style={styles.vaccineHeader}>
            <View style={styles.vaccineInfo}>
              <View style={styles.vaccineTitleRow}>
                <Text style={styles.vaccineName}>{vaccine.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                  <Ionicons name={statusInfo.icon} size={14} color="#fff" />
                  <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
                </View>
              </View>
              
              {vaccine.dose && (
                <Text style={styles.vaccineDose}>Dose: {vaccine.dose}</Text>
              )}
              
              {vaccine.status === VACCINE_STATUS.SCHEDULED && vaccine.scheduledDate && (
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={16} color="#F39C12" />
                  <Text style={styles.vaccineDate}>Agendada para: {formatDate(vaccine.scheduledDate)}</Text>
                </View>
              )}
              
              {vaccine.status === VACCINE_STATUS.APPLIED && vaccine.appliedDate && (
                <View style={styles.dateRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#2ECC71" />
                  <Text style={styles.vaccineDateApplied}>Aplicada em: {formatDate(vaccine.appliedDate)}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.vaccineActions}>
              <TouchableOpacity
                onPress={() => openEditModal(vaccine)}
                style={styles.editButton}
              >
                <Ionicons name="create-outline" size={20} color="#3498DB" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteVaccine(vaccine.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </View>
          
          {vaccine.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Observações:</Text>
              <Text style={styles.vaccineNotes}>{vaccine.notes}</Text>
            </View>
          )}
        </View>
      );
    }

    // Fallback para vacinas sem ID (não deve acontecer)
    return (
      <View key={`${vaccine.age}-${vaccine.vaccine}`} style={styles.vaccineCard}>
        <View style={styles.vaccineHeader}>
          <View style={styles.vaccineInfo}>
            <Text style={styles.vaccineName}>{vaccine.vaccine || vaccine.name}</Text>
            {vaccine.age && <Text style={styles.vaccineAge}>Idade: {vaccine.age}</Text>}
            {vaccine.dose && <Text style={styles.vaccineDose}>Dose: {vaccine.dose}</Text>}
          </View>
        </View>
        {vaccine.diseases && (
          <Text style={styles.vaccineDiseases}>Protege contra: {vaccine.diseases}</Text>
        )}
        {vaccine.description && (
          <Text style={styles.vaccineDiseases}>{vaccine.description}</Text>
        )}
        {vaccine.frequency && (
          <Text style={styles.vaccineFrequency}>Frequência: {vaccine.frequency}</Text>
        )}
      </View>
    );
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
          <Ionicons name="arrow-back" size={32} color="#2ECC71" />
        </TouchableOpacity>
        <Text style={styles.title}>Calendário de Vacinas</Text>
      </View>

      <View style={styles.content}>
        {/* Calendário Nacional */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={28} color="#2ECC71" />
            <Text style={styles.sectionTitle}>Calendário Nacional de Vacinação</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Toque em uma vacina para registrar informações da carteira de vacinação.
          </Text>
          <View style={styles.vaccinesList}>
            {NATIONAL_VACCINE_CALENDAR.map(vaccine => renderVaccineCard(vaccine))}
          </View>
        </View>

        {/* Vacinas Recomendadas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={28} color="#F39C12" />
            <Text style={styles.sectionTitle}>Outras Vacinas Recomendadas</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Toque em uma vacina para registrar informações da carteira de vacinação.
          </Text>
          <View style={styles.vaccinesList}>
            {RECOMMENDED_VACCINES.map((vaccine) => renderVaccineCard(vaccine))}
          </View>
        </View>

        {/* Minhas Vacinas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="add-circle" size={28} color="#3498DB" />
            <Text style={styles.sectionTitle}>Minhas Vacinas</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={openAddModal}
          >
            <Ionicons name="add-circle" size={32} color="#fff" />
            <Text style={styles.addButtonText}>Adicionar Vacina</Text>
          </TouchableOpacity>

          {/* Filtros */}
          {customVaccines.length > 0 && (
            <View style={styles.filtersContainer}>
              <Text style={styles.filtersLabel}>Filtrar por status:</Text>
              <View style={styles.filtersRow}>
                <TouchableOpacity
                  style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
                  onPress={() => setFilterStatus('all')}
                >
                  <Text style={[styles.filterButtonText, filterStatus === 'all' && styles.filterButtonTextActive]}>
                    Todas
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, filterStatus === VACCINE_STATUS.SCHEDULED && styles.filterButtonActive]}
                  onPress={() => setFilterStatus(VACCINE_STATUS.SCHEDULED)}
                >
                  <Text style={[styles.filterButtonText, filterStatus === VACCINE_STATUS.SCHEDULED && styles.filterButtonTextActive]}>
                    Agendadas
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, filterStatus === VACCINE_STATUS.APPLIED && styles.filterButtonActive]}
                  onPress={() => setFilterStatus(VACCINE_STATUS.APPLIED)}
                >
                  <Text style={[styles.filterButtonText, filterStatus === VACCINE_STATUS.APPLIED && styles.filterButtonTextActive]}>
                    Aplicadas
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, filterStatus === VACCINE_STATUS.PENDING && styles.filterButtonActive]}
                  onPress={() => setFilterStatus(VACCINE_STATUS.PENDING)}
                >
                  <Text style={[styles.filterButtonText, filterStatus === VACCINE_STATUS.PENDING && styles.filterButtonTextActive]}>
                    Pendentes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {filteredVaccines.length > 0 ? (
            <View style={styles.vaccinesList}>
              {filteredVaccines.map(vaccine => renderVaccineCard(vaccine, true))}
            </View>
          ) : customVaccines.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nenhuma vacina personalizada adicionada</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="filter-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nenhuma vacina encontrada com este filtro</Text>
            </View>
          )}
        </View>
      </View>

      {/* Modal para adicionar/editar vacina */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          resetForm();
          setShowAddModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCalendarVaccine 
                  ? `Registro: ${editingCalendarVaccine.vaccine || editingCalendarVaccine.name}`
                  : editingVaccine 
                    ? 'Editar Vacina' 
                    : 'Adicionar Vacina'}
              </Text>
              <TouchableOpacity onPress={() => {
                resetForm();
                setShowAddModal(false);
              }}>
                <Ionicons name="close" size={32} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome da Vacina *</Text>
                <TextInput
                  style={[styles.input, editingCalendarVaccine && styles.inputDisabled]}
                  placeholder="Ex: Gripe, Hepatite A, COVID-19, etc."
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  editable={!editingCalendarVaccine}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Status *</Text>
                <View style={styles.statusButtons}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      formData.status === VACCINE_STATUS.PENDING && styles.statusButtonActive,
                      { borderColor: '#95A5A6' }
                    ]}
                    onPress={() => setFormData({ ...formData, status: VACCINE_STATUS.PENDING })}
                  >
                    <Ionicons name="time-outline" size={20} color={formData.status === VACCINE_STATUS.PENDING ? '#fff' : '#95A5A6'} />
                    <Text style={[
                      styles.statusButtonText,
                      formData.status === VACCINE_STATUS.PENDING && styles.statusButtonTextActive
                    ]}>
                      Pendente
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      formData.status === VACCINE_STATUS.SCHEDULED && styles.statusButtonActive,
                      { borderColor: '#F39C12' }
                    ]}
                    onPress={() => setFormData({ ...formData, status: VACCINE_STATUS.SCHEDULED })}
                  >
                    <Ionicons name="calendar-outline" size={20} color={formData.status === VACCINE_STATUS.SCHEDULED ? '#fff' : '#F39C12'} />
                    <Text style={[
                      styles.statusButtonText,
                      formData.status === VACCINE_STATUS.SCHEDULED && styles.statusButtonTextActive
                    ]}>
                      Agendada
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      formData.status === VACCINE_STATUS.APPLIED && styles.statusButtonActive,
                      { borderColor: '#2ECC71' }
                    ]}
                    onPress={() => setFormData({ ...formData, status: VACCINE_STATUS.APPLIED })}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={formData.status === VACCINE_STATUS.APPLIED ? '#fff' : '#2ECC71'} />
                    <Text style={[
                      styles.statusButtonText,
                      formData.status === VACCINE_STATUS.APPLIED && styles.statusButtonTextActive
                    ]}>
                      Aplicada
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {formData.status === VACCINE_STATUS.SCHEDULED && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Data de Agendamento *</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowScheduledDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#F39C12" />
                      <Text style={styles.dateButtonText}>
                        {formData.scheduledDate 
                          ? formatDate(formData.scheduledDate.toISOString())
                          : 'Selecione a data'}
                      </Text>
                    </TouchableOpacity>
                    {showScheduledDatePicker && (
                      <DateTimePicker
                        value={formData.scheduledDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedDate) => {
                          setShowScheduledDatePicker(Platform.OS === 'ios');
                          if (selectedDate) {
                            setFormData({ ...formData, scheduledDate: selectedDate });
                          }
                        }}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Hora do Agendamento</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowScheduledTimePicker(true)}
                    >
                      <Ionicons name="time-outline" size={20} color="#F39C12" />
                      <Text style={styles.dateButtonText}>
                        {formData.scheduledTime 
                          ? formData.scheduledTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          : 'Selecione a hora'}
                      </Text>
                    </TouchableOpacity>
                    {showScheduledTimePicker && (
                      <DateTimePicker
                        value={formData.scheduledTime || new Date()}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedTime) => {
                          setShowScheduledTimePicker(Platform.OS === 'ios');
                          if (selectedTime) {
                            setFormData({ ...formData, scheduledTime: selectedTime });
                          }
                        }}
                      />
                    )}
                  </View>
                </>
              )}

              {formData.status === VACCINE_STATUS.APPLIED && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Data de Aplicação *</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowAppliedDatePicker(true)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                      <Text style={styles.dateButtonText}>
                        {formData.appliedDate 
                          ? formatDate(formData.appliedDate.toISOString())
                          : 'Selecione a data'}
                      </Text>
                    </TouchableOpacity>
                    {showAppliedDatePicker && (
                      <DateTimePicker
                        value={formData.appliedDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, selectedDate) => {
                          setShowAppliedDatePicker(Platform.OS === 'ios');
                          if (selectedDate) {
                            setFormData({ ...formData, appliedDate: selectedDate });
                          }
                        }}
                        maximumDate={new Date()}
                      />
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Lote da Vacina</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: L123456"
                      value={formData.lot}
                      onChangeText={(text) => setFormData({ ...formData, lot: text })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Fabricante</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Butantan, Fiocruz, Pfizer, etc."
                      value={formData.manufacturer}
                      onChangeText={(text) => setFormData({ ...formData, manufacturer: text })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Local de Aplicação</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Posto de Saúde Central, Clínica XYZ, etc."
                      value={formData.location}
                      onChangeText={(text) => setFormData({ ...formData, location: text })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Profissional que Aplicou</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Dr. João Silva, Enf. Maria Santos"
                      value={formData.professional}
                      onChangeText={(text) => setFormData({ ...formData, professional: text })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Reações Adversas</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Descreva qualquer reação adversa observada (febre, dor no local, etc.)"
                      value={formData.adverseReactions}
                      onChangeText={(text) => setFormData({ ...formData, adverseReactions: text })}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dose</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 1ª dose, 2ª dose, reforço, dose única"
                  value={formData.dose}
                  onChangeText={(text) => setFormData({ ...formData, dose: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Observações</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Informações adicionais sobre a vacina"
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  resetForm();
                  setShowAddModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveVaccine}
              >
                <Text style={styles.saveButtonText}>
                  {editingVaccine || editingCalendarVaccine ? 'Atualizar' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    marginLeft: -8,
    marginTop: Platform.OS === 'ios' ? -8 : Platform.OS === 'android' ? -8 : 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  vaccinesList: {
    gap: 12,
  },
  vaccineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vaccineCardWithRecord: {
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
  },
  customVaccineCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3498DB',
  },
  vaccineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  vaccineInfo: {
    flex: 1,
  },
  vaccineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  vaccineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  vaccineAge: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  vaccineDose: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  vaccineDate: {
    fontSize: 14,
    color: '#F39C12',
    fontWeight: '600',
  },
  vaccineDateApplied: {
    fontSize: 14,
    color: '#2ECC71',
    fontWeight: '600',
  },
  nextVaccineDate: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '600',
  },
  vaccineDiseases: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  vaccineFrequency: {
    fontSize: 14,
    color: '#F39C12',
    fontWeight: '600',
    marginTop: 4,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 6,
  },
  tapHintText: {
    fontSize: 12,
    color: '#3498DB',
    fontStyle: 'italic',
  },
  vaccineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  vaccineNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#2ECC71',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  filtersContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  filtersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#fff',
    gap: 6,
  },
  statusButtonActive: {
    backgroundColor: '#3498DB',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2ECC71',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
