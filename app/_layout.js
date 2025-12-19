import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
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
            title: 'SaudeNold',
            headerShown: true,
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}
