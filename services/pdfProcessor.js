/**
 * Serviço para processar PDFs e convertê-los em imagens
 * Funciona no React Native/Expo
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Converte primeira página do PDF para imagem usando react-native-pdf e view-shot
 * 
 * @param {string} pdfUri - URI do PDF
 * @param {function} onProgress - Callback para progresso
 * @returns {Promise<string|null>} URI da imagem gerada ou null
 */
export const pdfToImage = async (pdfUri, onProgress = null) => {
  try {
    console.log('Convertendo PDF para imagem...');

    if (onProgress) {
      onProgress({ status: 'Preparando PDF...', progress: 0.1 });
    }

    // No browser, podemos tentar usar pdf.js
    if (Platform.OS === 'web') {
      return await pdfToImageWeb(pdfUri, onProgress);
    }

    // No mobile, usar react-native-pdf para renderizar e capturar
    return await pdfToImageMobile(pdfUri, onProgress);
  } catch (error) {
    console.error('Erro ao converter PDF para imagem:', error);
    return null;
  }
};

/**
 * Converte PDF para imagem no browser usando pdf.js
 */
const pdfToImageWeb = async (pdfUri, onProgress) => {
  try {
    // Tentar usar pdf.js se disponível
    // Por enquanto, retornar null (requer biblioteca adicional)
    console.log('PDF no browser - conversão requer pdf.js');
    if (onProgress) {
      onProgress({ status: 'PDF no browser requer biblioteca adicional', progress: 0 });
    }
    return null;
  } catch (error) {
    console.error('Erro ao converter PDF no browser:', error);
    return null;
  }
};

/**
 * Converte PDF para imagem no mobile usando react-native-pdf
 * Retorna uma promise que resolve quando o componente capturar a imagem
 */
let pdfCapturePromise = null;
let pdfCaptureResolve = null;
let pdfCaptureReject = null;

export const setPDFCaptureCallback = (resolve, reject) => {
  pdfCaptureResolve = resolve;
  pdfCaptureReject = reject;
};

const pdfToImageMobile = async (pdfUri, onProgress) => {
  try {
    // Verificar se react-native-pdf está disponível
    let PDF, ViewShot;
    try {
      PDF = require('react-native-pdf').default;
      ViewShot = require('react-native-view-shot').default;
    } catch (e) {
      console.log('Bibliotecas de PDF não disponíveis:', e);
      return null;
    }

    if (onProgress) {
      onProgress({ status: 'Renderizando PDF...', progress: 0.3 });
    }

    // Esta função será chamada pelo componente PDFRenderer
    // quando ele capturar a imagem
    return new Promise((resolve, reject) => {
      setPDFCaptureCallback(resolve, reject);
      
      // Timeout de 30 segundos
      setTimeout(() => {
        if (pdfCaptureResolve === resolve) {
          setPDFCaptureCallback(null, null);
          reject(new Error('Timeout ao converter PDF para imagem'));
        }
      }, 30000);
    });
  } catch (error) {
    console.error('Erro ao converter PDF no mobile:', error);
    return null;
  }
};

/**
 * Extrai texto diretamente de PDF (se o PDF tiver texto selecionável)
 * Esta é uma alternativa mais simples que não requer conversão para imagem
 */
export const extractTextFromPDFDirect = async (pdfUri) => {
  try {
    // Tentar usar biblioteca que extrai texto diretamente de PDFs
    // Por enquanto, retornar null
    console.log('Extração direta de texto de PDF não implementada');
    return null;
  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error);
    return null;
  }
};
