import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ProfileCard from '../components/ProfileCard';
import {
  loadProfiles,
  syncProfilesWithServer,
  ACCOUNT_TYPES,
  switchToProfile,
  setProfilePin,
  getActiveProfile,
  removeProfile,
  getProfileById,
  updateProfile,
} from '../services/profileService';
import { getActiveProfileId, setActiveProfile } from '../services/profileStorageManager';
import { authenticateProfileWithBiometrics, authenticateProfileWithPin } from '../services/profileAuth';
import { enrollBiometricLogin, isBiometricEnabled, isBiometricSupported } from '../services/biometricService';
import { deleteFamilyProfile } from '../services/familyService';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfileSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [setupPinConfirm, setSetupPinConfirm] = useState('');
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuProfile, setContextMenuProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { colors } = useTheme();

  const loadData = async () => {
    await syncProfilesWithServer();
    const list = await loadProfiles();
    const current = await getActiveProfileId();
    setProfiles(list);
    setActiveId(current);
    setBiometricAvailable(await isBiometricSupported());
    
    // Verificar se usuário é admin
    const activeProfile = await getActiveProfile();
    setIsAdmin(activeProfile?.account_type === ACCOUNT_TYPES.FAMILY_ADMIN);
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleSelect = async (profile) => {
    try {
      console.log('[ProfileSelection] handleSelect chamado para perfil:', profile?.id, profile?.name, profile?.account_type);
      
      if (!profile || !profile.id) {
        console.error('[ProfileSelection] Perfil inválido:', profile);
        Alert.alert('Erro', 'Perfil inválido. Tente novamente.');
        return;
      }
      
      // Verificar se precisa de autenticação:
      // - Crianças (CHILD) não precisam de autenticação
      // - Perfis com allow_quick_access habilitado não precisam de autenticação
      const needsAuth = profile.account_type !== ACCOUNT_TYPES.CHILD && !profile.allow_quick_access;
      console.log('[ProfileSelection] needsAuth:', needsAuth, 'account_type:', profile.account_type, 'allow_quick_access:', profile.allow_quick_access);
      
      let biometricOn = false;
      try {
        biometricOn = await isBiometricEnabled(profile.id);
        console.log('[ProfileSelection] Biometria habilitada para perfil:', biometricOn);
      } catch (biometricError) {
        console.warn('[ProfileSelection] Erro ao verificar biometria (continuando):', biometricError);
        // Continuar mesmo se houver erro ao verificar biometria
      }
      setBiometricEnabled(biometricOn);
      
      console.log('[ProfileSelection] Estado - needsAuth:', needsAuth, 'pin_enabled:', profile.pin_enabled, 'biometricOn:', biometricOn);
      
      if (needsAuth) {
        // Verificar se perfil precisa de proteção (PIN ou biometria)
        const hasProtection = profile.pin_enabled || biometricOn;
        console.log('[ProfileSelection] hasProtection:', hasProtection);
        
        if (!hasProtection) {
          console.log('[ProfileSelection] Perfil precisa de proteção - abrindo modal de setup');
          // Definir perfil selecionado ANTES de mostrar alerta
          setSelectedProfile(profile);
          setSetupPin('');
          setSetupPinConfirm('');
          
          // Mostrar alerta e depois abrir modal
          Alert.alert(
            'Proteção obrigatória', 
            'Configure PIN ou biometria para continuar.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Aguardar um pouco para garantir que o estado foi atualizado
                  setTimeout(() => {
                    setSetupModalVisible(true);
                  }, 100);
                }
              }
            ]
          );
          return;
        }
        
        console.log('[ProfileSelection] Perfil protegido - abrindo modal de PIN');
        setSelectedProfile(profile);
        setPinValue('');
        // Aguardar um pouco para garantir que o estado foi atualizado
        setTimeout(() => {
          setPinModalVisible(true);
        }, 100);
        return;
      }
      
      console.log('[ProfileSelection] Perfil não precisa de autenticação - trocando perfil diretamente');
      try {
        const result = await switchToProfile(profile.id, { markAuthenticated: true });
        console.log('[ProfileSelection] switchToProfile resultado:', result);
        setActiveId(profile.id);
        const returnToRaw = params?.returnTo ? String(params.returnTo) : '/';
        const returnTo = decodeURIComponent(returnToRaw);
        console.log('[ProfileSelection] Navegando para:', returnTo);
        router.replace(returnTo);
      } catch (switchError) {
        console.error('[ProfileSelection] Erro em switchToProfile:', switchError);
        throw switchError; // Re-lançar para ser capturado pelo catch externo
      }
    } catch (error) {
      console.error('[ProfileSelection] Erro em handleSelect:', error);
      console.error('[ProfileSelection] Stack trace:', error?.stack);
      const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
      Alert.alert('Erro', `Não foi possível selecionar o perfil: ${errorMessage}`);
    }
  };

  const confirmPin = async () => {
    if (!selectedProfile) return;
    const ok = await authenticateProfileWithPin(selectedProfile.id, pinValue);
    if (!ok) {
      Alert.alert('PIN inválido', 'Tente novamente.');
      setPinValue('');
      return;
    }
    
    try {
      const switchedProfile = await switchToProfile(selectedProfile.id, { markAuthenticated: true });
      if (!switchedProfile) {
        throw new Error('Falha ao trocar perfil');
      }
      
      // Verificar se o perfil foi realmente trocado
      const currentActiveId = await getActiveProfileId();
      if (currentActiveId !== selectedProfile.id) {
        console.warn('[ProfileSelection] Perfil não foi trocado corretamente, tentando corrigir...');
        await setActiveProfile(selectedProfile.id);
        const verifyId = await getActiveProfileId();
        if (verifyId !== selectedProfile.id) {
          throw new Error('Falha ao trocar perfil');
        }
      }
      
      setActiveId(selectedProfile.id);
      setPinModalVisible(false);
      setPinValue('');
      setSelectedProfile(null);
      
      // Recarregar dados antes de navegar
      await loadData();
      
      const returnToRaw = params?.returnTo ? String(params.returnTo) : '/';
      const returnTo = decodeURIComponent(returnToRaw);
      router.replace(returnTo);
    } catch (error) {
      console.error('[ProfileSelection] Erro ao confirmar PIN e trocar perfil:', error);
      Alert.alert('Erro', 'Não foi possível trocar o perfil. Tente novamente.');
    }
  };

  const handleBiometricAuth = async () => {
    if (!selectedProfile) return;
    const result = await authenticateProfileWithBiometrics(selectedProfile.id);
    if (!result.success) {
      Alert.alert('Biometria indisponível', 'Não foi possível autenticar com biometria.');
      return;
    }
    
    try {
      const switchedProfile = await switchToProfile(selectedProfile.id, { markAuthenticated: true });
      if (!switchedProfile) {
        throw new Error('Falha ao trocar perfil');
      }
      
      // Verificar se o perfil foi realmente trocado
      const currentActiveId = await getActiveProfileId();
      if (currentActiveId !== selectedProfile.id) {
        console.warn('[ProfileSelection] Perfil não foi trocado corretamente, tentando corrigir...');
        await setActiveProfile(selectedProfile.id);
        const verifyId = await getActiveProfileId();
        if (verifyId !== selectedProfile.id) {
          throw new Error('Falha ao trocar perfil');
        }
      }
      
      setActiveId(selectedProfile.id);
      setPinModalVisible(false);
      setSelectedProfile(null);
      
      // Recarregar dados antes de navegar
      await loadData();
      
      const returnToRaw = params?.returnTo ? String(params.returnTo) : '/';
      const returnTo = decodeURIComponent(returnToRaw);
      router.replace(returnTo);
    } catch (error) {
      console.error('[ProfileSelection] Erro ao autenticar com biometria e trocar perfil:', error);
      Alert.alert('Erro', 'Não foi possível trocar o perfil. Tente novamente.');
    }
  };

  const handleSetupPin = async () => {
    try {
      console.log('[ProfileSelection] handleSetupPin chamado');
      if (!selectedProfile) {
        console.error('[ProfileSelection] selectedProfile é null');
        Alert.alert('Erro', 'Perfil não selecionado. Tente novamente.');
        return;
      }
      console.log('[ProfileSelection] Perfil selecionado:', selectedProfile.id, selectedProfile.name);
      
      if (!/^\d{4,}$/.test(setupPin)) {
        Alert.alert('PIN inválido', 'Use ao menos 4 dígitos numéricos.');
        return;
      }
      if (setupPin !== setupPinConfirm) {
        Alert.alert('PIN diferente', 'Confirme o mesmo PIN nos dois campos.');
        return;
      }
      
      console.log('[ProfileSelection] Configurando PIN para perfil:', selectedProfile.id);
      await setProfilePin(selectedProfile.id, setupPin);
      console.log('[ProfileSelection] PIN configurado com sucesso');
      
      // IMPORTANTE: Recarregar perfis para atualizar pin_enabled
      console.log('[ProfileSelection] Recarregando perfis para atualizar estado...');
      await loadData();
      console.log('[ProfileSelection] Perfis recarregados');
      
      // Verificar se o PIN foi realmente configurado
      const updatedProfile = await getProfileById(selectedProfile.id);
      if (!updatedProfile?.pin_enabled) {
        console.warn('[ProfileSelection] PIN não foi atualizado corretamente, tentando novamente...');
        // Tentar atualizar manualmente
        await updateProfile(selectedProfile.id, { pin_enabled: true });
        await loadData();
      }
      
      console.log('[ProfileSelection] Trocando para perfil:', selectedProfile.id);
      const switchedProfile = await switchToProfile(selectedProfile.id, { markAuthenticated: true });
      if (!switchedProfile) {
        throw new Error('Falha ao trocar perfil');
      }
      console.log('[ProfileSelection] Perfil trocado com sucesso:', switchedProfile.id);
      
      // Verificar se o perfil foi realmente trocado
      const currentActiveId = await getActiveProfileId();
      if (currentActiveId !== selectedProfile.id) {
        console.error('[ProfileSelection] Perfil não foi trocado corretamente. Esperado:', selectedProfile.id, 'Atual:', currentActiveId);
        // Tentar corrigir manualmente
        await setActiveProfile(selectedProfile.id);
        const verifyId = await getActiveProfileId();
        if (verifyId !== selectedProfile.id) {
          throw new Error('Falha ao trocar perfil: perfil ativo não corresponde ao selecionado');
        }
      }
      
      setActiveId(selectedProfile.id);
      setSetupModalVisible(false);
      setPinValue('');
      setSelectedProfile(null);
      
      // Recarregar dados finais antes de navegar
      await loadData();
      
      const returnToRaw = params?.returnTo ? String(params.returnTo) : '/';
      const returnTo = decodeURIComponent(returnToRaw);
      console.log('[ProfileSelection] Navegando para:', returnTo);
      // Usar router.replace para garantir navegação
      router.replace(returnTo);
    } catch (error) {
      console.error('[ProfileSelection] Erro em handleSetupPin:', error);
      console.error('[ProfileSelection] Stack trace:', error?.stack);
      const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
      Alert.alert('Erro', `Não foi possível configurar o PIN: ${errorMessage}`);
    }
  };

  const handleSetupBiometric = async () => {
    try {
      console.log('[ProfileSelection] handleSetupBiometric chamado');
      if (!selectedProfile) {
        console.error('[ProfileSelection] selectedProfile é null');
        Alert.alert('Erro', 'Perfil não selecionado. Tente novamente.');
        return;
      }
      console.log('[ProfileSelection] Perfil selecionado:', selectedProfile.id, selectedProfile.name);
      
      console.log('[ProfileSelection] Registrando biometria para perfil:', selectedProfile.id);
      const enrollResult = await enrollBiometricLogin(selectedProfile.id);
      console.log('[ProfileSelection] Resultado do registro de biometria:', enrollResult);
      
      if (!enrollResult.success) {
        const errorMsg = enrollResult.error === 'missing_token'
          ? 'Token de autenticação não encontrado. Faça login novamente.'
          : enrollResult.error === 'unauthorized'
            ? 'Sessão inválida. Faça login novamente.'
            : 'Não foi possível habilitar biometria. Tente novamente.';
        Alert.alert('Biometria indisponível', errorMsg);
        if (enrollResult.error === 'unauthorized' || enrollResult.error === 'missing_token') {
          router.replace('/auth/login');
        }
        return;
      }
      
      // IMPORTANTE: Recarregar perfis para atualizar estado de biometria
      console.log('[ProfileSelection] Recarregando perfis para atualizar estado...');
      await loadData();
      console.log('[ProfileSelection] Perfis recarregados');
      
      console.log('[ProfileSelection] Autenticando com biometria para perfil:', selectedProfile.id);
      const authResult = await authenticateProfileWithBiometrics(selectedProfile.id);
      console.log('[ProfileSelection] Resultado da autenticação:', authResult);
      
      if (!authResult.success) {
        Alert.alert('Biometria indisponível', 'Não foi possível autenticar com biometria.');
        return;
      }
      
      console.log('[ProfileSelection] Trocando para perfil:', selectedProfile.id);
      await switchToProfile(selectedProfile.id, { markAuthenticated: true });
      console.log('[ProfileSelection] Perfil trocado com sucesso');
      
      setActiveId(selectedProfile.id);
      setSetupModalVisible(false);
      const returnToRaw = params?.returnTo ? String(params.returnTo) : '/';
      const returnTo = decodeURIComponent(returnToRaw);
      console.log('[ProfileSelection] Navegando para:', returnTo);
      router.replace(returnTo);
    } catch (error) {
      console.error('[ProfileSelection] Erro em handleSetupBiometric:', error);
      console.error('[ProfileSelection] Stack trace:', error?.stack);
      const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
      Alert.alert('Erro', `Não foi possível configurar a biometria: ${errorMessage}`);
    }
  };

  const handleAddMember = (route) => {
    setAddModalVisible(false);
    router.push(route);
  };

  const handleLongPress = (profile) => {
    if (!isAdmin) {
      return; // Apenas admins podem ver o menu
    }
    setContextMenuProfile(profile);
    setContextMenuVisible(true);
  };

  const handleDeleteProfile = async () => {
    if (!contextMenuProfile) return;
    
    Alert.alert(
      'Deletar perfil',
      `Tem certeza que deseja deletar o perfil "${contextMenuProfile.name}"? Esta ação não pode ser desfeita.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {
            setContextMenuVisible(false);
            setContextMenuProfile(null);
          }
        },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Deletar no backend se tiver remote_id
              if (contextMenuProfile.remote_id) {
                await deleteFamilyProfile(contextMenuProfile.remote_id);
              }
              
              // Deletar localmente
              await removeProfile(contextMenuProfile.id);
              
              // Recarregar lista
              await loadData();
              
              setContextMenuVisible(false);
              setContextMenuProfile(null);
              
              Alert.alert('Sucesso', 'Perfil deletado com sucesso.');
            } catch (error) {
              console.error('Erro ao deletar perfil:', error);
              const errorMessage = error?.response?.data?.detail || error?.message || 'Não foi possível deletar o perfil.';
              Alert.alert('Erro', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    // TODO: Implementar edição de perfil
    Alert.alert('Em desenvolvimento', 'A edição de perfil será implementada em breve.');
    setContextMenuVisible(false);
    setContextMenuProfile(null);
  };

  const handleViewDetails = () => {
    // TODO: Implementar visualização de detalhes
    Alert.alert('Em desenvolvimento', 'A visualização de detalhes será implementada em breve.');
    setContextMenuVisible(false);
    setContextMenuProfile(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Quem vai usar o app?</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Selecione um perfil para continuar.</Text>

      <FlatList
        data={profiles}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProfileCard 
            profile={item} 
            isActive={item.id === activeId} 
            onPress={() => handleSelect(item)}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>Nenhum perfil encontrado. Crie o primeiro familiar.</Text>
        }
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
        <Text style={styles.addButtonText}>Adicionar familiar</Text>
      </TouchableOpacity>

      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Digite o PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={pinValue}
              onChangeText={setPinValue}
              placeholder="PIN"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setPinModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              {biometricAvailable && biometricEnabled ? (
                <TouchableOpacity onPress={handleBiometricAuth}>
                  <Text style={styles.modalConfirm}>Usar biometria</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={confirmPin}>
                <Text style={styles.modalConfirm}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={addModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Adicionar familiar</Text>
            <TouchableOpacity style={styles.option} onPress={() => handleAddMember('/family/add-child')}>
              <Text style={styles.optionText}>Adicionar criança</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={() => handleAddMember('/family/add-adult')}>
              <Text style={styles.optionText}>Adicionar adulto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={() => handleAddMember('/family/add-elder')}>
              <Text style={styles.optionText}>Adicionar idoso</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.option} onPress={() => handleAddMember('/family/create-invite')}>
              <Text style={styles.optionText}>Criar convite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={() => handleAddMember('/family/invites')}>
              <Text style={styles.optionText}>Gerenciar convites</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={() => handleAddMember('/family/accept-invite')}>
              <Text style={styles.optionText}>Aceitar convite</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={setupModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Proteja o perfil</Text>
            <Text style={styles.subtitle}>Para continuar, configure PIN ou biometria.</Text>
            <TextInput
              style={styles.pinInput}
              value={setupPin}
              onChangeText={setSetupPin}
              placeholder="PIN"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              secureTextEntry
            />
            <TextInput
              style={styles.pinInput}
              value={setupPinConfirm}
              onChangeText={setSetupPinConfirm}
              placeholder="Confirmar PIN"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setSetupModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancelar</Text>
              </TouchableOpacity>
              {biometricAvailable ? (
                <TouchableOpacity onPress={handleSetupBiometric}>
                  <Text style={styles.modalConfirm}>Usar biometria</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={handleSetupPin}>
                <Text style={styles.modalConfirm}>Salvar PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={contextMenuVisible} transparent animationType="fade" onRequestClose={() => setContextMenuVisible(false)}>
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => {
            setContextMenuVisible(false);
            setContextMenuProfile(null);
          }}
        >
          <View style={[styles.contextMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {contextMenuProfile && (
              <>
                <Text style={[styles.contextMenuTitle, { color: colors.text }]}>{contextMenuProfile.name}</Text>
                <View style={[styles.contextMenuDivider, { backgroundColor: colors.border }]} />
                
                <TouchableOpacity 
                  style={styles.contextMenuItem}
                  onPress={handleViewDetails}
                >
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.contextMenuItemText, { color: colors.text }]}>Ver detalhes</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.contextMenuItem}
                  onPress={handleEditProfile}
                >
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                  <Text style={[styles.contextMenuItemText, { color: colors.text }]}>Editar perfil</Text>
                </TouchableOpacity>
                
                <View style={[styles.contextMenuDivider, { backgroundColor: colors.border }]} />
                
                <TouchableOpacity 
                  style={styles.contextMenuItem}
                  onPress={handleDeleteProfile}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={[styles.contextMenuItemText, { color: colors.error }]}>Deletar perfil</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  list: {
    paddingVertical: 24,
  },
  row: {
    justifyContent: 'space-between',
  },
  empty: {
    textAlign: 'center',
    color: '#777',
    marginTop: 40,
  },
  addButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancel: {
    color: '#888',
    fontSize: 16,
  },
  modalConfirm: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: '600',
  },
  option: {
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  contextMenu: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  contextMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  contextMenuDivider: {
    height: 1,
    marginVertical: 8,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  contextMenuItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
});
