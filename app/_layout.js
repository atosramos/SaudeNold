import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { fullSync } from '../services/sync';
import { rescheduleAllAlarms } from '../services/alarm';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export default function RootLayout() {
  const router = useRouter();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Sincronizar ao abrir o app
    const syncData = async () => {
      try {
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
            medication: JSON.stringify({
              id: notification.request.content.data.medicationId,
              name: medicationName,
              dosage: dosage,
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
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false, // Desabilitar header automático para todas as telas
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