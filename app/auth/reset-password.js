import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Linking from 'expo-linking';
import { resetPassword } from '../../services/auth';
import PasswordStrengthIndicator, { isPasswordStrong } from '../../components/PasswordStrengthIndicator';
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

export default function ResetPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUrl = (url) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      if (parsed?.path?.includes('auth/reset')) {
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

  const handleReset = async () => {
    if (!email.trim() || !token.trim()) {
      Alert.alert('Erro', 'Informe email e token');
      return;
    }
    if (!password) {
      Alert.alert('Erro', 'Informe a nova senha');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Erro', 'As senhas nao conferem');
      return;
    }
    if (!isPasswordStrong(password)) {
      Alert.alert('Erro', 'Senha fraca. Atenda todos os requisitos.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim(), token.trim(), password);
      Alert.alert('Sucesso', 'Senha atualizada com sucesso!');
      router.replace('/auth/login');
    } catch (error) {
      const message = resolveAuthError(error, 'Nao foi possivel resetar');
      Alert.alert('Erro', message);
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
        <Text style={styles.title}>Resetar senha</Text>
        <Text style={styles.subtitle}>Informe token e nova senha</Text>

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
        <Text style={styles.inputLabel}>Nova senha</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputField}
            placeholder="Digite a nova senha"
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
            placeholder="Repita a nova senha"
            placeholderTextColor="#999"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Resetar</Text>}
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
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
});
