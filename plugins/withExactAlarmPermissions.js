const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Plugin do Expo para garantir que as permissões de alarme exato
 * sejam adicionadas ao AndroidManifest.xml quando usar Android Studio
 * 
 * IMPORTANTE: Quando você compila com Android Studio, o expo prebuild
 * pode não preservar todas as permissões do app.json corretamente.
 * Este plugin garante que SCHEDULE_EXACT_ALARM e USE_EXACT_ALARM
 * sejam sempre adicionadas ao AndroidManifest.xml.
 */
const withExactAlarmPermissions = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    
    // Encontrar ou criar a tag <manifest>
    if (!androidManifest.manifest) {
      androidManifest.manifest = {};
    }
    
    // Encontrar ou criar o array de permissões
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }
    
    const permissions = androidManifest.manifest['uses-permission'];
    
    // Lista de permissões necessárias para alarmes exatos
    const requiredPermissions = [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.VIBRATE',
      'android.permission.WAKE_LOCK',
    ];
    
    // Adicionar permissões se não existirem
    requiredPermissions.forEach((permission) => {
      // Verificar se a permissão já existe
      const exists = permissions.some((p) => {
        // Pode estar em formato de objeto com $ ou como string
        if (typeof p === 'string') {
          return p === permission;
        }
        if (p && p.$ && p.$['android:name']) {
          return p.$['android:name'] === permission;
        }
        return false;
      });
      
      if (!exists) {
        // Adicionar permissão no formato correto
        permissions.push({
          $: {
            'android:name': permission,
          },
        });
        console.log(`[withExactAlarmPermissions] Adicionada permissão: ${permission}`);
      }
    });
    
    return config;
  });
};

module.exports = withExactAlarmPermissions;
