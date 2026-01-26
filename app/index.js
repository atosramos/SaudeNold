import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getAuthUser, hasAuthToken, logoutUser } from '../services/auth';
import { useTheme } from '../contexts/ThemeContext';
import { useFontSize } from '../contexts/FontSizeContext';

export default function Home() {
  const router = useRouter();
  const { colors } = useTheme();
  const { scaleFontSize } = useFontSize();
  const [authUser, setAuthUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadAuth = useCallback(async () => {
    // Verificar autenticação de forma mais robusta
    const tokenExists = await hasAuthToken();
    let user = await getAuthUser();
    
    // Se tem token mas não tem user, tentar buscar novamente
    if (tokenExists && !user) {
      // Aguardar um pouco e tentar novamente (pode estar sendo salvo ainda)
      await new Promise(resolve => setTimeout(resolve, 300));
      user = await getAuthUser();
    }
    
    setIsAuthenticated(tokenExists);
    setAuthUser(user);
  }, []);

  // Atualizar quando a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const checkAuth = async () => {
        const tokenExists = await hasAuthToken();
        const user = await getAuthUser();
        if (isActive) {
          setIsAuthenticated(tokenExists);
          setAuthUser(user);
        }
      };
      checkAuth();
      return () => {
        isActive = false;
      };
    }, [])
  );

  // Atualizar também quando o componente monta (para garantir após login)
  useEffect(() => {
    loadAuth();
    // Adicionar delays progressivos para garantir que o token foi salvo após login
    // Isso resolve o problema de "Conta não conectada" após login bem-sucedido
    const timer1 = setTimeout(() => {
      loadAuth();
    }, 500);
    const timer2 = setTimeout(() => {
      loadAuth();
    }, 1500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [loadAuth]);

  const handleAuthPress = async () => {
    try {
      if (isAuthenticated) {
        await logoutUser();
        setIsAuthenticated(false);
        setAuthUser(null);
        return;
      }
      
      try {
        // Verificar se biometria está habilitada - se sim, mostrar tela de biometria primeiro
        const { isBiometricEnabled, isBiometricSupported } = await import('../services/biometricService');
        const supported = await isBiometricSupported();
        const enabled = supported ? await isBiometricEnabled() : false;
        
        if (enabled && supported) {
          router.replace('/auth/biometric-prompt');
        } else {
          router.replace('/auth/login');
        }
      } catch (error) {
        // Se houver erro ao verificar biometria, ir direto para login
        console.error('Erro ao verificar biometria, indo para login:', error);
        // Usar replace em vez de push para garantir navegação
        router.replace('/auth/login');
      }
    } catch (error) {
      // Capturar qualquer erro inesperado e garantir navegação para login
      console.error('Erro inesperado em handleAuthPress:', error);
      try {
        router.replace('/auth/login');
      } catch (navError) {
        console.error('Erro ao navegar para login:', navError);
        // Se mesmo a navegação falhar, tentar push como último recurso
        try {
          router.push('/auth/login');
        } catch (finalError) {
          console.error('Erro crítico na navegação:', finalError);
        }
      }
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontSize: scaleFontSize(36) }]}>Bem-vindo ao SaudeNold</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: scaleFontSize(24) }]}>Seu assistente de saúde pessoal</Text>
        <View style={[styles.authBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.authText, { color: colors.text, fontSize: scaleFontSize(14) }]}>
            {isAuthenticated && authUser?.email ? `Conta: ${authUser.email}` : isAuthenticated ? 'Conta: Autenticado' : 'Conta nao conectada'}
          </Text>
          <TouchableOpacity style={styles.authButton} onPress={handleAuthPress}>
            <Text style={[styles.authButtonText, { fontSize: scaleFontSize(14) }]}>{isAuthenticated ? 'Sair' : 'Entrar'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity 
          style={[styles.menuButton, styles.medicationsButton]}
          onPress={() => router.push('/medications')}
        >
          <Ionicons name="medical" size={48} color="#fff" />
          <Text style={[styles.menuButtonText, { fontSize: scaleFontSize(14) }]}>Meus Medicamentos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.emergencyButton]}
          onPress={() => router.push('/emergency-contacts')}
        >
          <Ionicons name="call" size={48} color="#fff" />
          <Text style={[styles.menuButtonText, { fontSize: scaleFontSize(14) }]}>Contatos de Emergência</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.visitsButton]}
          onPress={() => router.push('/doctor-visits')}
        >
          <Ionicons name="calendar" size={48} color="#fff" />
          <Text style={[styles.menuButtonText, { fontSize: scaleFontSize(14) }]}>Visitas ao Médico</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.anamnesisButton]}
          onPress={() => router.push('/anamnesis')}
        >
          <Ionicons name="document-text" size={48} color="#fff" />
          <Text style={[styles.menuButtonText, { fontSize: scaleFontSize(14) }]}>Ficha de Anamnese</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.examsButton]}
          onPress={() => router.push('/medical-exams')}
        >
          <Ionicons name="document-text" size={48} color="#fff" />
          <Text style={[styles.menuButtonText, { fontSize: scaleFontSize(14) }]}>Exames Médicos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.historyButton]}
          onPress={() => router.push('/history')}
        >
          <Ionicons name="time" size={48} color="#fff" />
          <Text style={[styles.menuButtonText, { fontSize: scaleFontSize(14) }]}>Histórico</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.vaccinesButton]}
          onPress={() => router.push('/vaccines')}
        >
          <Ionicons name="shield-checkmark" size={48} color="#fff" />
          <Text style={[styles.menuButtonText, { fontSize: scaleFontSize(14) }]}>Vacinas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.trackingButton]}
          onPress={() => router.push('/daily-tracking')}
        >
          <Ionicons name="stats-chart" size={48} color="#fff" />
          <Text style={[styles.menuButtonText, { fontSize: scaleFontSize(14) }]}>Acompanhamento Diário</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuButton, styles.familyButton]}
          onPress={() => router.push('/profile-selection')}
        >
          <Ionicons name="people" size={48} color="#fff" />
          <Text style={[styles.menuButtonText, { fontSize: scaleFontSize(14) }]}>Familiares</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.settingsButton]}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings" size={48} color="#fff" />
          <Text style={[styles.menuButtonText, { fontSize: scaleFontSize(14) }]}>Configurações</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.proButton, styles.lastButton]}
          onPress={() => router.push('/pro-license')}
        >
          <Ionicons name="star" size={48} color="#fff" />
          <Text style={[styles.menuButtonText, { fontSize: scaleFontSize(14) }]}>Licença PRO</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    flexGrow: 1,
  },
  header: {
    marginTop: 32,
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    marginBottom: 16,
  },
  authBar: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authText: {
    // fontSize aplicado inline
  },
  authButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  authButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  menu: {
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    minHeight: 120,
    marginBottom: 24,
  },
  medicationsButton: {
    backgroundColor: '#4ECDC4',
  },
  emergencyButton: {
    backgroundColor: '#FF6B6B',
  },
  visitsButton: {
    backgroundColor: '#95E1D3',
  },
  anamnesisButton: {
    backgroundColor: '#FFA07A',
  },
  examsButton: {
    backgroundColor: '#9B59B6',
  },
  historyButton: {
    backgroundColor: '#673AB7',
  },
  vaccinesButton: {
    backgroundColor: '#2ECC71',
  },
  trackingButton: {
    backgroundColor: '#E67E22',
  },
  familyButton: {
    backgroundColor: '#8E44AD',
  },
  settingsButton: {
    backgroundColor: '#1ABC9C',
  },
  proButton: {
    backgroundColor: '#FFD700',
  },
  lastButton: {
    marginBottom: 0,
  },
  menuButtonText: {
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 16,
  },
});
