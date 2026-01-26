import { Platform, PermissionsAndroid } from 'react-native';
import Voice from '@react-native-community/voice';
import * as Audio from 'expo-av';

// #region agent log
const DEBUG_LOG_ENDPOINT = 'http://127.0.0.1:7242/ingest/85b1774c-9280-4920-9617-a95403bc30b0';
const logDebug = (location, message, data, hypothesisId) => {
  fetch(DEBUG_LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data: { ...data, platform: Platform.OS },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId
    })
  }).catch(() => {});
};

// Log module initialization
logDebug('voiceDictation.js:4', 'MODULE INIT', { VoiceExists: !!Voice, VoiceType: typeof Voice, AudioExists: !!Audio, AudioType: typeof Audio, PermissionsAndroidExists: !!PermissionsAndroid }, 'A');
// #endregion

const getVoice = () => {
  // #region agent log
  logDebug('voiceDictation.js:5', 'getVoice ENTRY', { PlatformOS: Platform.OS, VoiceExists: !!Voice, VoiceType: typeof Voice }, 'C');
  // #endregion
  
  if (Platform.OS === 'web') {
    // #region agent log
    logDebug('voiceDictation.js:9', 'getVoice WEB DETECTED', {}, 'D');
    // #endregion
    return null;
  }
  
  // #region agent log
  logDebug('voiceDictation.js:15', 'getVoice RETURNING VOICE', { VoiceHasStart: !!(Voice?.start), VoiceHasStop: !!(Voice?.stop) }, 'C');
  // #endregion
  
  return Voice;
};

export const setDictationHandlers = ({
  onResults,
  onError,
  onStart,
  onEnd,
  onPartialResults,
} = {}) => {
  // #region agent log
  logDebug('voiceDictation.js:12', 'setDictationHandlers ENTRY', { hasOnResults: !!onResults, hasOnError: !!onError, hasOnStart: !!onStart, hasOnEnd: !!onEnd, hasOnPartialResults: !!onPartialResults }, 'E');
  // #endregion
  
  try {
    const voice = getVoice();
    // #region agent log
    logDebug('voiceDictation.js:20', 'setDictationHandlers VOICE CHECK', { voiceExists: !!voice, hasRemoveAllListeners: !!(voice?.removeAllListeners) }, 'E');
    // #endregion
    
    if (!voice) {
      // #region agent log
      logDebug('voiceDictation.js:25', 'setDictationHandlers VOICE NULL', {}, 'E');
      // #endregion
      console.warn('[VoiceDictation] Voice não disponível');
      return;
    }
    console.log('[VoiceDictation] Configurando handlers de ditado');
    
    // Remover listeners anteriores para evitar duplicação
    if (voice.removeAllListeners) {
      // #region agent log
      logDebug('voiceDictation.js:34', 'setDictationHandlers REMOVING LISTENERS', {}, 'E');
      // #endregion
      voice.removeAllListeners();
    }
    
    if (onResults) {
      // #region agent log
      logDebug('voiceDictation.js:40', 'setDictationHandlers SETTING onResults', {}, 'E');
      // #endregion
      voice.onSpeechResults = (event) => {
        // #region agent log
        logDebug('voiceDictation.js:44', 'setDictationHandlers onSpeechResults FIRED', { eventExists: !!event, eventValue: event?.value }, 'E');
        // #endregion
        console.log('[VoiceDictation] onSpeechResults:', event);
        onResults(event);
      };
    }
    if (onPartialResults) {
      // #region agent log
      logDebug('voiceDictation.js:52', 'setDictationHandlers SETTING onPartialResults', {}, 'E');
      // #endregion
      voice.onSpeechPartialResults = (event) => {
        // #region agent log
        logDebug('voiceDictation.js:56', 'setDictationHandlers onPartialResults FIRED', { eventExists: !!event, eventValue: event?.value }, 'E');
        // #endregion
        console.log('[VoiceDictation] onSpeechPartialResults:', event);
        onPartialResults(event);
      };
    }
    if (onError) {
      // #region agent log
      logDebug('voiceDictation.js:64', 'setDictationHandlers SETTING onError', {}, 'E');
      // #endregion
      voice.onSpeechError = (error) => {
        // #region agent log
        logDebug('voiceDictation.js:68', 'setDictationHandlers onSpeechError FIRED', { error: error?.message, errorType: error?.constructor?.name }, 'E');
        // #endregion
        console.error('[VoiceDictation] onSpeechError:', error);
        onError(error);
      };
    }
    if (onStart) {
      // #region agent log
      logDebug('voiceDictation.js:76', 'setDictationHandlers SETTING onStart', {}, 'E');
      // #endregion
      voice.onSpeechStart = (event) => {
        // #region agent log
        logDebug('voiceDictation.js:80', 'setDictationHandlers onSpeechStart FIRED', { eventExists: !!event }, 'E');
        // #endregion
        console.log('[VoiceDictation] onSpeechStart:', event);
        onStart(event);
      };
    }
    if (onEnd) {
      // #region agent log
      logDebug('voiceDictation.js:88', 'setDictationHandlers SETTING onEnd', {}, 'E');
      // #endregion
      voice.onSpeechEnd = (event) => {
        // #region agent log
        logDebug('voiceDictation.js:92', 'setDictationHandlers onSpeechEnd FIRED', { eventExists: !!event }, 'E');
        // #endregion
        console.log('[VoiceDictation] onSpeechEnd:', event);
        onEnd(event);
      };
    }
    // #region agent log
    logDebug('voiceDictation.js:100', 'setDictationHandlers SUCCESS', { handlersSet: true }, 'E');
    // #endregion
    console.log('[VoiceDictation] Handlers configurados com sucesso');
  } catch (error) {
    // #region agent log
    logDebug('voiceDictation.js:105', 'setDictationHandlers ERROR', { error: error?.message, errorType: error?.constructor?.name, stack: error?.stack }, 'E');
    // #endregion
    console.error('[VoiceDictation] Erro ao configurar handlers:', error);
  }
};

