# SaudeNold - Aplicativo de Saúde para Idosos

Aplicativo Android (React Native/Expo) para gerenciamento de medicamentos com interface amigável para terceira idade.

## 📱 Funcionalidades

### 1. Tela Principal (Home)
- **Próximo Medicamento**: Card grande mostrando o próximo remédio a tomar
- **Horário de hoje**: Mostra a data atual
- **Agenda do Dia**: Lista todos os medicamentos agendados para hoje
- **Botões de Ação**:
  - ✅ **"Tomei"**: Registra que o medicamento foi tomado
  - ⏰ **"+15 min"**: Adia o lembrete por 15 minutos
- **Menu de Navegação**: 4 botões grandes para acessar outras telas

### 2. Cadastro de Medicamentos
- **Formulário Completo**:
  - Nome do medicamento
  - Dosagem
  - Múltiplos horários (pode adicionar vários)
  - Horários rápidos (08:00, 12:00, 18:00, 22:00)
  - Foto do medicamento (câmera ou galeria)
  - Observações
- **Lista de Medicamentos**:
  - Visualização de todos os medicamentos cadastrados
  - Editar e remover medicamentos
  - Mostra foto, nome, dosagem e horários

### 3. Sistema de Lembretes (NOTIFICAÇÕES)
- **Notificações Locais**: Usa Expo Notifications
- **Agendamento Automático**: Ao cadastrar medicamento, notificações são agendadas automaticamente
- **Lembretes Diários**: Notificações repetem todos os dias nos horários configurados
- **Snooze**: Função de adiar por 15 minutos
- **Registro de Tomadas**: Salva no banco quando medicamento é tomado

### 4. Contatos de Emergência
- **Até 5 Contatos**: Limite de 5 contatos de emergência
- **Fotos Grandes**: Interface visual com fotos dos contatos
- **Integração WhatsApp**: Toque na foto para abrir WhatsApp direto
- **Informações**: Nome, telefone, parentesco (filha, filho, etc.)
- **Cadastro Fácil**: Tirar foto ou escolher da galeria

### 5. Visitas ao Médico
- **Registro de Consultas**:
  - Nome do médico
  - Especialidade (botões rápidos: Cardiologista, Clínico Geral, etc.)
  - Data da consulta
  - Observações
- **Lista de Visitas**: Histórico de todas as consultas

### 6. Histórico
- **Log Completo**: Todos os medicamentos tomados
- **Status Visual**: Ícones coloridos (tomado ✅, pulado ❌, adiado ⏰)
- **Detalhes**: Hora agendada vs hora que tomou

## 🎨 Design para Idosos

### Características Especiais:
- ✅ **Fontes MUITO GRANDES** (24-40px)
- ✅ **Botões EXTRA GRANDES** (mínimo 80x80px)
- ✅ **Alto Contraste**: Cores vibrantes e legíveis
- ✅ **Ícones + Texto**: Sempre os dois juntos
- ✅ **Espaçamento Generoso**: 24-32px entre elementos
- ✅ **Navegação Simples**: Poucos botões por tela
- ✅ **Feedback Visual Claro**: Alertas grandes e claros

### Paleta de Cores:
- 🟦 **Azul/Turquesa (#4ECDC4)**: Medicamentos
- 🟥 **Vermelho (#FF6B6B)**: Contatos de Emergência
- 🟩 **Verde (#95E1D3)**: Visitas Médicas
- 🟧 **Coral (#F38181)**: Histórico

## 🔧 Tecnologias

### Frontend:
- **Expo** (React Native)
- **Expo Router** (navegação file-based)
- **Expo Notifications** (lembretes locais)
- **Expo Image Picker** (câmera e galeria)
- **Axios** (chamadas API)
- **Ionicons** (ícones)
- **AsyncStorage** (armazenamento local)

## 🚀 Como Executar

### Pré-requisitos
- Node.js instalado
- Expo CLI instalado globalmente: `npm install -g expo-cli`
- Expo Go instalado no dispositivo Android (ou emulador configurado)

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar o projeto
npm start

# Para Android
npm run android
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

## 📊 Estrutura do Projeto

```
SaudeNold/
├── app/              # Telas usando Expo Router
│   ├── _layout.js    # Layout raiz
│   └── index.js      # Tela inicial
├── assets/           # Imagens e recursos
├── components/       # Componentes reutilizáveis
├── services/         # Serviços (API, notificações, etc.)
├── utils/            # Funções utilitárias
└── constants/        # Constantes e configurações
```

## 📝 Notas Importantes

1. **Imagens em Base64**: Todas as fotos são armazenadas em Base64
2. **Notificações**: Requerem permissão do usuário (pedida automaticamente)
3. **WhatsApp**: Requer WhatsApp instalado no dispositivo
4. **Horários**: Formato HH:MM (24h)
5. **Timezone**: UTC - ajustar conforme necessário

## 🎯 Status do Projeto

Este projeto está em desenvolvimento inicial. As funcionalidades serão implementadas progressivamente.

## 📄 Licença

Este projeto é privado.





















