import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { usePathname, useRouter } from 'expo-router';
import { getActiveProfileId } from '../services/profileStorageManager';
import { shouldRequireProfileReauth } from '../services/profileAuth';
import { hasAuthToken } from '../services/auth';
import { loadProfiles } from '../services/profileService';

export const useProfileAuthGuard = ({
  sensitive = false,
  timeoutMinutes,
} = {}) => {
  const router = useRouter();
  const pathname = usePathname();

  useFocusEffect(
    useCallback(() => {
      const verifyAccess = async () => {
        if (!sensitive) return;
        
        // PRIMEIRO: Verificar se o usuário está autenticado (tem token)
        const isAuthenticated = await hasAuthToken();
        if (!isAuthenticated) {
          // Verificar se biometria está habilitada - se sim, mostrar tela de biometria primeiro
          const { isBiometricEnabled, isBiometricSupported } = await import('../services/biometricService');
          const supported = await isBiometricSupported();
          const enabled = supported ? await isBiometricEnabled() : false;
          
          const returnTo = encodeURIComponent(pathname || '/');
          if (enabled && supported) {
            // Se biometria habilitada, mostrar tela de biometria primeiro (como banco C6)
            router.replace(`/auth/biometric-prompt?returnTo=${returnTo}`);
          } else {
            // Se não há biometria, ir direto para login
            router.replace(`/auth/login?returnTo=${returnTo}`);
          }
          return;
        }
        
        // SEGUNDO: Verificar se há perfis disponíveis e definir um ativo se necessário
        const profiles = await loadProfiles();
        let activeId = await getActiveProfileId();
        
        // #region agent log
        try {
          fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useProfileAuthGuard.js:42',message:'Profile check',data:{profilesCount:profiles.length,activeId:activeId,pathname:pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        } catch (e) {}
        // #endregion
        
        // Se não há perfil ativo mas há perfis disponíveis, usar o primeiro
        if (!activeId && profiles.length > 0) {
          const { setActiveProfile } = await import('../services/profileStorageManager');
          await setActiveProfile(profiles[0].id);
          activeId = profiles[0].id;
          // #region agent log
          try {
            fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useProfileAuthGuard.js:49',message:'Set first profile as active',data:{activeId:activeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          } catch (e) {}
          // #endregion
        }
        
        // Se ainda não há perfil ativo, redirecionar para seleção de perfil
        if (!activeId) {
          // #region agent log
          try {
            fetch('http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useProfileAuthGuard.js:54',message:'Redirecting to profile-selection - no active profile',data:{pathname:pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          } catch (e) {}
          // #endregion
          const returnTo = encodeURIComponent(pathname || '/');
          router.replace(`/profile-selection?returnTo=${returnTo}`);
          return;
        }
        
        // TERCEIRO: Verificar se requer reautenticação do perfil
        // Se timeoutMinutes não foi fornecido, usar null para buscar timeout configurado
        const requiresAuth = await shouldRequireProfileReauth(activeId, timeoutMinutes !== undefined ? timeoutMinutes : null);
        if (requiresAuth) {
          const returnTo = encodeURIComponent(pathname || '/');
          router.replace(`/profile-selection?returnTo=${returnTo}`);
        }
      };
      verifyAccess();
    }, [sensitive, timeoutMinutes, pathname, router])
  );
};