const requestMicrophonePermission = async () => {
  // #region agent log
  logDebug('voiceDictation.js:68', 'requestMicrophonePermission ENTRY', { PlatformOS: Platform.OS, PermissionsAndroidExists: !!PermissionsAndroid, AudioExists: !!Audio }, 'B');
  // #endregion
  
  if (Platform.OS === 'android') {
    try {
      // #region agent log
      logDebug('voiceDictation.js:73', 'requestMicrophonePermission ANDROID REQUESTING', { hasRequest: !!(PermissionsAndroid?.request), hasPERMISSIONS: !!(PermissionsAndroid?.PERMISSIONS) }, 'B');
      // #endregion
      
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Permissão de Microfone',
          message: 'O app precisa de permissão para usar o microfone para ditado por voz.',
          buttonNeutral: 'Perguntar depois',
          buttonNegative: 'Cancelar',
          buttonPositive: 'OK',
        }
      );
      
      // #region agent log
      logDebug('voiceDictation.js:87', 'requestMicrophonePermission ANDROID RESULT', { granted, isGranted: granted === PermissionsAndroid.RESULTS.GRANTED }, 'B');
      // #endregion
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('[VoiceDictation] Permissão de microfone concedida');
        return true;
      } else {
        console.warn('[VoiceDictation] Permissão de microfone negada');
        return false;
      }
    } catch (err) {
      // #region agent log
      logDebug('voiceDictation.js:98', 'requestMicrophonePermission ANDROID ERROR', { error: err?.message, errorType: err?.constructor?.name }, 'B');
      // #endregion
      console.error('[VoiceDictation] Erro ao solicitar permissão de microfone:', err);
      return false;
    }
  } else if (Platform.OS === 'ios') {
    try {
      // #region agent log
      logDebug('voiceDictation.js:105', 'requestMicrophonePermission iOS REQUESTING', { hasRequestPermissionsAsync: !!(Audio?.requestPermissionsAsync) }, 'B');
      // #endregion
      
      const { status } = await Audio.requestPermissionsAsync();
      
      // #region agent log
      logDebug('voiceDictation.js:110', 'requestMicrophonePermission iOS RESULT', { status, isGranted: status === 'granted' }, 'B');
      // #endregion
      
      if (status === 'granted') {
        console.log('[VoiceDictation] Permissão de microfone concedida (iOS)');
        return true;
      } else {
        console.warn('[VoiceDictation] Permissão de microfone negada (iOS)');
        return false;
      }
    } catch (err) {
      // #region agent log
      logDebug('voiceDictation.js:122', 'requestMicrophonePermission iOS ERROR', { error: err?.message, errorType: err?.constructor?.name }, 'B');
      // #endregion
      console.error('[VoiceDictation] Erro ao solicitar permissão de microfone (iOS):', err);
      return false;
    }
  }
  // #region agent log
  logDebug('voiceDictation.js:129', 'requestMicrophonePermission OTHER PLATFORM', {}, 'B');
  // #endregion
  return true; // Web ou outras plataformas
};

