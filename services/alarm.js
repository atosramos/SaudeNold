import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { addDebugLog } from './alarmDebug';

// Configurar como as notificações devem ser tratadas quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const notificationType = notification.request.content.data?.type;
    
    // Configurar áudio para garantir que toque mesmo em modo silencioso
    // Isso é importante para todos os tipos de alarme (medicamento, consulta, vacina)
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });
    } catch (error) {
      // Mesmo com erro, garantir que o som toque
      console.error('Erro ao configurar áudio, mas notificação continuará:', error);
    }
    
    // Se for uma notificação de medicamento, tentar falar o nome (opcional)
    if (notificationType === 'medication_alarm') {
      const medicationName = notification.request.content.data.medicationName || '';
      const dosage = notification.request.content.data.dosage || '';
      
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
    }
    
    // IMPORTANTE: Sempre retornar shouldPlaySound: true para garantir que o som toque
    // Isso é crítico para todos os tipos de alarme (medicamento, consulta, vacina)
    return {
      shouldShowAlert: true,
      shouldPlaySound: true, // CRÍTICO: garantir que o som toque sempre
      shouldSetBadge: true,
    };
  },
});

/**
 * Solicita permissões de notificação
 * Retorna objeto com status e mensagem de erro se houver
 */
export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) {
    const errorMsg = 'Deve usar um dispositivo físico para notificações!';
    await addDebugLog(errorMsg, 'error');
    return { granted: false, error: errorMsg };
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    await addDebugLog(`Status atual de permissões: ${existingStatus}`, 'info');
    
    if (existingStatus !== 'granted') {
      await addDebugLog('Solicitando permissões de notificação...', 'info');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
      await addDebugLog(`Resposta do usuário: ${status}`, status === 'granted' ? 'success' : 'warning');
    }
    
    if (finalStatus !== 'granted') {
      const errorMsg = `Permissões de notificação ${finalStatus === 'denied' ? 'negadas' : 'não concedidas'}. Os alarmes não funcionarão sem permissões!`;
      await addDebugLog(errorMsg, 'error');
      return { 
        granted: false, 
        error: errorMsg,
        status: finalStatus,
        canAskAgain: finalStatus !== 'denied'
      };
    }
    
    // Configurar canal de notificação para Android
    // IMPORTANTE: O canal deve ser configurado ANTES de agendar notificações
    // e deve ter MAX importance para funcionar mesmo com o app fechado
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('medication-alarm', {
          name: 'Alarme de Medicamentos',
          description: 'Notificações de alarmes de medicamentos, consultas e vacinas',
          importance: Notifications.AndroidImportance.MAX, // CRÍTICO: MAX para funcionar em background
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
          sound: 'default', // Som padrão do sistema (garante que toque)
          enableVibrate: true,
          showBadge: true,
          enableLights: true,
          // Nota: bypassDnd não está disponível na API do Expo, mas MAX importance já garante alta prioridade
        });
        await addDebugLog('Canal de notificação Android configurado com sucesso', 'success');
      } catch (channelError) {
        await addDebugLog(`Erro ao configurar canal: ${channelError.message}`, 'error');
        // Continuar mesmo com erro no canal
      }
    }
    
    await addDebugLog('Permissões de notificação concedidas com sucesso', 'success');
    return { granted: true };
  } catch (error) {
    const errorMsg = `Erro ao solicitar permissões: ${error.message}`;
    await addDebugLog(errorMsg, 'error');
    return { granted: false, error: errorMsg };
  }
};

/**
 * Verifica se medicamento já foi tomado hoje no horário específico
 */
const isMedicationAlreadyTaken = async (medicationId, schedule) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logKey = `medication_log_${medicationId}_${today}_${schedule}`;
    const log = await AsyncStorage.getItem(logKey);
    
    if (log) {
      const logData = JSON.parse(log);
      return logData.status === 'taken';
    }
    
    // Verificar também no array de logs do dia
    const dailyLogsKey = `medication_logs_${today}`;
    const dailyLogs = await AsyncStorage.getItem(dailyLogsKey);
    if (dailyLogs) {
      const logs = JSON.parse(dailyLogs);
      const found = logs.find(l => 
        l.medicationId === medicationId && 
        l.schedule === schedule && 
        l.status === 'taken'
      );
      return !!found;
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao verificar se medicamento foi tomado:', error);
    return false;
  }
};

/**
 * Agenda alarmes para um medicamento
 */
