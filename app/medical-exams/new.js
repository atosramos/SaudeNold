import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, TextInput, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { imageToBase64, performOCR, validateExamText } from '../../services/ocr';
import * as FileSystem from 'expo-file-system';
import { extractDataFromOCRText } from '../../services/examDataExtraction';
import { extractDataWithLLMFallback, extractDataWithGeminiDirect } from '../../services/llmDataExtraction';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { isProFeatureAvailable } from '../../services/proLicense';
import PdfViewer from '../../components/PdfViewer';
import { trackProFeatureUsage } from '../../services/analytics';

export default function NewMedicalExam() {
  const router = useRouter();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState('image'); // 'image' ou 'pdf'
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(null);
  const fileInputRef = useRef(null);
  const [originalFile, setOriginalFile] = useState(null); // Para browser: manter File object
  const [showPdfModal, setShowPdfModal] = useState(false); // Mostrar/ocultar modal do PDF
  const [processedFile, setProcessedFile] = useState(null); // Arquivo processado para visualização

  const pickImage = async () => {
    try {
      // No browser, usar input file nativo
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const selectedFile = e.target.files[0];
          if (selectedFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setFile(event.target.result);
              setFileType('image');
            };
            reader.readAsDataURL(selectedFile);
          }
        };
        input.click();
        return;
      }

      // No mobile, usar ImagePicker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
        quality: 0.7,
    });

    if (!result.canceled) {
      setFile(result.assets[0].uri);
      setFileType('image');
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      showAlert('Erro', 'Não foi possível selecionar a imagem', 'error');
    }
  };

  const takePhoto = async () => {
    try {
      // No browser, câmera não está disponível, usar galeria
      if (Platform.OS === 'web') {
        showAlert('Aviso', 'Câmera não disponível no navegador. Use a opção de galeria.', 'warning');
        pickImage();
        return;
      }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
        quality: 0.7,
    });

    if (!result.canceled) {
      setFile(result.assets[0].uri);
      setFileType('image');
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      showAlert('Erro', 'Não foi possível acessar a câmera', 'error');
    }
  };

  const pickPDF = async () => {
    try {
      // No browser, usar input file nativo
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = (e) => {
          const selectedFile = e.target.files[0];
          if (selectedFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setFile(event.target.result);
              setFileType('pdf');
            };
            reader.readAsDataURL(selectedFile);
          }
        };
        input.click();
        return;
      }

      // No mobile, usar DocumentPicker
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        console.log('📄 PDF selecionado no mobile:', {
          uri: selectedFile.uri?.substring(0, 50) || 'N/A',
          name: selectedFile.name,
          size: selectedFile.size,
          mimeType: selectedFile.mimeType
        });
        
        // Verificar se o arquivo tem tamanho válido
        if (selectedFile.size && selectedFile.size > 0) {
          setFile(selectedFile.uri);
        setFileType('pdf');
          console.log('✅ PDF configurado com sucesso');
        } else {
          console.error('❌ Arquivo selecionado está vazio');
          showAlert('Erro', 'O arquivo selecionado está vazio. Selecione um arquivo válido.', 'error');
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar PDF:', error);
      showAlert('Erro', 'Não foi possível selecionar o PDF', 'error');
    }
  };

  const showFileOptions = () => {
    // No browser, abrir seletor de arquivo diretamente (aceita imagens e PDFs)
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      // Limpar valor para garantir que o evento onchange seja disparado mesmo se o mesmo arquivo for selecionado
      input.value = '';
      input.onchange = async (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
          // Verificar se o arquivo não está vazio
          if (selectedFile.size === 0) {
            showAlert('Erro', 'O arquivo selecionado está vazio. Selecione um arquivo válido.', 'error');
            return;
          }
          
          // Determinar tipo de arquivo primeiro
          let detectedType = 'image';
          if (selectedFile.type.startsWith('image/')) {
            detectedType = 'image';
          } else if (selectedFile.type === 'application/pdf') {
            detectedType = 'pdf';
          } else if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
            detectedType = 'pdf';
          }
          
          setFileType(detectedType);
          setOriginalFile(selectedFile); // Guardar File object para processamento (SEMPRE atualizar)
          
          // Para preview, usar data URL ou object URL
          if (detectedType === 'image') {
            // Para imagens, usar FileReader para data URL (preview funciona)
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target.result;
              setFile(dataUrl);
            };
            reader.readAsDataURL(selectedFile);
          } else {
            // Para PDFs, criar object URL para preview (mas não usar para processamento)
            // Revogar URL anterior se existir para evitar vazamento de memória
            if (file && file.startsWith('blob:')) {
              try {
                URL.revokeObjectURL(file);
              } catch (e) {
                // Ignorar erros ao revogar URL
              }
            }
            const objectUrl = URL.createObjectURL(selectedFile);
            setFile(objectUrl);
          }
        }
      };
      input.click();
      return;
    }

    // No mobile, mostrar opções
    Alert.alert(
      'Adicionar Exame Médico',
      'Escolha uma opção',
      [
        { text: 'Câmera', onPress: takePhoto },
        { text: 'Galeria (Foto)', onPress: pickImage },
        { text: 'PDF', onPress: pickPDF },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const fileToBase64 = async (uri, type) => {
    try {
      console.log('fileToBase64 chamado:', { 
        type, 
        platform: Platform.OS,
        uriType: typeof uri, 
        uriStart: uri?.substring(0, 50), 
        hasOriginalFile: !!originalFile 
      });
      
      // No browser, SEMPRE usar FileReader (nunca FileSystem)
      if (Platform.OS === 'web') {
        // Se temos o File object original, usar ele
        if (originalFile && originalFile instanceof File) {
          console.log('Browser: Usando originalFile (File object) para converter para base64...');
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const dataUrl = event.target.result;
                console.log('Browser: Data URL criada, tamanho:', dataUrl.length);
                // Extrair base64 da data URL
                const base64Index = dataUrl.indexOf(',');
                if (base64Index !== -1) {
                  const base64 = dataUrl.substring(base64Index + 1);
                  console.log('Browser: Base64 extraído, tamanho:', base64.length);
          resolve(base64);
                } else {
                  reject(new Error('Erro ao extrair base64: data URL inválida'));
                }
              } catch (err) {
                reject(err);
              }
            };
            reader.onerror = (error) => {
              console.error('Browser: Erro no FileReader:', error);
              reject(new Error(`Erro ao ler arquivo: ${error.message || 'Erro desconhecido'}`));
            };
            reader.readAsDataURL(originalFile);
          });
        }
        
        // Se for data URL, extrair base64 diretamente
        if (typeof uri === 'string' && uri.startsWith('data:')) {
          console.log('Browser: Extraindo base64 de data URL...');
          const base64Index = uri.indexOf(',');
          if (base64Index !== -1) {
            const base64 = uri.substring(base64Index + 1);
            console.log('Browser: Base64 extraído de data URL, tamanho:', base64.length);
            return base64;
          }
          throw new Error('Data URL inválida');
        }
        
        // Se chegou aqui no browser sem File object nem data URL, erro
        throw new Error('Browser: Arquivo não disponível para conversão. Selecione o arquivo novamente.');
      }

      // No mobile, usar métodos nativos
      if (type === 'image') {
        console.log('Mobile: Convertendo imagem usando imageToBase64...');
        return await imageToBase64(uri);
      } else {
        // Para PDF no mobile, usar FileSystem
        console.log('Mobile: Convertendo PDF usando FileSystem...');
        try {
          const base64 = await FileSystem.readAsStringAsync(uri, { 
            encoding: FileSystem.EncodingType.Base64 
          });
          console.log('Mobile: PDF convertido para base64, tamanho:', base64.length);
          return base64;
        } catch (fsError) {
          console.error('Mobile: Erro ao ler PDF com FileSystem:', fsError);
          throw new Error(`Erro ao ler PDF: ${fsError.message || 'Não foi possível ler o arquivo PDF'}`);
        }
      }
    } catch (error) {
      console.error(`Erro ao converter ${type} (${Platform.OS}):`, error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  };

  const processExam = async (ocrText) => {
    if (!ocrText || ocrText.trim().length === 0) {
      return {
        exam_date: null,
        exam_type: null,
        parameters: [],
      };
    }

    // Validar se o texto parece ser de um exame médico
    const isValid = validateExamText(ocrText);
    if (!isValid) {
      // Mesmo se não validar, tentar extrair dados
      console.log('Texto não validado como exame médico, mas tentando extrair dados...');
    }

    // Tentar extrair dados usando LLM primeiro (mais preciso, ignora dados irrelevantes)
    console.log('Tentando extrair dados com LLM...');
    let extractedData = await extractDataWithLLMFallback(ocrText);
    
    // Se LLM não funcionou ou retornou poucos dados, usar método tradicional como fallback
    if (!extractedData || !extractedData.parameters || extractedData.parameters.length === 0) {
      console.log('LLM não retornou dados suficientes, usando método tradicional (regex)...');
      extractedData = extractDataFromOCRText(ocrText);
    } else {
      console.log(`✅ LLM extraiu ${extractedData.parameters.length} parâmetros (ignorou dados irrelevantes)`);
    }

    return extractedData;
  };


  const saveExam = async () => {
    console.log('🔵 saveExam chamado!', { 
      platform: Platform.OS,
      hasFile: !!file, 
      fileType,
      isUploading: uploading,
      isProcessing: processing
    });
    
    if (!file) {
      console.log('❌ Nenhum arquivo selecionado');
      showAlert('Erro', 'Por favor, adicione uma foto ou PDF do exame', 'error');
      return;
    }

    console.log('✅ Arquivo encontrado, iniciando processamento...');
    setUploading(true);
    setProcessing(true);

    try {
      console.log('🚀 Iniciando processamento do exame...', { 
        fileType, 
        hasFile: !!file, 
        hasOriginalFile: !!originalFile,
        originalFileSize: originalFile instanceof File ? originalFile.size : 'N/A',
        fileUri: typeof file === 'string' ? file.substring(0, 50) : 'N/A',
        platform: Platform.OS
      });
      
      // Verificar se o originalFile tem tamanho válido (browser)
      if (Platform.OS === 'web' && originalFile && originalFile instanceof File) {
        if (originalFile.size === 0) {
          showAlert('Erro', 'O arquivo selecionado está vazio. Selecione um arquivo válido e tente novamente.', 'error');
          setProcessing(false);
          setUploading(false);
          return;
        }
      }
      
      // Converter arquivo para base64 (para salvar depois)
      let fileBase64;
      try {
        console.log('Convertendo arquivo para base64...');
        fileBase64 = await fileToBase64(file, fileType);
        console.log('Arquivo convertido para base64, tamanho:', fileBase64?.length || 0);
        
        // Verificar se o base64 não está vazio
        if (!fileBase64 || fileBase64.length === 0) {
          throw new Error('Arquivo convertido está vazio. O arquivo pode estar corrompido ou inválido.');
        }
      } catch (error) {
        console.error('Erro ao converter arquivo para base64:', error);
        showAlert('Erro', `Erro ao processar arquivo: ${error.message || 'Não foi possível converter o arquivo'}. Tente selecionar o arquivo novamente.`, 'error');
        setProcessing(false);
        setUploading(false);
        return;
      }

      // Verificar se tem licença PRO ativa
      const hasPro = await isProFeatureAvailable();
      
      if (!hasPro) {
        // Sem licença PRO, permitir apenas entrada manual
        showAlert(
          'Funcionalidade PRO',
          'A leitura automática de exames com inteligência artificial requer uma licença PRO.\n\nVocê pode inserir os dados manualmente ou ativar uma licença PRO em Configurações.',
          'info'
        );
        setProcessing(false);
        setUploading(false);
        return; // Retornar sem processar, mas permitir entrada manual
      }
      
      // FLUXO: Apenas Gemini Direct (SEM OCR) - Requer PRO
      // IMPORTANTE: No mobile, variáveis de ambiente só funcionam após rebuild do app
      // Se estiver usando Expo Go, as variáveis não estarão disponíveis
      const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || null;
      let extractedData = null;
      
      console.log('🔍 Verificando chave Gemini...', { 
        hasKey: !!GEMINI_API_KEY, 
        keyLength: GEMINI_API_KEY?.length || 0,
        platform: Platform.OS,
        hasPro,
        envKeys: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('EXPO_PUBLIC'))
      });
      
      // Verificar se tem chave Gemini
      if (!GEMINI_API_KEY || GEMINI_API_KEY.length === 0) {
        const errorMsg = '❌ Chave Gemini não configurada. Configure EXPO_PUBLIC_GEMINI_API_KEY no .env';
        console.error(errorMsg);
        showAlert('Erro', 'Chave Gemini não configurada. Configure EXPO_PUBLIC_GEMINI_API_KEY no arquivo .env', 'error');
        setProcessing(false);
        setUploading(false);
        return; // Para aqui - não tenta OCR
      }
      try {
        console.log('🚀 Tentando Gemini Direct (processamento direto do arquivo)...');
        console.log('📁 Arquivo para processar:', { 
          type: typeof file, 
          uri: file?.substring(0, 50) || 'N/A',
          fileType,
          platform: Platform.OS 
        });
        
        showAlert('Processando', 'Analisando documento diretamente com Gemini... Isso pode levar alguns segundos.', 'info');
        
        // Preparar arquivo para Gemini - SEMPRE usar originalFile se disponível e válido
        let fileForGemini;
        if (Platform.OS === 'web' && originalFile && originalFile instanceof File && originalFile.size > 0) {
          fileForGemini = originalFile;
          console.log('✅ Usando originalFile para Gemini Direct, tamanho:', originalFile.size);
        } else {
          fileForGemini = file;
          console.log('✅ Usando file (URI/blob) para Gemini Direct:', typeof fileForGemini, fileForGemini?.substring?.(0, 50) || 'N/A');
        }
        
        console.log('📤 Enviando para Gemini Direct...');
        console.log('📤 Detalhes do envio:', {
          fileType: typeof fileForGemini,
          fileUri: typeof fileForGemini === 'string' ? fileForGemini.substring(0, 50) : 'File object',
          fileTypeParam: fileType,
          hasApiKey: !!GEMINI_API_KEY,
          apiKeyLength: GEMINI_API_KEY?.length || 0
        });
        
        extractedData = await extractDataWithGeminiDirect(fileForGemini, fileType, GEMINI_API_KEY);
        const responseMsg = `📥 Resposta do Gemini Direct: hasData=${!!extractedData}, params=${extractedData?.parameters?.length || 0}`;
        console.log(responseMsg, { 
          hasData: !!extractedData, 
          parametersCount: extractedData?.parameters?.length || 0,
          examDate: extractedData?.exam_date,
          examType: extractedData?.exam_type
        });
        
        // Verificar se Gemini retornou dados válidos
        if (extractedData && extractedData.parameters && Array.isArray(extractedData.parameters) && extractedData.parameters.length > 0) {
          const successMsg = `✅ Gemini Direct extraiu ${extractedData.parameters.length} parâmetros diretamente do arquivo!`;
          console.log(successMsg);
          
          // Salvar exame com dados extraídos - SEM OCR
          await processAndSaveExam(fileBase64, null, extractedData);
          
          // FINALIZAR AQUI - NÃO CONTINUAR PARA OCR
          setUploading(false);
          setProcessing(false);
          setOcrProgress(null);
          console.log('✅ Gemini funcionou! Retornando SEM tentar OCR.');
          return; // Sucesso! NÃO CONTINUA PARA OCR - RETORNA IMEDIATAMENTE
        } else {
          // Gemini não retornou dados suficientes
          const errorMsg = extractedData 
            ? '❌ Gemini retornou dados, mas sem parâmetros válidos'
            : '❌ Gemini não conseguiu extrair dados do documento';
          console.error(errorMsg);
          showAlert('Erro', 'Não foi possível extrair dados do documento. Verifique se o arquivo está legível e tente novamente.', 'error');
          setProcessing(false);
          setUploading(false);
          setOcrProgress(null);
          return; // Para aqui - NÃO tenta OCR
        }
      } catch (error) {
        console.error('❌ Erro no Gemini Direct:', error);
        console.error('❌ Stack trace:', error.stack);
        showAlert('Erro', `Erro ao processar documento: ${error.message || 'Erro desconhecido'}. Verifique sua conexão e tente novamente.`, 'error');
        setProcessing(false);
        setUploading(false);
        setOcrProgress(null);
        return; // Para aqui - NÃO tenta OCR
      }

      // OCR REMOVIDO - Apenas Gemini Direct funciona
      // Se chegou aqui, significa que o Gemini não funcionou ou não retornou dados
      // Não tentar OCR - apenas mostrar erro
      const finalErrorMsg = 'Não foi possível processar o documento. Verifique se o arquivo está legível e tente novamente.';
      console.error(finalErrorMsg);
      showAlert('Erro', finalErrorMsg, 'error');
      setProcessing(false);
      setUploading(false);
      setOcrProgress(null);
      return; // Finaliza aqui - não tenta OCR

    } catch (error) {
      console.error('Erro ao processar exame:', error);
      console.error('Stack trace:', error.stack);
      const errorMessage = error.message || 'Erro desconhecido';
      showAlert('Erro', `Não foi possível processar o exame: ${errorMessage}\n\nTente novamente.`, 'error');
      setProcessing(false);
      setUploading(false);
      setOcrProgress(null);
    } finally {
      setUploading(false);
      setProcessing(false);
      setOcrProgress(null);
    }
  };

  const processAndSaveExam = async (fileBase64, ocrText, preExtractedData = null) => {
    try {
      setProcessing(true);
      console.log('processAndSaveExam: Iniciando processamento...', { 
        hasBase64: !!fileBase64, 
        base64Length: fileBase64?.length || 0,
        ocrTextLength: ocrText?.length || 0,
        hasPreExtractedData: !!preExtractedData
      });

      // Se já temos dados extraídos (do Gemini Direct), usar diretamente
      let extractedData = preExtractedData;
      
      if (!extractedData && ocrText) {
        // Extrair dados do texto OCR
        console.log('processAndSaveExam: Extraindo dados do texto OCR...');
        extractedData = await processExam(ocrText);
      } else if (!extractedData) {
        // Se não temos nem dados pré-extraídos nem texto OCR, criar estrutura vazia
        console.log('processAndSaveExam: Nenhum dado disponível para extração');
        extractedData = {
          exam_date: null,
          exam_type: null,
          parameters: [],
        };
      }
      console.log('processAndSaveExam: Dados extraídos:', {
        hasData: !!extractedData,
        parametersCount: extractedData?.parameters?.length || 0,
        examDate: extractedData?.exam_date,
        examType: extractedData?.exam_type
      });
      
      if (!extractedData) {
        // Se não conseguiu extrair, salvar apenas com o texto OCR
        const exam = {
          id: Date.now(),
        image_base64: fileBase64,
        file_type: fileType,
        file_uri: file, // Salvar URI do arquivo original para visualização posterior
          raw_ocr_text: ocrText,
          extracted_data: {
        exam_date: null,
        exam_type: null,
            parameters: [],
          },
          processing_status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Salvar localmente
        const stored = await AsyncStorage.getItem('medicalExams');
        const exams = stored ? JSON.parse(stored) : [];
        exams.push(exam);
        await AsyncStorage.setItem('medicalExams', JSON.stringify(exams));

        showAlert('Sucesso', 'Exame salvo localmente!', 'success');
        router.back();
        return;
      }

      // Criar objeto do exame com dados extraídos
      const exam = {
        id: Date.now(),
        image_base64: fileBase64,
        file_type: fileType,
        file_uri: file, // Salvar URI do arquivo original para visualização posterior
        raw_ocr_text: ocrText,
        extracted_data: extractedData,
        exam_date: extractedData.exam_date,
        exam_type: extractedData.exam_type,
        processing_status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Salvar localmente
        const stored = await AsyncStorage.getItem('medicalExams');
        const exams = stored ? JSON.parse(stored) : [];
        exams.push(exam);
        await AsyncStorage.setItem('medicalExams', JSON.stringify(exams));

      const paramsCount = extractedData.parameters?.length || 0;
      
      // Salvar arquivo processado para visualização
      setProcessedFile(file);
      
      showAlert(
        'Sucesso',
        `Exame processado com sucesso! ${paramsCount} parâmetro(s) extraído(s).`,
        'success'
      );
      
      // Voltar automaticamente para a tela anterior após um pequeno delay
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Erro ao salvar exame:', error);
      showAlert('Erro', 'Não foi possível salvar o exame. Tente novamente.', 'error');
    } finally {
      setProcessing(false);
      setUploading(false);
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
        <Text style={styles.title}>Novo Exame Médico</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>
          Tire uma foto, escolha uma imagem ou selecione um PDF do exame médico.
          O sistema processará automaticamente e extrairá os dados.
        </Text>

        {file ? (
          <View style={styles.fileContainer}>
            {fileType === 'image' ? (
              <Image source={{ uri: file }} style={styles.image} />
            ) : (
              <View style={styles.pdfPreview}>
                <Ionicons name="document-text" size={120} color="#9B59B6" />
                <Text style={styles.pdfPreviewText}>PDF Selecionado</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.changeFileButton}
              onPress={showFileOptions}
            >
              <Ionicons name="refresh-outline" size={24} color="#fff" />
              <Text style={styles.changeFileButtonText}>Trocar Arquivo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.filePlaceholder}
            onPress={showFileOptions}
          >
            <Ionicons name="document-attach" size={80} color="#9B59B6" />
            <Text style={styles.filePlaceholderText}>Tocar para adicionar</Text>
            <Text style={styles.filePlaceholderSubtext}>Foto ou PDF</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#4ECDC4" />
          <Text style={styles.infoText}>
            {file ? (
              'O sistema processará a imagem ou PDF e extrairá os dados do exame automaticamente usando inteligência artificial (requer licença PRO). Você também pode inserir os dados manualmente.'
            ) : (
              'Adicione uma foto ou PDF do exame médico. A leitura automática com IA requer licença PRO, mas você sempre pode inserir os dados manualmente.'
            )}
          </Text>
        </View>

        {ocrProgress && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {ocrProgress.status === 'loading tesseract core' && 'Carregando OCR...'}
              {ocrProgress.status === 'initializing tesseract' && 'Inicializando OCR...'}
              {ocrProgress.status === 'loading language traineddata' && 'Carregando idioma português...'}
              {ocrProgress.status === 'initializing api' && 'Preparando OCR...'}
              {ocrProgress.status === 'recognizing text' && `Reconhecendo texto... ${Math.round(ocrProgress.progress * 100)}%`}
              {ocrProgress.status === 'Convertendo PDF para imagem...' && 'Convertendo PDF...'}
              {ocrProgress.status === 'Preparando PDF...' && 'Preparando PDF...'}
              {ocrProgress.status === 'Renderizando PDF...' && 'Renderizando PDF...'}
              {ocrProgress.status === 'Processando imagem do PDF...' && 'Processando imagem do PDF...'}
              {ocrProgress.status === 'Processando OCR nativo...' && 'Processando OCR nativo...'}
              {ocrProgress.status === 'OCR concluído!' && 'OCR concluído!'}
              {!ocrProgress.status && 'Processando...'}
            </Text>
            {ocrProgress.progress !== undefined && ocrProgress.progress > 0 && (
              <View style={styles.progressBar}>
                <View style={[styles.progressBarFill, { width: `${ocrProgress.progress * 100}%` }]} />
              </View>
            )}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.saveButton, (!file || uploading || processing) && styles.saveButtonDisabled]}
          onPress={saveExam}
          disabled={!file || uploading || processing}
        >
          {(uploading || processing) ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.saveButtonText}>
                {ocrProgress ? 'Processando OCR...' : processing ? 'Processando...' : 'Salvando...'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={28} color="#fff" />
              <Text style={styles.saveButtonText}>Processar Exame</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Botão compacto para visualizar PDF após processamento */}
        {processedFile && fileType === 'pdf' && !processing && !uploading && (
          <TouchableOpacity 
            style={styles.viewPdfButton}
            onPress={() => setShowPdfModal(true)}
          >
            <Ionicons name="document-text-outline" size={20} color="#9B59B6" />
            <Text style={styles.viewPdfButtonText}>Visualizar PDF Processado</Text>
          </TouchableOpacity>
        )}

        {/* Modal para visualizar PDF */}
        <Modal
          visible={showPdfModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowPdfModal(false)}
        >
          <View style={styles.pdfModalContainer}>
            <View style={styles.pdfModalHeader}>
              <Text style={styles.pdfModalTitle}>PDF do Exame</Text>
              <TouchableOpacity 
                style={styles.pdfModalCloseButton}
                onPress={() => setShowPdfModal(false)}
              >
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            {processedFile && (
              <View style={styles.pdfViewerContainer}>
                {Platform.OS === 'web' ? (
                  <View style={{ flex: 1 }}>
                    {/* eslint-disable-next-line react/no-unknown-property */}
                    <object 
                      data={processedFile} 
                      type="application/pdf"
                      style={styles.pdfWebViewer}
                    >
                      <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                        <Text style={{ color: '#fff', marginBottom: 10, textAlign: 'center' }}>
                          Seu navegador não suporta visualização de PDF.
                        </Text>
                        <TouchableOpacity 
                          onPress={() => {
                            if (typeof window !== 'undefined') {
                              window.open(processedFile, '_blank');
                            }
                          }}
                          style={{ padding: 10, backgroundColor: '#4ECDC4', borderRadius: 8 }}
                        >
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                            Abrir PDF em nova aba
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </object>
                  </View>
                  ) : (
                    <PdfViewer
                      source={{ uri: processedFile, cache: true }}
                      onLoadComplete={(numberOfPages) => {
                        console.log(`PDF carregado: ${numberOfPages} páginas`);
                      }}
                      onPageChanged={(page, numberOfPages) => {
                        console.log(`Página ${page} de ${numberOfPages}`);
                      }}
                      onError={(error) => {
                        console.error('Erro ao carregar PDF:', error);
                        showAlert('Erro', 'Não foi possível carregar o PDF.', 'error');
                      }}
                      style={styles.pdfViewer}
                    />
                  )}
              </View>
            )}
          </View>
        </Modal>
      </View>

      <AlertComponent />
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
  instruction: {
    fontSize: 22,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  fileContainer: {
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: 400,
    borderRadius: 16,
    marginBottom: 16,
    resizeMode: 'contain',
    backgroundColor: '#fff',
  },
  pdfPreview: {
    width: '100%',
    height: 400,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9B59B6',
    borderStyle: 'dashed',
  },
  pdfPreviewText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9B59B6',
    marginTop: 16,
  },
  changeFileButton: {
    backgroundColor: '#9B59B6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  changeFileButtonText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  filePlaceholder: {
    width: '100%',
    height: 400,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9B59B6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  filePlaceholderText: {
    fontSize: 24,
    color: '#9B59B6',
    fontWeight: 'bold',
    marginTop: 16,
  },
  filePlaceholderSubtext: {
    fontSize: 20,
    color: '#999',
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 18,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 24,
  },
  saveButton: {
    backgroundColor: '#9B59B6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    minHeight: 80,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  viewPdfButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#9B59B6',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewPdfButtonText: {
    color: '#9B59B6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pdfModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdfModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  pdfModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  pdfModalCloseButton: {
    padding: 8,
  },
  pdfViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  pdfViewer: {
    flex: 1,
    width: '100%',
  },
  pdfWebViewer: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalInstruction: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 200,
    maxHeight: 300,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonSubmit: {
    backgroundColor: '#9B59B6',
  },
  modalButtonTextCancel: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalButtonTextSubmit: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  progressContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 16,
    color: '#1976D2',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#BBDEFB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 4,
  },
  pdfHelpBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  pdfHelpText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
    lineHeight: 20,
  },
});
