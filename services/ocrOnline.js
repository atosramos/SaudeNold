/**
 * Serviço de OCR online usando APIs gratuitas
 * Usado como alternativa quando OCR nativo não está disponível
 */

import { Platform } from 'react-native';

/**
 * Realiza OCR usando Google Vision API (requer chave de API)
 * Alternativa online quando OCR nativo não funciona
 */
export const performOCROnline = async (imageBase64, apiKey = null) => {
  try {
    // Se não tiver chave de API, retornar null
    if (!apiKey) {
      console.log('Chave de API não fornecida para OCR online');
      return null;
    }

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageBase64,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.responses && data.responses[0] && data.responses[0].textAnnotations) {
      const textAnnotations = data.responses[0].textAnnotations;
      if (textAnnotations.length > 0) {
        // Primeira anotação contém todo o texto
        return textAnnotations[0].description;
      }
    }

    return null;
  } catch (error) {
    console.error('Erro no OCR online:', error);
    return null;
  }
};

/**
 * Realiza OCR usando API gratuita alternativa (OCR.space)
 * Suporta imagens e PDFs
 * Não requer chave de API, mas tem limite de requisições
 */
export const performOCROnlineFree = async (fileBase64, fileType = 'image', fileInput = null, addDebugLog = null) => {
  try {
    // Timeout de 120 segundos (aumentado para evitar timeouts)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    // No browser, usar FormData para evitar problemas de CORS
    // OCR.space aceita FormData que contorna algumas restrições CORS
    if (Platform.OS === 'web' && typeof FormData !== 'undefined') {
      const formData = new FormData();
      
      // Se fileInput é um File object (browser), usar diretamente (mais eficiente)
      let fileToSend;
      if (fileInput && fileInput instanceof File) {
        console.log('[OCR Online] Browser: Usando File object diretamente, tamanho:', fileInput.size, 'bytes');
        if (fileInput.size === 0) {
          throw new Error('Arquivo selecionado está vazio. Selecione um arquivo válido.');
        }
        fileToSend = fileInput;
      } else if (fileBase64 && fileBase64.length > 0) {
        // Converter base64 para Blob
        console.log('[OCR Online] Browser: Convertendo base64 para Blob, tamanho base64:', fileBase64.length);
        const mimeType = fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';
        try {
          const byteCharacters = atob(fileBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          fileToSend = new Blob([byteArray], { type: mimeType });
          console.log('[OCR Online] Browser: Blob criado, tamanho:', fileToSend.size, 'bytes');
          if (fileToSend.size === 0) {
            throw new Error('Erro ao converter arquivo: Blob criado está vazio. O arquivo pode estar corrompido.');
          }
        } catch (conversionError) {
          console.error('[OCR Online] Erro ao converter base64 para Blob:', conversionError);
          throw new Error(`Erro ao processar arquivo: ${conversionError.message || 'Falha na conversão'}`);
        }
      } else {
        throw new Error('Arquivo não disponível. Selecione um arquivo válido e tente novamente.');
      }
      
      // Adicionar arquivo ao FormData
      formData.append('file', fileToSend, fileType === 'pdf' ? 'document.pdf' : 'image.jpg');
      formData.append('language', 'por');
      formData.append('isOverlayRequired', 'false');
      if (fileType === 'pdf') {
        formData.append('filetype', 'PDF');
      }
      formData.append('OCREngine', '2');
      formData.append('detectOrientation', 'true');

      console.log(`Enviando ${fileType} para OCR online via FormData (browser)...`);

      // Usar endpoint que aceita FormData (parse/image ao invés de parse/imagebase64)
      const url = 'https://api.ocr.space/parse/image';
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': 'helloworld', // Chave pública gratuita (limitada)
          // Não definir Content-Type - o browser define automaticamente com boundary para FormData
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro na API OCR: ${response.status} - ${errorText}`);
        
        if (response.status === 429) {
          console.log('Rate limit atingido, aguardando 5 segundos...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          return null;
        }
        
        throw new Error(`Erro na API: ${response.status} - ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();
      
      console.log('Resposta da API OCR:', {
        hasParsedResults: !!data.ParsedResults,
        parsedResultsCount: data.ParsedResults?.length || 0,
        errorMessage: data.ErrorMessage,
      });
      
      if (data.ParsedResults && data.ParsedResults.length > 0) {
        const result = data.ParsedResults[0];
        const text = result.ParsedText;
        
        if (text && text.trim().length > 0) {
          console.log(`OCR extraiu ${text.length} caracteres`);
          return text.trim();
        } else {
          console.log('OCR retornou resultado vazio');
        }
      }

      if (data.ErrorMessage) {
        console.error('Erro do OCR.space:', data.ErrorMessage);
        throw new Error(`Erro do OCR: ${data.ErrorMessage}`);
      }

      console.log('OCR não retornou texto e não há mensagem de erro');
      return null;
    }

    // No mobile, usar JSON com base64 (funciona normalmente)
    let url, body;
    
    // Validar base64 antes de enviar
    if (!fileBase64 || fileBase64.length === 0) {
      throw new Error('Dados do arquivo vazios. Não foi possível ler o arquivo.');
    }
    
    console.log(`[OCR Online] Mobile: Preparando ${fileType} para OCR, tamanho base64: ${fileBase64.length}`);
    
    if (fileType === 'pdf') {
      url = 'https://api.ocr.space/parse/imagebase64';
      body = JSON.stringify({
        base64Image: fileBase64,
        language: 'por',
        isOverlayRequired: false,
        filetype: 'PDF',
        OCREngine: 2,
        detectOrientation: true,
      });
    } else {
      url = 'https://api.ocr.space/parse/imagebase64';
      body = JSON.stringify({
        base64Image: fileBase64,
        language: 'por',
        isOverlayRequired: false,
        OCREngine: 2,
        detectOrientation: true,
      });
    }

    if (addDebugLog) addDebugLog(`Enviando ${fileType} para OCR online (${Math.round(body.length / 1024)} KB)...`, 'info');
    console.log(`[OCR Online] Mobile: Enviando ${fileType} para OCR online via JSON...`);
    console.log(`[OCR Online] Mobile: Tamanho do body: ${body.length} bytes`);

    if (addDebugLog) addDebugLog('Aguardando resposta do servidor OCR...', 'info');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'helloworld',
      },
      body: body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    if (addDebugLog) addDebugLog(`Resposta recebida: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error');

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
        console.error(`[OCR Online] Mobile: Erro na API OCR: ${response.status}`);
        console.error(`[OCR Online] Mobile: Resposta de erro: ${errorText.substring(0, 200)}`);
      } catch (textError) {
        console.error(`[OCR Online] Mobile: Erro ao ler resposta de erro: ${textError.message}`);
        errorText = `Erro HTTP ${response.status}`;
      }
      
      // Se for erro 429 (rate limit), tentar com delay
      if (response.status === 429) {
        console.log('[OCR Online] Mobile: Rate limit atingido, aguardando 5 segundos...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Retornar null para permitir retry
        return null;
      }
      
      // Mensagens de erro mais específicas
      let errorMessage = `Erro na API OCR: ${response.status}`;
      if (response.status === 400) {
        errorMessage = 'Arquivo inválido ou formato não suportado. Verifique se o PDF está corrompido.';
      } else if (response.status === 413) {
        errorMessage = 'Arquivo muito grande. Tente com um arquivo menor.';
      } else if (response.status === 500 || response.status === 503) {
        errorMessage = 'Servidor OCR temporariamente indisponível. Tente novamente em alguns instantes.';
      } else if (errorText) {
        errorMessage = `${errorMessage} - ${errorText.substring(0, 100)}`;
      }
      
      throw new Error(errorMessage);
    }

    if (addDebugLog) addDebugLog('Processando resposta do OCR...', 'info');
    const data = await response.json();
    
    console.log('Resposta da API OCR:', {
      hasParsedResults: !!data.ParsedResults,
      parsedResultsCount: data.ParsedResults?.length || 0,
      errorMessage: data.ErrorMessage,
    });
    
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      const result = data.ParsedResults[0];
      const text = result.ParsedText;
      
      if (text && text.trim().length > 0) {
        if (addDebugLog) addDebugLog(`OCR extraiu ${text.length} caracteres com sucesso!`, 'success');
        console.log(`OCR extraiu ${text.length} caracteres`);
        return text.trim();
      } else {
        if (addDebugLog) addDebugLog('OCR retornou resultado vazio', 'error');
        console.log('OCR retornou resultado vazio');
      }
    }

    // Se não retornou texto, verificar se há erro
    if (data.ErrorMessage) {
      console.error('Erro do OCR.space:', data.ErrorMessage);
      throw new Error(`Erro do OCR: ${data.ErrorMessage}`);
    }

    // Se chegou aqui, não retornou texto mas também não tem erro explícito
    console.log('OCR não retornou texto e não há mensagem de erro');
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Timeout no OCR online (90s)');
      throw new Error('Timeout: O processamento demorou muito. Tente novamente com um arquivo menor.');
    } else if (error.message) {
      // Re-throw com mensagem de erro
      throw error;
    } else {
      console.error('Erro no OCR online gratuito:', error);
      throw new Error('Erro ao processar arquivo. Verifique sua conexão e tente novamente.');
    }
  }
};

