import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { enrollBiometricLogin } from '../../services/biometricService';

const getReturnTo = (params) => {
  const raw = params?.returnTo ? String(params.returnTo) : '/';
  try {
    return decodeURIComponent(raw);
  } catch {
    return '/';
  }
};

export default function BiometricSuggestion() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const returnTo = getReturnTo(params);

  const handleSkip = () => {
    router.replace(returnTo);
  };

  const handleEnable = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Aguardar um pouco para garantir que tudo está pronto
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const enrolled = await enrollBiometricLogin();
      
      // Se retornou success, tudo OK - navegar
      if (enrolled?.success) {
        router.replace(returnTo);
        return;
      }
      
      // Se não foi sucesso, tratar erros
      const error = enrolled?.error;
      
      // Se for missing_token, tentar mais uma vez (pode ser race condition)
      if (error === 'missing_token') {
        console.warn('Token não encontrado na primeira tentativa, tentando novamente...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryEnrolled = await enrollBiometricLogin();
        
        if (retryEnrolled?.success) {
          // Se funcionou na segunda tentativa, continuar
          router.replace(returnTo);
          return;
        }
        
        // Se ainda falhou, mostrar erro
        const retryError = retryEnrolled?.error;
        const message =
          retryError === 'unauthorized'
            ? 'Sessao invalida. Faca login novamente.'
            : retryError === 'register_failed'
              ? 'Nao foi possivel registrar a biometria no servidor. Tente novamente.'
              : 'Nao foi possivel ativar a biometria. Tente novamente.';
        Alert.alert('Erro', message);
        if (retryError === 'unauthorized') {
          router.replace('/auth/login');
        }
        setLoading(false);
        return;
      }
      
      // Outros erros
      const message =
        error === 'unauthorized'
          ? 'Sessao invalida. Faca login novamente.'
          : error === 'register_failed'
            ? 'Nao foi possivel registrar a biometria no servidor. Tente novamente.'
            : error === 'unavailable'
              ? 'Biometria nao disponivel neste dispositivo.'
              : 'Nao foi possivel ativar a biometria.';
      Alert.alert('Erro', message);
      if (error === 'unauthorized') {
        router.replace('/auth/login');
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao ativar biometria:', error);
      Alert.alert('Erro', 'Nao foi possivel ativar a biometria. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="finger-print" size={64} color="#4ECDC4" />
        <Text style={styles.title}>Ativar biometria?</Text>
        <Text style={styles.subtitle}>
          Use impressao digital para entrar mais rapido e com seguranca.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleEnable}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>Sim, ativar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
          <Text style={styles.secondaryButtonText}>Agora nao</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4ECDC4',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
