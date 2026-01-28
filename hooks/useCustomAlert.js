import { useState, useCallback } from 'react';
import CustomAlert from '../components/CustomAlert';

/**
 * @deprecated Use useAlert() from contexts/AlertContext em vez disso.
 * O AlertProvider já renderiza um único CustomAlert global; não é necessário
 * AlertComponent por tela. Migre para useAlert e remova <AlertComponent />.
 */
export function useCustomAlert() {
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
  });

  const showAlert = useCallback((title, message, type = 'info', buttons = []) => {
    setAlert({
      visible: true,
      title,
      message,
      type,
      buttons,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, visible: false }));
  }, []);

  const AlertComponent = useCallback(() => (
    <CustomAlert
      visible={alert.visible}
      title={alert.title}
      message={alert.message}
      type={alert.type}
      buttons={alert.buttons}
      onClose={hideAlert}
    />
  ), [alert, hideAlert]);

  return {
    showAlert,
    hideAlert,
    AlertComponent,
  };
}







