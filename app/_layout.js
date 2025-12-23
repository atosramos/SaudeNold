import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { fullSync } from '../services/sync';

export default function RootLayout() {
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
      />
    </SafeAreaProvider>
  );
}