export const scheduleMedicationAlarms = async (medication) => {
  try {
    const logMessage = `Agendando alarmes para medicamento: ${medication.name}`;
    console.log(`🔔 ${logMessage}`);
    await addDebugLog(logMessage, 'info');
    
    // Solicitar permissões se necessário
    const permissionResult = await requestNotificationPermissions();
    if (!permissionResult.granted) {
      const errorMsg = permissionResult.error || 'Permissões de notificação não concedidas!';
      console.error(`❌ ${errorMsg}`);
      await addDebugLog(errorMsg, 'error');
      throw new Error(errorMsg);
    }
    
    const notificationIds = [];
    
    // Obter dias da semana selecionados (padrão: todos os dias se não especificado)
    const daysOfWeek = medication.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
    const daysLog = `Dias da semana: ${daysOfWeek.join(', ')}`;
    console.log(`📅 ${daysLog}`);
    await addDebugLog(daysLog, 'info');
    
    // Para cada horário do medicamento
    for (const schedule of medication.schedules) {
      // Verificar se já foi tomado hoje neste horário
      const alreadyTaken = await isMedicationAlreadyTaken(medication.id, schedule);
      if (alreadyTaken) {
        const skipLog = `Medicamento ${medication.name} já foi tomado hoje às ${schedule}. Pulando agendamento.`;
        console.log(`⏭️ ${skipLog}`);
        await addDebugLog(skipLog, 'info');
        continue; // Pular este horário
      }
      const [hours, minutes] = schedule.split(':').map(Number);
      const scheduleLog = `Agendando para ${schedule} (${hours}:${minutes})`;
      console.log(`⏰ ${scheduleLog}`);
      await addDebugLog(scheduleLog, 'info');
      
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
          const weeklyLog = `Agendando notificação semanal: ${notificationId} para dia ${expoWeekday} às ${hours}:${minutes}`;
          console.log(`📌 ${weeklyLog}`);
          await addDebugLog(weeklyLog, 'info');
          
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
            trigger: Platform.OS === 'android'
              ? {
                  // Para Android Studio, incluir channelId no trigger
                  channelId: 'medication-alarm',
                  weekday: expoWeekday, // Expo usa 1-7 (Segunda a Domingo)
                  hour: hours,
                  minute: minutes,
                  repeats: true,
                }
              : {
                  // Para iOS, formato padrão
                  weekday: expoWeekday,
                  hour: hours,
                  minute: minutes,
                  repeats: true,
                },
          });
          
          const successLog = `Notificação semanal agendada com sucesso! ID: ${scheduledId}`;
          console.log(`✅ ${successLog}`);
          await addDebugLog(successLog, 'success');
          notificationIds.push(scheduledId);
        }
      } else {
        // Agendar para todos os dias (comportamento padrão)
        const notificationId = `${medication.id}-${schedule}`;
        const dailyLog = `Agendando notificação diária: ${notificationId} para ${hours}:${minutes}`;
        console.log(`📌 ${dailyLog}`);
        await addDebugLog(dailyLog, 'info');
        
        // IMPORTANTE: Notificações recorrentes com hour/minute só disparam no próximo dia
        // se o horário já passou hoje. Isso é comportamento normal do sistema.
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        if (scheduledTime <= now) {
          const warningMsg = `Horário ${hours}:${minutes} já passou hoje. A notificação vai tocar AMANHÃ às ${hours}:${minutes}`;
          console.log(`⚠️ ${warningMsg}`);
          await addDebugLog(warningMsg, 'warning');
        } else {
          const successMsg = `Horário ${hours}:${minutes} ainda não passou. A notificação vai tocar HOJE às ${hours}:${minutes}`;
          console.log(`✅ ${successMsg}`);
          await addDebugLog(successMsg, 'success');
        }
        
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
          trigger: Platform.OS === 'android'
            ? {
                // Para Android Studio, incluir channelId no trigger
                channelId: 'medication-alarm',
                hour: hours,
                minute: minutes,
                repeats: true,
              }
            : {
                // Para iOS, formato padrão
                hour: hours,
                minute: minutes,
                repeats: true,
              },
        });
        
        const dailySuccessLog = `Notificação diária agendada com sucesso! ID: ${scheduledId}`;
        console.log(`✅ ${dailySuccessLog}`);
        await addDebugLog(dailySuccessLog, 'success');
        notificationIds.push(scheduledId);
      }
    }
    
    // Salvar IDs das notificações para poder cancelá-las depois
    await saveNotificationIds(medication.id, notificationIds);
    
    const totalLog = `Total de ${notificationIds.length} notificação(ões) agendada(s) para ${medication.name}`;
    console.log(`✅ ${totalLog}`);
    await addDebugLog(totalLog, 'success');
    
    // Verificar se as notificações foram realmente agendadas
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const systemLog = `Total de notificações agendadas no sistema: ${allScheduled.length}`;
    console.log(`📊 ${systemLog}`);
    await addDebugLog(systemLog, 'info');
    
    return notificationIds;
  } catch (error) {
    const errorMsg = `Erro ao agendar alarmes: ${error.message}`;
    console.error(`❌ ${errorMsg}`);
    await addDebugLog(errorMsg, 'error');
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
 * Agenda todos os alarmes para todas as consultas futuras
 */
export const scheduleAllVisitAlarms = async () => {
  try {
    const stored = await AsyncStorage.getItem('doctorVisits');
    if (!stored) return;
    
    const visits = JSON.parse(stored);
    const now = new Date();
    
    // Agendar apenas para consultas futuras
    const futureVisits = visits.filter(v => {
      const visitDate = new Date(v.visitDate);
      return visitDate > now;
    });
    
    for (const visit of futureVisits) {
      try {
        await scheduleVisitAlarms(visit);
      } catch (error) {
        console.error(`Erro ao agendar alarmes da consulta ${visit.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Erro ao agendar todos os alarmes de consultas:', error);
  }
};

/**
 * Agenda todos os alarmes para todas as vacinas aplicadas com periodicidade
 */
export const scheduleAllVaccineAlarms = async () => {
  try {
    const stored = await AsyncStorage.getItem('vaccineRecords');
    if (!stored) return;
    
    const vaccineRecords = JSON.parse(stored);
    
    // Carregar calendário de vacinas para obter informações de periodicidade
    const calendarStored = await AsyncStorage.getItem('vaccineCalendar');
    if (!calendarStored) return;
    
    const vaccineCalendar = JSON.parse(calendarStored);
    
    // Para cada registro de vacina aplicada
    for (const [vaccineId, record] of Object.entries(vaccineRecords)) {
      if (record.status === 'applied' && record.appliedDate) {
        // Encontrar informações da vacina no calendário
        const vaccineInfo = vaccineCalendar.find(v => v.id === vaccineId);
        if (vaccineInfo && vaccineInfo.frequency) {
          try {
            await scheduleVaccineAlarms(record, vaccineInfo);
          } catch (error) {
            console.error(`Erro ao agendar alarmes da vacina ${vaccineId}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro ao agendar todos os alarmes de vacinas:', error);
  }
};

/**
 * Reagenda todos os alarmes (medicamentos, consultas e vacinas)
 * Útil quando o app inicia ou após sincronização
 * 
 * IMPORTANTE: As notificações agendadas funcionam mesmo com o app fechado!
 * Elas são gerenciadas pelo sistema operacional (Android/iOS), não pelo app.
 */
export const rescheduleAllAlarms = async () => {
  try {
    await addDebugLog('Iniciando reagendamento de todos os alarmes...', 'info');
    
    // Garantir que as permissões estão solicitadas e o canal está configurado
    const permissionResult = await requestNotificationPermissions();
    if (!permissionResult.granted) {
      const warningMsg = `Permissões de notificação não concedidas. Alarmes não serão agendados. Erro: ${permissionResult.error || 'Desconhecido'}`;
      console.warn(`⚠️ ${warningMsg}`);
      await addDebugLog(warningMsg, 'warning');
      return;
    }
    
    // Reagendar todos os alarmes
    await scheduleAllMedicationAlarms();
    await scheduleAllVisitAlarms();
    await scheduleAllVaccineAlarms();
    
    // Verificar quantas notificações foram agendadas (para debug)
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`✅ Todos os alarmes foram reagendados. Total de notificações agendadas: ${allScheduled.length}`);
    
    // IMPORTANTE: As notificações agendadas funcionam mesmo com o app fechado!
    // Elas são gerenciadas pelo sistema operacional, não pelo app React Native.
  } catch (error) {
    console.error('Erro ao reagendar todos os alarmes:', error);
  }
};

/**
 * Verifica e lista todas as notificações agendadas (útil para debug)
 */
export const listAllScheduledNotifications = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📋 Total de notificações agendadas: ${scheduled.length}`);
    scheduled.forEach((notif, index) => {
      const triggerInfo = notif.trigger.type === 'daily' 
        ? `diário às ${notif.trigger.hour}:${String(notif.trigger.minute).padStart(2, '0')}`
        : notif.trigger.type === 'weekly'
        ? `semanal - dia ${notif.trigger.weekday} às ${notif.trigger.hour}:${String(notif.trigger.minute).padStart(2, '0')}`
        : notif.trigger.type;
      console.log(`${index + 1}. ${notif.identifier} - ${triggerInfo}`);
      console.log(`   Título: ${notif.content.title}`);
    });
    return scheduled;
  } catch (error) {
    console.error('Erro ao listar notificações agendadas:', error);
    return [];
  }
};

/**
 * Testa uma notificação para verificar se o sistema está funcionando
 * Agenda uma notificação para 10 segundos no futuro
 * Retorna objeto com sucesso e mensagem de erro se houver
 */
export const testNotification = async () => {
  try {
    console.log('🧪 Testando notificação...');
    await addDebugLog('Iniciando teste de notificação...', 'info');
    
    const permissionResult = await requestNotificationPermissions();
    if (!permissionResult.granted) {
      const errorMsg = permissionResult.error || 'Permissões não concedidas!';
      console.error(`❌ ${errorMsg}`);
      await addDebugLog(errorMsg, 'error');
      return { success: false, error: errorMsg, canAskAgain: permissionResult.canAskAgain };
    }
    
    const testId = `test-${Date.now()}`;
    
    // Para notificações com segundos no Android Studio, usar formato específico
    // O trigger precisa ter channelId OU type
    const triggerDate = new Date(Date.now() + 10000); // 10 segundos no futuro
    
    const scheduledId = await Notifications.scheduleNotificationAsync({
      identifier: testId,
      content: {
        title: '🧪 Teste de Notificação',
        body: 'Se você viu isso, as notificações estão funcionando!',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' && { channelId: 'medication-alarm' }),
      },
      trigger: Platform.OS === 'android' 
        ? {
            // Para Android, usar channelId no trigger
            channelId: 'medication-alarm',
            seconds: 10,
          }
        : {
            // Para iOS, usar date
            date: triggerDate,
          },
    });
    
    const successMsg = `Notificação de teste agendada! ID: ${scheduledId}. Deve aparecer em 10 segundos.`;
    console.log(`✅ ${successMsg}`);
    await addDebugLog(successMsg, 'success');
    
    return { success: true, scheduledId };
  } catch (error) {
    const errorMsg = `Erro ao testar notificação: ${error.message}`;
    console.error(`❌ ${errorMsg}`);
    await addDebugLog(errorMsg, 'error');
    return { success: false, error: errorMsg };
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
          sound: 'default', // Usar som padrão do sistema (mais confiável)
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' && { channelId: 'medication-alarm' }),
        },
        trigger: Platform.OS === 'android'
          ? {
              // Para Android Studio, incluir channelId no trigger
              channelId: 'medication-alarm',
              type: 'timeInterval',
              seconds: secondsUntilTrigger,
              repeats: false,
            }
          : {
              // Para iOS, formato padrão
              type: 'timeInterval',
              seconds: secondsUntilTrigger,
              repeats: false,
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

/**
 * Calcula a próxima data de vacinação baseado na periodicidade
 * @param {string} frequency - Periodicidade (ex: "Anual", "A cada 10 anos", "2 doses com intervalo de 6 meses")
 * @param {Date} lastAppliedDate - Data da última aplicação
 * @returns {Date|null} Próxima data de vacinação ou null se não aplicável
 */
export const calculateNextVaccineDate = (frequency, lastAppliedDate) => {
  if (!lastAppliedDate || !frequency) return null;
  
  const lastDate = new Date(lastAppliedDate);
  const nextDate = new Date(lastDate);
  
  // Anual
  if (frequency.toLowerCase().includes('anual')) {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    return nextDate;
  }
  
  // A cada X anos
  const yearsMatch = frequency.match(/(\d+)\s*ano/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1]);
    nextDate.setFullYear(nextDate.getFullYear() + years);
    return nextDate;
  }
  
  // A cada X meses
  const monthsMatch = frequency.match(/(\d+)\s*m[eê]s/i);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1]);
    nextDate.setMonth(nextDate.getMonth() + months);
    return nextDate;
  }
  
  // Reforço após X anos
  const afterYearsMatch = frequency.match(/ap[óo]s\s*(\d+)\s*ano/i);
  if (afterYearsMatch) {
    const years = parseInt(afterYearsMatch[1]);
    nextDate.setFullYear(nextDate.getFullYear() + years);
    return nextDate;
  }
  
  return null;
};

/**
 * Agenda alarmes para uma vacina
 * @param {Object} vaccineRecord - Registro da vacina
 * @param {Object} vaccineInfo - Informações da vacina do calendário
 */
export const scheduleVaccineAlarms = async (vaccineRecord, vaccineInfo) => {
  try {
    await requestNotificationPermissions();
    
    // Só agendar se a vacina foi aplicada e tem periodicidade
    if (vaccineRecord.status !== 'applied' || !vaccineRecord.appliedDate || !vaccineInfo?.frequency) {
      return [];
    }
    
    const nextDate = calculateNextVaccineDate(vaccineInfo.frequency, vaccineRecord.appliedDate);
    if (!nextDate) {
      return [];
    }
    
    // Se a data já passou, não agendar
    if (nextDate <= new Date()) {
      return [];
    }
    
    const notificationIds = [];
    const vaccineName = vaccineInfo.vaccine || vaccineInfo.name || 'Vacina';
    
    // Lembrete 7 dias antes
    const reminder7Days = new Date(nextDate);
    reminder7Days.setDate(reminder7Days.getDate() - 7);
    reminder7Days.setHours(9, 0, 0, 0);
    
    if (reminder7Days > new Date()) {
      const notificationId = `vaccine-${vaccineInfo.id}-7days`;
      const secondsUntilTrigger = Math.max(0, Math.floor((reminder7Days.getTime() - new Date().getTime()) / 1000));
      
      const scheduledId = await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title: 'Lembrete de Vacinação! 💉',
          body: `Próxima dose de ${vaccineName} em 7 dias (${nextDate.toLocaleDateString('pt-BR')})`,
          data: {
            vaccineId: vaccineInfo.id,
            nextDate: nextDate.toISOString(),
            type: 'vaccine_reminder',
          },
          sound: 'default', // Usar som padrão do sistema (mais confiável)
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' && { channelId: 'medication-alarm' }),
        },
        trigger: Platform.OS === 'android'
          ? {
              // Para Android Studio, incluir channelId no trigger
              channelId: 'medication-alarm',
              type: 'timeInterval',
              seconds: secondsUntilTrigger,
              repeats: false,
            }
          : {
              // Para iOS, formato padrão
              type: 'timeInterval',
              seconds: secondsUntilTrigger,
              repeats: false,
            },
      });
      notificationIds.push(scheduledId);
    }
    
    // Lembrete no dia
    const reminderDay = new Date(nextDate);
    reminderDay.setHours(9, 0, 0, 0);
    
    if (reminderDay > new Date()) {
      const notificationId = `vaccine-${vaccineInfo.id}-day`;
      const secondsUntilTrigger = Math.max(0, Math.floor((reminderDay.getTime() - new Date().getTime()) / 1000));
      
      const scheduledId = await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title: 'Hora de Vacinar! 💉',
          body: `Hoje é o dia da próxima dose de ${vaccineName}`,
          data: {
            vaccineId: vaccineInfo.id,
            nextDate: nextDate.toISOString(),
            type: 'vaccine_reminder',
          },
          sound: 'default', // Usar som padrão do sistema (mais confiável)
          priority: Notifications.AndroidNotificationPriority.MAX,
          ...(Platform.OS === 'android' && { channelId: 'medication-alarm' }),
        },
        trigger: Platform.OS === 'android'
          ? {
              // Para Android Studio, incluir channelId no trigger
              channelId: 'medication-alarm',
              type: 'timeInterval',
              seconds: secondsUntilTrigger,
              repeats: false,
            }
          : {
              // Para iOS, formato padrão
              type: 'timeInterval',
              seconds: secondsUntilTrigger,
              repeats: false,
            },
      });
      notificationIds.push(scheduledId);
    }
    
    // Salvar IDs das notificações
    if (notificationIds.length > 0) {
      await saveNotificationIds(`vaccine-${vaccineInfo.id}`, notificationIds);
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Erro ao agendar alarmes da vacina:', error);
    return [];
  }
};

/**
 * Cancela todos os alarmes de uma vacina
 */
export const cancelVaccineAlarms = async (vaccineId) => {
  try {
    const notificationIds = await getNotificationIds(`vaccine-${vaccineId}`);
    
    for (const id of notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    
    await removeNotificationIds(`vaccine-${vaccineId}`);
  } catch (error) {
    console.error('Erro ao cancelar alarmes da vacina:', error);
  }
};

