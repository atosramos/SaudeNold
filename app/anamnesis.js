import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não sei'];

const commonConditions = [
  'Pressão Alta (Hipertensão)',
  'Pressão Baixa (Hipotensão)',
  'Diabetes',
  'Eclampsia',
  'Asma',
  'Bronquite',
  'Problemas Cardíacos',
  'Problemas Renais',
  'Problemas Hepáticos',
  'Alergia a Medicamentos',
  'Outro',
];

export default function Anamnesis() {
  const router = useRouter();
  // Dados pessoais
  const [birthDate, setBirthDate] = useState(null);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [isPregnant, setIsPregnant] = useState(null);
  
  // Calcular idade a partir da data de nascimento
  const calculateAge = (date) => {
    if (!date) return null;
    try {
      const today = new Date();
      const birth = new Date(date);
      // Verificar se a data é válida
      if (isNaN(birth.getTime())) return null;
      
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    } catch (error) {
      console.error('Erro ao calcular idade:', error);
      return null;
    }
  };
  
  const age = birthDate ? calculateAge(birthDate) : null;
  // Tipo sanguíneo
  const [bloodType, setBloodType] = useState('');
  // Alergias
  const [allergies, setAllergies] = useState([]);
  const [newAllergy, setNewAllergy] = useState('');
  // Cirurgias
  const [surgeries, setSurgeries] = useState([]);
  // Condições médicas
  const [conditions, setConditions] = useState([]);
  const [customConditions, setCustomConditions] = useState([]);
  const [newCustomCondition, setNewCustomCondition] = useState('');
  const [showCustomConditionForm, setShowCustomConditionForm] = useState(false);
  // Hábitos de vida
  const [smoking, setSmoking] = useState('');
  const [alcohol, setAlcohol] = useState('');
  const [physicalActivity, setPhysicalActivity] = useState('');
  // Antecedentes familiares
  const [familyHistory, setFamilyHistory] = useState([]);
  const [newFamilyHistory, setNewFamilyHistory] = useState('');
  const [showFamilyHistoryForm, setShowFamilyHistoryForm] = useState(false);
  // Medicamentos em uso
  const [currentMedications, setCurrentMedications] = useState([]);
  const [medicationsList, setMedicationsList] = useState([]); // Lista completa de medicamentos para buscar IDs
  // Revisão de sistemas
  const [systemReview, setSystemReview] = useState({
    cardiovascular: '',
    respiratory: '',
    digestive: '',
    urinary: '',
    neurological: '',
    dermatological: '',
    endocrine: '',
    musculoskeletal: '',
  });
  // Observações gerais
  const [observations, setObservations] = useState('');
  const [editing, setEditing] = useState(true);
  
  // Estados para accordion (seções expansíveis)
  const [expandedSections, setExpandedSections] = useState({
    personalData: true,
    bloodType: false,
    allergies: false,
    surgeries: false,
    conditions: false,
    habits: false,
    familyHistory: false,
    medications: false,
    systemReview: false,
    observations: false,
  });
  
  // Função para alternar expansão de seção
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Estados para nova cirurgia
  const [newSurgery, setNewSurgery] = useState({
    type: '',
    date: new Date(),
    notes: '',
  });
  const [showSurgeryDatePicker, setShowSurgeryDatePicker] = useState(false);
  const [showNewSurgeryForm, setShowNewSurgeryForm] = useState(false);
  
  // Estados para dropdowns de hábitos
  const [showSmokingDropdown, setShowSmokingDropdown] = useState(false);
  const [showAlcoholDropdown, setShowAlcoholDropdown] = useState(false);
  const [showPhysicalActivityDropdown, setShowPhysicalActivityDropdown] = useState(false);
  
  const smokingOptions = ['Não fuma', 'Ex-fumante', 'Fumante'];
  const alcoholOptions = ['Não bebe', 'Socialmente', 'Regularmente'];
  const physicalActivityOptions = ['Sedentário', 'Leve', 'Moderada', 'Intensa'];

  useFocusEffect(
    useCallback(() => {
      loadAnamnesis();
    }, [])
  );

  const loadAnamnesis = async () => {
    try {
      const stored = await AsyncStorage.getItem('anamnesis');
      let savedMedications = [];
      
      if (stored) {
        const data = JSON.parse(stored);
        // Suportar tanto data de nascimento quanto idade (para compatibilidade)
        if (data.birthDate) {
          setBirthDate(new Date(data.birthDate));
        } else if (data.age) {
          // Se tiver apenas idade, estimar data de nascimento (aproximada)
          const today = new Date();
          const estimatedYear = today.getFullYear() - parseInt(data.age) || 0;
          setBirthDate(new Date(estimatedYear, today.getMonth(), today.getDate()));
        }
        setGender(data.gender || '');
        setIsPregnant(data.isPregnant !== undefined ? data.isPregnant : null);
        setBloodType(data.bloodType || '');
        setAllergies(data.allergies || []);
        setSurgeries(data.surgeries || []);
        setConditions(data.conditions || []);
        setCustomConditions(data.customConditions || []);
        setSmoking(data.smoking || '');
        setAlcohol(data.alcohol || '');
        setPhysicalActivity(data.physicalActivity || '');
        setFamilyHistory(data.familyHistory || []);
        savedMedications = data.currentMedications || [];
        setSystemReview(data.systemReview || {
          cardiovascular: '',
          respiratory: '',
          digestive: '',
          urinary: '',
          neurological: '',
          dermatological: '',
          endocrine: '',
          musculoskeletal: '',
        });
        setObservations(data.observations || '');
      }

      // Carregar medicamentos de "Meus Medicamentos" e sincronizar
      try {
        const medicationsStored = await AsyncStorage.getItem('medications');
        if (medicationsStored) {
          const medications = JSON.parse(medicationsStored);
          setMedicationsList(medications); // Salvar lista completa para buscar IDs
          
          // Converter medicamentos para formato de string (nome + dosagem)
          const medicationsFromList = medications.map(med => {
            const name = med.name || '';
            const dosage = med.dosage || '';
            return dosage ? `${name} ${dosage}`.trim() : name;
          }).filter(med => med); // Remove strings vazias

          // Combinar medicamentos salvos na anamnese com os da lista de medicamentos
          // Evitar duplicatas
          const allMedications = [...savedMedications];
          medicationsFromList.forEach(med => {
            if (!allMedications.includes(med)) {
              allMedications.push(med);
            }
          });

          setCurrentMedications(allMedications);
        } else {
          // Se não há medicamentos na lista, usar apenas os salvos na anamnese
          setCurrentMedications(savedMedications);
          setMedicationsList([]);
        }
      } catch (error) {
        console.error('Erro ao carregar medicamentos:', error);
        // Em caso de erro, usar apenas os medicamentos salvos na anamnese
        setCurrentMedications(savedMedications);
        setMedicationsList([]);
      }
    } catch (error) {
      console.error('Erro ao carregar anamnese:', error);
    }
  };

  const saveAnamnesis = async () => {
    try {
      const anamnesisData = {
        birthDate: birthDate ? birthDate.toISOString() : null,
        age: age !== null && age !== undefined ? age : null, // Manter idade calculada para compatibilidade
        gender,
        isPregnant: gender === 'Feminino' ? isPregnant : null,
        bloodType,
        allergies,
        surgeries,
        conditions,
        customConditions,
        smoking,
        alcohol,
        physicalActivity,
        familyHistory,
        currentMedications,
        systemReview,
        observations: observations.trim(),
        lastUpdated: new Date().toISOString(),
      };

      await AsyncStorage.setItem('anamnesis', JSON.stringify(anamnesisData));
      Alert.alert('Sucesso', 'Ficha de anamnese salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar anamnese:', error);
      Alert.alert('Erro', 'Não foi possível salvar a ficha de anamnese');
    }
  };

  const addAllergy = () => {
    if (!newAllergy.trim()) {
      Alert.alert('Erro', 'Por favor, digite o nome da alergia');
      return;
    }

    if (allergies.includes(newAllergy.trim())) {
      Alert.alert('Aviso', 'Esta alergia já está cadastrada');
      return;
    }

    setAllergies([...allergies, newAllergy.trim()]);
    setNewAllergy('');
  };

  const removeAllergy = (allergy) => {
    setAllergies(allergies.filter(a => a !== allergy));
  };

  const addSurgery = () => {
    if (!newSurgery.type.trim()) {
      Alert.alert('Erro', 'Por favor, digite o tipo de cirurgia');
      return;
    }

    const surgery = {
      id: Date.now().toString(),
      type: newSurgery.type.trim(),
      date: newSurgery.date.toISOString(),
      notes: newSurgery.notes.trim(),
    };

    setSurgeries([...surgeries, surgery]);
    setNewSurgery({ type: '', date: new Date(), notes: '' });
    setShowNewSurgeryForm(false);
  };

  const removeSurgery = (surgeryId) => {
    Alert.alert(
      'Confirmar',
      'Deseja remover esta cirurgia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => setSurgeries(surgeries.filter(s => s.id !== surgeryId)),
        },
      ]
    );
  };

  const toggleCondition = (condition) => {
    if (condition === 'Outro') {
      // Se clicou em "Outro", mostrar formulário para adicionar condição customizada
      setShowCustomConditionForm(true);
      // Não adicionar "Outro" à lista, apenas mostrar o formulário
      return;
    }
    
    if (conditions.includes(condition)) {
      setConditions(conditions.filter(c => c !== condition));
    } else {
      setConditions([...conditions, condition]);
    }
  };

  const addCustomCondition = () => {
    if (!newCustomCondition.trim()) {
      Alert.alert('Erro', 'Por favor, digite a condição');
      return;
    }

    if (customConditions.includes(newCustomCondition.trim())) {
      Alert.alert('Aviso', 'Esta condição já está cadastrada');
      return;
    }

    setCustomConditions([...customConditions, newCustomCondition.trim()]);
    setNewCustomCondition('');
    setShowCustomConditionForm(false);
  };

  const removeCustomCondition = (condition) => {
    setCustomConditions(customConditions.filter(c => c !== condition));
  };

  const addFamilyHistory = () => {
    if (!newFamilyHistory.trim()) {
      Alert.alert('Erro', 'Por favor, digite o histórico familiar');
      return;
    }

    if (familyHistory.includes(newFamilyHistory.trim())) {
      Alert.alert('Aviso', 'Este histórico já está cadastrado');
      return;
    }

    setFamilyHistory([...familyHistory, newFamilyHistory.trim()]);
    setNewFamilyHistory('');
    setShowFamilyHistoryForm(false);
  };

  const removeFamilyHistory = (history) => {
    setFamilyHistory(familyHistory.filter(h => h !== history));
  };

  // Buscar ID do medicamento pelo nome
  const findMedicationId = (medicationName) => {
    const med = medicationsList.find(m => {
      const name = m.name || '';
      const dosage = m.dosage || '';
      const fullName = dosage ? `${name} ${dosage}`.trim() : name;
      return fullName === medicationName || name === medicationName;
    });
    return med?.id;
  };
  
  // Navegar para detalhes do medicamento
  const openMedicationDetails = (medicationName) => {
    const medicationId = findMedicationId(medicationName);
    if (medicationId) {
      router.push({
        pathname: '/medications/[id]',
        params: { id: medicationId.toString() }
      });
    } else {
      Alert.alert('Aviso', 'Medicamento não encontrado na lista de "Meus Medicamentos"');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
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
        <Text style={styles.title}>Ficha de Anamnese</Text>
      </View>

      <View style={styles.form}>
        {/* Dados Pessoais */}
        <View style={styles.inputGroup}>
          <TouchableOpacity 
            style={styles.sectionHeaderButton}
            onPress={() => toggleSection('personalData')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons 
                name={expandedSections.personalData ? "chevron-down" : "chevron-forward"} 
                size={24} 
                color="#4ECDC4" 
              />
              <Text style={styles.label}>Dados Pessoais</Text>
            </View>
          </TouchableOpacity>
          {expandedSections.personalData && editing ? (
            <View style={styles.personalDataContainer}>
              <View style={styles.personalDataRow}>
                <Text style={styles.personalDataLabel}>Data de Nascimento:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowBirthDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={24} color="#4ECDC4" />
                  <Text style={styles.dateButtonText}>
                    {birthDate ? formatDate(birthDate.toISOString()) : 'Selecione a data'}
                  </Text>
                </TouchableOpacity>
                {showBirthDatePicker && (
                  <DateTimePicker
                    value={birthDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShowBirthDatePicker(false);
                      if (selectedDate) {
                        setBirthDate(selectedDate);
                      }
                    }}
                  />
                )}
                {age !== null && age !== undefined && (
                  <Text style={styles.ageDisplay}>
                    Idade: {age} {age === 1 ? 'ano' : 'anos'}
                  </Text>
                )}
              </View>
              {/* Mostrar status de gestação se for feminino */}
              {gender === 'Feminino' && isPregnant !== null && (
                <View style={styles.pregnancyStatusContainer}>
                  <Ionicons 
                    name={isPregnant ? "checkmark-circle" : "close-circle"} 
                    size={24} 
                    color={isPregnant ? "#2ECC71" : "#E74C3C"} 
                  />
                  <Text style={styles.pregnancyStatusText}>
                    {isPregnant ? 'Em período de gestação' : 'Não está em período de gestação'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Alterar Status',
                        'Você está em período de gestação?',
                        [
                          {
                            text: 'Não',
                            onPress: () => setIsPregnant(false),
                          },
                          {
                            text: 'Sim',
                            onPress: () => setIsPregnant(true),
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#4ECDC4" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.personalDataRow}>
                <Text style={styles.personalDataLabel}>Sexo:</Text>
                <View style={styles.genderContainer}>
                  {['Masculino', 'Feminino'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderButton,
                        gender === g && styles.genderButtonActive
                      ]}
                      onPress={() => {
                        setGender(g);
                        // Se mudou para Feminino e ainda não foi perguntado, perguntar sobre gestação
                        if (g === 'Feminino' && isPregnant === null) {
                          Alert.alert(
                            'Informação Importante',
                            'Você está em período de gestação?',
                            [
                              {
                                text: 'Não',
                                onPress: () => setIsPregnant(false),
                              },
                              {
                                text: 'Sim',
                                onPress: () => setIsPregnant(true),
                              },
                            ]
                          );
                        } else if (g === 'Masculino') {
                          // Se mudou para Masculino, limpar informação de gestação
                          setIsPregnant(null);
                        }
                      }}
                    >
                      <Text style={[
                        styles.genderText,
                        gender === g && styles.genderTextActive
                      ]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : expandedSections.personalData ? (
            <View style={styles.displayValue}>
              <Text style={styles.displayText}>
                {birthDate ? `Data de Nascimento: ${formatDate(birthDate.toISOString())}${age !== null && age !== undefined ? ` (${age} ${age === 1 ? 'ano' : 'anos'})` : ''}` : 'Data de nascimento não informada'} | {gender || 'Sexo não informado'}
                {gender === 'Feminino' && isPregnant !== null && (
                  ` | ${isPregnant ? 'Grávida' : 'Não grávida'}`
                )}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Tipo Sanguíneo */}
        <View style={styles.inputGroup}>
          <TouchableOpacity 
            style={styles.sectionHeaderButton}
            onPress={() => toggleSection('bloodType')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons 
                name={expandedSections.bloodType ? "chevron-down" : "chevron-forward"} 
                size={24} 
                color="#4ECDC4" 
              />
              <Text style={styles.label}>Tipo Sanguíneo *</Text>
            </View>
          </TouchableOpacity>
          {expandedSections.bloodType && editing ? (
            <View style={styles.bloodTypeContainer}>
              {bloodTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.bloodTypeButton,
                    bloodType === type && styles.bloodTypeButtonActive
                  ]}
                  onPress={() => setBloodType(type)}
                >
                  <Text style={[
                    styles.bloodTypeText,
                    bloodType === type && styles.bloodTypeTextActive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : expandedSections.bloodType ? (
            <View style={styles.displayValue}>
              <Text style={styles.displayText}>{bloodType || 'Não informado'}</Text>
            </View>
          ) : null}
        </View>

        {/* Alergias */}
        <View style={styles.inputGroup}>
          <TouchableOpacity 
            style={styles.sectionHeaderButton}
            onPress={() => toggleSection('allergies')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons 
                name={expandedSections.allergies ? "chevron-down" : "chevron-forward"} 
                size={24} 
                color="#4ECDC4" 
              />
              <Text style={styles.label}>Alergias Conhecidas</Text>
            </View>
          </TouchableOpacity>
          {expandedSections.allergies && editing && (
            <View style={styles.addAllergyContainer}>
              <TextInput
                style={styles.addAllergyInput}
                value={newAllergy}
                onChangeText={setNewAllergy}
                placeholder="Ex: Penicilina, Amendoim..."
                placeholderTextColor="#999"
                onSubmitEditing={addAllergy}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={addAllergy}
              >
                <Ionicons name="add-circle" size={32} color="#4ECDC4" />
              </TouchableOpacity>
            </View>
          )}
          {expandedSections.allergies && allergies.length > 0 ? (
            <View style={styles.listContainer}>
              {allergies.map((allergy, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>{allergy}</Text>
                  {editing && (
                    <TouchableOpacity onPress={() => removeAllergy(allergy)}>
                      <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ) : expandedSections.allergies ? (
            <Text style={styles.emptyText}>Nenhuma alergia cadastrada</Text>
          ) : null}
        </View>

        {/* Cirurgias */}
        <View style={styles.inputGroup}>
          <TouchableOpacity 
            style={styles.sectionHeaderButton}
            onPress={() => toggleSection('surgeries')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons 
                name={expandedSections.surgeries ? "chevron-down" : "chevron-forward"} 
                size={24} 
                color="#4ECDC4" 
              />
              <Text style={styles.label}>Cirurgias Realizadas</Text>
            </View>
          </TouchableOpacity>
          {expandedSections.surgeries && editing && (
            <>
              {!showNewSurgeryForm ? (
                <TouchableOpacity
                  style={styles.addSurgeryButton}
                  onPress={() => setShowNewSurgeryForm(true)}
                >
                  <Ionicons name="add-circle" size={28} color="#4ECDC4" />
                  <Text style={styles.addSurgeryButtonText}>Adicionar Cirurgia</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.surgeryForm}>
                  <TextInput
                    style={styles.input}
                    value={newSurgery.type}
                    onChangeText={(text) => setNewSurgery({ ...newSurgery, type: text })}
                    placeholder="Tipo de cirurgia (Ex: Apendicectomia)"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowSurgeryDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={24} color="#4ECDC4" />
                    <Text style={styles.dateButtonText}>
                      Data: {formatDate(newSurgery.date.toISOString())}
                    </Text>
                  </TouchableOpacity>
                  {showSurgeryDatePicker && (
                    <DateTimePicker
                      value={newSurgery.date}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        setShowSurgeryDatePicker(false);
                        if (selectedDate) {
                          setNewSurgery({ ...newSurgery, date: selectedDate });
                        }
                      }}
                    />
                  )}
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newSurgery.notes}
                    onChangeText={(text) => setNewSurgery({ ...newSurgery, notes: text })}
                    placeholder="Observações sobre a cirurgia..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.surgeryFormButtons}>
                    <TouchableOpacity
                      style={[styles.surgeryFormButton, styles.cancelButton]}
                      onPress={() => {
                        setShowNewSurgeryForm(false);
                        setNewSurgery({ type: '', date: new Date(), notes: '' });
                      }}
                    >
                      <Text style={styles.surgeryFormButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.surgeryFormButton, styles.saveButton]}
                      onPress={addSurgery}
                    >
                      <Text style={styles.surgeryFormButtonText}>Salvar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
          {expandedSections.surgeries && surgeries.length > 0 ? (
            <View style={styles.listContainer}>
              {surgeries.map((surgery) => (
                <View key={surgery.id} style={styles.surgeryItem}>
                  <View style={styles.surgeryItemContent}>
                    <Text style={styles.surgeryItemTitle}>{surgery.type}</Text>
                    <Text style={styles.surgeryItemDate}>
                      Data: {formatDate(surgery.date)}
                    </Text>
                    {surgery.notes && (
                      <Text style={styles.surgeryItemNotes}>{surgery.notes}</Text>
                    )}
                  </View>
                  {editing && (
                    <TouchableOpacity onPress={() => removeSurgery(surgery.id)}>
                      <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ) : expandedSections.surgeries ? (
            <Text style={styles.emptyText}>Nenhuma cirurgia cadastrada</Text>
          ) : null}
        </View>

        {/* Condições Médicas */}
        <View style={styles.inputGroup}>
          <TouchableOpacity 
            style={styles.sectionHeaderButton}
            onPress={() => toggleSection('conditions')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons 
                name={expandedSections.conditions ? "chevron-down" : "chevron-forward"} 
                size={24} 
                color="#4ECDC4" 
              />
              <Text style={styles.label}>Condições Médicas / Observações</Text>
            </View>
          </TouchableOpacity>
          {expandedSections.conditions && editing ? (
            <>
              <View style={styles.conditionsContainer}>
                {commonConditions.map((condition) => (
                  <TouchableOpacity
                    key={condition}
                    style={[
                      styles.conditionButton,
                      condition !== 'Outro' && conditions.includes(condition) && styles.conditionButtonActive,
                      condition === 'Outro' && showCustomConditionForm && styles.conditionButtonActive
                    ]}
                    onPress={() => toggleCondition(condition)}
                  >
                    <Ionicons
                      name={
                        (condition !== 'Outro' && conditions.includes(condition)) || 
                        (condition === 'Outro' && showCustomConditionForm)
                          ? "checkbox" 
                          : "checkbox-outline"
                      }
                      size={24}
                      color={
                        (condition !== 'Outro' && conditions.includes(condition)) || 
                        (condition === 'Outro' && showCustomConditionForm)
                          ? "#fff" 
                          : "#4ECDC4"
                      }
                    />
                    <Text style={[
                      styles.conditionText,
                      (condition !== 'Outro' && conditions.includes(condition)) || 
                      (condition === 'Outro' && showCustomConditionForm)
                        ? styles.conditionTextActive
                        : null
                    ]}>
                      {condition}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Formulário para adicionar condição customizada */}
              {showCustomConditionForm && (
                <View style={styles.customConditionForm}>
                  <Text style={styles.customConditionLabel}>Descreva a condição:</Text>
                  <View style={styles.customConditionInputContainer}>
                    <TextInput
                      style={styles.customConditionInput}
                      value={newCustomCondition}
                      onChangeText={setNewCustomCondition}
                      placeholder="Ex: Artrite reumatoide"
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                      style={styles.addCustomConditionButton}
                      onPress={addCustomCondition}
                    >
                      <Ionicons name="add-circle" size={32} color="#4ECDC4" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelCustomConditionButton}
                    onPress={() => {
                      setShowCustomConditionForm(false);
                      setNewCustomCondition('');
                    }}
                  >
                    <Text style={styles.cancelCustomConditionText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Lista de condições customizadas */}
              {customConditions.length > 0 && (
                <View style={styles.customConditionsList}>
                  <Text style={styles.customConditionsLabel}>Condições Adicionais:</Text>
                  {customConditions.map((condition, index) => (
                    <View key={index} style={styles.customConditionItem}>
                      <Ionicons name="checkmark-circle" size={24} color="#4ECDC4" />
                      <Text style={styles.customConditionItemText}>{condition}</Text>
                      <TouchableOpacity onPress={() => removeCustomCondition(condition)}>
                        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.listContainer}>
              {(conditions.length > 0 || customConditions.length > 0) ? (
                <>
                  {conditions.map((condition, index) => (
                    <View key={index} style={styles.listItem}>
                      <Ionicons name="checkmark-circle" size={24} color="#4ECDC4" />
                      <Text style={styles.listItemText}>{condition}</Text>
                    </View>
                  ))}
                  {customConditions.map((condition, index) => (
                    <View key={`custom-${index}`} style={styles.listItem}>
                      <Ionicons name="checkmark-circle" size={24} color="#4ECDC4" />
                      <Text style={styles.listItemText}>{condition}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.emptyText}>Nenhuma condição cadastrada</Text>
              )}
            </View>
          )}
        </View>

        {/* Hábitos de Vida */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hábitos de Vida</Text>
          {editing ? (
            <>
              <View style={styles.habitsContainer}>
                {/* Tabagismo Dropdown */}
                <View style={styles.habitItem}>
                  <Text style={styles.habitLabel}>Tabagismo:</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowSmokingDropdown(!showSmokingDropdown);
                      setShowAlcoholDropdown(false);
                      setShowPhysicalActivityDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownButtonText}>
                      {smoking || 'Selecione uma opção'}
                    </Text>
                    <Ionicons 
                      name={showSmokingDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#4ECDC4" 
                    />
                  </TouchableOpacity>
                  {showSmokingDropdown && (
                    <View style={styles.dropdownOptions}>
                      {smokingOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.dropdownOption,
                            smoking === option && styles.dropdownOptionSelected
                          ]}
                          onPress={() => {
                            setSmoking(option);
                            setShowSmokingDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownOptionText,
                            smoking === option && styles.dropdownOptionTextSelected
                          ]}>
                            {option}
                          </Text>
                          {smoking === option && (
                            <Ionicons name="checkmark" size={20} color="#4ECDC4" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                
                {/* Álcool Dropdown */}
                <View style={styles.habitItem}>
                  <Text style={styles.habitLabel}>Álcool:</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowAlcoholDropdown(!showAlcoholDropdown);
                      setShowSmokingDropdown(false);
                      setShowPhysicalActivityDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownButtonText}>
                      {alcohol || 'Selecione uma opção'}
                    </Text>
                    <Ionicons 
                      name={showAlcoholDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#4ECDC4" 
                    />
                  </TouchableOpacity>
                  {showAlcoholDropdown && (
                    <View style={styles.dropdownOptions}>
                      {alcoholOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.dropdownOption,
                            alcohol === option && styles.dropdownOptionSelected
                          ]}
                          onPress={() => {
                            setAlcohol(option);
                            setShowAlcoholDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownOptionText,
                            alcohol === option && styles.dropdownOptionTextSelected
                          ]}>
                            {option}
                          </Text>
                          {alcohol === option && (
                            <Ionicons name="checkmark" size={20} color="#4ECDC4" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                
                {/* Atividade Física Dropdown */}
                <View style={styles.habitItem}>
                  <Text style={styles.habitLabel}>Atividade Física:</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowPhysicalActivityDropdown(!showPhysicalActivityDropdown);
                      setShowSmokingDropdown(false);
                      setShowAlcoholDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownButtonText}>
                      {physicalActivity || 'Selecione uma opção'}
                    </Text>
                    <Ionicons 
                      name={showPhysicalActivityDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#4ECDC4" 
                    />
                  </TouchableOpacity>
                  {showPhysicalActivityDropdown && (
                    <View style={styles.dropdownOptions}>
                      {physicalActivityOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.dropdownOption,
                            physicalActivity === option && styles.dropdownOptionSelected
                          ]}
                          onPress={() => {
                            setPhysicalActivity(option);
                            setShowPhysicalActivityDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownOptionText,
                            physicalActivity === option && styles.dropdownOptionTextSelected
                          ]}>
                            {option}
                          </Text>
                          {physicalActivity === option && (
                            <Ionicons name="checkmark" size={20} color="#4ECDC4" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : expandedSections.habits ? (
            <View style={styles.displayValue}>
              <Text style={styles.displayText}>
                {smoking ? `Tabagismo: ${smoking}` : 'Tabagismo não informado'} | {' '}
                {alcohol ? `Álcool: ${alcohol}` : 'Álcool não informado'} | {' '}
                {physicalActivity ? `Atividade Física: ${physicalActivity}` : 'Atividade física não informada'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Antecedentes Familiares */}
        <View style={styles.inputGroup}>
          <TouchableOpacity 
            style={styles.sectionHeaderButton}
            onPress={() => toggleSection('familyHistory')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons 
                name={expandedSections.familyHistory ? "chevron-down" : "chevron-forward"} 
                size={24} 
                color="#4ECDC4" 
              />
              <Text style={styles.label}>Antecedentes Familiares</Text>
            </View>
          </TouchableOpacity>
          {expandedSections.familyHistory && editing && (
            <>
              {!showFamilyHistoryForm ? (
                <TouchableOpacity
                  style={styles.addSurgeryButton}
                  onPress={() => setShowFamilyHistoryForm(true)}
                >
                  <Ionicons name="add-circle" size={28} color="#4ECDC4" />
                  <Text style={styles.addSurgeryButtonText}>Adicionar Histórico Familiar</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.familyHistoryForm}>
                  <TextInput
                    style={styles.input}
                    value={newFamilyHistory}
                    onChangeText={setNewFamilyHistory}
                    placeholder="Ex: Pai com diabetes, Mãe com hipertensão"
                    placeholderTextColor="#999"
                  />
                  <View style={styles.formButtons}>
                    <TouchableOpacity
                      style={[styles.formButton, styles.cancelButton]}
                      onPress={() => {
                        setShowFamilyHistoryForm(false);
                        setNewFamilyHistory('');
                      }}
                    >
                      <Text style={styles.formButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.formButton, styles.saveButton]}
                      onPress={addFamilyHistory}
                    >
                      <Text style={styles.formButtonText}>Adicionar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
          {expandedSections.familyHistory && familyHistory.length > 0 ? (
            <View style={styles.listContainer}>
              {familyHistory.map((history, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>{history}</Text>
                  {editing && (
                    <TouchableOpacity onPress={() => removeFamilyHistory(history)}>
                      <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ) : expandedSections.familyHistory ? (
            <Text style={styles.emptyText}>Nenhum histórico familiar cadastrado</Text>
          ) : null}
        </View>

        {/* Medicamentos em Uso */}
        <View style={styles.inputGroup}>
          <TouchableOpacity 
            style={styles.sectionHeaderButton}
            onPress={() => toggleSection('medications')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons 
                name={expandedSections.medications ? "chevron-down" : "chevron-forward"} 
                size={24} 
                color="#4ECDC4" 
              />
              <Text style={styles.label}>Medicamentos em Uso</Text>
            </View>
          </TouchableOpacity>
          {expandedSections.medications && (
            <>
              <Text style={styles.infoText}>
                Os medicamentos cadastrados em "Meus Medicamentos" são sincronizados automaticamente aqui.
              </Text>
              {editing && (
                <TouchableOpacity
                  style={styles.addMedicationButton}
                  onPress={() => router.push('/medications')}
                >
                  <Ionicons name="add-circle" size={28} color="#4ECDC4" />
                  <Text style={styles.addMedicationButtonText}>Adicionar Medicamento</Text>
                </TouchableOpacity>
              )}
              {currentMedications.length > 0 ? (
                <View style={styles.listContainer}>
                  {currentMedications.map((medication, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.listItem}
                      onPress={() => openMedicationDetails(medication)}
                    >
                      <Text style={styles.listItemText}>{medication}</Text>
                      <Ionicons name="chevron-forward" size={20} color="#4ECDC4" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>Nenhum medicamento cadastrado</Text>
              )}
            </>
          )}
        </View>

        {/* Revisão de Sistemas */}
        <View style={styles.inputGroup}>
          <TouchableOpacity 
            style={styles.sectionHeaderButton}
            onPress={() => toggleSection('systemReview')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons 
                name={expandedSections.systemReview ? "chevron-down" : "chevron-forward"} 
                size={24} 
                color="#4ECDC4" 
              />
              <Text style={styles.label}>Revisão de Sistemas</Text>
            </View>
          </TouchableOpacity>
          {expandedSections.systemReview && editing ? (
            <View style={styles.systemReviewContainer}>
              {[
                { key: 'cardiovascular', label: 'Cardiovascular', placeholder: 'Ex: Palpitações, dor no peito' },
                { key: 'respiratory', label: 'Respiratório', placeholder: 'Ex: Falta de ar, tosse' },
                { key: 'digestive', label: 'Digestivo', placeholder: 'Ex: Náusea, dor abdominal' },
                { key: 'urinary', label: 'Urinário', placeholder: 'Ex: Dificuldade para urinar' },
                { key: 'neurological', label: 'Neurológico', placeholder: 'Ex: Tontura, dor de cabeça' },
                { key: 'dermatological', label: 'Dermatológico', placeholder: 'Ex: Erupções, coceira' },
                { key: 'endocrine', label: 'Endócrino', placeholder: 'Ex: Sudorese, alterações de peso' },
                { key: 'musculoskeletal', label: 'Musculoesquelético', placeholder: 'Ex: Dores articulares' },
              ].map((system) => (
                <View key={system.key} style={styles.systemReviewItem}>
                  <Text style={styles.systemReviewLabel}>{system.label}:</Text>
                  <TextInput
                    style={styles.systemReviewInput}
                    value={systemReview[system.key]}
                    onChangeText={(text) => setSystemReview({ ...systemReview, [system.key]: text })}
                    placeholder={system.placeholder}
                    placeholderTextColor="#999"
                    multiline
                  />
                </View>
              ))}
            </View>
          ) : expandedSections.systemReview ? (
            <View style={styles.listContainer}>
              {Object.entries(systemReview).map(([key, value]) => {
                if (!value) return null;
                const labels = {
                  cardiovascular: 'Cardiovascular',
                  respiratory: 'Respiratório',
                  digestive: 'Digestivo',
                  urinary: 'Urinário',
                  neurological: 'Neurológico',
                  dermatological: 'Dermatológico',
                  endocrine: 'Endócrino',
                  musculoskeletal: 'Musculoesquelético',
                };
                return (
                  <View key={key} style={styles.listItem}>
                    <Ionicons name="medical-outline" size={24} color="#4ECDC4" />
                    <View style={styles.systemReviewDisplay}>
                      <Text style={styles.systemReviewDisplayLabel}>{labels[key]}:</Text>
                      <Text style={styles.listItemText}>{value}</Text>
                    </View>
                  </View>
                );
              })}
              {Object.values(systemReview).every(v => !v) && (
                <Text style={styles.emptyText}>Nenhuma informação registrada</Text>
              )}
            </View>
          ) : null}
        </View>

        {/* Observações Gerais */}
        <View style={styles.inputGroup}>
          <TouchableOpacity 
            style={styles.sectionHeaderButton}
            onPress={() => toggleSection('observations')}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons 
                name={expandedSections.observations ? "chevron-down" : "chevron-forward"} 
                size={24} 
                color="#4ECDC4" 
              />
              <Text style={styles.label}>Observações Gerais</Text>
            </View>
          </TouchableOpacity>
          {expandedSections.observations && editing ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={observations}
              onChangeText={setObservations}
              placeholder="Informações adicionais relevantes para o atendimento médico..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
            />
          ) : expandedSections.observations ? (
            <View style={styles.displayValue}>
              <Text style={styles.displayText}>
                {observations || 'Nenhuma observação cadastrada'}
              </Text>
            </View>
          ) : null}
        </View>

        {editing && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelActionButton]}
              onPress={() => {
                loadAnamnesis();
                setEditing(false);
              }}
            >
              <Text style={styles.actionButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveActionButton]}
              onPress={saveAnamnesis}
            >
              <Text style={styles.actionButtonText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        )}
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
    justifyContent: 'space-between',
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
    flex: 1,
  },
  editButton: {
    marginLeft: 16,
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  sectionHeaderButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
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
  displayValue: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  displayText: {
    fontSize: 22,
    color: '#333',
  },
  bloodTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bloodTypeButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    minWidth: 80,
    alignItems: 'center',
  },
  bloodTypeButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  bloodTypeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  bloodTypeTextActive: {
    color: '#fff',
  },
  addAllergyContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  addAllergyInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    fontSize: 22,
    color: '#333',
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  addMedicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    gap: 8,
  },
  addMedicationButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listItemText: {
    fontSize: 22,
    color: '#333',
    flex: 1,
  },
  emptyText: {
    fontSize: 20,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  infoText: {
    fontSize: 18,
    color: '#4ECDC4',
    fontStyle: 'italic',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  addSurgeryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    marginBottom: 16,
    gap: 12,
  },
  addSurgeryButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  surgeryForm: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    marginTop: 12,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 22,
    color: '#333',
  },
  surgeryFormButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  surgeryFormButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
  },
  surgeryFormButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  surgeryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  surgeryItemContent: {
    flex: 1,
  },
  surgeryItemTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  surgeryItemDate: {
    fontSize: 20,
    color: '#666',
    marginBottom: 8,
  },
  surgeryItemNotes: {
    fontSize: 18,
    color: '#666',
    fontStyle: 'italic',
  },
  conditionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  conditionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    gap: 8,
    minWidth: '45%',
  },
  conditionButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  conditionText: {
    fontSize: 20,
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
  conditionTextActive: {
    color: '#fff',
  },
  customConditionForm: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  customConditionLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  customConditionInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  customConditionInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    fontSize: 22,
    color: '#333',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  addCustomConditionButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelCustomConditionButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  cancelCustomConditionText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  customConditionsList: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  customConditionsLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  customConditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  customConditionItemText: {
    fontSize: 22,
    color: '#333',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  cancelActionButton: {
    backgroundColor: '#e0e0e0',
  },
  saveActionButton: {
    backgroundColor: '#4ECDC4',
  },
  actionButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  personalDataContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  personalDataRow: {
    marginBottom: 16,
  },
  personalDataLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  personalDataInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    fontSize: 22,
    color: '#333',
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  ageDisplay: {
    fontSize: 20,
    color: '#4ECDC4',
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genderButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    minWidth: 120,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  genderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  genderTextActive: {
    color: '#fff',
  },
  habitsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  habitItem: {
    marginBottom: 20,
  },
  habitLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  dropdownButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonText: {
    fontSize: 18,
    color: '#333',
    flex: 1,
  },
  dropdownOptions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dropdownOptionSelected: {
    backgroundColor: '#E8F8F5',
  },
  dropdownOptionText: {
    fontSize: 18,
    color: '#333',
    flex: 1,
  },
  dropdownOptionTextSelected: {
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
  familyHistoryForm: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    marginBottom: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  formButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  systemReviewContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  systemReviewItem: {
    marginBottom: 20,
  },
  systemReviewLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  systemReviewInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    color: '#333',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  systemReviewDisplay: {
    flex: 1,
  },
  systemReviewDisplayLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
});

