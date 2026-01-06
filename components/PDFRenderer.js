/**
 * Componente para renderizar PDF e capturar como imagem
 * Usado para converter PDF em imagem para OCR
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

let ViewShot;
try {
  ViewShot = require('react-native-view-shot').default;
} catch (e) {
  console.log('react-native-view-shot não disponível');
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PDF_WIDTH = SCREEN_WIDTH - 48; // padding
const PDF_HEIGHT = 800; // altura fixa para captura

export default function PDFRenderer({ 
  pdfUri, 
  onCapture, 
  page = 1,
  onError 
}) {
  const viewShotRef = useRef(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  useEffect(() => {
    if (pdfLoaded && viewShotRef.current) {
      // Aguardar um pouco para garantir que o PDF foi renderizado
      setTimeout(() => {
        capturePDF();
      }, 1000);
    }
  }, [pdfLoaded]);

  const capturePDF = async () => {
    try {
      if (!viewShotRef.current) {
        throw new Error('ViewShot ref não disponível');
      }

      const uri = await viewShotRef.current.capture();
      
      if (onCapture) {
        onCapture(uri);
      }
    } catch (error) {
      console.error('Erro ao capturar PDF:', error);
      if (onError) {
        onError(error);
      }
    }
  };

  // Verificar se react-native-pdf está disponível
  let PDF;
  try {
    PDF = require('react-native-pdf').default;
  } catch (e) {
    console.log('react-native-pdf não disponível');
    if (onError) {
      onError(new Error('Biblioteca react-native-pdf não disponível'));
    }
    return null;
  }

  if (!ViewShot) {
    if (onError) {
      onError(new Error('react-native-view-shot não disponível'));
    }
    return null;
  }

  return (
    <View style={styles.container}>
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'jpg', quality: 0.9 }}
        style={styles.viewShot}
      >
        <PDF
          source={{ uri: pdfUri, cache: true }}
          page={page}
          style={styles.pdf}
          onLoadComplete={(numberOfPages) => {
            console.log(`PDF carregado: ${numberOfPages} páginas`);
            setPdfLoaded(true);
          }}
          onError={(error) => {
            console.error('Erro ao carregar PDF:', error);
            if (onError) {
              onError(error);
            }
          }}
        />
      </ViewShot>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: -9999, // Esconder fora da tela
    top: -9999,
    width: PDF_WIDTH,
    height: PDF_HEIGHT,
  },
  viewShot: {
    width: PDF_WIDTH,
    height: PDF_HEIGHT,
  },
  pdf: {
    width: PDF_WIDTH,
    height: PDF_HEIGHT,
  },
});

