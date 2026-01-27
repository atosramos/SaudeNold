/**
 * Emergency Mode Screen - Modo de Emergência
 * 
 * Tela para acesso rápido a informações críticas de saúde.
 * Acessível a partir da tela de bloqueio com PIN de 6 dígitos.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { getActiveProfile } from '../../services/profileService';
// QRCode será implementado quando a biblioteca estiver disponível
// import QRCode from 'react-native-qrcode-svg';

export default function EmergencyModeScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [emergencyInfo, setEmergencyInfo] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [profileId, setProfileId] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await getActiveProfile();
      if (profile) {
        setProfileId(profile.id);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 6) {
      Alert.alert('Erro', 'PIN deve ter 6 dígitos');
      return;
    }

    if (!profileId) {
      Alert.alert('Erro', 'Perfil não encontrado');
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.post(`/api/emergency/profile/${profileId}/verify-pin`, {
        pin: pin
      });

      setEmergencyInfo(response.data);
      setPin(''); // Limpar PIN após acesso
    } catch (error) {
      console.error('Error verifying PIN:', error);
      Alert.alert('Erro', 'PIN incorreto ou modo emergência desabilitado');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQRCode = async () => {
    if (!profileId) {
      Alert.alert('Erro', 'Perfil não encontrado');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/api/emergency/profile/${profileId}/qr-code`);
      setQrData(response.data.qr_data);
      setShowQRCode(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      Alert.alert('Erro', 'Não foi possível gerar QR Code');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone) => {
    // Formatar telefone brasileiro
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (emergencyInfo) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emergencyTitle}>MODO DE EMERGÊNCIA</Text>
          <Text style={styles.emergencySubtitle}>Informações Críticas de Saúde</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Identificação</Text>
          <Text style={styles.infoText}>{emergencyInfo.name}</Text>
          
          {emergencyInfo.blood_type && (
            <>
              <Text style={styles.sectionTitle}>Tipo Sanguíneo</Text>
              <Text style={styles.infoText}>{emergencyInfo.blood_type}</Text>
            </>
          )}
        </View>

        {emergencyInfo.allergies && emergencyInfo.allergies.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Alergias Críticas</Text>
            {emergencyInfo.allergies.map((allergy, index) => (
              <Text key={index} style={styles.infoText}>• {allergy}</Text>
            ))}
          </View>
        )}

        {emergencyInfo.medications && emergencyInfo.medications.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Medicamentos Contínuos</Text>
            {emergencyInfo.medications.map((med, index) => (
              <View key={index} style={styles.medicationItem}>
                <Text style={styles.medicationName}>{med.name}</Text>
                {med.dosage && <Text style={styles.medicationDosage}>{med.dosage}</Text>}
              </View>
            ))}
          </View>
        )}

        {emergencyInfo.emergency_contacts && emergencyInfo.emergency_contacts.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Contatos de Emergência</Text>
            {emergencyInfo.emergency_contacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactItem}
                onPress={() => {
                  if (contact.phone) {
                    // Abrir discador
                    const phoneNumber = contact.phone.replace(/\D/g, '');
                    // Linking.openURL(`tel:${phoneNumber}`);
                    Alert.alert('Ligar', `Ligar para ${contact.name}?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Ligar', onPress: () => {} }
                    ]);
                  }
                }}
              >
                <Text style={styles.contactName}>{contact.name}</Text>
                {contact.relationship && (
                  <Text style={styles.contactRelation}>{contact.relationship}</Text>
                )}
                {contact.phone && (
                  <Text style={styles.contactPhone}>{formatPhone(contact.phone)}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {emergencyInfo.health_insurance && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Plano de Saúde</Text>
            {emergencyInfo.health_insurance.name && (
              <Text style={styles.infoText}>{emergencyInfo.health_insurance.name}</Text>
            )}
            {emergencyInfo.health_insurance.number && (
              <Text style={styles.infoText}>Carteirinha: {emergencyInfo.health_insurance.number}</Text>
            )}
          </View>
        )}

        {emergencyInfo.advance_directives && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Diretivas Antecipadas</Text>
            <Text style={styles.infoText}>{emergencyInfo.advance_directives}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            setEmergencyInfo(null);
            setPin('');
          }}
        >
          <Text style={styles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Modo de Emergência</Text>
        <Text style={styles.subtitle}>
          Digite o PIN de 6 dígitos para acessar informações críticas
        </Text>
      </View>

      <View style={styles.pinContainer}>
        <TextInput
          style={styles.pinInput}
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          placeholder="000000"
          placeholderTextColor="#999"
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, pin.length !== 6 && styles.submitButtonDisabled]}
        onPress={handlePinSubmit}
        disabled={pin.length !== 6 || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Acessar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.qrButton}
        onPress={handleGenerateQRCode}
        disabled={loading}
      >
        <Text style={styles.qrButtonText}>Gerar QR Code</Text>
      </TouchableOpacity>

      <Modal
        visible={showQRCode}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRCode(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>QR Code de Emergência</Text>
            {qrData && (
              <View style={styles.qrCodePlaceholder}>
                <Text style={styles.qrCodeText}>QR Code</Text>
                <Text style={styles.qrCodeData}>{qrData.substring(0, 50)}...</Text>
                <Text style={styles.qrCodeHint}>
                  Instale react-native-qrcode-svg para exibir QR Code
                </Text>
              </View>
            )}
            <Text style={styles.modalSubtitle}>
              Paramedicos podem escanear este código para acessar informações de emergência
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowQRCode(false)}
            >
              <Text style={styles.modalCloseButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  header: {
    marginBottom: 30,
    alignItems: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center'
  },
  emergencyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 5
  },
  emergencySubtitle: {
    fontSize: 16,
    color: '#666'
  },
  pinContainer: {
    marginBottom: 20,
    alignItems: 'center'
  },
  pinInput: {
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 10,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#4ECDC4',
    padding: 10,
    width: 200,
    color: '#333'
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  qrButton: {
    backgroundColor: '#4ECDC4',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  infoSection: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  infoText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 5
  },
  medicationItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  medicationDosage: {
    fontSize: 16,
    color: '#666',
    marginTop: 5
  },
  contactItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4'
  },
  contactName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  contactRelation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5
  },
  contactPhone: {
    fontSize: 18,
    color: '#4ECDC4',
    fontWeight: 'bold'
  },
  closeButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    width: '90%'
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333'
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20
  },
  modalCloseButton: {
    backgroundColor: '#4ECDC4',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center'
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  qrCodePlaceholder: {
    width: 250,
    height: 250,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 20
  },
  qrCodeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  qrCodeData: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    padding: 10
  },
  qrCodeHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10
  }
});
