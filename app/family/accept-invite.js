import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { acceptFamilyInvite } from '../../services/familyService';
import { syncProfilesWithServer } from '../../services/profileService';
import { useTheme } from '../../contexts/ThemeContext';

export default function AcceptInvite() {
  const router = useRouter();
  const { colors } = useTheme();
  const [code, setCode] = useState('');

  const handleAccept = async () => {
    if (!code.trim()) {
      Alert.alert('Erro', 'Informe o codigo do convite.');
      return;
    }
    try {
      await acceptFamilyInvite(code.trim());
      // CRÍTICO: Sincronizar perfis após aceitar convite para garantir que o novo perfil apareça
      await syncProfilesWithServer();
      Alert.alert('Sucesso', 'Convite aceito com sucesso.');
      router.replace('/profile-selection');
    } catch (error) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Nao foi possivel aceitar o convite.';
      Alert.alert('Erro', errorMessage);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Aceitar convite</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Informe o codigo recebido.</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={code}
        onChangeText={setCode}
        placeholder="Codigo do convite"
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
      />
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleAccept}>
        <Text style={styles.buttonText}>Aceitar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
