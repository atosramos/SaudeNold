# Correção: DateTimePicker na Ficha de Anamnese

## Problema Identificado

Ao tentar selecionar a data **29/08/1969** na ficha de anamnese, ao clicar no dia 29, o calendário voltava o mês para dezembro e o dia para 31.

## Causa Raiz

O problema ocorria devido a:
1. **Ajustes automáticos do DateTimePicker**: Quando uma data é selecionada, o componente pode ajustar automaticamente devido a problemas de timezone
2. **Manipulação incorreta da data**: A data selecionada não estava sendo extraída corretamente dos componentes (ano, mês, dia)
3. **Falta de tratamento específico para Android**: O comportamento do DateTimePicker no Android é diferente do iOS

## Correções Aplicadas

### 1. Extração de Componentes da Data
- ✅ Extrair ano, mês e dia separadamente da data selecionada
- ✅ Criar nova data usando esses componentes para evitar ajustes automáticos

### 2. Tratamento Específico para Android
- ✅ Verificar se o evento foi cancelado (`event.type === 'dismissed'`)
- ✅ Fechar o picker apenas após confirmação
- ✅ Usar hora fixa (12:00) ao criar a data para evitar problemas de timezone

### 3. Criação de Data Válida
- ✅ Criar data usando `new Date(year, month, day, 12, 0, 0, 0)` com hora fixa
- ✅ Isso garante que a data não seja ajustada automaticamente

## Arquivos Modificados

1. `app/anamnesis.js` - Corrigido o handler `onChange` do DateTimePicker

## Como Testar

1. Recompile o APK no Android Studio
2. Abra a Ficha de Anamnese
3. Tente selecionar a data 29/08/1969
4. Verifique se a data permanece correta após seleção

## Notas Técnicas

- O DateTimePicker no Android fecha automaticamente após seleção
- No iOS, o picker permanece aberto até confirmação explícita
- Usar hora fixa (12:00) ao criar datas evita problemas de timezone que podem causar ajustes de dia/mês
- Extrair componentes da data antes de criar uma nova instância garante que não haja ajustes automáticos
