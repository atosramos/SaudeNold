import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

// Configurar como as notificações devem ser tratadas quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Se for uma notificação de medicamento, garantir que o som toque
    if (notification.request.content.data?.type === 'medication_alarm') {
      const medicationName = notification.request.content.data.medicationName || '';
      const dosage = notification.request.content.data.dosage || '';
      
      // Configurar áudio para garantir que toque mesmo em modo silencioso
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });

        // Tentar falar o nome do medicamento (opcional, não bloqueia o alarme)
        try {
          const message = `Hora de tomar ${medicationName}${dosage ? ', dosagem ' + dosage : ''}`;
          Speech.speak(message, {
            language: 'pt-BR',
            pitch: 1.2,
            rate: 0.9,
          });
        } catch (speechError) {
          // Se falhar a voz, continua - o som da notificação já está tocando
          console.log('Voz não disponível, mas o alarme continua tocando');
        }
      } catch (error) {
        // Mesmo com erro, garantir que o som toque
        console.error('Erro ao configurar áudio, mas notificação continuará:', error);
      }
    }
    
    // IMPORTANTE: Sempre retornar shouldPlaySound: true para garantir que o som toque
    return {
      shouldShowAlert: true,
      shouldPlaySound: true, // CRÍTICO: garantir que o som toque sempre
      shouldSetBadge: true,
    };
  },
});

/**
 * Solicita permissões de notificação
 */
export const requestNotificationPermissions = async () => {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Falha ao obter permissão para notificações!');
      return false;
    }
    
    // Configurar canal de notificação para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medication-alarm', {
        name: 'Alarme de Medicamentos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
        sound: 'default', // Som padrão do sistema (garante que toque)
        enableVibrate: true,
        showBadge: true,
        enableLights: true,
      });
    }
    
    return true;
  } else {
    alert('Deve usar um dispositivo físico para notificações!');
    return false;
  }
};

/**
 * Agenda alarmes para um medicamento
 */
export const scheduleMedicationAlarms = async (medication) => {
  try {
    // Solicitar permissões se necessário
    await requestNotificationPermissions();
    
    const notificationIds = [];
    
    // Obter dias da semana selecionados (padrão: todos os dias se não especificado)
    const daysOfWeek = medication.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
    
    // Para cada horário do medicamento
    for (const schedule of medication.schedules) {
      const [hours, minutes] = schedule.split(':').map(Number);
      
      // Se há dias específicos selecionados, agendar para cada dia
      if (daysOfWeek.length < 7) {
        // Agendar para dias específicos da semana
        for (const dayOfWeek of daysOfWeek) {
          // Criar identificador único para esta notificação
          const notificationId = `${medication.id}-${schedule}-${dayOfWeek}`;
          
          // Converter de 0-6 (Domingo-Sábado) para 1-7 (Segunda-Domingo) do Expo
          // 0 (Domingo) -> 7, 1 (Segunda) -> 1, 2 (Terça) -> 2, ..., 6 (Sábado) -> 6
          const expoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek;
          
          // Agendar notificação semanal
          const scheduledId = await Notifications.scheduleNotificationAsync({
            identifier: notificationId,
            content: {
              title: 'Hora do Medicamento! 💊',
              body: `${medication.name}${medication.dosage ? ' - ' + medication.dosage : ''}${medication.fasting ? ' (Em jejum)' : ''}`,
              data: {
                medicationId: medication.id,
                medicationName: medication.name,
                dosage: medication.dosage || '',
                schedule: schedule,
                type: 'medication_alarm',
                fasting: medication.fasting || false,
              },
              sound: 'default', // Usar som padrão do sistema (mais confiável)
              priority: Notifications.AndroidNotificationPriority.MAX,
              ...(Platform.OS === 'android' && { channelId: 'medication-alarm' }),
            },
            trigger: {
              weekday: expoWeekday, // Expo usa 1-7 (Segunda a Domingo)
              hour: hours,
              minute: minutes,
              repeats: true,
            },
          });
          
          notificationIds.push(scheduledId);
        }
      } else {
        // Agendar para todos os dias (comportamento padrão)
        const notificationId = `${medication.id}-${schedule}`;
        
        const scheduledId = await Notifications.scheduleNotificationAsync({
          identifier: notificationId,
          content: {
            title: 'Hora do Medicamento! 💊',
            body: `${medication.name}${medication.dosage ? ' - ' + medication.dosage : ''}${medication.fasting ? ' (Em jejum)' : ''}`,
            data: {
              medicationId: medication.id,
              medicationName: medication.name,
              dosage: medication.dosage || '',
              schedule: schedule,
              type: 'medication_alarm',
              fasting: medication.fasting || false,
            },
            sound: 'default', // Usar som padrão do sistema (mais confiável)
            priority: Notifications.AndroidNotificationPriority.MAX,
            ...(Platform.OS === 'android' && { channelId: 'medication-alarm' }),
          },
          trigger: {
            hour: hours,
            minute: minutes,
            repeats: true,
          },
        });
        
        notificationIds.push(scheduledId);
      }
    }
    
    // Salvar IDs das notificações para poder cancelá-las depois
    await saveNotificationIds(medication.id, notificationIds);
    
    return notificationIds;
  } catch (error) {
    console.error('Erro ao agendar alarmes:', error);
    throw error;
  }
};

