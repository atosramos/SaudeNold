import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { createFamilyInvite, fetchFamilyInvites, cancelFamilyInvite, resendFamilyInvite } from '../../services/familyService';
import { ACCOUNT_TYPES, getActiveProfile } from '../../services/profileService';
import { useTheme } from '../../contexts/ThemeContext';
import { hasActiveLicense } from '../../services/proLicense';

export default function FamilyInvites() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [invites, setInvites] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadInvites = async () => {
    try {
      const profile = await getActiveProfile();
      setIsAdmin(profile?.account_type === ACCOUNT_TYPES.FAMILY_ADMIN);
      const data = await fetchFamilyInvites();
      setInvites(Array.isArray(data) ? data : []);
    } catch (error) {
      setInvites([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInvites();
    }, [])
  );

  const handleCreateInvite = async () => {
    // Verificar licença Pro antes de criar convite
    try {
      const hasPro = await hasActiveLicense();
      if (!hasPro) {
        Alert.alert(
          'Licença PRO necessária',
          'Para criar convites familiares quando os dados estão armazenados no servidor, é necessário ter uma licença PRO ativa.\n\nDeseja adquirir uma licença PRO?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ver Licenças',
              onPress: () => router.push('/pro-license'),
            },
          ]
        );
        return;
      }
    } catch (error) {
      console.error('Erro ao verificar licença Pro:', error);
      // Continuar mesmo se houver erro na verificação (backend vai validar)
    }

    try {
      const emailValue = email.trim() || null;
      const response = await createFamilyInvite(emailValue);
      setEmail('');
      await loadInvites();
      Alert.alert('Convite criado', 'Convite enviado com sucesso.');
    } catch (error) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Nao foi possivel criar o convite.';
      Alert.alert('Erro', errorMessage);
    }
  };

  const handleCancel = async (inviteId) => {
    try {
      await cancelFamilyInvite(inviteId);
      await loadInvites();
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel cancelar o convite.');
    }
  };

  const handleResend = async (inviteId) => {
    try {
      const response = await resendFamilyInvite(inviteId);
      await loadInvites();
      Alert.alert('Convite reenviado', 'Convite enviado novamente.');
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel reenviar o convite.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Convites</Text>
      {!isAdmin ? (
        <Text style={styles.info}>Apenas o administrador pode enviar convites.</Text>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Email do convidado (opcional)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="exemplo@email.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.button} onPress={handleCreateInvite}>
            <Text style={styles.buttonText}>Criar convite</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={invites}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum convite.</Text>}
        renderItem={({ item }) => (
          <View style={styles.inviteCard}>
            <Text style={styles.inviteText}>Status: {item.status}</Text>
            {item.invitee_email ? (
              <Text style={styles.inviteText}>Email: {item.invitee_email}</Text>
            ) : null}
            {item.invite_code ? (
              <Text style={styles.inviteText}>Codigo: {item.invite_code}</Text>
            ) : null}
            <View style={styles.actions}>
              {item.status === 'pending' ? (
                <>
                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={() => handleResend(item.id)}>
                    <Text style={styles.actionButtonText}>Reenviar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.error }]} onPress={() => handleCancel(item.id)}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
        )}
      />
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
    marginTop: 20,
    marginBottom: 12,
  },
  info: {
    fontSize: 14,
    marginBottom: 16,
  },
  form: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
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
  list: {
    paddingBottom: 40,
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
  },
  inviteCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  inviteText: {
    fontSize: 14,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
