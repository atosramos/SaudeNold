import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const LIBRARIES = [
  {
    name: 'Expo',
    version: '~54.0.30',
    license: 'MIT',
    description: 'Framework React Native para desenvolvimento mobile',
    url: 'https://expo.dev',
  },
  {
    name: 'React Native',
    version: '0.81.5',
    license: 'MIT',
    description: 'Framework para desenvolvimento de aplicativos móveis',
    url: 'https://reactnative.dev',
  },
  {
    name: 'React',
    version: '19.1.0',
    license: 'MIT',
    description: 'Biblioteca JavaScript para construção de interfaces',
    url: 'https://react.dev',
  },
  {
    name: 'Expo Router',
    version: '^6.0.21',
    license: 'MIT',
    description: 'Roteamento file-based para Expo',
    url: 'https://docs.expo.dev/router/introduction/',
  },
  {
    name: '@react-native-async-storage/async-storage',
    version: '^2.2.0',
    license: 'MIT',
    description: 'Armazenamento local assíncrono e persistente',
    url: 'https://github.com/react-native-async-storage/async-storage',
  },
  {
    name: 'Expo Notifications',
    version: '^0.32.15',
    license: 'MIT',
    description: 'Sistema de notificações push e locais',
    url: 'https://docs.expo.dev/versions/latest/sdk/notifications/',
  },
  {
    name: 'Expo Image Picker',
    version: '^17.0.10',
    license: 'MIT',
    description: 'Seleção de imagens da câmera ou galeria',
    url: 'https://docs.expo.dev/versions/latest/sdk/image-picker/',
  },
  {
    name: 'Expo Document Picker',
    version: '~14.0.8',
    license: 'MIT',
    description: 'Seletor de documentos (PDFs, etc.)',
    url: 'https://docs.expo.dev/versions/latest/sdk/document-picker/',
  },
  {
    name: 'Expo File System',
    version: '~18.0.4',
    license: 'MIT',
    description: 'Manipulação de arquivos e sistema de arquivos',
    url: 'https://docs.expo.dev/versions/latest/sdk/filesystem/',
  },
  {
    name: 'Expo AV',
    version: '~16.0.8',
    license: 'MIT',
    description: 'Reprodução de áudio e vídeo',
    url: 'https://docs.expo.dev/versions/latest/sdk/av/',
  },
  {
    name: 'Expo Speech',
    version: '~14.0.8',
    license: 'MIT',
    description: 'Text-to-speech para leitura de texto',
    url: 'https://docs.expo.dev/versions/latest/sdk/speech/',
  },
  {
    name: '@expo/vector-icons',
    version: '^15.0.3',
    license: 'MIT',
    description: 'Biblioteca de ícones (Ionicons, MaterialIcons, etc.)',
    url: 'https://docs.expo.dev/guides/icons/',
  },
  {
    name: '@react-native-community/datetimepicker',
    version: '8.4.4',
    license: 'MIT',
    description: 'Seletor de data e hora nativo',
    url: 'https://github.com/react-native-datetimepicker/datetimepicker',
  },
  {
    name: 'react-native-pdf',
    version: '^6.7.0',
    license: 'MIT',
    description: 'Visualizador de PDF para React Native',
    url: 'https://github.com/wonday/react-native-pdf',
  },
  {
    name: 'react-native-view-shot',
    version: '^3.8.0',
    license: 'MIT',
    description: 'Captura de screenshots de componentes React Native',
    url: 'https://github.com/gre/react-native-view-shot',
  },
  {
    name: 'react-native-safe-area-context',
    version: '^5.6.2',
    license: 'MIT',
    description: 'Gerenciamento de áreas seguras (notch, status bar)',
    url: 'https://github.com/th3rdwave/react-native-safe-area-context',
  },
  {
    name: 'react-native-screens',
    version: '~4.16.0',
    license: 'MIT',
    description: 'Navegação nativa otimizada para React Native',
    url: 'https://github.com/software-mansion/react-native-screens',
  },
  {
    name: 'react-native-svg',
    version: '15.12.1',
    license: 'MIT',
    description: 'Renderização de SVG em React Native',
    url: 'https://github.com/software-mansion/react-native-svg',
  },
  {
    name: 'tesseract.js',
    version: '^5.0.4',
    license: 'Apache-2.0',
    description: 'OCR (Reconhecimento Óptico de Caracteres) em JavaScript',
    url: 'https://github.com/naptha/tesseract.js',
  },
  {
    name: 'axios',
    version: '^1.13.2',
    license: 'MIT',
    description: 'Cliente HTTP baseado em Promises',
    url: 'https://github.com/axios/axios',
  },
  {
    name: 'expo-text-extractor',
    version: '^0.2.2',
    license: 'MIT',
    description: 'Extração de texto de documentos',
    url: 'https://docs.expo.dev/versions/latest/sdk/text-extractor/',
  },
];

export default function About() {
  const router = useRouter();

  const openUrl = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Erro ao abrir URL:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={32} color="#4ECDC4" />
        </TouchableOpacity>
        <Text style={styles.title}>Código Fonte Utilizado</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.introCard}>
          <Ionicons name="information-circle" size={32} color="#4ECDC4" />
          <Text style={styles.introText}>
            Este aplicativo utiliza bibliotecas de código aberto (open source) desenvolvidas pela comunidade.
            Abaixo está a lista completa de bibliotecas utilizadas, suas versões e licenças.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Bibliotecas de Terceiros</Text>

        {LIBRARIES.map((library, index) => (
          <View key={index} style={styles.libraryCard}>
            <View style={styles.libraryHeader}>
              <View style={styles.libraryInfo}>
                <Text style={styles.libraryName}>{library.name}</Text>
                <Text style={styles.libraryVersion}>v{library.version}</Text>
              </View>
              <View style={styles.licenseBadge}>
                <Text style={styles.licenseText}>{library.license}</Text>
              </View>
            </View>
            <Text style={styles.libraryDescription}>{library.description}</Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => openUrl(library.url)}
            >
              <Ionicons name="open-outline" size={16} color="#4ECDC4" />
              <Text style={styles.linkText}>Ver documentação</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.footerCard}>
          <Ionicons name="heart" size={24} color="#FF6B6B" />
          <Text style={styles.footerText}>
            Agradecemos a todos os desenvolvedores e mantenedores das bibliotecas open source que tornam este projeto possível.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 24,
  },
  introCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  introText: {
    flex: 1,
    fontSize: 16,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  libraryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  libraryInfo: {
    flex: 1,
  },
  libraryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  libraryVersion: {
    fontSize: 14,
    color: '#666',
  },
  licenseBadge: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  licenseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  libraryDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    lineHeight: 22,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 14,
    color: '#4ECDC4',
    marginLeft: 6,
    fontWeight: '600',
  },
  footerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 20,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  footerText: {
    flex: 1,
    fontSize: 16,
    color: '#E65100',
    marginLeft: 12,
    lineHeight: 22,
  },
});
