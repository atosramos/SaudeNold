/**
 * Servico de Analytics - Google Analytics e LogRocket
 * Centraliza o tracking de eventos e sessoes
 */

// Google Analytics (preparado para quando Google Play Console estiver ativo)
export const initGoogleAnalytics = () => {
  // TODO: Implementar quando Google Play Console estiver ativo
  // Por enquanto, apenas estrutura preparada
  if (typeof window !== 'undefined' && window.gtag) {
    console.log('Google Analytics inicializado');
    return true;
  }
  return false;
};

// LogRocket para sessões (frontend)
export const initLogRocket = () => {
  try {
    // Verificar se LogRocket esta disponivel
    if (typeof window !== 'undefined' && window.LogRocket) {
      const LogRocket = window.LogRocket;
      const LOGROCKET_APP_ID = process.env.EXPO_PUBLIC_LOGROCKET_APP_ID;
      
      if (LOGROCKET_APP_ID) {
        LogRocket.init(LOGROCKET_APP_ID);
        console.log('LogRocket inicializado');
        return true;
      } else {
        console.warn('LogRocket APP ID nao configurado');
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('Erro ao inicializar LogRocket:', error);
    return false;
  }
};

// Track evento no Google Analytics
export const trackEvent = (eventName, eventParams = {}) => {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, eventParams);
      console.log(`Evento rastreado: ${eventName}`, eventParams);
    }
  } catch (error) {
    console.error('Erro ao rastrear evento:', error);
  }
};

// Track evento no LogRocket
export const logRocketTrack = (eventName, eventData = {}) => {
  try {
    if (typeof window !== 'undefined' && window.LogRocket) {
      window.LogRocket.track(eventName, eventData);
      console.log(`LogRocket track: ${eventName}`, eventData);
    }
  } catch (error) {
    console.error('Erro ao rastrear no LogRocket:', error);
  }
};

// Track identificacao de usuario
export const identifyUser = (userId, userProperties = {}) => {
  try {
    // Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('set', { user_id: userId });
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        user_id: userId,
        ...userProperties
      });
    }
    
    // LogRocket
    if (typeof window !== 'undefined' && window.LogRocket) {
      window.LogRocket.identify(userId, userProperties);
    }
  } catch (error) {
    console.error('Erro ao identificar usuario:', error);
  }
};

// Eventos especificos do app

// Rastrear ativacao de licenca
export const trackLicenseActivation = (licenseType, userId) => {
  trackEvent('license_activated', {
    license_type: licenseType,
    user_id: userId
  });
  logRocketTrack('License Activated', {
    licenseType,
    userId
  });
};

// Rastrear compra
export const trackPurchase = (licenseType, amount, currency = 'BRL') => {
  trackEvent('purchase', {
    license_type: licenseType,
    value: amount,
    currency: currency
  });
  logRocketTrack('Purchase', {
    licenseType,
    amount,
    currency
  });
};

// Rastrear validacao de licenca
export const trackLicenseValidation = (success, errorType = null) => {
  trackEvent('license_validation', {
    success: success,
    error_type: errorType
  });
  logRocketTrack('License Validation', {
    success,
    errorType
  });
};

// Rastrear erro
export const trackError = (errorMessage, errorContext = {}) => {
  trackEvent('error', {
    error_message: errorMessage,
    ...errorContext
  });
  logRocketTrack('Error', {
    errorMessage,
    ...errorContext
  });
};

// Rastrear uso de feature PRO
export const trackProFeatureUsage = (featureName) => {
  trackEvent('pro_feature_used', {
    feature_name: featureName
  });
  logRocketTrack('Pro Feature Used', {
    featureName
  });
};
