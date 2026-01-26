import {
  getProfileSecureItem,
  removeProfileSecureItem,
  setProfileSecureItem,
  getProfileItem,
  setProfileItem,
  removeProfileItem,
  getActiveProfileId,
  setActiveProfile,
  getProfileKey,
} from './profileStorageManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import api from './api';

const canUseSecureStore = Platform.OS !== 'web';

export const AUTH_TOKEN_KEY = 'authToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const AUTH_USER_KEY = 'authUser';

export const setStoredAuth = async (token, refreshToken, user, profileId = null) => {
  // NUNCA lançar exceção aqui - sempre tentar salvar o máximo possível
  try {
    // IMPORTANTE: Definir activeProfileId ANTES de salvar tokens
    // Caso contrário, getAuthToken() não encontrará o token
    let resolvedProfileId = profileId || (await getActiveProfileId());
    
    if (!resolvedProfileId) {
      // Se não há profileId, criar um temporário para salvar o token
      // Isso garante que o token seja salvo mesmo sem perfil ativo
      resolvedProfileId = 'temp_auth';
    }
    
    // Sempre tentar definir o profile ativo primeiro
    try {
      await setActiveProfile(resolvedProfileId);
    } catch (profileError) {
      console.warn('Erro ao definir perfil ativo, continuando:', profileError);
    }
    
    // Salvar token (crítico)
    if (token) {
      try {
        await setProfileSecureItem(AUTH_TOKEN_KEY, token, resolvedProfileId);
      } catch (tokenError) {
        console.error('Erro ao salvar token, tentando novamente:', tokenError);
        // Tentar uma vez mais
        try {
          await setProfileSecureItem(AUTH_TOKEN_KEY, token, resolvedProfileId);
        } catch (retryError) {
          console.error('Erro ao salvar token após retry:', retryError);
          // Continuar mesmo assim
        }
      }
    }
    
    // Salvar refresh token
    if (refreshToken) {
      try {
        await setProfileSecureItem(REFRESH_TOKEN_KEY, refreshToken, resolvedProfileId);
      } catch (refreshError) {
        console.warn('Erro ao salvar refresh token:', refreshError);
      }
    }
    
    // Salvar user (não crítico)
    if (user) {
      try {
        await setProfileItem(AUTH_USER_KEY, JSON.stringify(user), resolvedProfileId);
      } catch (userError) {
        console.warn('Erro ao salvar dados do usuario:', userError);
      }
    }
  } catch (error) {
    // NUNCA lançar exceção - sempre logar e continuar
    console.error('Erro geral ao salvar autenticacao:', error);
  }
};

export const clearStoredAuth = async () => {
  try {
    // CRÍTICO: Remover de TODOS os perfis, não só do ativo
    // Isso previne que o token seja encontrado após logout
    try {
      const { loadProfiles } = await import('./profileService');
      const profiles = await loadProfiles();
      
      // Remover de todos os perfis conhecidos
      for (const profile of profiles) {
        try {
          await removeProfileSecureItem(AUTH_TOKEN_KEY, profile.id);
          await removeProfileSecureItem(REFRESH_TOKEN_KEY, profile.id);
          await removeProfileItem(AUTH_USER_KEY, profile.id);
        } catch (profileError) {
          // Continuar removendo dos outros perfis mesmo se um falhar
          console.warn(`Erro ao limpar auth do perfil ${profile.id}:`, profileError);
        }
      }
    } catch (profilesError) {
      console.warn('Erro ao carregar perfis para limpeza:', profilesError);
    }
    
    // Também remover do perfil ativo (se houver)
    await removeProfileSecureItem(AUTH_TOKEN_KEY);
    await removeProfileSecureItem(REFRESH_TOKEN_KEY);
    await removeProfileItem(AUTH_USER_KEY);
    
    // CRÍTICO: Limpar também do header do axios (já feito em logoutUser, mas garantir)
    if (api?.defaults?.headers?.common?.Authorization) {
      delete api.defaults.headers.common.Authorization;
    }
  } catch (error) {
    console.error('Erro ao limpar autenticacao:', error);
  }
};

export const getAuthToken = async () => {
  try {
    // PRIMEIRO: Tentar buscar do perfil ativo
    let token = await getProfileSecureItem(AUTH_TOKEN_KEY);
    
    // SEGUNDO: Se não encontrou, tentar buscar de qualquer perfil (fallback já implementado em getProfileSecureItem)
    if (!token) {
      // O getProfileSecureItem já tem fallback para buscar em todos os perfis
      // Mas vamos garantir que funcione mesmo sem perfil ativo
      const { loadProfiles } = await import('./profileService');
      const profiles = await loadProfiles();
      
      for (const profile of profiles) {
        try {
          const profileKey = getProfileKey(AUTH_TOKEN_KEY, profile.id);
          if (canUseSecureStore) {
            token = await SecureStore.getItemAsync(profileKey);
          } else {
            token = await AsyncStorage.getItem(profileKey);
          }
          if (token) {
            // Encontrar token, definir este perfil como ativo
            await setActiveProfile(profile.id);
            return token;
          }
        } catch (err) {
          // Continuar procurando
        }
      }
    }
    
    // TERCEIRO: Se ainda não encontrou, verificar se está no header do axios (fallback final)
    if (!token && api?.defaults?.headers?.common?.Authorization) {
      const headerAuth = api.defaults.headers.common.Authorization;
      if (headerAuth && headerAuth.startsWith('Bearer ')) {
        token = headerAuth.substring(7); // Remove "Bearer "
      }
    }
    
    return token;
  } catch (error) {
    console.error('Erro ao ler token:', error);
    return null;
  }
};

export const getRefreshToken = async () => {
  try {
    return await getProfileSecureItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Erro ao ler refresh token:', error);
    return null;
  }
};

export const getStoredAuthUser = async () => {
  try {
    const raw = await getProfileItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Erro ao ler usuario:', error);
    return null;
  }
};
