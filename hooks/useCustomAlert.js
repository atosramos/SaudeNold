import { useState, useCallback } from 'react';
import CustomAlert from '../components/CustomAlert';

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







