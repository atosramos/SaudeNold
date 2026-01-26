import { getProfileItem, setProfileItem } from './profileStorageManager';
import { medicationsAPI, medicationLogsAPI, emergencyContactsAPI, doctorVisitsAPI, medicalExamsAPI, healthCheck } from './api';
import { hasAuthToken } from './auth';
import { hasActiveLicense } from './proLicense';

const STORAGE_KEYS = {
  medications: 'medications',
  medicationLogs: 'medicationLogs',
  emergencyContacts: 'emergencyContacts',
  doctorVisits: 'doctorVisits',
  medicalExams: 'medicalExams',
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
 * Permite buscar dados mesmo sem licença PRO (para usuários que tiveram licença antes)
 */
export const syncFromBackend = async () => {
  try {
    // CRÍTICO: Verificar autenticação antes de sincronizar
    const isAuthenticated = await hasAuthToken();
    if (!isAuthenticated) {
      console.log('[Sync] Usuário não autenticado, pulando sincronização do backend');
      return false;
    }

    const isAvailable = await isBackendAvailable();
    if (!isAvailable) {
      console.log('[Sync] Backend não disponível, usando dados locais');
      return false;
    }

    // Sincronizar medicamentos
    try {
      const medicationsResponse = await medicationsAPI.getAll();
      if (medicationsResponse.data) {
        await setProfileItem(STORAGE_KEYS.medications, JSON.stringify(medicationsResponse.data));
      }
    } catch (error) {
      console.error('Erro ao sincronizar medicamentos:', error);
    }

    // Sincronizar logs
    try {
      const logsResponse = await medicationLogsAPI.getAll();
      if (logsResponse.data) {
        await setProfileItem(STORAGE_KEYS.medicationLogs, JSON.stringify(logsResponse.data));
      }
    } catch (error) {
      console.error('Erro ao sincronizar logs:', error);
    }

    // Sincronizar contatos
    try {
      const contactsResponse = await emergencyContactsAPI.getAll();
      if (contactsResponse.data) {
        await setProfileItem(STORAGE_KEYS.emergencyContacts, JSON.stringify(contactsResponse.data));
      }
    } catch (error) {
      console.error('Erro ao sincronizar contatos:', error);
    }

    // Sincronizar visitas
    try {
      const visitsResponse = await doctorVisitsAPI.getAll();
      if (visitsResponse.data) {
        await setProfileItem(STORAGE_KEYS.doctorVisits, JSON.stringify(visitsResponse.data));
      }
    } catch (error) {
      console.error('Erro ao sincronizar visitas:', error);
    }

    // Sincronizar exames médicos
    try {
      const examsResponse = await medicalExamsAPI.getAll();
      if (examsResponse.data) {
        await setProfileItem(STORAGE_KEYS.medicalExams, JSON.stringify(examsResponse.data));
      }
    } catch (error) {
      console.error('Erro ao sincronizar exames médicos:', error);
    }

    // Salvar timestamp da última sincronização
    await setProfileItem(STORAGE_KEYS.lastSync, new Date().toISOString());

    console.log('Sincronização do backend concluída');
    return true;
  } catch (error) {
    console.error('Erro na sincronização do backend:', error);
    return false;
  }
};

/**
 * Sincroniza dados do AsyncStorage para o backend
 * CRÍTICO: Requer licença PRO ativa para salvar dados no servidor (conformidade LGPD/HIPAA)
 */
export const syncToBackend = async () => {
  try {
    // CRÍTICO: Verificar autenticação antes de sincronizar
    const isAuthenticated = await hasAuthToken();
    if (!isAuthenticated) {
      console.log('[Sync] Usuário não autenticado, pulando sincronização para o backend');
      return false;
    }

    // CRÍTICO: Verificar licença PRO ativa para armazenamento no servidor
    // Dados de saúde só podem ser armazenados no servidor com licença PRO (conformidade LGPD/HIPAA)
    const hasProLicense = await hasActiveLicense();
    if (!hasProLicense) {
      console.log('[Sync] Licença PRO não ativa - dados serão salvos apenas localmente (conformidade LGPD/HIPAA)');
      return false;
    }

    const isAvailable = await isBackendAvailable();
    if (!isAvailable) {
      console.log('[Sync] Backend não disponível, dados serão salvos apenas localmente');
      return false;
    }

    // Sincronizar medicamentos
    try {
      const localMedications = await getProfileItem(STORAGE_KEYS.medications);
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
      const localLogs = await getProfileItem(STORAGE_KEYS.medicationLogs);
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
      const localContacts = await getProfileItem(STORAGE_KEYS.emergencyContacts);
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
      const localVisits = await getProfileItem(STORAGE_KEYS.doctorVisits);
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

    // Sincronizar exames médicos
    try {
      const localExams = await getProfileItem(STORAGE_KEYS.medicalExams);
      if (localExams) {
        const exams = JSON.parse(localExams);
        for (const exam of exams) {
          try {
            // Se o exame tem ID temporário (timestamp) ou não tem ID do backend, enviar
            // Exames pendentes precisam ser enviados para processamento
            if (!exam.id || exam.id <= 0 || (typeof exam.id === 'number' && exam.id > 1000000000000)) {
              // É um ID temporário (timestamp), criar novo no backend
              // Converter exam_date para formato ISO datetime se necessário
              let examDate = exam.exam_date || null;
              if (examDate) {
                try {
                  // Se for apenas data (YYYY-MM-DD), converter para datetime ISO
                  if (typeof examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
                    examDate = new Date(examDate + 'T12:00:00.000Z').toISOString();
                  } else if (examDate instanceof Date) {
                    examDate = examDate.toISOString();
                  } else if (typeof examDate === 'string' && !examDate.includes('T')) {
                    // Se for string de data sem T, adicionar hora
                    examDate = new Date(examDate + 'T12:00:00.000Z').toISOString();
                  }
                } catch (error) {
                  console.warn('Erro ao converter exam_date:', error);
                  examDate = null;
                }
              }
              
              const examData = {
                image_base64: exam.image_base64,
                file_type: exam.file_type || 'image',
                exam_date: examDate,
                exam_type: exam.exam_type || null,
              };
              const response = await medicalExamsAPI.create(examData);
              if (response.data) {
                // Atualizar o exame local com o ID do backend
                const updatedExams = exams.map(e => 
                  e.id === exam.id ? { ...response.data, id: response.data.id } : e
                );
                await setProfileItem(STORAGE_KEYS.medicalExams, JSON.stringify(updatedExams));
              }
            } else if (exam.processing_status === 'pending' || exam.processing_status === 'processing') {
              // Verificar se o status mudou no backend
              try {
                const backendExam = await medicalExamsAPI.getById(exam.id);
                if (backendExam.data) {
                  // Atualizar exame local com dados do backend
                  const updatedExams = exams.map(e => 
                    e.id === exam.id ? backendExam.data : e
                  );
                  await setProfileItem(STORAGE_KEYS.medicalExams, JSON.stringify(updatedExams));
                }
              } catch (error) {
                console.error('Erro ao verificar status do exame:', error);
              }
            }
          } catch (error) {
            console.error('Erro ao sincronizar exame:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar exames médicos para o backend:', error);
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
 * CRÍTICO: Requer licença PRO ativa para salvar dados no servidor (conformidade LGPD/HIPAA)
 */
export const fullSync = async () => {
  // CRÍTICO: Verificar autenticação antes de sincronizar
  const isAuthenticated = await hasAuthToken();
  if (!isAuthenticated) {
    console.log('[Sync] Usuário não autenticado, pulando sincronização completa');
    return false;
  }

  // CRÍTICO: Verificar licença PRO ativa para armazenamento no servidor
  const hasProLicense = await hasActiveLicense();
  if (!hasProLicense) {
    console.log('[Sync] Licença PRO não ativa - sincronização limitada a dados locais (conformidade LGPD/HIPAA)');
    // Ainda podemos buscar dados do servidor se houver (para usuários que tiveram licença antes)
    // Mas não vamos enviar novos dados sem licença PRO
    await syncFromBackend();
    return false;
  }

  console.log('[Sync] Iniciando sincronização completa (licença PRO ativa)...');
  
  // Primeiro: enviar dados locais para o backend
  await syncToBackend();
  
  // Depois: buscar dados atualizados do backend
  await syncFromBackend();
  
  console.log('[Sync] Sincronização completa concluída');
  return true;
};

/**
 * Verifica e atualiza o status de exames médicos pendentes
 */
export const checkPendingExams = async () => {
  try {
    const isAvailable = await isBackendAvailable();
    if (!isAvailable) {
      return false;
    }

    const localExams = await getProfileItem(STORAGE_KEYS.medicalExams);
    if (!localExams) {
      return false;
    }

    const exams = JSON.parse(localExams);
    let updated = false;

    for (const exam of exams) {
      // Verificar apenas exames pendentes ou em processamento
      if (exam.processing_status === 'pending' || exam.processing_status === 'processing') {
        // Se tem ID do backend, verificar status
        if (exam.id && exam.id > 0 && typeof exam.id !== 'string') {
          try {
            const response = await medicalExamsAPI.getById(exam.id);
            if (response.data && response.data.processing_status !== exam.processing_status) {
              // Status mudou, atualizar
              const index = exams.findIndex(e => e.id === exam.id);
              if (index >= 0) {
                exams[index] = response.data;
                updated = true;
              }
            }
          } catch (error) {
            console.error(`Erro ao verificar exame ${exam.id}:`, error);
          }
        } else {
          // Exame local sem ID do backend, tentar enviar
          try {
            // Converter exam_date para formato ISO datetime se necessário
            let examDate = exam.exam_date || null;
            if (examDate) {
              try {
                // Se for apenas data (YYYY-MM-DD), converter para datetime ISO
                if (typeof examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
                  examDate = new Date(examDate + 'T12:00:00.000Z').toISOString();
                } else if (examDate instanceof Date) {
                  examDate = examDate.toISOString();
                } else if (typeof examDate === 'string' && !examDate.includes('T')) {
                  // Se for string de data sem T, adicionar hora
                  examDate = new Date(examDate + 'T12:00:00.000Z').toISOString();
                }
              } catch (error) {
                console.warn('Erro ao converter exam_date:', error);
                examDate = null;
              }
            }
            
            const examData = {
              image_base64: exam.image_base64,
              file_type: exam.file_type || 'image',
              exam_date: examDate,
              exam_type: exam.exam_type || null,
            };
            const response = await medicalExamsAPI.create(examData);
            if (response.data) {
              // Substituir exame local pelo do backend
              const index = exams.findIndex(e => 
                (e.id === exam.id) || 
                (e.created_at === exam.created_at && !e.id)
              );
              if (index >= 0) {
                exams[index] = response.data;
                updated = true;
              }
            }
          } catch (error) {
            console.error(`Erro ao enviar exame pendente:`, error);
          }
        }
      }
    }

    if (updated) {
      await setProfileItem(STORAGE_KEYS.medicalExams, JSON.stringify(exams));
      console.log('Status de exames atualizado');
    }

    return updated;
  } catch (error) {
    console.error('Erro ao verificar exames pendentes:', error);
    return false;
  }
};


















