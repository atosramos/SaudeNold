/**
 * Script de migração de dados locais (AsyncStorage) para estrutura de perfis.
 * Migra chaves antigas para chaves prefixadas com profile_id.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveProfileId, setActiveProfile } from './profileStorageManager';

// Chaves antigas (sem prefixo de perfil)
const OLD_KEYS = {
  medications: 'medications',
  medicationLogs: 'medicationLogs',
  emergencyContacts: 'emergencyContacts',
  doctorVisits: 'doctorVisits',
  medicalExams: 'medicalExams',
  lastSync: 'lastSync',
};

// Prefixo para chaves de perfil
const PROFILE_PREFIX = 'profile';

/**
 * Sanitiza uma chave para uso seguro no AsyncStorage
 */
function sanitizeKey(key) {
  return key.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Obtém a chave do perfil formatada
 */
function getProfileKey(key, profileId) {
  const sanitizedProfileId = sanitizeKey(String(profileId));
  return `${PROFILE_PREFIX}_${sanitizedProfileId}_${key}`;
}

/**
 * Verifica se há dados antigos no AsyncStorage
 */
export async function hasOldData() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Verificar se existem chaves antigas
    const hasOldKeys = Object.values(OLD_KEYS).some(key => allKeys.includes(key));
    
    // Verificar se não há chaves de perfil ainda
    const hasProfileKeys = allKeys.some(key => key.startsWith(PROFILE_PREFIX));
    
    return hasOldKeys && !hasProfileKeys;
  } catch (error) {
    console.error('Erro ao verificar dados antigos:', error);
    return false;
  }
}

/**
 * Faz backup dos dados antigos
 */
export async function backupOldData() {
  try {
    const backup = {};
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Buscar todas as chaves antigas
    for (const [keyName, oldKey] of Object.entries(OLD_KEYS)) {
      if (allKeys.includes(oldKey)) {
        const data = await AsyncStorage.getItem(oldKey);
        if (data) {
          backup[keyName] = data;
        }
      }
    }
    
    // Salvar backup
    const backupKey = `migration_backup_${Date.now()}`;
    await AsyncStorage.setItem(backupKey, JSON.stringify(backup));
    
    console.log(`Backup criado: ${backupKey}`);
    return backupKey;
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    throw error;
  }
}

/**
 * Migra dados antigos para estrutura de perfis
 */
