/**
 * Serviço de OCR local para processamento de imagens e PDFs
 * Funciona totalmente offline usando bibliotecas nativas
 */

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { performOCROnlineFree } from './ocrOnline';

/**
 * Converte uma imagem para base64
 */
export const imageToBase64 = async (uri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Erro ao converter imagem para base64:', error);
    throw error;
  }
};

/**
 * Processa uma imagem para melhorar a qualidade do OCR
 * Redimensiona se necessário e melhora o contraste
 */
export const enhanceImageForOCR = async (uri) => {
  try {
    // Redimensionar se muito pequena (melhora OCR)
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [
        { resize: { width: 1200 } }, // Redimensionar para largura máxima de 1200px
      ],
      {
        compress: 0.9, // Menos compressão para melhor qualidade
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return manipulated.uri;
  } catch (error) {
    console.error('Erro ao melhorar imagem:', error);
    return uri; // Retorna URI original se falhar
  }
};

/**
 * Realiza OCR em imagem usando expo-text-extractor (nativo)
 */
const performOCRNative = async (imageUri, onProgress = null) => {
  try {
    // Tentar usar expo-text-extractor
    // Nota: Esta biblioteca requer código nativo e só funciona no runtime do React Native
    let extractTextFromImage;
    try {
      // expo-text-extractor exporta extractTextFromImage como função nomeada
      const { extractTextFromImage: extract } = require('expo-text-extractor');
      extractTextFromImage = extract;
      
      // Se não encontrou, tentar importação default
      if (!extractTextFromImage) {
        const TextExtractor = require('expo-text-extractor');
        extractTextFromImage = TextExtractor.extractTextFromImage || TextExtractor.default?.extractTextFromImage;
      }
    } catch (e) {
      // Erro esperado no Node.js (módulo nativo não disponível)
      // No React Native, isso funcionará
      console.log('expo-text-extractor - módulo nativo requerido (funcionará no app):', e.message);
      return null;
    }
    
    if (!extractTextFromImage || typeof extractTextFromImage !== 'function') {
      console.log('extractTextFromImage não encontrado ou não é uma função');
      return null;
    }

    if (onProgress) {
      onProgress({ status: 'Processando OCR nativo...', progress: 0.5 });
    }

    // Melhorar imagem antes do OCR
    const enhancedUri = await enhanceImageForOCR(imageUri);

    // Realizar OCR
    const textArray = await extractTextFromImage(enhancedUri);
    
    if (!textArray || textArray.length === 0) {
      console.log('OCR nativo não extraiu texto');
      return null;
    }

    // Juntar todas as linhas de texto
    const extractedText = textArray.join('\n').trim();
    
    console.log(`OCR nativo concluído. Texto extraído: ${extractedText.length} caracteres`);
    
    if (onProgress) {
      onProgress({ status: 'OCR concluído!', progress: 1.0 });
    }
    
    return extractedText.length > 0 ? extractedText : null;
  } catch (error) {
    console.error('Erro no OCR nativo:', error);
    return null;
  }
};

/**
 * Extrai texto de uma imagem ou PDF usando APENAS OCR online gratuito
 * 
 * @param {string} fileUri - URI do arquivo (imagem ou PDF)
 * @param {string} fileType - Tipo de arquivo ('image' ou 'pdf')
 * @param {function} onProgress - Callback para progresso (opcional)
 * @returns {Promise<string|null>} Texto extraído ou null
 */
export const performOCR = async (fileUri, fileType = 'image', onProgress = null) => {
  try {
    console.log(`[OCR Service] Iniciando OCR online para ${fileType}...`);
    console.log(`[OCR Service] Tipo de entrada: ${typeof fileUri}, é File: ${fileUri instanceof File}`);
    
    if (onProgress) {
      onProgress({ status: 'Preparando arquivo...', progress: 0.1 });
    }

    // No browser, se for File object, passar diretamente para OCR (mais eficiente)
    if (Platform.OS === 'web' && fileUri instanceof File) {
      console.log(`[OCR Service] Browser: Passando File object diretamente para OCR, tamanho: ${fileUri.size} bytes`);
      if (fileUri.size === 0) {
        throw new Error('Arquivo selecionado está vazio. Selecione um arquivo válido.');
      }
      
      if (onProgress) {
        onProgress({ status: 'Enviando para OCR online...', progress: 0.3 });
      }
      
      // Passar File object diretamente (ocrOnline.js vai usar FormData)
      const onlineResult = await performOCROnlineFree(null, fileType, fileUri);
      
      if (onlineResult && onlineResult.trim().length > 0) {
        console.log(`[OCR Service] OCR online extraiu ${onlineResult.length} caracteres`);
        if (onProgress) {
          onProgress({ status: 'OCR concluído!', progress: 1.0 });
        }
        return onlineResult.trim();
      }
      
      console.log('[OCR Service] OCR online não retornou texto');
      if (onProgress) {
        onProgress({ 
          status: 'OCR não extraiu texto.', 
          progress: 0 
        });
      }
      
      return null;
    }

    // Converter arquivo para base64 (mobile ou browser com data URL)
    let base64;
    
    // No browser, se for data URL, extrair base64 diretamente
    if (Platform.OS === 'web' && typeof fileUri === 'string' && fileUri.startsWith('data:')) {
      console.log('[OCR Service] Browser: Extraindo base64 de data URL...');
      const base64Index = fileUri.indexOf(',');
      if (base64Index !== -1) {
        base64 = fileUri.substring(base64Index + 1);
        console.log(`[OCR Service] Base64 extraído, tamanho: ${base64.length}`);
      } else {
        throw new Error('Data URL inválida');
      }
    } else if (fileType === 'pdf') {
      // Para PDF no mobile, ler diretamente como base64
      console.log('[OCR Service] Mobile: Lendo PDF como base64...');
      console.log('[OCR Service] URI do PDF:', fileUri?.substring?.(0, 100) || fileUri);
      
      try {
        if (!fileUri || typeof fileUri !== 'string') {
          throw new Error(`URI inválida: ${typeof fileUri}`);
        }
        
        // Verificar se o arquivo existe
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        console.log('[OCR Service] Informações do arquivo:', {
          exists: fileInfo.exists,
          isDirectory: fileInfo.isDirectory,
          size: fileInfo.size,
          uri: fileUri.substring(0, 50)
        });
        
        if (!fileInfo.exists) {
          throw new Error(`Arquivo não encontrado: ${fileUri}`);
        }
        
        if (fileInfo.isDirectory) {
          throw new Error(`O caminho é um diretório, não um arquivo: ${fileUri}`);
        }
        
        base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log(`[OCR Service] PDF lido com sucesso, tamanho base64: ${base64.length}`);
        
        if (!base64 || base64.length === 0) {
          throw new Error('Arquivo lido está vazio');
        }
      } catch (readError) {
        console.error('[OCR Service] Erro ao ler PDF:', readError);
        console.error('[OCR Service] Stack trace:', readError.stack);
        throw new Error(`Erro ao ler arquivo PDF: ${readError.message}`);
      }
    } else {
      // Para imagens, usar função existente
      console.log('[OCR Service] Convertendo imagem para base64...');
      base64 = await imageToBase64(fileUri);
      console.log(`[OCR Service] Imagem convertida, tamanho base64: ${base64.length}`);
    }

    if (!base64 || base64.length === 0) {
      throw new Error('Erro ao converter arquivo para base64. O arquivo pode estar vazio ou corrompido.');
    }

    if (onProgress) {
      onProgress({ status: 'Enviando para OCR online...', progress: 0.3 });
    }

    // Usar APENAS OCR online gratuito
    const onlineResult = await performOCROnlineFree(base64, fileType);
    
    if (onlineResult && onlineResult.trim().length > 0) {
      console.log(`OCR online extraiu ${onlineResult.length} caracteres`);
      if (onProgress) {
        onProgress({ status: 'OCR concluído!', progress: 1.0 });
      }
      return onlineResult.trim();
    }

    console.log('OCR online não retornou texto');
    if (onProgress) {
      onProgress({ 
        status: 'OCR não extraiu texto. Use entrada manual.', 
        progress: 0 
      });
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao realizar OCR:', error);
    if (onProgress) {
      onProgress({ 
        status: 'Erro no OCR. Use entrada manual.', 
        progress: 0 
      });
    }
    return null;
  }
};

/**
 * Realiza OCR no browser usando Tesseract.js
 */
const performOCRWeb = async (imageUri, onProgress) => {
  try {
    const Tesseract = (await import('tesseract.js')).default;
    
    // Converter URI para formato que Tesseract aceita
    let imageData = imageUri;
    
    // Se for data URI, usar diretamente
    if (!imageUri.startsWith('data:')) {
      // Converter para base64 primeiro
      const base64 = await imageToBase64(imageUri);
      imageData = `data:image/jpeg;base64,${base64}`;
    }

    const worker = await Tesseract.createWorker('por', 1, {
      logger: (m) => {
        if (onProgress && m.status) {
          onProgress({
            status: m.status,
            progress: m.progress || 0,
          });
        }
      },
    });

    try {
      const { data: { text } } = await worker.recognize(imageData);
      await worker.terminate();

      const extractedText = text.trim();
      console.log(`OCR concluído. Texto extraído: ${extractedText.length} caracteres`);
      
      return extractedText.length > 0 ? extractedText : null;
    } catch (error) {
      await worker.terminate();
      throw error;
    }
  } catch (error) {
    console.error('Erro no OCR web:', error);
    return null;
  }
};

/**
 * Valida se o texto extraído parece ser de um exame médico
 */
export const validateExamText = (text) => {
  if (!text || text.length < 10) {
    return false;
  }

  // Palavras-chave comuns em exames médicos
  const medicalKeywords = [
    'hemograma', 'glicemia', 'colesterol', 'urina', 'fezes',
    'tsh', 't4', 'vitamina', 'creatinina', 'ureia',
    'hemoglobina', 'leucócitos', 'plaquetas', 'glicose',
    'hdl', 'ldl', 'triglicerídeos', 'exame', 'resultado',
    'referência', 'valor', 'unidade', 'data', 'paciente',
    'mg/dl', 'g/dl', 'ml', 'mm3', 'ui/l', 'ng/ml'
  ];

  const textLower = text.toLowerCase();
  const foundKeywords = medicalKeywords.filter(keyword => 
    textLower.includes(keyword)
  );

  // Se encontrar pelo menos 2 palavras-chave, provavelmente é um exame
  return foundKeywords.length >= 2;
};
