# 🔔 Notificações em Background - Como Funcionam

## ✅ IMPORTANTE: As Notificações Funcionam com o App Fechado!

As notificações agendadas do Expo **FUNCIONAM MESMO COM O APP FECHADO**. Elas são gerenciadas pelo **sistema operacional** (Android/iOS), não pelo app React Native.

## 🔧 Como Funciona

### 1. **Agendamento de Notificações**
Quando você agenda um alarme (medicamento, consulta ou vacina), o Expo Notifications:
- Agenda a notificação no **sistema operacional**
- O sistema operacional armazena essa notificação
- **Não precisa do app estar aberto** para a notificação disparar

### 2. **Quando a Notificação Dispara**
- O sistema operacional verifica as notificações agendadas
- No horário programado, o sistema **dispara a notificação automaticamente**
- A notificação aparece mesmo se o app estiver fechado
- O som toca mesmo se o app estiver fechado

### 3. **O que Foi Configurado**

#### Android (`app.json`):
```json
{
  "android": {
    "permissions": [
      "RECEIVE_BOOT_COMPLETED",  // Permite reagendar após reiniciar
      "VIBRATE",                  // Permite vibração
      "WAKE_LOCK",                // Permite acordar o dispositivo
      "SCHEDULE_EXACT_ALARM",     // Permite alarmes exatos (Android 12+)
      "USE_EXACT_ALARM"           // Permite alarmes exatos (Android 12+)
    ]
  }
}
```

#### Canal de Notificação:
- **Importance: MAX** - Garante que a notificação tenha prioridade máxima
- **Sound: default** - Usa o som padrão do sistema (mais confiável)
- **Vibration: enabled** - Vibra quando a notificação dispara

## ⚠️ Possíveis Problemas e Soluções

### 1. **Otimização de Bateria (Android)**
Alguns dispositivos Android podem "matar" apps em background para economizar bateria.

**Solução:**
- Oriente o usuário a desativar a otimização de bateria para o app
- Configurações → Apps → SaudeNold → Bateria → Não otimizar

### 2. **Permissões Não Concedidas**
Se o usuário negar permissões de notificação, os alarmes não funcionarão.

**Solução:**
- O app solicita permissões automaticamente
- Se negadas, o usuário precisa conceder manualmente nas configurações

### 3. **Modo "Não Perturbe"**
Se o dispositivo estiver em modo "Não Perturbe", as notificações podem ser silenciadas.

**Solução:**
- O canal de notificação está configurado com MAX importance
- Alguns dispositivos podem ainda silenciar - oriente o usuário a verificar

### 4. **App Reinstalado ou Dados Limpos**
Se o app for reinstalado ou os dados limpos, os alarmes precisam ser reagendados.

**Solução:**
- O app reagenda automaticamente todos os alarmes ao iniciar
- Função `rescheduleAllAlarms()` é chamada no `_layout.js`

## 🧪 Como Testar

### 1. **Teste Básico:**
```javascript
// Agendar uma notificação para 1 minuto no futuro
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Teste',
    body: 'Esta notificação deve tocar mesmo com o app fechado',
    sound: 'default',
  },
  trigger: {
    seconds: 60, // 1 minuto
  },
});
```

### 2. **Verificar Notificações Agendadas:**
```javascript
import { listAllScheduledNotifications } from '../services/alarm';

// Listar todas as notificações agendadas
const scheduled = await listAllScheduledNotifications();
console.log(`Total de notificações agendadas: ${scheduled.length}`);
```

### 3. **Teste Real:**
1. Agende um medicamento para daqui a 5 minutos
2. **Feche completamente o app** (não apenas minimizar)
3. Aguarde 5 minutos
4. A notificação deve tocar automaticamente

## 📱 Configurações do Usuário

### Android:
1. **Configurações → Apps → SaudeNold → Notificações**
   - Verificar se as notificações estão habilitadas
   - Verificar se o canal "Alarme de Medicamentos" está ativo

2. **Configurações → Apps → SaudeNold → Bateria**
   - Desativar otimização de bateria (se disponível)

3. **Configurações → Notificações → SaudeNold**
   - Verificar se não está em modo "Não Perturbe"

### iOS:
1. **Configurações → Notificações → SaudeNold**
   - Verificar se as notificações estão habilitadas
   - Verificar se "Permitir Notificações" está ativado

## 🔍 Debug

Se os alarmes não estiverem funcionando:

1. **Verificar permissões:**
```javascript
const { status } = await Notifications.getPermissionsAsync();
console.log('Status das permissões:', status); // Deve ser 'granted'
```

2. **Listar notificações agendadas:**
```javascript
const scheduled = await Notifications.getAllScheduledNotificationsAsync();
console.log('Notificações agendadas:', scheduled);
```

3. **Verificar logs:**
- Abra o console do React Native
- Procure por mensagens de erro ao agendar alarmes
- Verifique se `rescheduleAllAlarms()` está sendo chamada

## ✅ Resumo

- ✅ **As notificações funcionam com o app fechado**
- ✅ **São gerenciadas pelo sistema operacional**
- ✅ **Não precisam do app estar aberto**
- ✅ **São reagendadas automaticamente ao iniciar o app**
- ✅ **Funcionam mesmo após reiniciar o dispositivo** (com RECEIVE_BOOT_COMPLETED)

## 📚 Referências

- [Expo Notifications - Documentação](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Android Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)
- [iOS User Notifications](https://developer.apple.com/documentation/usernotifications)
