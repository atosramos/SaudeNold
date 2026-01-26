import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PROFILES_KEY,
  setActiveProfile,
  getActiveProfileId,
  clearProfileData,
  setProfileSecureItem,
  getProfileSecureItem,
  removeProfileSecureItem,
  getProfileItem,
  setProfileItem,
  ensureProfileEncryptionKey,
} from './profileStorageManager';
import api from './api';
import { clearProfileAuthState, markProfileAuthenticated, recordProfileActivity } from './profileAuth';
import { clearDebugLogs } from './alarmDebug';

let profileRuntimeCache = {};

export const clearProfileRuntimeCache = () => {
  profileRuntimeCache = {};
};

export const ACCOUNT_TYPES = {
  FAMILY_ADMIN: 'family_admin',
  ADULT_MEMBER: 'adult_member',
  CHILD: 'child',
  ELDER_UNDER_CARE: 'elder_under_care',
};

export const MAX_FAMILY_PROFILES = 10;
const LEGACY_STORAGE_KEYS = [
  'medications',
  'medicationLogs',
  'emergencyContacts',
  'doctorVisits',
  'medicalExams',
  'dailyTracking',
  'vaccineRecords',
  'vaccineCalendar',
  'customVaccines',
  'anamnesis',
  'pro_license',
  'pro_license_info',
];

const migrateLegacyStorage = async (profileId) => {
  for (const key of LEGACY_STORAGE_KEYS) {
    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue != null) {
      const existing = await getProfileItem(key, profileId);
      if (!existing) {
        await setProfileItem(key, legacyValue, profileId);
      }
    }
  }
};

