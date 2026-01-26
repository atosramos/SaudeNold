import { useEffect, useRef } from 'react';
import { getActiveProfileId } from '../services/profileStorageManager';

/**
 * Hook que monitora mudanças no perfil ativo e executa callback quando muda
 * Útil para recarregar dados quando o usuário troca de perfil
 */
export const useProfileChange = (onProfileChange) => {
  const previousProfileIdRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let checkInterval = null;

    const checkProfileChange = async () => {
      if (!isMounted) return;
      
      try {
        const currentProfileId = await getActiveProfileId();
        
        // Se o perfil mudou, executar callback
        if (previousProfileIdRef.current !== null && 
            previousProfileIdRef.current !== currentProfileId) {
          // #region agent log
          console.log('[useProfileChange] Perfil mudou:', {
            anterior: previousProfileIdRef.current,
            atual: currentProfileId
          });
          // #endregion
          
          if (onProfileChange) {
            onProfileChange(currentProfileId, previousProfileIdRef.current);
          }
        }
        
        previousProfileIdRef.current = currentProfileId;
      } catch (error) {
        console.error('[useProfileChange] Erro ao verificar perfil:', error);
      }
    };

    // Verificar imediatamente
    checkProfileChange();

    // Verificar periodicamente (a cada 500ms)
    checkInterval = setInterval(checkProfileChange, 500);

    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [onProfileChange]);
};
