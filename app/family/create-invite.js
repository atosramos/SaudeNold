import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Switch, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createFamilyInvite } from '../../services/familyService';
import { authenticateBiometricLogin, isBiometricSupported, isBiometricEnabled } from '../../services/biometricService';
import { getAuthUser } from '../../services/auth';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { hasActiveLicense } from '../../services/proLicense';

export default function CreateInvite() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: true,
    can_edit: false,
    can_delete: false,
  });

  useEffect(() => {
    const checkBiometric = async () => {
      const supported = await isBiometricSupported();
      const enabled = supported ? await isBiometricEnabled() : false;
      setBiometricAvailable(supported);
      setBiometricEnabled(enabled);
    };
    checkBiometric();
  }, []);

  const validateEmail = (emailValue) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handleContinue = async () => {
    // Verificar licença Pro antes de continuar
    try {
      const hasPro = await hasActiveLicense();
      if (!hasPro) {
        Alert.alert(
          'Licença PRO necessária',
          'Para criar convites familiares quando os dados estão armazenados no servidor, é necessário ter uma licença PRO ativa.\n\nDeseja adquirir uma licença PRO?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ver Licenças',
              onPress: () => router.push('/pro-license'),
            },
          ]
        );
        return;
      }
    } catch (error) {
      console.error('Erro ao verificar licença Pro:', error);
      // Continuar mesmo se houver erro na verificação (backend vai validar)
    }

    const emailValue = email.trim();
    if (!emailValue) {
      Alert.alert('Erro', 'Informe o email de destino');
      return;
    }
    if (!validateEmail(emailValue)) {
      Alert.alert('Erro', 'Email inválido');
      return;
    }
    setShowPasswordModal(true);
  };

  const verifyPassword = async () => {
    try {
      const user = await getAuthUser();
      if (!user?.email) {
        Alert.alert('Erro', 'Usuário não encontrado');
        return false;
      }

      // Verificar senha fazendo login temporário
      const response = await api.post('/api/auth/login', {
        email: user.email,
        password: password,
        device: { device_id: null },
      });

      return response?.status === 200;
    } catch (error) {
      if (error?.response?.status === 401) {
        return false;
      }
      throw error;
    }
  };

  const verifyBiometric = async () => {
    try {
      const result = await authenticateBiometricLogin();
      return result?.success === true;
    } catch (error) {
      return false;
    }
  };

  const handleConfirm = async (useBiometric = false) => {
    if (loading) return;

    setLoading(true);
    try {
      let verified = false;

      if (useBiometric && biometricEnabled) {
        verified = await verifyBiometric();
        if (!verified) {
          Alert.alert('Erro', 'Biometria não autenticada');
          setLoading(false);
          return;
        }
      } else {
        if (!password.trim()) {
          Alert.alert('Erro', 'Informe sua senha');
          setLoading(false);
          return;
        }
        verified = await verifyPassword();
        if (!verified) {
          Alert.alert('Erro', 'Senha incorreta');
          setLoading(false);
          return;
        }
      }

      // Criar convite com permissões
      const emailValue = email.trim();
      const response = await createFamilyInvite(emailValue, permissions);
      
      setShowPasswordModal(false);
      setEmail('');
      setPassword('');
      
      Alert.alert('Convite criado', 'O convite foi enviado por email com sucesso.');
      
      router.back();
    } catch (error) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Não foi possível criar o convite.';
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Criar Convite</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>Email do convidado</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={email}
          onChangeText={setEmail}
          placeholder="exemplo@email.com"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Um convite será enviado por email para o destinatário.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Permissões do convidado</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Defina o que o convidado poderá fazer com seus dados:
        </Text>

        <View style={[styles.permissionItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.permissionContent}>
            <Ionicons name="eye" size={20} color={colors.primary} style={styles.permissionIcon} />
            <View style={styles.permissionTextContainer}>
              <Text style={[styles.permissionLabel, { color: colors.text }]}>Ver dados</Text>
              <Text style={[styles.permissionDescription, { color: colors.textSecondary }]}>
                O convidado poderá visualizar seus dados
              </Text>
            </View>
          </View>
          <Switch
            value={permissions.can_view}
            onValueChange={(value) => setPermissions({ ...permissions, can_view: value })}
            trackColor={{ false: '#ccc', true: colors.primary }}
            thumbColor={permissions.can_view ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={[styles.permissionItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.permissionContent}>
            <Ionicons name="create" size={20} color={colors.primary} style={styles.permissionIcon} />
            <View style={styles.permissionTextContainer}>
              <Text style={[styles.permissionLabel, { color: colors.text }]}>Editar/Salvar</Text>
              <Text style={[styles.permissionDescription, { color: colors.textSecondary }]}>
                O convidado poderá editar e salvar seus dados
              </Text>
            </View>
          </View>
          <Switch
            value={permissions.can_edit}
            onValueChange={(value) => setPermissions({ ...permissions, can_edit: value })}
            disabled={!permissions.can_view}
            trackColor={{ false: '#ccc', true: colors.primary }}
            thumbColor={permissions.can_edit ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={[styles.permissionItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.permissionContent}>
            <Ionicons name="trash" size={20} color={colors.primary} style={styles.permissionIcon} />
            <View style={styles.permissionTextContainer}>
              <Text style={[styles.permissionLabel, { color: colors.text }]}>Deletar</Text>
              <Text style={[styles.permissionDescription, { color: colors.textSecondary }]}>
                O convidado poderá deletar seus dados
              </Text>
            </View>
          </View>
          <Switch
            value={permissions.can_delete}
            onValueChange={(value) => setPermissions({ ...permissions, can_delete: value })}
            disabled={!permissions.can_edit}
            trackColor={{ false: '#ccc', true: colors.primary }}
            thumbColor={permissions.can_delete ? '#fff' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de confirmação com senha/biometria */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => !loading && setShowPasswordModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirmar envio</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Para enviar o convite, confirme sua identidade
            </Text>

            {biometricAvailable && biometricEnabled && (
              <TouchableOpacity
                style={[styles.biometricButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
                onPress={() => handleConfirm(true)}
                disabled={loading}
              >
                <Ionicons name="finger-print" size={24} color="#fff" />
                <Text style={styles.biometricButtonText}>Usar biometria</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.orText, { color: colors.textTertiary }]}>ou</Text>

            <TextInput
              style={[styles.passwordInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Digite sua senha"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              editable={!loading}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
                onPress={() => handleConfirm(false)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  biometricButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  orText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  permissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionIcon: {
    marginRight: 12,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 12,
  },
});
