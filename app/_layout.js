import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { fullSync } from '../services/sync';
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
      } catch (error) {
        console.error('Erro na sincronização inicial:', error);
        // Continua mesmo se a sincronização falhar
      }
    };

    syncData();

    // Configurar listener de notificações
    notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
      // Quando uma notificação é recebida
      if (notification.request.content.data.type === 'medication_alarm') {
        const medicationName = notification.request.content.data.medicationName;
        const dosage = notification.request.content.data.dosage || '';
        
        // Tocar som de alarme imediatamente
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
          });

          // Tentar tocar som de alarme
          try {
            const { sound: alarmSound } = await Audio.Sound.createAsync(
              { uri: 'https://assets.mixkit.co/active_storage/sfx/2704/2704-preview.mp3' },
              { shouldPlay: true, isLooping: true, volume: 1.0 }
            );
            
            // Não precisamos guardar a referência aqui, apenas tocar
            // O som será gerenciado pela tela de alarme quando ela abrir
          } catch (e) {
            console.log('Erro ao tocar som de alarme:', e);
          }

          // Falar o nome do medicamento imediatamente
          const message = `Hora de tomar ${medicationName}${dosage ? ', dosagem ' + dosage : ''}`;
          Speech.speak(message, {
            language: 'pt-BR',
            pitch: 1.2, // Voz mais aguda (feminina)
            rate: 0.9, // Velocidade um pouco mais lenta para idosos
          });
        } catch (error) {
          console.error('Erro ao tocar alarme:', error);
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
        
        // Tocar som e voz quando usuário toca na notificação
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
          });

          // Tentar tocar som de alarme
          try {
            const { sound: alarmSound } = await Audio.Sound.createAsync(
              { uri: 'https://assets.mixkit.co/active_storage/sfx/2704/2704-preview.mp3' },
              { shouldPlay: true, isLooping: true, volume: 1.0 }
            );
          } catch (e) {
            console.log('Erro ao tocar som de alarme:', e);
          }

          // Falar o nome do medicamento
          const message = `Hora de tomar ${medicationName}${dosage ? ', dosagem ' + dosage : ''}`;
          Speech.speak(message, {
            language: 'pt-BR',
            pitch: 1.2, // Voz mais aguda (feminina)
            rate: 0.9, // Velocidade um pouco mais lenta para idosos
          });
        } catch (error) {
          console.error('Erro ao tocar alarme:', error);
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
          headerStyle: {
            backgroundColor: '#4ECDC4',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 24,
          },
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