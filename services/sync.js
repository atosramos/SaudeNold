import AsyncStorage from '@react-native-async-storage/async-storage';
import { medicationsAPI, medicationLogsAPI, emergencyContactsAPI, doctorVisitsAPI, healthCheck } from './api';

const STORAGE_KEYS = {
  medications: 'medications',
  medicationLogs: 'medicationLogs',
  emergencyContacts: 'emergencyContacts',
  doctorVisits: 'doctorVisits',
  lastSync: 'lastSync',
};

/**
 * Verifica se o backend está disponível
 */
export const isBackendAvailable = async () => {
  try {
    await healthCheck();
    return true;
  } catch (error) {
    console.log('Backend não disponível:', error.message);
    return false;
  }
};

/**
 * Sincroniza dados do backend para o AsyncStorage
 */
export const syncFromBackend = async () => {
  try {
    const isAvailable = await isBackendAvailable();
    if (!isAvailable) {
      console.log('Backend não disponível, usando dados locais');
      return false;
    }

    // Sincronizar medicamentos
    try {
      const medicationsResponse = await medicationsAPI.getAll();
      if (medicationsResponse.data) {
        await AsyncStorage.setItem(STORAGE_KEYS.medications, JSON.stringify(medicationsResponse.data));
      }
    } catch (error) {
      console.error('Erro ao sincronizar medicamentos:', error);
    }

    // Sincronizar logs
    try {
      const logsResponse = await medicationLogsAPI.getAll();
      if (logsResponse.data) {
        await AsyncStorage.setItem(STORAGE_KEYS.medicationLogs, JSON.stringify(logsResponse.data));
      }
    } catch (error) {
      console.error('Erro ao sincronizar logs:', error);
    }

    // Sincronizar contatos
    try {
      const contactsResponse = await emergencyContactsAPI.getAll();
      if (contactsResponse.data) {
        await AsyncStorage.setItem(STORAGE_KEYS.emergencyContacts, JSON.stringify(contactsResponse.data));
      }
    } catch (error) {
      console.error('Erro ao sincronizar contatos:', error);
    }

    // Sincronizar visitas
    try {
      const visitsResponse = await doctorVisitsAPI.getAll();
      if (visitsResponse.data) {
        await AsyncStorage.setItem(STORAGE_KEYS.doctorVisits, JSON.stringify(visitsResponse.data));
      }
    } catch (error) {
      console.error('Erro ao sincronizar visitas:', error);
    }

    // Salvar timestamp da última sincronização
    await AsyncStorage.setItem(STORAGE_KEYS.lastSync, new Date().toISOString());

    console.log('Sincronização do backend concluída');
    return true;
  } catch (error) {
    console.error('Erro na sincronização do backend:', error);
    return false;
  }
};

/**
 * Sincroniza dados do AsyncStorage para o backend
 */
export const syncToBackend = async () => {
  try {
    const isAvailable = await isBackendAvailable();
    if (!isAvailable) {
      console.log('Backend não disponível, dados serão salvos apenas localmente');
      return false;
    }

    // Sincronizar medicamentos
    try {
      const localMedications = await AsyncStorage.getItem(STORAGE_KEYS.medications);
      if (localMedications) {
        const medications = JSON.parse(localMedications);
        // Aqui você pode implementar lógica para comparar timestamps
        // e enviar apenas os novos/atualizados
        for (const medication of medications) {
          try {
            if (medication.id && medication.id > 0) {
              // Atualizar existente (se tiver ID do backend)
              await medicationsAPI.update(medication.id, medication);
            } else {
              // Criar novo
              await medicationsAPI.create(medication);
            }
          } catch (error) {
            console.error('Erro ao sincronizar medicamento:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar medicamentos para o backend:', error);
    }

    // Sincronizar logs
    try {
      const localLogs = await AsyncStorage.getItem(STORAGE_KEYS.medicationLogs);
      if (localLogs) {
        const logs = JSON.parse(localLogs);
        for (const log of logs) {
          try {
            if (!log.id || log.id <= 0) {
              // Criar novo log
              await medicationLogsAPI.create(log);
            }
          } catch (error) {
            console.error('Erro ao sincronizar log:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar logs para o backend:', error);
    }

    // Sincronizar contatos
    try {
      const localContacts = await AsyncStorage.getItem(STORAGE_KEYS.emergencyContacts);
      if (localContacts) {
        const contacts = JSON.parse(localContacts);
        for (const contact of contacts) {
          try {
            if (contact.id && contact.id > 0) {
              await emergencyContactsAPI.update(contact.id, contact);
            } else {
              await emergencyContactsAPI.create(contact);
            }
          } catch (error) {
            console.error('Erro ao sincronizar contato:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar contatos para o backend:', error);
    }

    // Sincronizar visitas
    try {
      const localVisits = await AsyncStorage.getItem(STORAGE_KEYS.doctorVisits);
      if (localVisits) {
        const visits = JSON.parse(localVisits);
        for (const visit of visits) {
          try {
            if (visit.id && visit.id > 0) {
              await doctorVisitsAPI.update(visit.id, visit);
            } else {
              await doctorVisitsAPI.create(visit);
            }
          } catch (error) {
            console.error('Erro ao sincronizar visita:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar visitas para o backend:', error);
    }

    console.log('Sincronização para o backend concluída');
    return true;
  } catch (error) {
    console.error('Erro na sincronização para o backend:', error);
    return false;
  }
};

/**
 * Sincronização completa: primeiro envia dados locais, depois busca do backend
 */
export const fullSync = async () => {
  console.log('Iniciando sincronização completa...');
  
  // Primeiro: enviar dados locais para o backend
  await syncToBackend();
  
  // Depois: buscar dados atualizados do backend
  await syncFromBackend();
  
  console.log('Sincronização completa concluída');
};





