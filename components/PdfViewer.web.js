// Stub para web - react-native-pdf não funciona no web
import { View, Text } from 'react-native-web';

export default function PdfViewer({ source, onLoadComplete, onPageChanged, onError, style }) {
  return (
    <View style={style}>
      <Text style={{ color: '#fff', padding: 20, textAlign: 'center' }}>
        Visualizador de PDF não disponível no web. Use o botão para abrir em nova aba.
      </Text>
    </View>
  );
}


