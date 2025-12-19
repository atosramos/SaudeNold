import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bem-vindo ao SaudeNold</Text>
        <Text style={styles.subtitle}>Seu assistente de saúde pessoal</Text>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={[styles.menuButton, styles.medicationsButton]}>
          <Ionicons name="medical" size={48} color="#fff" />
          <Text style={styles.menuButtonText}>Meus Medicamentos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, styles.emergencyButton]}>
          <Ionicons name="call" size={48} color="#fff" />
          <Text style={styles.menuButtonText}>Contatos de Emergência</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, styles.visitsButton]}>
          <Ionicons name="calendar" size={48} color="#fff" />
          <Text style={styles.menuButtonText}>Visitas ao Médico</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, styles.historyButton]}>
          <Ionicons name="time" size={48} color="#fff" />
          <Text style={styles.menuButtonText}>Histórico</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 24,
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
    flex: 1,
    gap: 24,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    minHeight: 120,
    gap: 24,
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
  historyButton: {
    backgroundColor: '#F38181',
  },
  menuButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
});