export const startDictation = async (locale = 'pt-BR') => {
  // #region agent log
  logDebug('voiceDictation.js:110', 'startDictation ENTRY', { locale }, 'C');
  // #endregion
  
  try {
    const voice = getVoice();
    // #region agent log
    logDebug('voiceDictation.js:115', 'startDictation VOICE CHECK', { voiceExists: !!voice, hasStart: !!(voice?.start), voiceType: typeof voice }, 'C');
    // #endregion
    
    if (!voice?.start) {
      // #region agent log
      logDebug('voiceDictation.js:120', 'startDictation VOICE UNAVAILABLE', {}, 'C');
      // #endregion
      console.warn('[VoiceDictation] Voice não disponível ou método start não existe');
      return;
    }
    
    // Solicitar permissão de microfone antes de iniciar
    // #region agent log
    logDebug('voiceDictation.js:127', 'startDictation REQUESTING PERMISSION', {}, 'B');
    // #endregion
    
    const hasPermission = await requestMicrophonePermission();
    // #region agent log
    logDebug('voiceDictation.js:131', 'startDictation PERMISSION RESULT', { hasPermission }, 'B');
    // #endregion
    
    if (!hasPermission) {
      // #region agent log
      logDebug('voiceDictation.js:135', 'startDictation PERMISSION DENIED', {}, 'B');
      // #endregion
      throw new Error('Permissão de microfone negada');
    }
    
    // #region agent log
    logDebug('voiceDictation.js:141', 'startDictation STARTING VOICE', { locale, hasStart: !!(voice?.start) }, 'C');
    // #endregion
    
    console.log('[VoiceDictation] Iniciando ditado com locale:', locale);
    await voice.start(locale);
    
    // #region agent log
    logDebug('voiceDictation.js:147', 'startDictation VOICE STARTED', {}, 'C');
    // #endregion
    
    console.log('[VoiceDictation] Ditado iniciado com sucesso');
  } catch (error) {
    // #region agent log
    logDebug('voiceDictation.js:153', 'startDictation ERROR', { error: error?.message, errorType: error?.constructor?.name, stack: error?.stack }, 'C');
    // #endregion
    console.error('[VoiceDictation] Erro ao iniciar ditado:', error);
    throw error;
  }
};

export const stopDictation = async () => {
  const voice = getVoice();
  if (!voice?.stop) {
    return;
  }
  await voice.stop();
};

export const destroyDictation = async () => {
  const voice = getVoice();
  if (!voice) {
    return;
  }
  if (voice.destroy) {
    try {
      await voice.destroy();
    } catch (error) {
      // Ignore teardown errors when native module is unavailable
    }
  }
  if (voice.removeAllListeners) {
    try {
      voice.removeAllListeners();
    } catch (error) {
      // Ignore teardown errors when native module is unavailable
    }
  }
};
