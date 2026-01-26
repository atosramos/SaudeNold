import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { loginUser, resendVerification, hasAuthToken } from '../../services/auth';
import api from '../../services/api';
import VoiceTextInput from '../../components/VoiceTextInput';
import {
  authenticateBiometricLogin,
  isBiometricEnabled,
  isBiometricSupported,
} from '../../services/biometricService';
import { useTheme } from '../../contexts/ThemeContext';

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

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [healthStatus, setHealthStatus] = useState('');
  const debugTapCount = useRef(0);
  const debugTapTimer = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const loadBiometricState = async () => {
      // #region agent log
      console.log('[Login] loadBiometricState ENTRY');
      // #endregion
      
      const supported = await isBiometricSupported();
      const enabled = supported ? await isBiometricEnabled() : false;
      
      // #region agent log
      console.log('[Login] loadBiometricState BIOMETRIC STATE', { supported, enabled });
      // #endregion
      
      if (isMounted) {
        setBiometricAvailable(supported);
        setBiometricEnabledState(enabled);
        
        // IMPORTANTE: NÃO redirecionar automaticamente para biometria se o usuário já está na tela de login
        // O usuário pode ter clicado em "Usar Email e Senha" explicitamente
        // Apenas mostrar a opção de biometria, mas não forçar redirecionamento
        // #region agent log
        console.log('[Login] loadBiometricState SKIPPING AUTO-REDIRECT - user is already on login screen');
        // #endregion
      }
    };
    loadBiometricState();
    return () => {
      isMounted = false;
    };
  }, [router, params]);

  useEffect(() => {
    setApiUrl(api?.defaults?.baseURL || '');
  }, []);

  useEffect(() => {
    if (!showDebug) {
      return;
    }
    let isActive = true;
    setHealthStatus('testando...');
    api
      .get('/health', { timeout: 3000 })
      .then(() => {
        if (isActive) {
          setHealthStatus('ok');
        }
      })
      .catch(() => {
        if (isActive) {
          setHealthStatus('falhou');
        }
      });
    return () => {
      isActive = false;
    };
  }, [showDebug]);

  const handleUnverifiedEmail = async () => {
    const emailValue = email.trim();
    const params = new URLSearchParams();
    if (emailValue) {
      params.set('email', emailValue);
    }
    const verifyPath = `/auth/verify-email${params.toString() ? `?${params.toString()}` : ''}`;
    try {
      if (emailValue) {
        await resendVerification(emailValue);
        Alert.alert('Token reenviado', 'Enviamos um novo token para seu email.');
      }
    } catch (error) {
      const message = resolveAuthError(error, 'Nao foi possivel reenviar o token');
      Alert.alert('Erro', message);
    } finally {
      router.push(verifyPath);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erro', 'Informe email e senha');
      return;
    }

    setLoading(true);
    try {
      const loginResult = await loginUser(email.trim(), password);
      
      // CRÍTICO: Se chegou aqui, o backend retornou 200 OK e o token está no header do axios
      // O token JÁ está disponível em api.defaults.headers.common.Authorization
      // Não precisamos esperar - o token está lá!
      
      // Aguardar apenas um pouco para garantir que o storage foi atualizado (não crítico)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verificar se há returnTo nos parâmetros
      const returnTo = params?.returnTo ? decodeURIComponent(String(params.returnTo)) : '/';
      
      // NÃO perguntar sobre biometria automaticamente - usuário pode ativar nas configurações
      router.replace(returnTo);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const isUnverified = error?.response?.status === 403 && typeof detail === 'string' && detail.toLowerCase().includes('email nao verificado');
      if (isUnverified) {
        Alert.alert(
          'Email nao verificado',
          'Seu cadastro precisa ser verificado para entrar.',
          [
            { text: 'Verificar email', onPress: handleUnverifiedEmail },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
        return;
      }
      const message = resolveAuthError(error, 'Nao foi possivel entrar');
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const result = await authenticateBiometricLogin();
      if (!result?.success) {
        Alert.alert('Erro', 'Nao foi possivel autenticar por biometria');
        return;
      }
      router.replace('/');
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel autenticar por biometria');
    } finally {
      setLoading(false);
    }
  };

  const handleDebugTap = () => {
    if (debugTapTimer.current) {
      clearTimeout(debugTapTimer.current);
    }
    debugTapCount.current += 1;
    if (debugTapCount.current >= 5) {
      debugTapCount.current = 0;
      setShowDebug((prev) => !prev);
      return;
    }
    debugTapTimer.current = setTimeout(() => {
      debugTapCount.current = 0;
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Pressable onLongPress={() => setShowDebug((prev) => !prev)} onPress={handleDebugTap}>
          <Text style={[styles.title, { color: colors.text }]}>Entrar</Text>
        </Pressable>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Acesse sua conta</Text>
        <Text style={[styles.helper, { color: colors.textSecondary }]}>
          O cadastro permite sincronizar seus dados, recuperar a conta e usar em mais de um dispositivo.
        </Text>
        {!showDebug ? (
          <Text style={[styles.debugHint, { color: colors.textTertiary }]}>Toque 5x no titulo para ver o debug.</Text>
        ) : null}
        {showDebug ? (
          <View style={[styles.debugBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.debugText, { color: colors.text }]}>API_URL: {apiUrl || 'nao definido'}</Text>
            <Text style={[styles.debugText, { color: colors.text }]}>/health: {healthStatus || 'pendente'}</Text>
          </View>
        ) : null}
        {biometricAvailable && (
          <Text style={[styles.biometricsHelper, { color: colors.textSecondary }]}>
            A biometria usa a impressao digital do seu aparelho para entrar mais rapido.
          </Text>
        )}

        <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
        <VoiceTextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Digite seu email"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          keyboardType="email-address"
          containerStyle={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          inputStyle={[styles.inputField, { color: colors.text }]}
          helperText="Toque no microfone para ditar."
        />
        <Text style={[styles.inputLabel, { color: colors.text }]}>Senha</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.inputField, { color: colors.text }]}
            placeholder="Digite sua senha"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Entrar</Text>}
        </TouchableOpacity>

        {biometricAvailable && biometricEnabled ? (
          <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.primary }]} onPress={handleBiometricLogin} disabled={loading}>
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Entrar com biometria</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/auth/forgot-password')}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Esqueci minha senha</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/auth/register')}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Criar nova conta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/auth/verify-email')}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Verificar email</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
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
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  helper: {
    fontSize: 13,
    marginBottom: 24,
  },
  biometricsHelper: {
    fontSize: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  debugBox: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  debugText: {
    fontSize: 12,
  },
  debugHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  inputRow: {
    borderWidth: 1,
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
  },
  primaryButton: {
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
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontWeight: 'bold',
  },
});
