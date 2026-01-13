import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const relations = ['Filha', 'Filho', 'Cônjuge', 'Neto(a)', 'Amigo(a)', 'Cuidador(a)', 'Outro'];

export default function NewEmergencyContact() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [photo, setPhoto] = useState(null);
  const [customRelation, setCustomRelation] = useState('');
  const [showCustomRelationForm, setShowCustomRelationForm] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
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

  const handleRelationSelect = (rel) => {
    if (rel === 'Outro') {
      setShowCustomRelationForm(true);
      setRelation(''); // Limpar seleção anterior
    } else {
      setRelation(rel);
      setShowCustomRelationForm(false);
      setCustomRelation('');
    }
  };

  const saveCustomRelation = () => {
    if (!customRelation.trim()) {
      Alert.alert('Erro', 'Por favor, digite o parentesco');
      return;
    }
    setRelation(customRelation.trim());
    setShowCustomRelationForm(false);
  };

  const saveContact = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o telefone');
      return;
    }

    if (!relation) {
      Alert.alert('Erro', 'Por favor, selecione ou digite o parentesco');
      return;
    }

    try {
      const stored = await AsyncStorage.getItem('emergencyContacts');
      const contacts = stored ? JSON.parse(stored) : [];
      
      if (contacts.length >= 5) {
        Alert.alert('Erro', 'Limite de 5 contatos atingido');
        return;
      }

      const newContact = {
        id: Date.now().toString(),
        name: name.trim(),
        phone: phone.trim(),
        relation: relation,
        photo: photo,
      };

      contacts.push(newContact);
      await AsyncStorage.setItem('emergencyContacts', JSON.stringify(contacts));
      
      Alert.alert('Sucesso', 'Contato cadastrado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erro ao salvar contato:', error);
      Alert.alert('Erro', 'Não foi possível salvar o contato');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={32} color="#FF6B6B" />
        </TouchableOpacity>
        <Text style={styles.title}>Novo Contato</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoButton} onPress={showImageOptions}>
            {photo ? (
              <Image 
                source={{ uri: photo }} 
                style={styles.photoImage}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={40} color="#FF6B6B" />
                <Text style={styles.photoText}>Adicionar Foto</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nome do contato"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefone *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="(00) 00000-0000"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Parentesco *</Text>
          <View style={styles.relationsContainer}>
            {relations.map((rel) => (
              <TouchableOpacity
                key={rel}
                style={[
                  styles.relationButton,
                  rel !== 'Outro' && relation === rel && styles.relationButtonActive,
                  rel === 'Outro' && showCustomRelationForm && styles.relationButtonActive
                ]}
                onPress={() => handleRelationSelect(rel)}
              >
                <Text style={[
                  styles.relationText,
                  (rel !== 'Outro' && relation === rel) || 
                  (rel === 'Outro' && showCustomRelationForm)
                    ? styles.relationTextActive
                    : null
                ]}>
                  {rel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Formulário para parentesco customizado */}
          {showCustomRelationForm && (
            <View style={styles.customRelationForm}>
              <Text style={styles.customRelationLabel}>Digite o parentesco:</Text>
              <View style={styles.customRelationInputContainer}>
                <TextInput
                  style={styles.customRelationInput}
                  value={customRelation}
                  onChangeText={setCustomRelation}
                  placeholder="Ex: Sobrinho, Vizinho"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.addCustomRelationButton}
                  onPress={saveCustomRelation}
                >
                  <Ionicons name="checkmark-circle" size={32} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.cancelCustomRelationButton}
                onPress={() => {
                  setShowCustomRelationForm(false);
                  setCustomRelation('');
                  setRelation('');
                }}
              >
                <Text style={styles.cancelCustomRelationText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Mostrar parentesco customizado selecionado */}
          {relation && !relations.includes(relation) && (
            <View style={styles.customRelationDisplay}>
              <Text style={styles.customRelationDisplayLabel}>Parentesco selecionado:</Text>
              <View style={styles.customRelationDisplayItem}>
                <Text style={styles.customRelationDisplayText}>{relation}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setRelation('');
                    setCustomRelation('');
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveContact}>
          <Text style={styles.saveButtonText}>Salvar Contato</Text>
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
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoButton: {
    width: 150,
    height: 150,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  photoImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#fff',
  },
  photoText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 8,
    fontWeight: 'bold',
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
  relationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  relationButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    minWidth: 100,
    alignItems: 'center',
  },
  relationButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  relationText: {
    fontSize: 20,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  relationTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#FF6B6B',
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
  customRelationForm: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  customRelationLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  customRelationInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  customRelationInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    fontSize: 22,
    color: '#333',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  addCustomRelationButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelCustomRelationButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  cancelCustomRelationText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  customRelationDisplay: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  customRelationDisplayLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  customRelationDisplayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    gap: 12,
  },
  customRelationDisplayText: {
    fontSize: 22,
    color: '#333',
    flex: 1,
    fontWeight: 'bold',
  },
});