/**
 * Cancela todos os alarmes de um medicamento
 */
export const cancelMedicationAlarms = async (medicationId) => {
  try {
    const notificationIds = await getNotificationIds(medicationId);
    
    for (const id of notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    
    // Remover IDs salvos
    await removeNotificationIds(medicationId);
  } catch (error) {
    console.error('Erro ao cancelar alarmes:', error);
  }
};

/**
 * Cancela e reagenda alarmes de um medicamento (útil ao editar)
 */
export const rescheduleMedicationAlarms = async (medication) => {
  await cancelMedicationAlarms(medication.id);
  return await scheduleMedicationAlarms(medication);
};

/**
 * Salva IDs das notificações
 */
const saveNotificationIds = async (medicationId, notificationIds) => {
  try {
    const key = `notificationIds_${medicationId}`;
    await AsyncStorage.setItem(key, JSON.stringify(notificationIds));
  } catch (error) {
    console.error('Erro ao salvar IDs de notificação:', error);
  }
};

/**
 * Recupera IDs das notificações
 */
const getNotificationIds = async (medicationId) => {
  try {
    const key = `notificationIds_${medicationId}`;
    const ids = await AsyncStorage.getItem(key);
    return ids ? JSON.parse(ids) : [];
  } catch (error) {
    console.error('Erro ao recuperar IDs de notificação:', error);
    return [];
  }
};

/**
 * Remove IDs das notificações
 */
const removeNotificationIds = async (medicationId) => {
  try {
    const key = `notificationIds_${medicationId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Erro ao remover IDs de notificação:', error);
  }
};

/**
 * Agenda todos os alarmes para todos os medicamentos ativos
 */
export const scheduleAllMedicationAlarms = async () => {
  try {
    const stored = await AsyncStorage.getItem('medications');
    if (!stored) return;
    
    const medications = JSON.parse(stored);
    const activeMedications = medications.filter(m => m.active !== false);
    
    for (const medication of activeMedications) {
      await scheduleMedicationAlarms(medication);
    }
  } catch (error) {
    console.error('Erro ao agendar todos os alarmes:', error);
  }
};

/**
 * Agenda alarmes para uma consulta médica
 */
export const scheduleVisitAlarms = async (visit) => {
  try {
    await requestNotificationPermissions();
    
    const notificationIds = [];
    const visitDate = new Date(visit.visitDate);
    const reminderBefore = visit.reminderBefore || '1h';
    
    // Calcular horários dos lembretes
    const reminderTimes = [];
    
    // Lembrete 1 dia antes (às 18h do dia anterior)
    const oneDayBefore = new Date(visitDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(18, 0, 0, 0);
    
    if (oneDayBefore > new Date()) {
      reminderTimes.push({
        date: oneDayBefore,
        message: `Lembrete: Consulta com ${visit.doctorName} (${visit.specialty}) amanhã às ${visitDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      });
    }
    
    // Lembrete no horário especificado antes da consulta
    const reminderTime = new Date(visitDate);
    if (reminderBefore === '1h') {
      reminderTime.setHours(reminderTime.getHours() - 1);
    } else if (reminderBefore === '2h') {
      reminderTime.setHours(reminderTime.getHours() - 2);
    } else if (reminderBefore === '1 dia') {
      reminderTime.setDate(reminderTime.getDate() - 1);
    } else if (reminderBefore === '2 dias') {
      reminderTime.setDate(reminderTime.getDate() - 2);
    }
    
    if (reminderTime > new Date()) {
      reminderTimes.push({
        date: reminderTime,
        message: `Lembrete: Consulta com ${visit.doctorName} (${visit.specialty}) em ${reminderBefore}`,
      });
    }
    
    // Agendar cada lembrete
    for (const reminder of reminderTimes) {
      const notificationId = `visit-${visit.id}-${reminder.date.getTime()}`;
      
      // Converter data para trigger do Expo
      const triggerDate = reminder.date;
      const now = new Date();
      const secondsUntilTrigger = Math.max(0, Math.floor((triggerDate.getTime() - now.getTime()) / 1000));
      
      // Se a data já passou, não agendar
      if (secondsUntilTrigger <= 0) {
        continue;
      }
      
      const scheduledId = await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title: 'Lembrete de Consulta! 🏥',
          body: reminder.message,
          data: {
            visitId: visit.id,
            visitDate: visit.visitDate,
            type: 'visit_reminder',
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' && { channelId: 'medication-alarm' }),
        },
        trigger: {
          seconds: secondsUntilTrigger,
        },
      });
      
      notificationIds.push(scheduledId);
    }
    
    // Salvar IDs das notificações
    await saveNotificationIds(`visit-${visit.id}`, notificationIds);
    
    return notificationIds;
  } catch (error) {
    console.error('Erro ao agendar alarmes da consulta:', error);
    throw error;
  }
};

/**
 * Cancela todos os alarmes de uma consulta
 */
export const cancelVisitAlarms = async (visitId) => {
  try {
    const notificationIds = await getNotificationIds(`visit-${visitId}`);
    
    for (const id of notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    
    await removeNotificationIds(`visit-${visitId}`);
  } catch (error) {
    console.error('Erro ao cancelar alarmes da consulta:', error);
  }
};

