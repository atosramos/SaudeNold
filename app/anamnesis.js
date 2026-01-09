import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
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
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
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
  const [newCurrentMedication, setNewCurrentMedication] = useState('');
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

  // Estados para nova cirurgia
  const [newSurgery, setNewSurgery] = useState({
    type: '',
    date: new Date(),
    notes: '',
  });
  const [showSurgeryDatePicker, setShowSurgeryDatePicker] = useState(false);
  const [showNewSurgeryForm, setShowNewSurgeryForm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAnamnesis();
    }, [])
  );

  const loadAnamnesis = async () => {
    try {
      const stored = await AsyncStorage.getItem('anamnesis');
      if (stored) {
        const data = JSON.parse(stored);
        setAge(data.age || '');
        setGender(data.gender || '');
        setBloodType(data.bloodType || '');
        setAllergies(data.allergies || []);
        setSurgeries(data.surgeries || []);
        setConditions(data.conditions || []);
        setCustomConditions(data.customConditions || []);
        setSmoking(data.smoking || '');
        setAlcohol(data.alcohol || '');
        setPhysicalActivity(data.physicalActivity || '');
        setFamilyHistory(data.familyHistory || []);
        setCurrentMedications(data.currentMedications || []);
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
    } catch (error) {
      console.error('Erro ao carregar anamnese:', error);
    }
  };

  const saveAnamnesis = async () => {
    try {
      const anamnesisData = {
        age,
        gender,
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

  const addCurrentMedication = () => {
    if (!newCurrentMedication.trim()) {
      Alert.alert('Erro', 'Por favor, digite o nome do medicamento');
      return;
    }

    if (currentMedications.includes(newCurrentMedication.trim())) {
      Alert.alert('Aviso', 'Este medicamento já está cadastrado');
      return;
    }

    setCurrentMedications([...currentMedications, newCurrentMedication.trim()]);
    setNewCurrentMedication('');
  };

  const removeCurrentMedication = (medication) => {
    setCurrentMedications(currentMedications.filter(m => m !== medication));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
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
        <Text style={styles.title}>Ficha de Anamnese</Text>
      </View>

      <View style={styles.form}>
        {/* Dados Pessoais */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dados Pessoais</Text>
          {editing ? (
            <View style={styles.personalDataContainer}>
              <View style={styles.personalDataRow}>
                <Text style={styles.personalDataLabel}>Idade:</Text>
                <TextInput
                  style={styles.personalDataInput}
                  value={age}
                  onChangeText={setAge}
                  placeholder="Ex: 75"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
              <View style={styles.personalDataRow}>
                <Text style={styles.personalDataLabel}>Sexo:</Text>
                <View style={styles.genderContainer}>
                  {['Masculino', 'Feminino', 'Outro'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderButton,
                        gender === g && styles.genderButtonActive
                      ]}
                      onPress={() => setGender(g)}
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
          ) : (
            <View style={styles.displayValue}>
              <Text style={styles.displayText}>
                {age ? `Idade: ${age} anos` : 'Idade não informada'} | {gender || 'Sexo não informado'}
              </Text>
            </View>
          )}
        </View>

        {/* Tipo Sanguíneo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tipo Sanguíneo *</Text>
          {editing ? (
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
          ) : (
            <View style={styles.displayValue}>
              <Text style={styles.displayText}>{bloodType || 'Não informado'}</Text>
            </View>
          )}
        </View>

        {/* Alergias */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Alergias Conhecidas</Text>
          {editing && (
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
          {allergies.length > 0 ? (
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
          ) : (
            <Text style={styles.emptyText}>Nenhuma alergia cadastrada</Text>
          )}
        </View>

        {/* Cirurgias */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cirurgias Realizadas</Text>
          {editing && (
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
          {surgeries.length > 0 ? (
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
          ) : (
            <Text style={styles.emptyText}>Nenhuma cirurgia cadastrada</Text>
          )}
        </View>

        {/* Condições Médicas */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Condições Médicas / Observações</Text>
          {editing ? (
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
                <View style={styles.habitItem}>
                  <Text style={styles.habitLabel}>Tabagismo:</Text>
                  <View style={styles.habitOptions}>
                    {['Não fuma', 'Ex-fumante', 'Fumante'].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.habitButton,
                          smoking === option && styles.habitButtonActive
                        ]}
                        onPress={() => setSmoking(option)}
                      >
                        <Text style={[
                          styles.habitText,
                          smoking === option && styles.habitTextActive
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.habitItem}>
                  <Text style={styles.habitLabel}>Álcool:</Text>
                  <View style={styles.habitOptions}>
                    {['Não bebe', 'Socialmente', 'Regularmente'].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.habitButton,
                          alcohol === option && styles.habitButtonActive
                        ]}
                        onPress={() => setAlcohol(option)}
                      >
                        <Text style={[
                          styles.habitText,
                          alcohol === option && styles.habitTextActive
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.habitItem}>
                  <Text style={styles.habitLabel}>Atividade Física:</Text>
                  <View style={styles.habitOptions}>
                    {['Sedentário', 'Leve', 'Moderada', 'Intensa'].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.habitButton,
                          physicalActivity === option && styles.habitButtonActive
                        ]}
                        onPress={() => setPhysicalActivity(option)}
                      >
                        <Text style={[
                          styles.habitText,
                          physicalActivity === option && styles.habitTextActive
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.displayValue}>
              <Text style={styles.displayText}>
                {smoking ? `Tabagismo: ${smoking}` : 'Tabagismo não informado'} | {' '}
                {alcohol ? `Álcool: ${alcohol}` : 'Álcool não informado'} | {' '}
                {physicalActivity ? `Atividade Física: ${physicalActivity}` : 'Atividade física não informada'}
              </Text>
            </View>
          )}
        </View>

        {/* Antecedentes Familiares */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Antecedentes Familiares</Text>
          {editing && (
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
          {familyHistory.length > 0 ? (
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
          ) : (
            <Text style={styles.emptyText}>Nenhum histórico familiar cadastrado</Text>
          )}
        </View>

        {/* Medicamentos em Uso */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medicamentos em Uso</Text>
          {editing && (
            <View style={styles.addAllergyContainer}>
              <TextInput
                style={styles.addAllergyInput}
                value={newCurrentMedication}
                onChangeText={setNewCurrentMedication}
                placeholder="Ex: Losartana 50mg, Metformina 850mg"
                placeholderTextColor="#999"
                onSubmitEditing={addCurrentMedication}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={addCurrentMedication}
              >
                <Ionicons name="add-circle" size={32} color="#4ECDC4" />
              </TouchableOpacity>
            </View>
          )}
          {currentMedications.length > 0 ? (
            <View style={styles.listContainer}>
              {currentMedications.map((medication, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.listItemText}>{medication}</Text>
                  {editing && (
                    <TouchableOpacity onPress={() => removeCurrentMedication(medication)}>
                      <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Nenhum medicamento cadastrado</Text>
          )}
        </View>

        {/* Revisão de Sistemas */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Revisão de Sistemas</Text>
          {editing ? (
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
          ) : (
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
          )}
        </View>

        {/* Observações Gerais */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Observações Gerais</Text>
          {editing ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={observations}
              onChangeText={setObservations}
              placeholder="Informações adicionais relevantes para o atendimento médico..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
            />
          ) : (
            <View style={styles.displayValue}>
              <Text style={styles.displayText}>
                {observations || 'Nenhuma observação cadastrada'}
              </Text>
            </View>
          )}
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
  habitOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  habitButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    minWidth: 120,
    alignItems: 'center',
  },
  habitButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  habitText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  habitTextActive: {
    color: '#fff',
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

