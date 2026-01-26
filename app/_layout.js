import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { fullSync } from '../services/sync';
import { rescheduleAllAlarms } from '../services/alarm';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { initGoogleAnalytics, initLogRocket } from '../services/analytics';
import { startTokenRefreshLoop, stopTokenRefreshLoop } from '../services/tokenManager';
import { getActiveProfileId, setActiveProfile } from '../services/profileStorageManager';
import { loadProfiles } from '../services/profileService';
import { recordProfileActivity } from '../services/profileAuth';
import { startProfileSyncLoop, stopProfileSyncLoop } from '../services/profileSync';
import { AppState } from 'react-native';
import { hasAuthToken } from '../services/auth';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { FontSizeProvider } from '../contexts/FontSizeContext';

function StackNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();
  const notificationListener = useRef();
  const responseListener = useRef();

  // Inicializar analytics
  useEffect(() => {
    try {
      // Inicializar Google Analytics (se disponivel)
      initGoogleAnalytics();
    } catch (error) {
      console.error('Erro ao inicializar Google Analytics:', error);
    }
    
    try {
      // Inicializar LogRocket (se disponivel)
      initLogRocket();
    } catch (error) {
      console.error('Erro ao inicializar LogRocket:', error);
    }
  }, []);

  useEffect(() => {
    const ensureProfileSelection = async () => {
      const inAuth = segments?.[0] === 'auth';
      const inProfileSelection = segments?.[0] === 'profile-selection';
      if (inAuth || inProfileSelection) {
        return;
      }
      const isAuthenticated = await hasAuthToken();
      
      // Se não está autenticado, verificar se biometria está habilitada
      if (!isAuthenticated) {
        try {
          const { isBiometricEnabled, isBiometricSupported } = await import('../services/biometricService');
          const supported = await isBiometricSupported();
          const enabled = supported ? await isBiometricEnabled() : false;
          
          // Se biometria habilitada, mostrar tela de biometria primeiro (como banco C6)
          if (enabled && supported) {
            router.replace('/auth/biometric-prompt');
            return;
          }
        } catch (error) {
          console.error('Erro ao verificar biometria:', error);
        }
        return;
      }
      
      const profiles = await loadProfiles();
      const activeId = await getActiveProfileId();
      if (profiles.length === 0) {
        router.replace('/profile-selection');
        return;
      }
      if (!activeId) {
        await setActiveProfile(profiles[0].id);
      }
    };

    ensureProfileSelection();
  }, [segments, router]);

  useEffect(() => {
    recordProfileActivity();
  }, [segments]);

  useEffect(() => {
    // Sincronizar ao abrir o app APENAS se estiver autenticado
    const syncData = async () => {
      try {
        // Aguardar um pouco para garantir que o token foi salvo (se acabou de fazer login)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se está autenticado antes de sincronizar
        const isAuthenticated = await hasAuthToken();
        if (!isAuthenticated) {
          console.log('Usuário não autenticado, pulando sincronização inicial');
          // Mesmo sem autenticação, tentar reagendar alarmes locais
          try {
            await rescheduleAllAlarms();
          } catch (alarmError) {
            console.error('Erro ao reagendar alarmes:', alarmError);
          }
          return;
        }

        // fullSync já verifica autenticação internamente, mas verificamos aqui também
        await fullSync();
        // Após sincronizar, reagendar todos os alarmes
        // Isso garante que os alarmes estejam configurados mesmo após reinstalar o app
        // ou sincronizar dados de outro dispositivo
        await rescheduleAllAlarms();
      } catch (error) {
        console.error('Erro na sincronização inicial:', error);
        // Mesmo se a sincronização falhar, tentar reagendar alarmes locais
        try {
          await rescheduleAllAlarms();
        } catch (alarmError) {
          console.error('Erro ao reagendar alarmes:', alarmError);
        }
      }
    };

    syncData();
    startTokenRefreshLoop();
    startProfileSyncLoop();

    // Configurar listener de notificações
    notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
      // Quando uma notificação é recebida
      if (notification.request.content.data.type === 'medication_alarm') {
        const medicationName = notification.request.content.data.medicationName;
        const dosage = notification.request.content.data.dosage || '';
        
        // Configurar áudio (o som da notificação já deve estar tocando)
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
          });

          // Tentar falar o nome do medicamento (opcional)
          try {
            const message = `Hora de tomar ${medicationName}${dosage ? ', dosagem ' + dosage : ''}`;
            Speech.speak(message, {
              language: 'pt-BR',
              pitch: 1.2,
              rate: 0.9,
            });
          } catch (speechError) {
            // Se falhar a voz, não é problema - o som da notificação já está tocando
            console.log('Voz não disponível, mas o alarme continua');
          }
        } catch (error) {
          // Mesmo com erro, o som da notificação já deve estar tocando
          console.error('Erro ao configurar áudio, mas notificação continuará:', error);
        }

        // Navegar para a tela de alarme
        router.push({
          pathname: '/alarm',
          params: {
            medicationId: notification.request.content.data.medicationId,
            schedule: notification.request.content.data.schedule || '', // Passar schedule
            medication: JSON.stringify({
              id: notification.request.content.data.medicationId,
              name: medicationName,
              dosage: dosage,
              schedule: notification.request.content.data.schedule || '',
            })
          }
        });
      }
    });

    // Configurar listener de resposta à notificação (quando usuário toca)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      if (data.type === 'medication_alarm') {
        const medicationName = data.medicationName;
        const dosage = data.dosage || '';
        
        // Configurar áudio quando usuário toca na notificação
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
          });

          // Tentar falar o nome do medicamento (opcional)
          try {
            const message = `Hora de tomar ${medicationName}${dosage ? ', dosagem ' + dosage : ''}`;
            Speech.speak(message, {
              language: 'pt-BR',
              pitch: 1.2,
              rate: 0.9,
            });
          } catch (speechError) {
            // Se falhar a voz, não é problema - o som da notificação já está tocando
            console.log('Voz não disponível, mas o alarme continua');
          }
        } catch (error) {
          // Mesmo com erro, o som da notificação já deve estar tocando
          console.error('Erro ao configurar áudio, mas notificação continuará:', error);
        }

        router.push({
          pathname: '/alarm',
          params: {
            medicationId: data.medicationId,
            medication: JSON.stringify({
              id: data.medicationId,
              name: medicationName,
              dosage: dosage,
            })
          }
        });
      }
    });

    return () => {
      stopTokenRefreshLoop();
      stopProfileSyncLoop();
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        recordProfileActivity();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Sincronizar ao abrir o app APENAS se estiver autenticado
    const syncData = async () => {
      try {
        // Aguardar um pouco para garantir que o token foi salvo (se acabou de fazer login)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se está autenticado antes de sincronizar
        const isAuthenticated = await hasAuthToken();
        if (!isAuthenticated) {
          console.log('Usuário não autenticado, pulando sincronização inicial');
          // Mesmo sem autenticação, tentar reagendar alarmes locais
          try {
            await rescheduleAllAlarms();
          } catch (alarmError) {
            console.error('Erro ao reagendar alarmes:', alarmError);
          }
          return;
        }

        // fullSync já verifica autenticação internamente, mas verificamos aqui também
        await fullSync();
        // Após sincronizar, reagendar todos os alarmes
        // Isso garante que os alarmes estejam configurados mesmo após reinstalar o app
        // ou sincronizar dados de outro dispositivo
        await rescheduleAllAlarms();
      } catch (error) {
        console.error('Erro na sincronização inicial:', error);
        // Mesmo se a sincronização falhar, tentar reagendar alarmes locais
        try {
          await rescheduleAllAlarms();
        } catch (alarmError) {
          console.error('Erro ao reagendar alarmes:', alarmError);
        }
      }
    };

    syncData();
    startTokenRefreshLoop();
    startProfileSyncLoop();

    // Configurar listener de notificações
    notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
      // Quando uma notificação é recebida
      if (notification.request.content.data.type === 'medication_alarm') {
        const medicationName = notification.request.content.data.medicationName;
        const dosage = notification.request.content.data.dosage || '';
        
        // Configurar áudio (o som da notificação já deve estar tocando)
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
          });

          // Tentar falar o nome do medicamento (opcional)
          try {
            const message = `Hora de tomar ${medicationName}${dosage ? ', dosagem ' + dosage : ''}`;
            Speech.speak(message, {
              language: 'pt-BR',
              pitch: 1.2,
              rate: 0.9,
            });
          } catch (speechError) {
            // Se falhar a voz, não é problema - o som da notificação já está tocando
            console.log('Voz não disponível, mas o alarme continua');
          }
        } catch (error) {
          // Mesmo com erro, o som da notificação já deve estar tocando
          console.error('Erro ao configurar áudio, mas notificação continuará:', error);
        }

        // Navegar para a tela de alarme
        router.push({
          pathname: '/alarm',
          params: {
            medicationId: notification.request.content.data.medicationId,
            schedule: notification.request.content.data.schedule || '', // Passar schedule
            medication: JSON.stringify({
              id: notification.request.content.data.medicationId,
              name: medicationName,
              dosage: dosage,
              schedule: notification.request.content.data.schedule || '',
            })
          }
        });
      }
    });

    // Configurar listener de resposta à notificação (quando usuário toca)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      if (data.type === 'medication_alarm') {
        const medicationName = data.medicationName;
        const dosage = data.dosage || '';
        
        // Configurar áudio quando usuário toca na notificação
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
          });

          // Tentar falar o nome do medicamento (opcional)
          try {
            const message = `Hora de tomar ${medicationName}${dosage ? ', dosagem ' + dosage : ''}`;
            Speech.speak(message, {
              language: 'pt-BR',
              pitch: 1.2,
              rate: 0.9,
            });
          } catch (speechError) {
            // Se falhar a voz, não é problema - o som da notificação já está tocando
            console.log('Voz não disponível, mas o alarme continua');
          }
        } catch (error) {
          // Mesmo com erro, o som da notificação já deve estar tocando
          console.error('Erro ao configurar áudio, mas notificação continuará:', error);
        }

        router.push({
          pathname: '/alarm',
          params: {
            medicationId: data.medicationId,
            medication: JSON.stringify({
              id: data.medicationId,
              name: medicationName,
              dosage: dosage,
            })
          }
        });
      }
    });

    return () => {
      stopTokenRefreshLoop();
      stopProfileSyncLoop();
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        recordProfileActivity();
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: 'bold', color: colors.text },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <FontSizeProvider>
        <StackNavigator />
      </FontSizeProvider>
    </ThemeProvider>
  );
}