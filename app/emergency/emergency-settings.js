/**
 * Emergency Settings Screen - Configurações de Modo de Emergência
 * 
 * Tela para configurar modo de emergência, PIN e privacidade.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { getActiveProfile } from '../../services/profileService';

export default function EmergencySettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [settings, setSettings] = useState({
    emergency_pin_enabled: false,
    show_blood_type: true,
    show_allergies: true,
    show_chronic_conditions: true,
    show_medications: true,
    show_emergency_contacts: true,
    show_health_insurance: true,
    show_advance_directives: false,
    show_full_name: false,
    health_insurance_name: '',
    health_insurance_number: '',
    advance_directives: '',
    qr_code_enabled: true,
    share_location_enabled: false,
    notify_contacts_on_access: true,
    is_active: true
  });
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const profile = await getActiveProfile();
      if (!profile) {
        Alert.alert('Erro', 'Perfil não encontrado');
        return;
      }

      setProfileId(profile.id);

      const response = await api.get(`/api/emergency/profile/${profile.id}`);
      setSettings(response.data);
      setShowPinInput(!response.data.emergency_pin_enabled);
    } catch (error) {
      console.error('Error loading settings:', error);
      // Se não existir, será criado ao salvar
    } finally {
      setLoading(false);
    }
  };

  const handleSavePin = async () => {
    if (pin.length !== 6) {
      Alert.alert('Erro', 'PIN deve ter 6 dígitos');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('Erro', 'PINs não coincidem');
      return;
    }

    try {
      setSaving(true);
      await api.post(`/api/emergency/profile/${profileId}/pin`, { pin });
      Alert.alert('Sucesso', 'PIN configurado com sucesso');
      setShowPinInput(false);
      setPin('');
      setConfirmPin('');
      await loadSettings();
    } catch (error) {
      console.error('Error setting PIN:', error);
      Alert.alert('Erro', 'Não foi possível configurar o PIN');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await api.put(`/api/emergency/profile/${profileId}`, settings);
      Alert.alert('Sucesso', 'Configurações salvas com sucesso');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const newActive = !settings.is_active;
    try {
      setSaving(true);
      if (newActive) {
        await api.post(`/api/emergency/profile/${profileId}/enable`);
      } else {
        await api.post(`/api/emergency/profile/${profileId}/disable`);
      }
      setSettings({ ...settings, is_active: newActive });
      Alert.alert('Sucesso', `Modo de emergência ${newActive ? 'habilitado' : 'desabilitado'}`);
    } catch (error) {
      console.error('Error toggling emergency mode:', error);
      Alert.alert('Erro', 'Não foi possível alterar o status');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Configurações de Emergência</Text>

      {/* Status do Modo de Emergência */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Modo de Emergência</Text>
          <Switch
            value={settings.is_active}
            onValueChange={handleToggleActive}
            trackColor={{ false: '#ccc', true: '#4ECDC4' }}
            thumbColor={settings.is_active ? '#fff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.sectionDescription}>
          {settings.is_active
            ? 'Modo de emergência ativo. Informações acessíveis via PIN.'
            : 'Modo de emergência desativado.'}
        </Text>
      </View>

      {/* PIN de Emergência */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PIN de Emergência</Text>
        {settings.emergency_pin_enabled ? (
          <View>
            <Text style={styles.sectionDescription}>
              PIN configurado. Para alterar, desabilite e configure novamente.
            </Text>
            <TouchableOpacity
              style={styles.disablePinButton}
              onPress={() => {
                Alert.alert(
                  'Desabilitar PIN',
                  'Tem certeza que deseja desabilitar o PIN de emergência?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Desabilitar',
                      style: 'destructive',
                      onPress: async () => {
                        // TODO: Implementar desabilitação do PIN
                        Alert.alert('Info', 'Funcionalidade em desenvolvimento');
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={styles.disablePinButtonText}>Desabilitar PIN</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionDescription}>
              Configure um PIN de 6 dígitos para acessar informações de emergência.
            </Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="PIN (6 dígitos)"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.pinInput}
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="Confirmar PIN"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={[styles.saveButton, (pin.length !== 6 || pin !== confirmPin) && styles.saveButtonDisabled]}
              onPress={handleSavePin}
              disabled={pin.length !== 6 || pin !== confirmPin || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar PIN</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Privacidade - Dados Visíveis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados Visíveis no Modo Emergência</Text>
        <Text style={styles.sectionDescription}>
          Escolha quais informações ficarão visíveis quando o modo emergência for ativado.
        </Text>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Tipo Sanguíneo</Text>
          <Switch
            value={settings.show_blood_type}
            onValueChange={(value) => setSettings({ ...settings, show_blood_type: value })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Alergias</Text>
          <Switch
            value={settings.show_allergies}
            onValueChange={(value) => setSettings({ ...settings, show_allergies: value })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Condições Crônicas</Text>
          <Switch
            value={settings.show_chronic_conditions}
            onValueChange={(value) => setSettings({ ...settings, show_chronic_conditions: value })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Medicamentos</Text>
          <Switch
            value={settings.show_medications}
            onValueChange={(value) => setSettings({ ...settings, show_medications: value })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Contatos de Emergência</Text>
          <Switch
            value={settings.show_emergency_contacts}
            onValueChange={(value) => setSettings({ ...settings, show_emergency_contacts: value })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Plano de Saúde</Text>
          <Switch
            value={settings.show_health_insurance}
            onValueChange={(value) => setSettings({ ...settings, show_health_insurance: value })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Diretivas Antecipadas</Text>
          <Switch
            value={settings.show_advance_directives}
            onValueChange={(value) => setSettings({ ...settings, show_advance_directives: value })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Mostrar Nome Completo</Text>
          <Switch
            value={settings.show_full_name}
            onValueChange={(value) => setSettings({ ...settings, show_full_name: value })}
          />
        </View>
        <Text style={styles.switchHint}>
          Se desativado, apenas iniciais serão exibidas para preservar privacidade.
        </Text>
      </View>

      {/* Informações Adicionais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Adicionais</Text>

        <Text style={styles.inputLabel}>Nome do Plano de Saúde</Text>
        <TextInput
          style={styles.textInput}
          value={settings.health_insurance_name}
          onChangeText={(value) => setSettings({ ...settings, health_insurance_name: value })}
          placeholder="Ex: Unimed, Amil, etc."
        />

        <Text style={styles.inputLabel}>Número da Carteirinha</Text>
        <TextInput
          style={styles.textInput}
          value={settings.health_insurance_number}
          onChangeText={(value) => setSettings({ ...settings, health_insurance_number: value })}
          placeholder="Número da carteirinha"
        />

        <Text style={styles.inputLabel}>Diretivas Antecipadas</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={settings.advance_directives}
          onChangeText={(value) => setSettings({ ...settings, advance_directives: value })}
          placeholder="Diretivas antecipadas de vontade..."
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Recursos Especiais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recursos Especiais</Text>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>QR Code Habilitado</Text>
          <Switch
            value={settings.qr_code_enabled}
            onValueChange={(value) => setSettings({ ...settings, qr_code_enabled: value })}
          />
        </View>
        <Text style={styles.switchHint}>
          Permite gerar QR Code para acesso rápido por paramédicos.
        </Text>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Compartilhar Localização</Text>
          <Switch
            value={settings.share_location_enabled}
            onValueChange={(value) => setSettings({ ...settings, share_location_enabled: value })}
          />
        </View>
        <Text style={styles.switchHint}>
          Compartilha localização em tempo real quando modo emergência é ativado.
        </Text>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Notificar Contatos</Text>
          <Switch
            value={settings.notify_contacts_on_access}
            onValueChange={(value) => setSettings({ ...settings, notify_contacts_on_access: value })}
          />
        </View>
        <Text style={styles.switchHint}>
          Notifica contatos de emergência quando modo emergência é acessado.
        </Text>
      </View>

      {/* Botão Salvar */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSaveSettings}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Salvar Configurações</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          O modo de emergência permite acesso rápido a informações críticas de saúde
          sem desbloquear o aparelho, usando um PIN de 6 dígitos.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30
  },
  section: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15
  },
  pinInput: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10
  },
  switchLabel: {
    fontSize: 18,
    color: '#333',
    flex: 1
  },
  switchHint: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: -10,
    marginBottom: 10
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    marginTop: 10
  },
  textInput: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  disablePinButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  disablePinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  footer: {
    marginTop: 20,
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#e8f5e9',
    borderRadius: 8
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20
  }
});
