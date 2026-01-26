import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Linking from 'expo-linking';
import { resendVerification, verifyEmail } from '../../services/auth';
import VoiceTextInput from '../../components/VoiceTextInput';

const resolveAuthError = (error, fallbackMessage) => {
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
  return fallbackMessage;
};

export default function VerifyEmail() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const handleUrl = (url) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      if (parsed?.path?.includes('auth/verify')) {
        if (parsed.queryParams?.email) {
          setEmail(String(parsed.queryParams.email));
        }
        if (parsed.queryParams?.token) {
          setToken(String(parsed.queryParams.token));
        }
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, []);

  const handleVerify = async () => {
    if (!email.trim() || !token.trim()) {
      Alert.alert('Erro', 'Informe email e token');
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email.trim(), token.trim());
      Alert.alert('Sucesso', 'Email verificado com sucesso!');
      router.replace('/auth/login');
    } catch (error) {
      const message = resolveAuthError(error, 'Nao foi possivel verificar');
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Informe o email');
      return;
    }
    setResending(true);
    try {
      const result = await resendVerification(email.trim());
      const debugInfo = result?.verification_token
        ? `\n\nToken de verificacao (debug): ${result.verification_token}`
        : '';
      Alert.alert('Enviado', `Verificacao reenviada.${debugInfo}`);
    } catch (error) {
      const message = resolveAuthError(error, 'Nao foi possivel reenviar');
      Alert.alert('Erro', message);
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Verificar Email</Text>
        <Text style={styles.subtitle}>Digite o token enviado para seu email</Text>

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
        <Text style={styles.inputLabel}>Token</Text>
        <VoiceTextInput
          value={token}
          onChangeText={setToken}
          placeholder="Cole o token"
          placeholderTextColor="#999"
          autoCapitalize="none"
          containerStyle={styles.inputRow}
          inputStyle={styles.inputField}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verificar</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleResend} disabled={resending}>
          {resending ? <ActivityIndicator color="#4ECDC4" /> : <Text style={styles.secondaryButtonText}>Reenviar token</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.back()}>
          <Text style={styles.linkText}>Voltar</Text>
        </TouchableOpacity>
      </View>
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
  secondaryButton: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4ECDC4',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#4ECDC4',
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
});
