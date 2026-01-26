import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { saveTrackingRecord, createTrackingRecord, TRACKING_TYPES } from '../../services/dailyTracking';
import { extractTrackingDataFromImage, convertExtractedDataToRecords } from '../../services/dailyTrackingOCR';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { isProFeatureAvailable } from '../../services/proLicense';
import { trackProFeatureUsage } from '../../services/analytics';
import VoiceTextInput from '../../components/VoiceTextInput';

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

export default function NewDailyTracking() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [selectedType, setSelectedType] = useState(TRACKING_TYPES.BLOOD_PRESSURE);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState(DEFAULT_UNITS[TRACKING_TYPES.BLOOD_PRESSURE]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const selectedFile = e.target.files[0];
          if (selectedFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setImage(event.target.result);
            };
            reader.readAsDataURL(selectedFile);
          }
        };
        input.click();
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      showAlert('Erro', 'Não foi possível selecionar a imagem', 'error');
    }
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS === 'web') {
        showAlert('Aviso', 'Câmera não disponível no navegador. Use a opção de galeria.', 'warning');
        pickImage();
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      showAlert('Erro', 'Não foi possível acessar a câmera', 'error');
    }
  };

  const processImageWithGemini = async () => {
    if (!image) {
      showAlert('Aviso', 'Selecione uma imagem primeiro', 'warning');
      return;
    }

    // Verificar se tem licença PRO ativa
    const hasPro = await isProFeatureAvailable();
    
    if (!hasPro) {
      showAlert(
        'Funcionalidade PRO',
        'A leitura automática de aparelhos médicos com inteligência artificial requer uma licença PRO.\n\nVocê pode inserir os dados manualmente ou ativar uma licença PRO em Configurações.',
        'info'
      );
      return;
    }

    // IMPORTANTE: No mobile, variáveis de ambiente só funcionam após rebuild do app
    // Se estiver usando Expo Go, as variáveis não estarão disponíveis
    // Para builds de produção, a chave está configurada via EAS secrets
    const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || null;
    
    console.log('🔍 Verificando chave Gemini...', { 
      hasKey: !!GEMINI_API_KEY, 
      keyLength: GEMINI_API_KEY?.length || 0,
      platform: Platform.OS,
      hasPro,
      envKeys: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('EXPO_PUBLIC'))
    });
    
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length === 0) {
      const errorMsg = '❌ Chave Gemini não configurada. Para builds de produção, a chave está configurada via EAS secrets. Para desenvolvimento local, configure EXPO_PUBLIC_GEMINI_API_KEY no arquivo .env';
      console.error(errorMsg);
      showAlert(
        'Chave Gemini não configurada',
        'A chave Gemini não está disponível. Para builds de produção, ela está configurada via EAS secrets. Para desenvolvimento local, configure EXPO_PUBLIC_GEMINI_API_KEY no arquivo .env e faça rebuild do app.',
        'warning'
      );
      return;
    }

    setProcessing(true);
    try {
      showAlert('Processando', 'Analisando imagem com Gemini... Isso pode levar alguns segundos.', 'info');
      
      const extractedData = await extractTrackingDataFromImage(image, GEMINI_API_KEY);
      
      // Rastrear uso de feature PRO
      trackProFeatureUsage('gemini_daily_tracking_extraction');
      
      if (!extractedData) {
        showAlert('Erro', 'Não foi possível extrair dados da imagem. Tente novamente ou digite manualmente.', 'error');
        setProcessing(false);
        return;
      }

      // Converter dados extraídos para registros
      const records = convertExtractedDataToRecords(extractedData);
      
      if (records.length === 0) {
        showAlert('Aviso', 'Nenhum dado de saúde foi encontrado na imagem. Digite manualmente.', 'warning');
        setProcessing(false);
        return;
      }

      // Se encontrou apenas um registro, preencher automaticamente
      if (records.length === 1) {
        const record = records[0];
        setSelectedType(record.type);
        setValue(record.value);
        setUnit(record.unit || DEFAULT_UNITS[record.type]);
        if (record.date) {
          setDate(new Date(record.date));
        }
        if (record.notes) {
          setNotes(record.notes);
        }
        showAlert('Sucesso', 'Dados extraídos com sucesso! Revise e ajuste se necessário.', 'success');
      } else {
        // Múltiplos registros encontrados - mostrar opções
        Alert.alert(
          'Múltiplos dados encontrados',
          `Foram encontrados ${records.length} tipos de dados na imagem. Escolha qual deseja salvar:`,
          [
            ...records.map((record, index) => ({
              text: `${TYPE_LABELS[record.type]}: ${record.value} ${record.unit || ''}`,
              onPress: () => {
                setSelectedType(record.type);
                setValue(record.value);
                setUnit(record.unit || DEFAULT_UNITS[record.type]);
                if (record.date) {
                  setDate(new Date(record.date));
                }
                if (record.notes) {
                  setNotes(record.notes);
                }
              },
            })),
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
        showAlert('Sucesso', `${records.length} tipos de dados encontrados! Escolha qual deseja salvar.`, 'success');
      }
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      showAlert('Erro', `Erro ao processar imagem: ${error.message}`, 'error');
    } finally {
      setProcessing(false);
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

      const result = await saveTrackingRecord(record);
      
      if (result.success) {
        showAlert('Sucesso', 'Registro salvo com sucesso!', 'success');
        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        showAlert('Erro', result.error || 'Não foi possível salvar o registro', 'error');
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Novo Registro</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
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
              editable={!processing}
              containerStyle={styles.valueInput}
              inputStyle={styles.valueInputText}
            />
            <TextInput
              style={styles.unitInput}
              value={unit}
              onChangeText={setUnit}
              placeholder="Unidade"
              editable={!processing}
            />
          </View>
        </View>

        {/* Data e hora */}
        <View style={styles.section}>
          <Text style={styles.label}>Data e Hora</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            disabled={processing}
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
            editable={!processing}
            containerStyle={styles.notesInput}
            inputStyle={styles.notesInputText}
          />
        </View>

        {/* Imagem */}
        <View style={styles.section}>
          <Text style={styles.label}>Ler da Imagem (opcional)</Text>
          <Text style={styles.hint}>
            Tire uma foto do aparelho (pressão, termômetro, etc.) e o sistema fará a leitura automática (requer licença PRO)
          </Text>
          
          {image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.imageButtons}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={takePhoto}
              disabled={processing}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.imageButtonText}>Tirar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={pickImage}
              disabled={processing}
            >
              <Ionicons name="image" size={20} color="#fff" />
              <Text style={styles.imageButtonText}>Galeria</Text>
            </TouchableOpacity>
            {image && (
              <TouchableOpacity
                style={[styles.imageButton, styles.processButton]}
                onPress={async () => {
                  const hasPro = await isProFeatureAvailable();
                  if (hasPro) {
                    processImageWithGemini();
                  } else {
                    showAlert(
                      'Funcionalidade PRO',
                      'A leitura automática requer licença PRO. Você pode inserir os dados manualmente acima.',
                      'info'
                    );
                  }
                }}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#fff" />
                    <Text style={styles.imageButtonText}>Ler com Gemini</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Botão salvar */}
        <TouchableOpacity
          style={[styles.saveButton, (saving || processing) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || processing}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar Registro</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date/Time Pickers */}
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

      {showTimePicker && (
        <DateTimePicker
          value={date}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              const newDate = new Date(date);
              newDate.setHours(selectedTime.getHours());
              newDate.setMinutes(selectedTime.getMinutes());
              setDate(newDate);
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
  hint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
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
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'contain',
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  imageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: '30%',
    justifyContent: 'center',
  },
  processButton: {
    backgroundColor: '#9B59B6',
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
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
