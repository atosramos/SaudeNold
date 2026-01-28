import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import CustomAlert from '../components/CustomAlert';

/**
 * Títulos padrão para os helpers showSuccess, showError, showWarning, showInfo.
 * Alterar aqui afeta todos os alertas que usam esses atalhos.
 */
export const TITLES = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Atenção',
  info: 'Info',
};

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
  });

  const hideAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback((title, message, type = 'info', buttons = []) => {
    setAlert({
      visible: true,
      title: title ?? '',
      message: message ?? '',
      type: type || 'info',
      buttons: Array.isArray(buttons) ? buttons : [],
    });
  }, []);

  const showSuccess = useCallback(
    (message, buttons = []) => showAlert(TITLES.success, message, 'success', buttons),
    [showAlert]
  );

  const showError = useCallback(
    (message, buttons = []) => showAlert(TITLES.error, message, 'error', buttons),
    [showAlert]
  );

  const showWarning = useCallback(
    (message, buttons = []) => showAlert(TITLES.warning, message, 'warning', buttons),
    [showAlert]
  );

  const showInfo = useCallback(
    (message, buttons = []) => showAlert(TITLES.info, message, 'info', buttons),
    [showAlert]
  );

  const value = useMemo(
    () => ({
      showAlert,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      hideAlert,
    }),
    [showAlert, showSuccess, showError, showWarning, showInfo, hideAlert]
  );

  return (
    <AlertContext.Provider value={value}>
      {children}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        buttons={alert.buttons}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert deve ser usado dentro de AlertProvider');
  }
  return context;
}
