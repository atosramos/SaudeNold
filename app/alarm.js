import { StyleSheet, Text, View, TouchableOpacity, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useCustomModal } from '../hooks/useCustomModal';

export default function AlarmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showModal, ModalComponent } = useCustomModal();
  const [medication, setMedication] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef(null);
  const voiceIntervalRef = useRef(null);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const snoozeTimeoutRef = useRef(null);
  const confirmationTimeoutRef = useRef(null);

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
      if (snoozeTimeoutRef.current) {
        clearTimeout(snoozeTimeoutRef.current);
      }
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
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
      // Configurar áudio para garantir que toque mesmo em modo silencioso
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });

      // O som da notificação do sistema já deve estar tocando
      // Tentar criar som adicional apenas se necessário (opcional)
      // O importante é que a notificação com sound: 'default' já toca
      setIsPlaying(true);
      isPlayingRef.current = true;
      
      // Tentar adicionar som adicional (opcional, não bloqueia se falhar)
      try {
        // Tentar usar som online como backup adicional
        const { sound: alarmSound } = await Audio.Sound.createAsync(
          { uri: 'https://assets.mixkit.co/active_storage/sfx/2704/2704-preview.mp3' },
          { 
            shouldPlay: true, 
            isLooping: true, 
            volume: 1.0,
            isMuted: false
          }
        );
        setSound(alarmSound);
      } catch (e) {
        // Se falhar, não é problema - o som da notificação já está tocando
        console.log('Som adicional não disponível, usando apenas notificação do sistema');
      }

      // Tentar falar o nome do medicamento (opcional, não bloqueia o alarme)
      if (medication) {
        const speakMessage = () => {
          if (!isPlayingRef.current || isPausedRef.current) return;
          
          try {
            let message = `Hora de tomar ${medication.name}`;
            if (medication.dosage) {
              message += `, dosagem ${medication.dosage}`;
            }
            if (medication.fasting) {
              message += '. Atenção: este medicamento deve ser tomado em jejum';
            }
            
            Speech.speak(message, {
              language: 'pt-BR',
              pitch: 1.2,
              rate: 0.9,
            });
          } catch (speechError) {
            // Se falhar a voz, continua com o som
            console.log('Erro ao falar mensagem:', speechError);
          }
        };
        
        // Falar imediatamente (se possível)
        try {
          speakMessage();
        } catch (e) {
          console.log('Não foi possível falar, mas o alarme continua tocando');
        }
        
        // Limpar intervalo anterior se existir
        if (voiceIntervalRef.current) {
          clearInterval(voiceIntervalRef.current);
        }
        
        // Repetir voz a cada 30 segundos (menos frequente para não sobrecarregar)
        voiceIntervalRef.current = setInterval(() => {
          if (isPlayingRef.current && !isPausedRef.current && medication) {
            try {
              speakMessage();
            } catch (e) {
              // Ignora erro de voz, continua com som
            }
          }
        }, 30000); // Repetir a cada 30 segundos
      }

      // Agendar confirmação após 15 minutos
      scheduleConfirmationAfter15Minutes();
    } catch (error) {
      console.error('Erro ao iniciar alarme:', error);
      // Mesmo com erro, garantir que o alarme continue
      setIsPlaying(true);
      isPlayingRef.current = true;
      
      // Tentar falar (opcional)
      if (medication) {
        try {
          const message = `Hora de tomar ${medication.name}${medication.dosage ? ', dosagem ' + medication.dosage : ''}`;
          Speech.speak(message, {
            language: 'pt-BR',
            pitch: 1.2,
            rate: 0.9,
          });
        } catch (e) {
          // Ignora erro de voz
        }
      }
      
      // Agendar confirmação mesmo com erro
      scheduleConfirmationAfter15Minutes();
    }
  };

  const scheduleConfirmationAfter15Minutes = () => {
    // Limpar timeout anterior se existir
    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
    }

    // Agendar confirmação após 15 minutos
    confirmationTimeoutRef.current = setTimeout(() => {
      if (medication) {
        askIfMedicationTaken();
      }
    }, 15 * 60 * 1000); // 15 minutos
  };

  const askIfMedicationTaken = () => {
    showModal(
      'Confirmação',
      `Você já tomou o medicamento ${medication.name}?`,
      'confirm',
      [
        {
          text: 'Sim, tomei',
          onPress: async () => {
            await markMedicationAsTaken();
            await stopAlarm();
            router.back();
          },
          style: 'default',
        },
        {
          text: 'Ainda não',
          onPress: () => {
            // Continuar alarme e agendar nova confirmação em mais 15 minutos
            if (!isPlaying) {
              startAlarm();
            }
            scheduleConfirmationAfter15Minutes();
          },
          style: 'cancel',
        },
      ]
    );
  };

  const markMedicationAsTaken = async () => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Obter schedule da notificação ou do medicamento
      let schedule = params.schedule || medication?.schedule;
      if (!schedule && medication?.schedules && medication.schedules.length > 0) {
        // Se não tem schedule específico, usar o primeiro horário
        schedule = medication.schedules[0];
      }
      
      if (!schedule) {
        console.warn('Schedule não encontrado, usando horário atual aproximado');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        schedule = `${hours}:${minutes}`;
      }
      
      // Salvar log de medicamento tomado
      const logKey = `medication_log_${medication.id}_${today}_${schedule}`;
      const logData = {
        medicationId: medication.id,
        medicationName: medication.name,
        schedule: schedule,
        date: today,
        takenAt: now.toISOString(),
        status: 'taken'
      };
      await AsyncStorage.setItem(logKey, JSON.stringify(logData));
      
      // Salvar no array de logs do dia
      const dailyLogsKey = `medication_logs_${today}`;
      const dailyLogs = await AsyncStorage.getItem(dailyLogsKey);
      let logs = dailyLogs ? JSON.parse(dailyLogs) : [];
      logs.push(logData);
      await AsyncStorage.setItem(dailyLogsKey, JSON.stringify(logs));
      
      // Atualizar lastTaken no medicamento
      const stored = await AsyncStorage.getItem('medications');
      if (stored) {
        const medications = JSON.parse(stored);
        const updatedMedications = medications.map(m => 
          m.id === medication.id 
            ? { ...m, lastTaken: now.toISOString() }
            : m
        );
        await AsyncStorage.setItem('medications', JSON.stringify(updatedMedications));
      }
      
      // Cancelar notificações do dia para este horário
      await cancelTodayNotifications(medication.id, schedule);
      
      console.log('Medicamento marcado como tomado:', logData);
    } catch (error) {
      console.error('Erro ao marcar medicamento como tomado:', error);
    }
  };
  
  // Função para cancelar notificações do dia
  const cancelTodayNotifications = async (medicationId, schedule) => {
    try {
      const notificationId = `${medicationId}-${schedule}`;
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notificação cancelada para hoje:', notificationId);
    } catch (error) {
      console.error('Erro ao cancelar notificação:', error);
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
      
      // Limpar todos os timeouts
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      
      if (snoozeTimeoutRef.current) {
        clearTimeout(snoozeTimeoutRef.current);
        snoozeTimeoutRef.current = null;
      }
      
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
        confirmationTimeoutRef.current = null;
      }
      
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
    } catch (error) {
      console.error('Erro ao parar alarme:', error);
    }
  };

  const handleSnooze = async () => {
    try {
      // Parar alarme atual
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

      // Limpar confirmação anterior
      if (confirmationTimeoutRef.current) {
        clearTimeout(confirmationTimeoutRef.current);
      }
      
      // Agendar retorno do alarme em 15 minutos (soneca)
      snoozeTimeoutRef.current = setTimeout(() => {
        resumeAlarm();
      }, 15 * 60 * 1000); // 15 minutos
    } catch (error) {
      console.error('Erro ao ativar soneca:', error);
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
    // Limpar todos os timeouts
    if (confirmationTimeoutRef.current) {
      clearTimeout(confirmationTimeoutRef.current);
    }
    if (snoozeTimeoutRef.current) {
      clearTimeout(snoozeTimeoutRef.current);
    }
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

  const handleTakeMedication = async () => {
    await markMedicationAsTaken();
    await stopAlarm();
    router.back();
  };

  if (!medication) {
    return (
      <View style={styles.container}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <>
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
                <Text style={styles.pauseSubtext}>
                  {snoozeTimeoutRef.current ? 'Retomará em 15 minutos' : 'Retomará em 5 minutos'}
                </Text>
              </View>
            )}
            
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.button, styles.takeButton]}
                onPress={handleTakeMedication}
              >
                <Ionicons name="checkmark-circle" size={40} color="#fff" />
                <Text style={styles.buttonText}>Tomei</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.snoozeButton]}
                onPress={handleSnooze}
              >
                <Ionicons name="time" size={40} color="#fff" />
                <Text style={styles.buttonText}>Soneca 15min</Text>
              </TouchableOpacity>
              
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
            </View>
          </View>
        </View>
      </Modal>
      <ModalComponent />
    </>
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
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  button: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    maxWidth: 180,
  },
  takeButton: {
    backgroundColor: '#4ECDC4',
  },
  snoozeButton: {
    backgroundColor: '#FFA07A',
  },
  pauseButton: {
    backgroundColor: '#95E1D3',
  },
  buttonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
});

