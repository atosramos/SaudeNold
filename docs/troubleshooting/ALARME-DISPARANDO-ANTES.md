# ⏰ Alarme Disparando Antes do Horário Programado

## 🔴 Problema

O alarme está disparando alguns minutos antes do horário programado (ex: 15:11 quando programado para 15:15).

## 🔍 Causas Possíveis

### 1. Otimização de Bateria do Android

O Android (especialmente versões 8.0+) tem um sistema de otimização de bateria que pode:
- Ajustar o horário de notificações para economizar bateria
- Agrupar notificações próximas
- Atrasar notificações quando o dispositivo está em modo de economia de energia

### 2. Timezone ou Horário do Dispositivo

- Dispositivo com horário incorreto
- Mudança de timezone automática
- Horário de verão

### 3. Problema com Notificações Recorrentes

Notificações recorrentes no Android podem ter pequenas variações de timing.

## ✅ Correções Aplicadas

1. **Validação de horário** - Garantir que horas e minutos são números inteiros válidos
2. **Parsing explícito** - Usar `parseInt()` para garantir conversão correta
3. **Canal de notificação otimizado** - Configurações específicas para precisão

## 🛠️ Soluções

### Solução 1: Desabilitar Otimização de Bateria (Recomendado)

1. **Configurações** → **Bateria**
2. **Otimização de bateria** ou **Economia de bateria**
3. Encontrar **SaudeNold** na lista
4. Selecionar **Não otimizar** ou **Não restringir**

### Solução 2: Verificar Horário do Dispositivo

1. **Configurações** → **Data e hora**
2. Verificar se está correto
3. Desativar **Data e hora automáticas** temporariamente para testar
4. Verificar se o timezone está correto

### Solução 3: Verificar Permissões

1. **Configurações** → **Apps** → **SaudeNold**
2. **Permissões**
3. Verificar se **Notificações** está ativado
4. Verificar se **Exibir sobre outros apps** está ativado (se disponível)

### Solução 4: Reagendar Alarmes

Após fazer as correções acima:

1. Abrir o app
2. Ir em **Meus Medicamentos**
3. Editar o medicamento com problema
4. Salvar novamente (isso reagenda os alarmes)

## 🧪 Como Verificar

### Verificar Horário Programado

1. Abrir o app
2. Ir em **Meus Medicamentos**
3. Verificar o horário exibido
4. Comparar com o horário que o alarme disparou

### Verificar Logs de Debug

O app mantém logs de debug. Verificar:
- Quando o alarme foi agendado
- Qual horário foi usado
- Se houve algum erro

## 📋 Checklist

- [ ] Otimização de bateria desabilitada para o app
- [ ] Horário do dispositivo está correto
- [ ] Timezone está correto
- [ ] Permissões de notificação concedidas
- [ ] App não está em modo de economia de energia
- [ ] Alarmes foram reagendados após correções

## 🔧 Se o Problema Persistir

### Opção 1: Usar Notificações Não-Recorrentes

Se o problema continuar, podemos modificar o código para usar notificações não-recorrentes que são agendadas diariamente. Isso garante mais precisão, mas requer que o app seja aberto pelo menos uma vez por dia.

### Opção 2: Adicionar Margem de Segurança

Podemos adicionar uma pequena margem (ex: 1 minuto) ao horário programado para compensar variações do sistema.

### Opção 3: Usar AlarmManager Direto (Android Nativo)

Para máxima precisão, podemos usar o AlarmManager nativo do Android, que tem melhor controle sobre o timing exato.

## 📝 Notas Técnicas

- O Android pode ajustar notificações em até 5 minutos para economizar bateria
- Notificações recorrentes têm menos precisão que notificações únicas
- O modo "Não perturbe" pode afetar o timing
- Modo de economia de energia pode atrasar notificações

## 🔗 Arquivos Relacionados

- `services/alarm.js` - Lógica de agendamento de alarmes
- `app/alarm.js` - Tela de alarme
- `app/medications/new.js` - Cadastro de medicamentos
