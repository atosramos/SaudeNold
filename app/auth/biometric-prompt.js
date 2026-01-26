import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { authenticateBiometricLogin, isBiometricEnabled, isBiometricSupported } from '../../services/biometricService';
import { hasAuthToken } from '../../services/auth';
import { Ionicons } from '@expo/vector-icons';

export default function BiometricPrompt() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkBiometric = async () => {
      // #region agent log
      console.log('[BiometricPrompt] checkBiometric ENTRY');
      // #endregion
      
      const supported = await isBiometricSupported();
      const enabled = supported ? await isBiometricEnabled() : false;
      const hasToken = await hasAuthToken();
      
      // #region agent log
      console.log('[BiometricPrompt] checkBiometric STATE', { supported, enabled, hasToken });
      // #endregion
      
      setBiometricAvailable(supported);
      setBiometricEnabled(enabled);
      setChecking(false);
      
      // Se não há biometria habilitada ou já está autenticado, ir direto para login
      if (!enabled || hasToken) {
        const returnTo = params?.returnTo ? decodeURIComponent(String(params.returnTo)) : '/';
        // #region agent log
        console.log('[BiometricPrompt] checkBiometric REDIRECTING', { reason: !enabled ? 'biometric_not_enabled' : 'has_token', hasToken, returnTo });
        // #endregion
        if (hasToken) {
          router.replace(returnTo);
        } else {
          router.replace(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
        }
      } else {
        // #region agent log
        console.log('[BiometricPrompt] checkBiometric STAYING - biometric enabled and no token');
        // #endregion
      }
    };
    
    checkBiometric();
  }, [router, params]);

  const handleBiometricLogin = async () => {
    if (loading) return;
    setLoading(true);
    
    // #region agent log
    console.log('[BiometricPrompt] handleBiometricLogin ENTRY');
    // #endregion
    
    try {
      const result = await authenticateBiometricLogin();
      
      // #region agent log
      console.log('[BiometricPrompt] handleBiometricLogin RESULT', { success: result?.success, error: result?.error });
      // #endregion
      
      if (result?.success) {
        // Login por biometria bem-sucedido - navegar para home
        const returnTo = params?.returnTo ? decodeURIComponent(String(params.returnTo)) : '/';
        // #region agent log
        console.log('[BiometricPrompt] handleBiometricLogin SUCCESS - navigating to', returnTo);
        // #endregion
        router.replace(returnTo);
        return;
      }
      
      // Se foi cancelado pelo usuário, não mostrar erro
      if (result?.error === 'cancelled') {
        // #region agent log
        console.log('[BiometricPrompt] handleBiometricLogin CANCELLED - staying on screen');
        // #endregion
        setLoading(false);
        return; // Manter na tela para tentar novamente ou usar email/senha
      }
      
      // Outros erros
      if (result?.error === 'unauthorized' || result?.error === 'missing_token') {
        // #region agent log
        console.log('[BiometricPrompt] handleBiometricLogin UNAUTHORIZED - disabling biometric and redirecting to login', { error: result?.error });
        // #endregion
        
        // CRÍTICO: Se token inválido, desabilitar biometria para evitar loop
        try {
          const { setBiometricEnabled } = await import('../../services/biometricService');
          await setBiometricEnabled(false);
          // #region agent log
          console.log('[BiometricPrompt] handleBiometricLogin BIOMETRIC DISABLED due to invalid token');
          // #endregion
        } catch (disableError) {
          console.error('[BiometricPrompt] Erro ao desabilitar biometria:', disableError);
        }
        
        Alert.alert('Erro', 'Sessao invalida. Faca login novamente.');
        // Se sessão inválida, ir para login normal
        const returnTo = params?.returnTo ? decodeURIComponent(String(params.returnTo)) : '/';
        router.replace(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
      } else {
        // #region agent log
        console.log('[BiometricPrompt] handleBiometricLogin OTHER ERROR', { error: result?.error });
        // #endregion
        Alert.alert('Erro', 'Nao foi possivel autenticar por biometria. Tente novamente.');
      }
    } catch (error) {
      // #region agent log
      console.error('[BiometricPrompt] handleBiometricLogin EXCEPTION', { error: error?.message, stack: error?.stack });
      // #endregion
      console.error('Erro ao autenticar com biometria:', error);
      Alert.alert('Erro', 'Nao foi possivel autenticar por biometria. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseEmailPassword = () => {
    // #region agent log
    console.log('[BiometricPrompt] handleUseEmailPassword ENTRY - user explicitly chose email/password');
    // #endregion
    
    // CRÍTICO: Quando usuário escolhe usar email/senha, desabilitar biometria temporariamente
    // para evitar que login.js redirecione de volta para biometria
    // Isso quebra o loop
    const disableBiometricTemporarily = async () => {
      try {
        const { setBiometricEnabled } = await import('../../services/biometricService');
        await setBiometricEnabled(false);
        // #region agent log
        console.log('[BiometricPrompt] handleUseEmailPassword BIOMETRIC DISABLED temporarily');
        // #endregion
      } catch (error) {
        console.error('[BiometricPrompt] Erro ao desabilitar biometria temporariamente:', error);
      }
    };
    
    disableBiometricTemporarily();
    
    const returnTo = params?.returnTo ? decodeURIComponent(String(params.returnTo)) : '/';
    // #region agent log
    console.log('[BiometricPrompt] handleUseEmailPassword REDIRECTING TO LOGIN', { returnTo });
    // #endregion
    router.replace(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  // Mostrar loading enquanto verifica biometria
  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  // Se biometria não está habilitada, redirecionar (já feito no useEffect, mas garantir)
  if (!biometricEnabled || !biometricAvailable) {
    return null; // useEffect já redirecionou
  }

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handleUseEmailPassword}
    >
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="finger-print" size={80} color="#4ECDC4" />
        </View>
        
        <Text style={styles.title}>Entrar com Biometria</Text>
        <Text style={styles.subtitle}>
          Use sua impressao digital ou reconhecimento facial para entrar rapidamente
        </Text>

        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleBiometricLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="finger-print" size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.biometricButtonText}>Entrar com Biometria</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.emailPasswordButton}
          onPress={handleUseEmailPassword}
          disabled={loading}
        >
          <Text style={styles.emailPasswordButtonText}>Usar Email e Senha</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Toque em qualquer lugar da tela ou use o botao acima para entrar com email e senha
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  biometricButton: {
    backgroundColor: '#4ECDC4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    marginBottom: 16,
    minHeight: 56,
  },
  buttonIcon: {
    marginRight: 8,
  },
  biometricButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emailPasswordButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4ECDC4',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  emailPasswordButtonText: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
