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
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState([]);
  const [newAllergy, setNewAllergy] = useState('');
  const [surgeries, setSurgeries] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [observations, setObservations] = useState('');
  const [editing, setEditing] = useState(false);

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
        setBloodType(data.bloodType || '');
        setAllergies(data.allergies || []);
        setSurgeries(data.surgeries || []);
        setConditions(data.conditions || []);
        setObservations(data.observations || '');
      }
    } catch (error) {
      console.error('Erro ao carregar anamnese:', error);
    }
  };

  const saveAnamnesis = async () => {
    try {
      const anamnesisData = {
        bloodType,
        allergies,
        surgeries,
        conditions,
        observations: observations.trim(),
        lastUpdated: new Date().toISOString(),
      };

      await AsyncStorage.setItem('anamnesis', JSON.stringify(anamnesisData));
      setEditing(false);
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
    if (conditions.includes(condition)) {
      setConditions(conditions.filter(c => c !== condition));
    } else {
      setConditions([...conditions, condition]);
    }
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
        {!editing && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setEditing(true)}
          >
            <Ionicons name="create-outline" size={32} color="#4ECDC4" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.form}>
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
            <View style={styles.conditionsContainer}>
              {commonConditions.map((condition) => (
                <TouchableOpacity
                  key={condition}
                  style={[
                    styles.conditionButton,
                    conditions.includes(condition) && styles.conditionButtonActive
                  ]}
                  onPress={() => toggleCondition(condition)}
                >
                  <Ionicons
                    name={conditions.includes(condition) ? "checkbox" : "checkbox-outline"}
                    size={24}
                    color={conditions.includes(condition) ? "#fff" : "#4ECDC4"}
                  />
                  <Text style={[
                    styles.conditionText,
                    conditions.includes(condition) && styles.conditionTextActive
                  ]}>
                    {condition}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {conditions.length > 0 ? (
                conditions.map((condition, index) => (
                  <View key={index} style={styles.listItem}>
                    <Ionicons name="checkmark-circle" size={24} color="#4ECDC4" />
                    <Text style={styles.listItemText}>{condition}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Nenhuma condição cadastrada</Text>
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
});

