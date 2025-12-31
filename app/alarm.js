import { StyleSheet, Text, View, TouchableOpacity, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AlarmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [medication, setMedication] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef(null);
  const voiceIntervalRef = useRef(null);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    loadMedication();
    
    return () => {
      stopAlarm();
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (medication) {
      startAlarm();
    }
  }, [medication]);

  const loadMedication = async () => {
    try {
      let medicationData;
      
      // Se os dados vieram via params
      if (params.medicationId) {
        const stored = await AsyncStorage.getItem('medications');
        if (stored) {
          const medications = JSON.parse(stored);
          medicationData = medications.find(m => m.id === params.medicationId);
        }
      } else if (params.medication) {
        medicationData = JSON.parse(params.medication);
      }
      
      if (medicationData) {
        setMedication(medicationData);
      }
    } catch (error) {
      console.error('Erro ao carregar medicamento:', error);
    }
  };

  const startAlarm = async () => {
    try {
      // Configurar áudio
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });

      // Criar som de alarme
      // Tentar usar um som de alarme online
      try {
        const { sound: alarmSound } = await Audio.Sound.createAsync(
          { uri: 'https://assets.mixkit.co/active_storage/sfx/2704/2704-preview.mp3' },
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
      setSound(alarmSound);
      setIsPlaying(true);
      isPlayingRef.current = true;
      } catch (e) {
        // Se falhar, usar apenas voz (que será repetida)
        console.log('Usando apenas voz para o alarme');
        setIsPlaying(true);
        isPlayingRef.current = true;
      }

      // Falar o nome do medicamento e dosagem
      if (medication) {
        const speakMessage = () => {
          if (!isPlayingRef.current || isPausedRef.current) return;
          
          let message = `Hora de tomar ${medication.name}`;
          if (medication.dosage) {
            message += `, dosagem ${medication.dosage}`;
          }
          if (medication.fasting) {
            message += '. Atenção: este medicamento deve ser tomado em jejum';
          }
          
          Speech.speak(message, {
            language: 'pt-BR',
            pitch: 1.2, // Voz mais aguda (feminina)
            rate: 0.9, // Velocidade um pouco mais lenta para idosos
          });
        };
        
        // Falar imediatamente
        speakMessage();
        
        // Limpar intervalo anterior se existir
        if (voiceIntervalRef.current) {
          clearInterval(voiceIntervalRef.current);
        }
        
        // Repetir a cada 15 segundos se o alarme estiver tocando
        voiceIntervalRef.current = setInterval(() => {
          if (isPlayingRef.current && !isPausedRef.current && medication) {
            speakMessage();
          }
        }, 15000); // Repetir a cada 15 segundos
      }
    } catch (error) {
      console.error('Erro ao iniciar alarme:', error);
      // Continuar sem som, apenas com voz
      setIsPlaying(true);
      if (medication) {
        const message = `Hora de tomar ${medication.name}${medication.dosage ? ', dosagem ' + medication.dosage : ''}`;
        Speech.speak(message, {
          language: 'pt-BR',
          pitch: 1.2,
          rate: 0.9,
        });
      }
    }
  };

  const stopAlarm = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      Speech.stop();
      setIsPlaying(false);
      setIsPaused(false);
      isPlayingRef.current = false;
      isPausedRef.current = false;
      
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
    } catch (error) {
      console.error('Erro ao parar alarme:', error);
    }
  };

  const pauseAlarm = async () => {
    try {
      if (sound) {
        await sound.pauseAsync();
      }
      Speech.stop();
      setIsPlaying(false);
      setIsPaused(true);
      isPlayingRef.current = false;
      isPausedRef.current = true;
      
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
      
      // Agendar retorno do alarme em 5 minutos
      pauseTimeoutRef.current = setTimeout(() => {
        resumeAlarm();
      }, 5 * 60 * 1000); // 5 minutos
    } catch (error) {
      console.error('Erro ao pausar alarme:', error);
    }
  };

  const resumeAlarm = async () => {
    try {
      if (sound) {
        await sound.playAsync();
      }
      setIsPlaying(true);
      setIsPaused(false);
      isPlayingRef.current = true;
      isPausedRef.current = false;
      
      // Falar novamente
      if (medication) {
        const speakMessage = () => {
          const message = `Lembrete: Hora de tomar ${medication.name}${medication.dosage ? ', dosagem ' + medication.dosage : ''}`;
          Speech.speak(message, {
            language: 'pt-BR',
            pitch: 1.2,
            rate: 0.9,
          });
        };
        
        speakMessage();
        
        // Reiniciar intervalo de repetição
        if (voiceIntervalRef.current) {
          clearInterval(voiceIntervalRef.current);
        }
        
        voiceIntervalRef.current = setInterval(() => {
          if (isPlayingRef.current && !isPausedRef.current && medication) {
            speakMessage();
          }
        }, 15000);
      }
      
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
    } catch (error) {
      console.error('Erro ao retomar alarme:', error);
    }
  };

  const handleStop = async () => {
    await stopAlarm();
    router.back();
  };

  const handlePause = async () => {
    if (isPaused) {
      await resumeAlarm();
    } else {
      await pauseAlarm();
    }
  };

  if (!medication) {
    return (
      <View style={styles.container}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      onRequestClose={handleStop}
    >
      <View style={styles.container}>
        <View style={styles.alarmContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="medical" size={120} color="#FF6B6B" />
          </View>
          
          <Text style={styles.title}>Hora do Medicamento!</Text>
          
          {medication.image && (
            <Image source={{ uri: medication.image }} style={styles.medicationImage} />
          )}
          
          <Text style={styles.medicationName}>{medication.name}</Text>
          
          {medication.dosage && (
            <Text style={styles.dosage}>Dosagem: {medication.dosage}</Text>
          )}
          
          {isPaused && (
            <View style={styles.pauseIndicator}>
              <Text style={styles.pauseText}>Alarme pausado</Text>
              <Text style={styles.pauseSubtext}>Retomará em 5 minutos</Text>
            </View>
          )}
          
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.pauseButton]}
              onPress={handlePause}
            >
              <Ionicons 
                name={isPaused ? "play" : "pause"} 
                size={40} 
                color="#fff" 
              />
              <Text style={styles.buttonText}>
                {isPaused ? "Retomar" : "Pausar"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStop}
            >
              <Ionicons name="stop" size={40} color="#fff" />
              <Text style={styles.buttonText}>Parar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmContent: {
    alignItems: 'center',
    padding: 40,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 30,
    backgroundColor: '#fff',
    borderRadius: 100,
    padding: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  medicationImage: {
    width: 200,
    height: 200,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#fff',
  },
  medicationName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  dosage: {
    fontSize: 28,
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
  },
  pauseIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
  },
  pauseText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pauseSubtext: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 24,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    maxWidth: 200,
  },
  pauseButton: {
    backgroundColor: '#4ECDC4',
  },
  stopButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
});