export const loadProfiles = async () => {
  const raw = await AsyncStorage.getItem(PROFILES_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const getProfileById = async (profileId) => {
  const profiles = await loadProfiles();
  return profiles.find((profile) => String(profile.id) === String(profileId)) || null;
};

export const getActiveProfile = async () => {
  const activeId = await getActiveProfileId();
  if (!activeId) return null;
  return await getProfileById(activeId);
};

export const saveProfiles = async (profiles) => {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
};

export const ensureDefaultProfile = async (user) => {
  const profiles = await loadProfiles();
  if (profiles.length > 0) {
    const activeId = await getActiveProfileId();
    if (!activeId) {
      await setActiveProfile(profiles[0].id);
      await ensureProfileEncryptionKey(profiles[0].id);
    }
    return profiles;
  }

  const name = user?.email ? user.email.split('@')[0] : 'Administrador';
  const newProfile = {
    id: `profile_${Date.now()}`,
    name,
    account_type: ACCOUNT_TYPES.FAMILY_ADMIN,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    allow_quick_access: false,
    pin_enabled: false,
  };
  const updated = [newProfile];
  await saveProfiles(updated);
  await setActiveProfile(newProfile.id);
  await migrateLegacyStorage(newProfile.id);
  await ensureProfileEncryptionKey(newProfile.id);
  return updated;
};

export const createProfile = async (profile) => {
  const profiles = await loadProfiles();
  if (profiles.length >= MAX_FAMILY_PROFILES) {
    return { success: false, error: `Limite de ${MAX_FAMILY_PROFILES} perfis atingido` };
  }
  const newProfile = {
    id: `profile_${Date.now()}`,
    name: profile.name?.trim() || 'Novo Perfil',
    account_type: profile.account_type,
    remote_id: profile.remote_id ?? null,
    birth_date: profile.birth_date || null,
    gender: profile.gender || null,
    blood_type: profile.blood_type || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    allow_quick_access: !!profile.allow_quick_access,
    pin_enabled: !!profile.pin_enabled,
  };
  const updated = [...profiles, newProfile];
  await saveProfiles(updated);
  await ensureProfileEncryptionKey(newProfile.id);
  return { success: true, profile: newProfile };
};

const normalizeDateKey = (value) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
};

const findLocalProfileForRemote = (remote, locals) => {
  const remoteId = String(remote.id);
  const direct = locals.find((profile) => String(profile.remote_id) === remoteId);
  if (direct) return direct;

  const remoteBirth = normalizeDateKey(remote.birth_date);
  const remoteName = (remote.name || '').trim().toLowerCase();
  const remoteType = remote.account_type;
  return locals.find((profile) => {
    const localName = (profile.name || '').trim().toLowerCase();
    const localBirth = normalizeDateKey(profile.birth_date);
    if (remoteType !== profile.account_type) return false;
    if (remoteBirth && localBirth && remoteBirth !== localBirth) return false;
    return remoteName && localName && remoteName === localName;
  }) || null;
};

export const updateProfile = async (profileId, updates) => {
  const profiles = await loadProfiles();
  const updated = profiles.map((profile) => {
    if (profile.id !== profileId) return profile;
    return {
      ...profile,
      ...updates,
      updated_at: new Date().toISOString(),
    };
  });
  await saveProfiles(updated);
  return updated.find((profile) => profile.id === profileId) || null;
};

export const removeProfile = async (profileId) => {
  const profiles = await loadProfiles();
  const filtered = profiles.filter((profile) => profile.id !== profileId);
  await saveProfiles(filtered);
  await clearProfileData(profileId);
  const activeId = await getActiveProfileId();
  if (activeId === profileId) {
    const nextProfile = filtered[0];
    await setActiveProfile(nextProfile ? nextProfile.id : null);
  }
  return filtered;
};

export const setProfilePin = async (profileId, pin) => {
  if (!pin) return;
  await setProfileSecureItem('profilePin', pin, profileId);
  await updateProfile(profileId, { pin_enabled: true });
};

export const clearProfilePin = async (profileId) => {
  await removeProfileSecureItem('profilePin', profileId);
  await updateProfile(profileId, { pin_enabled: false });
};

export const verifyProfilePin = async (profileId, pin) => {
  const stored = await getProfileSecureItem('profilePin', profileId);
  return stored && pin === stored;
};

export const switchToProfile = async (profileId, { markAuthenticated = false } = {}) => {
  try {
    console.log('[ProfileService] switchToProfile chamado com profileId:', profileId, 'markAuthenticated:', markAuthenticated);
    
    if (!profileId) {
      console.warn('[ProfileService] switchToProfile: profileId é null/undefined');
      return null;
    }
    
    const previousProfileId = await getActiveProfileId();
    console.log('[ProfileService] Perfil anterior:', previousProfileId);
    
    clearProfileRuntimeCache();
    await clearDebugLogs();
    
    if (previousProfileId && previousProfileId !== profileId) {
      console.log('[ProfileService] Limpando estado de autenticação do perfil anterior');
      await clearProfileAuthState(previousProfileId);
    }
    
    console.log('[ProfileService] Definindo perfil ativo:', profileId);
    await setActiveProfile(profileId);
    
    console.log('[ProfileService] Registrando atividade do perfil');
    await recordProfileActivity(profileId);
    
    if (markAuthenticated) {
      console.log('[ProfileService] Marcando perfil como autenticado');
      await markProfileAuthenticated(profileId);
    }
    
    console.log('[ProfileService] Buscando dados do perfil');
    const profile = await getProfileById(profileId);
    
    if (!profile) {
      console.error('[ProfileService] getProfileById retornou null para profileId:', profileId);
      throw new Error(`Perfil com ID ${profileId} não encontrado`);
    }
    
    // CRÍTICO: Sincronizar dados do novo perfil do servidor
    console.log('[ProfileService] Sincronizando dados do novo perfil do servidor...');
    try {
      const { syncFromBackend } = await import('./sync');
      await syncFromBackend();
      console.log('[ProfileService] Sincronização concluída com sucesso');
    } catch (syncError) {
      console.warn('[ProfileService] Erro ao sincronizar dados (continuando mesmo assim):', syncError?.message);
      // Não falhar a troca de perfil se a sincronização falhar
    }
    
    console.log('[ProfileService] switchToProfile concluído com sucesso');
    return profile;
  } catch (error) {
    console.error('[ProfileService] Erro em switchToProfile:', error);
    console.error('[ProfileService] Stack trace:', error?.stack);
    throw error; // Re-lançar para que o chamador possa tratar
  }
};

export const syncProfilesWithServer = async () => {
  try {
    const response = await api.get('/api/family/profiles');
    if (Array.isArray(response?.data)) {
      const localProfiles = await loadProfiles();
      const usedLocalIds = new Set();
      const merged = response.data.map((remote) => {
        const local = findLocalProfileForRemote(remote, localProfiles);
        if (local) {
          usedLocalIds.add(local.id);
          return {
            ...local,
            ...remote,
            id: local.id,
            remote_id: remote.id,
            // IMPORTANTE: Preservar pin_enabled local (não vem do servidor)
            pin_enabled: local?.pin_enabled ?? false,
            allow_quick_access: remote.allow_quick_access ?? local?.allow_quick_access ?? false,
          };
        }
        return {
          id: `remote_${remote.id}`,
          remote_id: remote.id,
          name: remote.name,
          account_type: remote.account_type,
          birth_date: remote.birth_date || null,
          gender: remote.gender || null,
          blood_type: remote.blood_type || null,
          created_at: remote.created_at,
          updated_at: remote.updated_at,
          allow_quick_access: !!remote.allow_quick_access,
          pin_enabled: false,
        };
      });
      const localOnly = localProfiles.filter((profile) => !usedLocalIds.has(profile.id));
      const nextProfiles = [...merged, ...localOnly];
      await saveProfiles(nextProfiles);
      for (const profile of nextProfiles) {
        await ensureProfileEncryptionKey(profile.id);
      }
    }
  } catch (error) {
    // Offline first: ignore errors
  }
};
