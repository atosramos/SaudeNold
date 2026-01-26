import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addFamilyAdult } from '../../services/familyService';
import FamilyMemberForm from '../../components/FamilyMemberForm';
import { useTheme } from '../../contexts/ThemeContext';

export default function AddAdult() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    birth_date: new Date(new Date().setFullYear(new Date().getFullYear() - 25)),
    gender: '',
    blood_type: '',
    email: '',
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.birth_date) {
      newErrors.birth_date = 'Data de nascimento é obrigatória';
    } else {
      const today = new Date();
      const birthDate = new Date(formData.birth_date);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
      
      if (actualAge < 18) {
        newErrors.birth_date = 'Adulto deve ter 18 anos ou mais';
      }
    }
    
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Email inválido';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Erro', 'Por favor, corrija os erros no formulário');
      return;
    }

    setLoading(true);
    try {
      const birthDate = new Date(formData.birth_date);
      const payload = {
        name: formData.name.trim(),
        birth_date: birthDate.toISOString(),
        gender: formData.gender.trim() || null,
        blood_type: formData.blood_type.trim().toUpperCase() || null,
        email: formData.email.trim() || null,
      };

      await addFamilyAdult(payload);
      
      Alert.alert(
        'Sucesso',
        'Adulto adicionado à família com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Erro ao adicionar adulto:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Erro ao adicionar adulto';
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Adicionar Adulto</Text>
      </View>

      <View style={styles.formContainer}>
        <FamilyMemberForm
          values={formData}
          onChange={handleChange}
          showEmail={true}
          errors={errors}
        />

        <View style={styles.datePickerContainer}>
          <Text style={styles.label}>Data de nascimento</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formatDate(formData.birth_date) || 'Selecione a data'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          {errors.birth_date ? (
            <Text style={styles.errorText}>{errors.birth_date}</Text>
          ) : null}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={formData.birth_date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              if (Platform.OS === 'android') {
                setShowDatePicker(false);
                if (event.type !== 'dismissed' && selectedDate) {
                  const year = selectedDate.getFullYear();
                  const month = selectedDate.getMonth();
                  const day = selectedDate.getDate();
                  const validDate = new Date(year, month, day, 12, 0, 0, 0);
                  handleChange('birth_date', validDate);
                }
              } else {
                if (selectedDate) {
                  handleChange('birth_date', selectedDate);
                }
              }
            }}
          />
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Adicionar Adulto</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 16,
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  errorText: {
    color: '#c53030',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#4ECDC4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