export async function migrateLocalStorage(profileId = null) {
  const stats = {
    keysMigrated: 0,
    keysSkipped: 0,
    errors: [],
    backupKey: null,
  };
  
  try {
    // Obter profileId ativo ou usar o fornecido
    let activeProfileId = profileId;
    if (!activeProfileId) {
      activeProfileId = await getActiveProfileId();
    }
    
    if (!activeProfileId) {
      throw new Error('Nenhum profileId disponível. É necessário ter um perfil ativo para migração.');
    }
    
    console.log(`Iniciando migração para perfil ${activeProfileId}...`);
    
    // Criar backup antes da migração
    try {
      stats.backupKey = await backupOldData();
    } catch (error) {
      console.warn('Aviso: Não foi possível criar backup:', error);
    }
    
    // Migrar cada chave antiga
    for (const [keyName, oldKey] of Object.entries(OLD_KEYS)) {
      try {
        const data = await AsyncStorage.getItem(oldKey);
        
        if (!data) {
          console.log(`Chave ${oldKey} não encontrada, pulando...`);
          stats.keysSkipped++;
          continue;
        }
        
        // Criar nova chave com prefixo de perfil
        const newKey = getProfileKey(keyName, activeProfileId);
        
        // Verificar se a nova chave já existe
        const existingData = await AsyncStorage.getItem(newKey);
        if (existingData) {
          console.log(`Chave ${newKey} já existe, mantendo dados existentes...`);
          stats.keysSkipped++;
          continue;
        }
        
        // Migrar dados
        await AsyncStorage.setItem(newKey, data);
        console.log(`Migrado: ${oldKey} → ${newKey}`);
        stats.keysMigrated++;
        
        // Opcional: Remover chave antiga após migração bem-sucedida
        // Descomente a linha abaixo se quiser remover as chaves antigas
        // await AsyncStorage.removeItem(oldKey);
        
      } catch (error) {
        const errorMsg = `Erro ao migrar ${oldKey}: ${error.message}`;
        console.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }
    
    console.log('Migração concluída!');
    console.log(`Chaves migradas: ${stats.keysMigrated}`);
    console.log(`Chaves puladas: ${stats.keysSkipped}`);
    console.log(`Erros: ${stats.errors.length}`);
    
    return stats;
    
  } catch (error) {
    const errorMsg = `Erro crítico na migração: ${error.message}`;
    console.error(errorMsg);
    stats.errors.push(errorMsg);
    throw error;
  }
}

/**
 * Valida migração local
 */
export async function validateLocalMigration(profileId = null) {
  const validation = {
    hasOldData: false,
    hasNewData: false,
    allKeysMigrated: false,
    errors: [],
  };
  
  try {
    // Verificar se há dados antigos
    validation.hasOldData = await hasOldData();
    
    // Obter profileId
    let activeProfileId = profileId;
    if (!activeProfileId) {
      activeProfileId = await getActiveProfileId();
    }
    
    if (!activeProfileId) {
      validation.errors.push('Nenhum profileId disponível');
      return validation;
    }
    
    // Verificar se há dados novos (com prefixo de perfil)
    const allKeys = await AsyncStorage.getAllKeys();
    const profileKeys = allKeys.filter(key => 
      key.startsWith(getProfileKey('', activeProfileId).replace('_', ''))
    );
    validation.hasNewData = profileKeys.length > 0;
    
    // Verificar se todas as chaves antigas foram migradas
    let allMigrated = true;
    for (const [keyName, oldKey] of Object.entries(OLD_KEYS)) {
      const oldData = await AsyncStorage.getItem(oldKey);
      const newKey = getProfileKey(keyName, activeProfileId);
      const newData = await AsyncStorage.getItem(newKey);
      
      if (oldData && !newData) {
        allMigrated = false;
        validation.errors.push(`Chave ${oldKey} não foi migrada para ${newKey}`);
      }
    }
    
    validation.allKeysMigrated = allMigrated;
    
  } catch (error) {
    validation.errors.push(`Erro na validação: ${error.message}`);
  }
  
  return validation;
}

/**
 * Remove dados antigos (após validação)
 */
export async function removeOldData() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const oldKeys = Object.values(OLD_KEYS).filter(key => allKeys.includes(key));
    
    if (oldKeys.length === 0) {
      console.log('Nenhuma chave antiga encontrada para remover');
      return { removed: 0 };
    }
    
    await AsyncStorage.multiRemove(oldKeys);
    console.log(`Removidas ${oldKeys.length} chaves antigas`);
    
    return { removed: oldKeys.length };
  } catch (error) {
    console.error('Erro ao remover dados antigos:', error);
    throw error;
  }
}

/**
 * Função principal de migração (para uso no app)
 * Deve ser chamada uma vez quando o app detectar dados antigos
 */
export async function runLocalStorageMigration(profileId = null) {
  try {
    // Verificar se há dados antigos
    const hasOld = await hasOldData();
    if (!hasOld) {
      console.log('Nenhum dado antigo encontrado. Migração não necessária.');
      return { migrated: false, reason: 'no_old_data' };
    }
    
    console.log('Dados antigos detectados. Iniciando migração...');
    
    // Executar migração
    const stats = await migrateLocalStorage(profileId);
    
    // Validar migração
    const validation = await validateLocalMigration(profileId);
    
    if (validation.allKeysMigrated && stats.errors.length === 0) {
      console.log('Migração validada com sucesso!');
      // Opcional: Remover dados antigos após validação
      // await removeOldData();
      return { migrated: true, stats, validation };
    } else {
      console.warn('Migração concluída com avisos:', validation.errors);
      return { migrated: true, stats, validation, warnings: validation.errors };
    }
    
  } catch (error) {
    console.error('Erro na migração local:', error);
    return { migrated: false, error: error.message };
  }
}
