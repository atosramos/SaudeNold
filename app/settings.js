import { StyleSheet, Text, View, TouchableOpacity, Switch, ScrollView, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { isBiometricSupported, isBiometricEnabled, enrollBiometricLogin, setBiometricEnabled } from '../services/biometricService';
import { hasAuthToken } from '../services/auth';
import { useTheme } from '../contexts/ThemeContext';
import { useFontSize, FONT_SIZES } from '../contexts/FontSizeContext';
import { setProfilePin, getActiveProfile, verifyProfilePin } from '../services/profileService';
import { getActiveProfileId } from '../services/profileStorageManager';
import { getProfileAuthTimeout, setProfileAuthTimeout } from '../services/profileAuth';

export default function Settings() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { fontSize, updateFontSize, scaleFontSize } = useFontSize();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinMode, setPinMode] = useState('setup'); // 'setup' ou 'change'
  const [currentPin, setCurrentPin] = useState('');
  const [hasPin, setHasPin] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState(10);

  const loadBiometricState = useCallback(async () => {
    try {
      console.log('[Settings] Carregando estado da biometria...');
      const supported = await isBiometricSupported();
      const enabled = supported ? await isBiometricEnabled() : false;
      const authenticated = await hasAuthToken();
      
      // Verificar se o perfil ativo tem PIN configurado
      const activeProfileId = await getActiveProfileId();
      let pinEnabled = false;
      let timeout = 10;
      if (activeProfileId) {
        try {
          const activeProfile = await getActiveProfile();
          pinEnabled = activeProfile?.pin_enabled || false;
          timeout = await getProfileAuthTimeout(activeProfileId);
        } catch (error) {
          console.warn('[Settings] Erro ao verificar PIN do perfil:', error);
        }
      }
      
      console.log('[Settings] Estado carregado - supported:', supported, 'enabled:', enabled, 'authenticated:', authenticated, 'hasPin:', pinEnabled, 'timeout:', timeout);
      
      setBiometricSupported(supported);
      setBiometricEnabledState(enabled);
      setIsAuthenticated(authenticated);
      setHasPin(pinEnabled);
      setTimeoutMinutes(timeout);
    } catch (error) {
      console.error('[Settings] Erro ao carregar estado da biometria:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBiometricState();
    }, [loadBiometricState])
  );

  useEffect(() => {
    loadBiometricState();
  }, [loadBiometricState]);

  const handleBiometricToggle = async (value) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'settings.js:69',
        message: 'handleBiometricToggle ENTRY',
        data: { value, isAuthenticated, biometricSupported },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A'
      })
    }).catch(() => {});
    // #endregion
    
    console.log('[Settings] handleBiometricToggle chamado com value:', value);
    console.log('[Settings] isAuthenticated:', isAuthenticated);
    console.log('[Settings] biometricSupported:', biometricSupported);
    
    if (!isAuthenticated) {
      console.warn('[Settings] Usuário não autenticado, bloqueando toggle');
      Alert.alert('Atenção', 'Você precisa estar logado para ativar a biometria.');
      // Reverter o estado do Switch
      setBiometricEnabledState(!value);
      return;
    }

    if (!biometricSupported) {
      console.warn('[Settings] Biometria não suportada, bloqueando toggle');
      Alert.alert('Atenção', 'Biometria não está disponível neste dispositivo.');
      setBiometricEnabledState(!value);
      return;
    }

    if (value) {
      console.log('[Settings] Ativando biometria...');
      // Ativar biometria
      setBiometricLoading(true);
      try {
        // Obter profileId ativo antes de chamar enrollBiometricLogin
        const activeProfileId = await getActiveProfileId();
        console.log('[Settings] ProfileId ativo:', activeProfileId);
        console.log('[Settings] Chamando enrollBiometricLogin com profileId:', activeProfileId);
        const enrolled = await enrollBiometricLogin(activeProfileId);
        console.log('[Settings] Resultado de enrollBiometricLogin:', enrolled);
        
        if (enrolled?.success) {
          console.log('[Settings] Biometria ativada com sucesso!');
          setBiometricEnabledState(true);
          await loadBiometricState(); // Recarregar estado para garantir sincronização
          Alert.alert('Sucesso', 'Biometria ativada com sucesso!');
        } else {
          console.error('[Settings] Falha ao ativar biometria:', enrolled?.error);
          // Reverter o estado do Switch em caso de erro
          setBiometricEnabledState(false);
          const error = enrolled?.error;
          const message =
            error === 'unauthorized'
              ? 'Sessão inválida. Faça login novamente.'
              : error === 'register_failed'
                ? 'Não foi possível registrar a biometria no servidor. Tente novamente.'
                : error === 'unavailable'
                  ? 'Biometria não disponível neste dispositivo.'
                  : error === 'missing_token'
                    ? 'Token de autenticação não encontrado. Faça login novamente.'
                    : 'Não foi possível ativar a biometria. Tente novamente.';
          Alert.alert('Erro', message);
          if (error === 'unauthorized') {
            router.replace('/auth/login');
          }
        }
      } catch (error) {
        console.error('[Settings] Erro ao ativar biometria (catch):', error);
        // Reverter o estado do Switch em caso de erro
        setBiometricEnabledState(false);
        Alert.alert('Erro', `Não foi possível ativar a biometria: ${error?.message || 'Erro desconhecido'}`);
      } finally {
        setBiometricLoading(false);
      }
    } else {
      // Desativar biometria
      Alert.alert(
        'Desativar biometria',
        'Tem certeza que deseja desativar a biometria? Você precisará usar email e senha para entrar.',
        [
          { 
            text: 'Cancelar', 
            style: 'cancel', 
            onPress: () => {
              // Reverter o estado do Switch se cancelar
              setBiometricEnabledState(true);
            }
          },
          {
            text: 'Desativar',
            style: 'destructive',
            onPress: async () => {
              setBiometricLoading(true);
              try {
                await setBiometricEnabled(false);
                setBiometricEnabledState(false);
                await loadBiometricState(); // Recarregar estado para garantir sincronização
                Alert.alert('Sucesso', 'Biometria desativada.');
              } catch (error) {
                console.error('Erro ao desativar biometria:', error);
                // Reverter o estado do Switch em caso de erro
                setBiometricEnabledState(true);
                Alert.alert('Erro', 'Não foi possível desativar a biometria.');
              } finally {
                setBiometricLoading(false);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Gerencie as configurações do aplicativo</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaleFontSize(18) }]}>Segurança</Text>
        
        <View style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.settingContent} pointerEvents="box-none">
            <Ionicons name="finger-print" size={24} color={colors.primary} style={styles.settingIcon} />
            <View style={styles.settingTextContainer} pointerEvents="box-none">
              <Text style={[styles.settingLabel, { color: colors.text, fontSize: scaleFontSize(16) }]}>Biometria</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: scaleFontSize(13) }]}>
                {biometricSupported
                  ? 'Use impressão digital ou reconhecimento facial para entrar rapidamente'
                  : 'Biometria não disponível neste dispositivo'}
              </Text>
            </View>
          </View>
          {biometricLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={biometricEnabled}
              onValueChange={(newValue) => {
                console.log('[Settings] Switch onValueChange chamado:', newValue);
                console.log('[Settings] Estado atual - biometricEnabled:', biometricEnabled);
                console.log('[Settings] Estado atual - biometricSupported:', biometricSupported);
                console.log('[Settings] Estado atual - isAuthenticated:', isAuthenticated);
                console.log('[Settings] Estado atual - biometricLoading:', biometricLoading);
                handleBiometricToggle(newValue).catch((error) => {
                  console.error('[Settings] Erro não capturado em handleBiometricToggle:', error);
                  Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
                });
              }}
              disabled={!biometricSupported || !isAuthenticated || biometricLoading}
              trackColor={{ false: '#ccc', true: colors.primary }}
              thumbColor={biometricEnabled ? '#fff' : '#f4f3f4'}
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            setPinMode(hasPin ? 'change' : 'setup');
            setPinValue('');
            setPinConfirm('');
            setCurrentPin('');
            setShowPinModal(true);
          }}
        >
          <View style={styles.settingContent}>
            <Ionicons name="lock-closed" size={24} color={colors.primary} style={styles.settingIcon} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text, fontSize: scaleFontSize(16) }]}>
                {hasPin ? 'Alterar PIN' : 'Configurar PIN'}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: scaleFontSize(13) }]}>
                {hasPin ? 'Altere o PIN de segurança do perfil' : 'Configure um PIN de segurança para o perfil'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowTimeoutModal(true)}
        >
          <View style={styles.settingContent}>
            <Ionicons name="time-outline" size={24} color={colors.primary} style={styles.settingIcon} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text, fontSize: scaleFontSize(16) }]}>
                Timeout de Inatividade
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: scaleFontSize(13) }]}>
                {timeoutMinutes} minutos - Tempo antes de solicitar reautenticação
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaleFontSize(18) }]}>Aparência</Text>
        
        <View style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.settingContent}>
            <Ionicons name={isDark ? "moon" : "sunny"} size={24} color={colors.primary} style={styles.settingIcon} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text, fontSize: scaleFontSize(16) }]}>Tema Escuro</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: scaleFontSize(13) }]}>
                {isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#ccc', true: colors.primary }}
            thumbColor={isDark ? '#fff' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowFontSizeModal(true)}
        >
          <View style={styles.settingContent}>
            <Ionicons name="text" size={24} color={colors.primary} style={styles.settingIcon} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text, fontSize: scaleFontSize(16) }]}>Tamanho da Fonte</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: scaleFontSize(13) }]}>
                {fontSize === FONT_SIZES.small ? 'Pequena (atual)' : fontSize === FONT_SIZES.medium ? 'Média' : 'Grande'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaleFontSize(18) }]}>Conta</Text>
        
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/sessions')}
        >
          <View style={styles.settingContent}>
            <Ionicons name="phone-portrait" size={24} color={colors.primary} style={styles.settingIcon} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text, fontSize: scaleFontSize(16) }]}>Dispositivos Logados</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: scaleFontSize(13) }]}>
                Gerencie dispositivos conectados e encerre acessos
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Modal de seleção de tamanho de fonte */}
      <Modal
        visible={showFontSizeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFontSizeModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: scaleFontSize(20) }]}>Tamanho da Fonte</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary, fontSize: scaleFontSize(14) }]}>
              Escolha o tamanho da fonte que melhor se adapta a você
            </Text>

            <TouchableOpacity
              style={[
                styles.fontSizeOption,
                { backgroundColor: colors.background, borderColor: colors.border },
                fontSize === FONT_SIZES.small && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
              ]}
              onPress={async () => {
                await updateFontSize(FONT_SIZES.small);
                setShowFontSizeModal(false);
              }}
            >
              <View style={styles.fontSizeOptionContent}>
                <Text style={[styles.fontSizeLabel, { color: colors.text, fontSize: scaleFontSize(16) }]}>Pequena</Text>
                <Text style={[styles.fontSizePreview, { color: colors.textSecondary, fontSize: 14 }]}>
                  Texto de exemplo com fonte pequena
                </Text>
              </View>
              {fontSize === FONT_SIZES.small && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.fontSizeOption,
                { backgroundColor: colors.background, borderColor: colors.border },
                fontSize === FONT_SIZES.medium && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
              ]}
              onPress={async () => {
                await updateFontSize(FONT_SIZES.medium);
                setShowFontSizeModal(false);
              }}
            >
              <View style={styles.fontSizeOptionContent}>
                <Text style={[styles.fontSizeLabel, { color: colors.text, fontSize: scaleFontSize(16) }]}>Média</Text>
                <Text style={[styles.fontSizePreview, { color: colors.textSecondary, fontSize: Math.round(14 * 1.2) }]}>
                  Texto de exemplo com fonte média
                </Text>
              </View>
              {fontSize === FONT_SIZES.medium && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.fontSizeOption,
                { backgroundColor: colors.background, borderColor: colors.border },
                fontSize === FONT_SIZES.large && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
              ]}
              onPress={async () => {
                await updateFontSize(FONT_SIZES.large);
                setShowFontSizeModal(false);
              }}
            >
              <View style={styles.fontSizeOptionContent}>
                <Text style={[styles.fontSizeLabel, { color: colors.text, fontSize: scaleFontSize(16) }]}>Grande</Text>
                <Text style={[styles.fontSizePreview, { color: colors.textSecondary, fontSize: Math.round(14 * 1.4) }]}>
                  Texto de exemplo com fonte grande
                </Text>
              </View>
              {fontSize === FONT_SIZES.large && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalCancelButton, { borderColor: colors.border }]}
              onPress={() => setShowFontSizeModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary, fontSize: scaleFontSize(16) }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          </View>
        </Modal>

      {/* Modal de configuração de PIN */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: scaleFontSize(20) }]}>
              {pinMode === 'change' ? 'Alterar PIN' : 'Configurar PIN'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary, fontSize: scaleFontSize(14) }]}>
              {pinMode === 'change' 
                ? 'Digite o PIN atual e o novo PIN' 
                : 'Configure um PIN de segurança para proteger seu perfil'}
            </Text>

            {pinMode === 'change' && (
              <TextInput
                style={[styles.pinInput, { borderColor: colors.border, color: colors.text }]}
                value={currentPin}
                onChangeText={setCurrentPin}
                placeholder="PIN atual"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={10}
              />
            )}

            <TextInput
              style={[styles.pinInput, { borderColor: colors.border, color: colors.text }]}
              value={pinValue}
              onChangeText={setPinValue}
              placeholder="Novo PIN"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={10}
            />

            <TextInput
              style={[styles.pinInput, { borderColor: colors.border, color: colors.text }]}
              value={pinConfirm}
              onChangeText={setPinConfirm}
              placeholder="Confirmar PIN"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={10}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowPinModal(false);
                  setPinValue('');
                  setPinConfirm('');
                  setCurrentPin('');
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary, fontSize: scaleFontSize(16) }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  try {
                    if (pinMode === 'change') {
                      // Verificar PIN atual
                      const activeProfileId = await getActiveProfileId();
                      if (!activeProfileId) {
                        Alert.alert('Erro', 'Nenhum perfil ativo encontrado.');
                        return;
                      }
                      const isValid = await verifyProfilePin(activeProfileId, currentPin);
                      if (!isValid) {
                        Alert.alert('Erro', 'PIN atual incorreto.');
                        return;
                      }
                    }

                    if (!/^\d{4,}$/.test(pinValue)) {
                      Alert.alert('PIN inválido', 'Use ao menos 4 dígitos numéricos.');
                      return;
                    }

                    if (pinValue !== pinConfirm) {
                      Alert.alert('PIN diferente', 'Confirme o mesmo PIN nos dois campos.');
                      return;
                    }

                    const activeProfileId = await getActiveProfileId();
                    if (!activeProfileId) {
                      Alert.alert('Erro', 'Nenhum perfil ativo encontrado.');
                      return;
                    }

                    await setProfilePin(activeProfileId, pinValue);
                    // Recarregar estado completo (incluindo PIN)
                    await loadBiometricState();
                    setShowPinModal(false);
                    setPinValue('');
                    setPinConfirm('');
                    setCurrentPin('');
                    Alert.alert('Sucesso', pinMode === 'change' ? 'PIN alterado com sucesso!' : 'PIN configurado com sucesso!');
                  } catch (error) {
                    console.error('[Settings] Erro ao configurar PIN:', error);
                    Alert.alert('Erro', `Não foi possível configurar o PIN: ${error?.message || 'Erro desconhecido'}`);
                  }
                }}
              >
                <Text style={[styles.modalConfirmText, { color: '#fff', fontSize: scaleFontSize(16) }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de configuração de timeout */}
      <Modal
        visible={showTimeoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimeoutModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: scaleFontSize(20) }]}>
              Timeout de Inatividade
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary, fontSize: scaleFontSize(14) }]}>
              Escolha o tempo antes de solicitar reautenticação após inatividade
            </Text>

            {[5, 10, 15].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.fontSizeOption,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  timeoutMinutes === minutes && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
                onPress={async () => {
                  try {
                    const activeProfileId = await getActiveProfileId();
                    if (!activeProfileId) {
                      Alert.alert('Erro', 'Nenhum perfil ativo encontrado.');
                      return;
                    }
                    await setProfileAuthTimeout(activeProfileId, minutes);
                    setTimeoutMinutes(minutes);
                    setShowTimeoutModal(false);
                    Alert.alert('Sucesso', `Timeout configurado para ${minutes} minutos.`);
                  } catch (error) {
                    console.error('[Settings] Erro ao configurar timeout:', error);
                    Alert.alert('Erro', `Não foi possível configurar o timeout: ${error?.message || 'Erro desconhecido'}`);
                  }
                }}
              >
                <View style={styles.fontSizeOptionContent}>
                  <Text style={[styles.fontSizeLabel, { color: colors.text, fontSize: scaleFontSize(16) }]}>
                    {minutes} minutos
                  </Text>
                  <Text style={[styles.fontSizePreview, { color: colors.textSecondary, fontSize: 14 }]}>
                    {minutes === 5 ? 'Mais seguro, solicita reautenticação com mais frequência' :
                     minutes === 10 ? 'Equilibrado entre segurança e conveniência (padrão)' :
                     'Mais conveniente, menos solicitações de reautenticação'}
                  </Text>
                </View>
                {timeoutMinutes === minutes && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.border }]}
                onPress={() => setShowTimeoutModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary, fontSize: scaleFontSize(16) }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginTop: 16,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  fontSizeOption: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fontSizeOptionContent: {
    flex: 1,
  },
  fontSizeLabel: {
    fontWeight: '600',
    marginBottom: 8,
  },
  fontSizePreview: {
    marginTop: 4,
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontWeight: '600',
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalConfirmButton: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontWeight: '600',
  },
});
