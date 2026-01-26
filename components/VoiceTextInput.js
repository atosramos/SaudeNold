import { StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Platform } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { destroyDictation, setDictationHandlers, startDictation, stopDictation } from '../services/voiceDictation';

export default function VoiceTextInput({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  autoCapitalize,
  keyboardType,
  secureTextEntry,
  multiline,
  numberOfLines,
  editable = true,
  containerStyle,
  inputStyle,
  voiceEnabled = true,
  locale = 'pt-BR',
  helperText,
  ...inputProps
}) {
  const [listening, setListening] = useState(false);
  const canUseVoice = useMemo(
    () => voiceEnabled && editable && Platform.OS !== 'web',
    [voiceEnabled, editable]
  );

  useEffect(() => {
    setDictationHandlers({
      onResults: (event) => {
        const text = event?.value?.[0];
        if (text && onChangeText) {
          onChangeText(text);
        }
        setListening(false);
      },
      onPartialResults: (event) => {
        const text = event?.value?.[0];
        if (text && onChangeText) {
          onChangeText(text);
        }
      },
      onError: () => {
        setListening(false);
      },
      onEnd: () => {
        setListening(false);
      },
    });
    return () => {
      destroyDictation();
    };
  }, [onChangeText]);

  const handleMicPress = async () => {
    if (!canUseVoice) {
      console.warn('[VoiceTextInput] Ditado não disponível (canUseVoice:', canUseVoice, ')');
      return;
    }
    if (listening) {
      console.log('[VoiceTextInput] Parando ditado...');
      await stopDictation();
      setListening(false);
      return;
    }
    try {
      console.log('[VoiceTextInput] Iniciando ditado...');
      setListening(true);
      await startDictation(locale);
      console.log('[VoiceTextInput] Ditado iniciado');
    } catch (error) {
      console.error('[VoiceTextInput] Erro ao iniciar ditado:', error);
      setListening(false);
      // Mostrar erro ao usuário se possível
      if (error?.message) {
        console.warn('[VoiceTextInput] Erro:', error.message);
      }
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.inputRow, containerStyle]}>
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          value={value}
          onChangeText={onChangeText}
          {...inputProps}
        />
        {canUseVoice && (
          <TouchableOpacity style={styles.micButton} onPress={handleMicPress} accessibilityLabel="Ditado por voz">
            {listening ? (
              <ActivityIndicator color="#4ECDC4" />
            ) : (
              <Ionicons name="mic" size={20} color="#4ECDC4" />
            )}
          </TouchableOpacity>
        )}
      </View>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  micButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#777',
  },
});
