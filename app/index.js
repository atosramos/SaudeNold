import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Bem-vindo ao SaudeNold</Text>
        <Text style={styles.subtitle}>Seu assistente de saúde pessoal</Text>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity 
          style={[styles.menuButton, styles.medicationsButton]}
          onPress={() => router.push('/medications')}
        >
          <Ionicons name="medical" size={48} color="#fff" />
          <Text style={styles.menuButtonText}>Meus Medicamentos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.emergencyButton]}
          onPress={() => router.push('/emergency-contacts')}
        >
          <Ionicons name="call" size={48} color="#fff" />
          <Text style={styles.menuButtonText}>Contatos de Emergência</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.visitsButton]}
          onPress={() => router.push('/doctor-visits')}
        >
          <Ionicons name="calendar" size={48} color="#fff" />
          <Text style={styles.menuButtonText}>Visitas ao Médico</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.anamnesisButton]}
          onPress={() => router.push('/anamnesis')}
        >
          <Ionicons name="document-text" size={48} color="#fff" />
          <Text style={styles.menuButtonText}>Ficha de Anamnese</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuButton, styles.historyButton, styles.lastButton]}
          onPress={() => router.push('/history')}
        >
          <Ionicons name="time" size={48} color="#fff" />
          <Text style={styles.menuButtonText}>Histórico</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 24,
    flexGrow: 1,
  },
  header: {
    marginTop: 32,
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 24,
    color: '#666',
  },
  menu: {
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    minHeight: 120,
    marginBottom: 24,
  },
  medicationsButton: {
    backgroundColor: '#4ECDC4',
  },
  emergencyButton: {
    backgroundColor: '#FF6B6B',
  },
  visitsButton: {
    backgroundColor: '#95E1D3',
  },
  anamnesisButton: {
    backgroundColor: '#FFA07A',
  },
  historyButton: {
    backgroundColor: '#9B59B6',
  },
  lastButton: {
    marginBottom: 0,
  },
  menuButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 16,
  },
});
