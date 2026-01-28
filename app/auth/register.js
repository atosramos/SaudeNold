import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { registerUser, resendVerification } from '../../services/auth';
import PasswordStrengthIndicator, { isPasswordStrong } from '../../components/PasswordStrengthIndicator';
import VoiceTextInput from '../../components/VoiceTextInput';
import TermsAcceptance from '../../components/TermsAcceptance';
import { useAlert } from '../../contexts/AlertContext';

const resolveRegisterError = (error) => {
  const data = error?.response?.data;
  if (typeof data?.detail === 'string') {
    return data.detail;
  }
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstDetail = data.detail[0];
    if (typeof firstDetail?.msg === 'string') {
      return firstDetail.msg;
    }
    if (typeof firstDetail === 'string') {
      return firstDetail;
    }
  }
  if (typeof data?.message === 'string') {
    return data.message;
  }
  if (error?.message?.toLowerCase().includes('network')) {
    return 'Falha de conexao com o servidor';
  }
  if (error?.code === 'ECONNABORTED') {
    return 'Timeout na conexao com o servidor';
  }
  return 'Nao foi possivel cadastrar';
};

export default function Register() {
  const router = useRouter();
  const { showAlert, showError, showWarning } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      showError('Informe email e senha');
      return;
    }
    if (password !== confirm) {
      showError('As senhas nao conferem');
      return;
    }
    if (!isPasswordStrong(password)) {
      showError('Senha fraca. Atenda todos os requisitos.');
      return;
    }
    if (!termsAccepted) {
      showWarning('Você precisa aceitar os termos de uso e política de privacidade para continuar.');
      return;
    }

    setLoading(true);
    try {
        const result = await registerUser(email.trim(), password, true); // terms_accepted = true
        if (result?.verification_required) {
          const emailValue = email.trim();
          const tokenValue = result?.verification_token || '';
          const params = new URLSearchParams();
          if (emailValue) {
            params.set('email', emailValue);
          }
          if (tokenValue) {
            params.set('token', tokenValue);
          }
          const verifyPath = `/auth/verify-email${params.toString() ? `?${params.toString()}` : ''}`;
          showAlert(
            'Verificacao de email',
            'Enviamos um link de verificacao para seu email. Verifique para continuar.',
            'info'
          );
          router.replace(verifyPath);
          return;
        }
        router.replace('/');
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const isEmailExists = error?.response?.status === 400 && typeof detail === 'string' && detail.toLowerCase().includes('email ja cadastrado');
      if (isEmailExists) {
        const emailValue = email.trim();
        const params = new URLSearchParams();
        if (emailValue) {
          params.set('email', emailValue);
        }
        const verifyPath = `/auth/verify-email${params.toString() ? `?${params.toString()}` : ''}`;
        showAlert(
          'Email ja cadastrado',
          'Esse email ja possui cadastro. Se nao verificou, podemos reenviar o token.',
          'warning',
          [
            {
              text: 'Reenviar token',
              onPress: async () => {
                try {
                  if (emailValue) {
                    await resendVerification(emailValue);
                    showAlert('Token reenviado', 'Enviamos um novo token para seu email.', 'info');
                  }
                } catch (resendError) {
                  const resendMessage = resolveRegisterError(resendError);
                  showError(resendMessage);
                } finally {
                  router.push(verifyPath);
                }
              },
            },
            { text: 'Entrar', onPress: () => router.replace('/auth/login') },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
        return;
      }
      const message = resolveRegisterError(error);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Configure seu acesso</Text>
        <Text style={styles.helper}>
          O cadastro permite sincronizar seus dados, recuperar a conta e usar em mais de um dispositivo.
        </Text>

        <Text style={styles.inputLabel}>Email</Text>
        <VoiceTextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Digite seu email"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          containerStyle={styles.inputRow}
          inputStyle={styles.inputField}
          helperText="Toque no microfone para ditar."
        />
        <Text style={styles.inputLabel}>Senha</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputField}
            placeholder="Digite sua senha"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <PasswordStrengthIndicator password={password} />
        <Text style={styles.inputLabel}>Confirmar senha</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputField}
            placeholder="Repita sua senha"
            placeholderTextColor="#999"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        <TouchableOpacity 
          style={[styles.termsButton, { borderColor: termsAccepted ? '#4ECDC4' : '#e0e0e0' }]}
          onPress={() => setShowTermsModal(true)}
        >
          <Text style={[styles.termsText, { color: termsAccepted ? '#4ECDC4' : '#666' }]}>
            {termsAccepted ? '✓ Termos aceitos' : 'Ler e aceitar termos de uso e política de privacidade'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading || !termsAccepted}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Cadastrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.back()}>
          <Text style={styles.linkText}>Ja tenho conta</Text>
        </TouchableOpacity>
      </View>

      <TermsAcceptance
        visible={showTermsModal}
        onAccept={() => {
          setTermsAccepted(true);
          setShowTermsModal(false);
        }}
        onCancel={() => setShowTermsModal(false)}
        required={true}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  helper: {
    fontSize: 13,
    color: '#777',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  inputRow: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#4ECDC4',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
  termsButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
