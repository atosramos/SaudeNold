// Versão mobile - usa react-native-pdf
import { View, Text } from 'react-native';
import Pdf from 'react-native-pdf';

export default function PdfViewer({ source, onLoadComplete, onPageChanged, onError, style }) {
  try {
    return (
      <Pdf
        source={source}
        onLoadComplete={onLoadComplete}
        onPageChanged={onPageChanged}
        onError={onError}
        style={style}
      />
    );
  } catch (error) {
    console.warn('react-native-pdf não disponível:', error);
    return (
      <View style={style}>
        <Text style={{ color: '#fff', padding: 20, textAlign: 'center' }}>
          Visualizador de PDF não disponível.
        </Text>
      </View>
    );
  }
}

