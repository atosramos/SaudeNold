import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { 
  activateLicense, 
  getLicenseInfo, 
  deactivateLicense, 
  hasActiveLicense,
  LICENSE_LABELS,
  LICENSE_TYPES 
} from '../services/proLicense';
import { useCustomAlert } from '../hooks/useCustomAlert';

export default function ProLicense() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [checking, setChecking] = useState(true);

  useFocusEffect(
    useCallback(() => {
      checkLicenseStatus();
    }, [])
  );

  const checkLicenseStatus = async () => {
    setChecking(true);
    try {
      const hasActive = await hasActiveLicense();
      if (hasActive) {
        const info = await getLicenseInfo();
        setLicenseInfo(info);
      } else {
        setLicenseInfo(null);
      }
    } catch (error) {
      console.error('Erro ao verificar status da licença:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      showAlert('Erro', 'Por favor, insira a chave de licença', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await activateLicense(licenseKey.trim());
      
      if (result.success) {
        showAlert(
          'Sucesso!',
          `Licença PRO ${result.licenseInfo.typeLabel} ativada com sucesso!\n\nExpira em: ${new Date(result.licenseInfo.expirationDate).toLocaleDateString('pt-BR')}`,
          'success'
        );
        setLicenseKey('');
        await checkLicenseStatus();
      } else {
        showAlert('Erro', result.error || 'Não foi possível ativar a licença', 'error');
      }
    } catch (error) {
      console.error('Erro ao ativar licença:', error);
      showAlert('Erro', 'Erro ao ativar licença: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateLicense = () => {
    Alert.alert(
      'Desativar Licença PRO',
      'Tem certeza que deseja desativar sua licença PRO? Você perderá acesso às funcionalidades PRO até ativar uma nova licença.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deactivateLicense();
              if (result.success) {
                showAlert('Sucesso', 'Licença PRO desativada com sucesso', 'success');
                await checkLicenseStatus();
              } else {
                showAlert('Erro', result.error || 'Erro ao desativar licença', 'error');
              }
            } catch (error) {
              console.error('Erro ao desativar licença:', error);
              showAlert('Erro', 'Erro ao desativar licença: ' + error.message, 'error');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <Text style={styles.title}>Licença PRO</Text>
      </View>

      <View style={styles.content}>
        {/* Status da Licença */}
        {checking ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>Verificando licença...</Text>
          </View>
        ) : licenseInfo ? (
          <View style={[styles.statusCard, styles.statusCardActive]}>
            <View style={styles.statusHeader}>
              <Ionicons name="checkmark-circle" size={48} color="#2ECC71" />
              <Text style={styles.statusTitle}>Licença PRO Ativa</Text>
            </View>
            <View style={styles.statusInfo}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Tipo:</Text>
                <Text style={styles.statusValue}>{licenseInfo.typeLabel}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Ativada em:</Text>
                <Text style={styles.statusValue}>{formatDate(licenseInfo.activatedAt)}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Expira em:</Text>
                <Text style={styles.statusValue}>{formatDate(licenseInfo.expirationDate)}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Dias restantes:</Text>
                <Text style={[styles.statusValue, licenseInfo.daysRemaining <= 7 && styles.statusWarning]}>
                  {licenseInfo.daysRemaining} {licenseInfo.daysRemaining === 1 ? 'dia' : 'dias'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.deactivateButton}
              onPress={handleDeactivateLicense}
            >
              <Ionicons name="close-circle-outline" size={24} color="#FF6B6B" />
              <Text style={styles.deactivateButtonText}>Desativar Licença</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.statusCard, styles.statusCardInactive]}>
            <View style={styles.statusHeader}>
              <Ionicons name="lock-closed" size={48} color="#FF6B6B" />
              <Text style={styles.statusTitle}>Licença PRO Não Ativa</Text>
            </View>
            <Text style={styles.statusDescription}>
              Ative uma licença PRO para desbloquear funcionalidades avançadas com Gemini AI:
            </Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                <Text style={styles.featureText}>Leitura automática de exames médicos</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                <Text style={styles.featureText}>Leitura automática de aparelhos médicos</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                <Text style={styles.featureText}>Leitura automática de receitas médicas</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                <Text style={styles.featureText}>Importação de anamnese de documentos</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                <Text style={styles.featureText}>Leitura de cartões de contatos</Text>
              </View>
            </View>
          </View>
        )}

        {/* Formulário de Ativação */}
        {!licenseInfo && (
          <View style={styles.activationCard}>
            <Text style={styles.activationTitle}>Ativar Licença PRO</Text>
            <Text style={styles.activationDescription}>
              Insira sua chave de licença no formato: PRO-XXXX-XXXX-XXXX-XXXX
            </Text>
            <TextInput
              style={styles.licenseInput}
              placeholder="PRO-XXXX-XXXX-XXXX-XXXX"
              placeholderTextColor="#999"
              value={licenseKey}
              onChangeText={(text) => setLicenseKey(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.activateButton, loading && styles.activateButtonDisabled]}
              onPress={handleActivateLicense}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.activateButtonText}>Ativando...</Text>
              ) : (
                <>
                  <Ionicons name="key" size={24} color="#fff" />
                  <Text style={styles.activateButtonText}>Ativar Licença</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Informações sobre Licenças */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Tipos de Licença Disponíveis</Text>
          <View style={styles.licenseTypesList}>
            <View style={styles.licenseTypeItem}>
              <Ionicons name="calendar" size={24} color="#4ECDC4" />
              <View style={styles.licenseTypeInfo}>
                <Text style={styles.licenseTypeName}>1 Mês</Text>
                <Text style={styles.licenseTypeDesc}>Acesso completo por 30 dias</Text>
              </View>
            </View>
            <View style={styles.licenseTypeItem}>
              <Ionicons name="calendar" size={24} color="#4ECDC4" />
              <View style={styles.licenseTypeInfo}>
                <Text style={styles.licenseTypeName}>6 Meses</Text>
                <Text style={styles.licenseTypeDesc}>Acesso completo por 180 dias</Text>
              </View>
            </View>
            <View style={styles.licenseTypeItem}>
              <Ionicons name="calendar" size={24} color="#4ECDC4" />
              <View style={styles.licenseTypeInfo}>
                <Text style={styles.licenseTypeName}>1 Ano</Text>
                <Text style={styles.licenseTypeDesc}>Acesso completo por 365 dias</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nota sobre Entrada Manual */}
        <View style={styles.noteCard}>
          <Ionicons name="information-circle" size={24} color="#3498DB" />
          <Text style={styles.noteText}>
            <Text style={styles.noteBold}>Importante:</Text> Mesmo sem licença PRO, você pode inserir todos os dados manualmente. A licença PRO apenas habilita a leitura automática com inteligência artificial.
          </Text>
        </View>
      </View>

      <AlertComponent />
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
  content: {
    padding: 24,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
  },
  statusCardActive: {
    borderColor: '#2ECC71',
  },
  statusCardInactive: {
    borderColor: '#FF6B6B',
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  statusDescription: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusInfo: {
    marginTop: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 18,
    color: '#666',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusWarning: {
    color: '#FF6B6B',
  },
  statusText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  featuresList: {
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  deactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFE5E5',
  },
  deactivateButtonText: {
    fontSize: 18,
    color: '#FF6B6B',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  activationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  activationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  activationDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  licenseInput: {
    borderWidth: 2,
    borderColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    padding: 20,
    borderRadius: 12,
    minHeight: 70,
  },
  activateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  activateButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  licenseTypesList: {
    gap: 16,
  },
  licenseTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  licenseTypeInfo: {
    marginLeft: 16,
    flex: 1,
  },
  licenseTypeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  licenseTypeDesc: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  noteText: {
    flex: 1,
    fontSize: 16,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 24,
  },
  noteBold: {
    fontWeight: 'bold',
  },
});
