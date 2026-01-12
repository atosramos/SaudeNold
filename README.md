# 🏥 SaudeNold - Aplicativo de Saúde para Idosos

Aplicativo Android/iOS desenvolvido com React Native (Expo) para gerenciamento completo de saúde, com interface otimizada para usuários da terceira idade.

## 📱 Sobre o Projeto

O SaudeNold é uma solução completa para o gerenciamento de saúde pessoal, oferecendo funcionalidades essenciais como controle de medicamentos, agendamento de consultas, registro de exames médicos, acompanhamento diário de saúde e muito mais. O aplicativo foi projetado com foco em usabilidade, acessibilidade e interface amigável para idosos.

## ✨ Funcionalidades Principais

### 💊 Gerenciamento de Medicamentos
- Cadastro completo de medicamentos com foto
- Múltiplos horários de administração
- Notificações automáticas e persistentes
- Registro de tomadas com histórico
- Função de adiar lembrete (snooze)
- Suporte a medicamentos em jejum
- Agendamento por dias da semana específicos

### 🏥 Consultas Médicas
- Cadastro de consultas com médico e especialidade
- Lembretes automáticos antes da consulta
- Histórico completo de visitas
- Edição e exclusão de registros

### 💉 Vacinas
- Controle de carteira de vacinação
- Lembretes automáticos para próximas doses
- Histórico de vacinas aplicadas
- Informações sobre vacinas obrigatórias

### 📋 Exames Médicos
- Captura de exames via câmera ou galeria
- Suporte a PDFs
- Extração automática de dados usando Gemini AI
- Visualização de parâmetros extraídos
- Gráficos de evolução temporal
- Armazenamento local offline

### 📊 Acompanhamento Diário
- Registro de pressão arterial
- Controle de temperatura
- Monitoramento de batimentos cardíacos
- Registro de insulina
- Outros parâmetros de saúde
- Leitura automática via câmera (Gemini AI)
- Gráficos de timeline para visualização de tendências

### 📝 Anamnese
- Formulário completo de histórico médico
- Informações pessoais e de saúde
- Alergias e condições médicas
- Histórico familiar

### 📞 Contatos de Emergência
- Até 5 contatos de emergência
- Integração com WhatsApp
- Fotos dos contatos
- Informações de parentesco

### 📈 Histórico
- Log completo de medicamentos tomados
- Status visual (tomado, pulado, adiado)
- Detalhes de horários agendados vs. tomados

## 🎨 Design para Idosos

O aplicativo foi projetado especificamente para ser acessível e fácil de usar:

- ✅ **Fontes grandes** (24-40px)
- ✅ **Botões extra grandes** (mínimo 80x80px)
- ✅ **Alto contraste** de cores
- ✅ **Ícones + texto** sempre juntos
- ✅ **Espaçamento generoso** entre elementos
- ✅ **Navegação simples** com poucos botões por tela
- ✅ **Feedback visual claro** em todas as ações

### Paleta de Cores
- 🟦 **Azul/Turquesa (#4ECDC4)**: Medicamentos
- 🟥 **Vermelho (#FF6B6B)**: Contatos de Emergência
- 🟩 **Verde (#95E1D3)**: Visitas Médicas
- 🟧 **Coral (#F38181)**: Histórico
- 🟪 **Roxo (#9B59B6)**: Exames Médicos

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Expo** (~54.0.30) - Framework React Native
- **Expo Router** - Navegação file-based
- **React Native** - Framework mobile
- **AsyncStorage** - Armazenamento local
- **Expo Notifications** - Sistema de notificações
- **Expo Image Picker** - Câmera e galeria
- **Expo Document Picker** - Seleção de PDFs
- **Expo File System** - Manipulação de arquivos
- **Expo AV** - Reprodução de áudio
- **Expo Speech** - Text-to-speech
- **Ionicons** - Biblioteca de ícones
- **Axios** - Cliente HTTP
- **Victory Native** - Gráficos e visualizações

### Backend (Opcional)
- **FastAPI** - API REST
- **PostgreSQL** - Banco de dados
- **Docker** - Containerização
- **Kubernetes** - Orquestração

### IA e Processamento
- **Google Gemini AI** - Extração de dados de exames
- **OCR** - Reconhecimento óptico de caracteres

## 🚀 Como Executar

### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go instalado no dispositivo (para desenvolvimento)
- Android Studio (para build nativo)

### Instalação

```bash
# Clonar o repositório
git clone <repository-url>
cd SaudeNold

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm start

# Para Android
npm run android

# Para iOS
npm run ios

# Para Web
npm run web
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Backend (opcional)
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000

# Gemini AI (para extração de dados de exames)
EXPO_PUBLIC_GEMINI_API_KEY=sua-chave-aqui
```

**Nota:** Para builds de produção, configure as variáveis via EAS Secrets.

## 📁 Estrutura do Projeto

```
SaudeNold/
├── app/                    # Telas (Expo Router)
│   ├── _layout.js         # Layout raiz
│   ├── index.js           # Tela inicial
│   ├── medications/       # Gerenciamento de medicamentos
│   ├── doctor-visits/     # Consultas médicas
│   ├── vaccines/          # Vacinas
│   ├── medical-exams/     # Exames médicos
│   ├── daily-tracking/    # Acompanhamento diário
│   ├── emergency-contacts/# Contatos de emergência
│   ├── anamnesis.js       # Anamnese
│   └── history.js         # Histórico
├── components/            # Componentes reutilizáveis
├── services/             # Serviços e lógica de negócio
│   ├── alarm.js          # Sistema de notificações
│   ├── ocr.js            # Processamento OCR
│   ├── llmDataExtraction.js # Extração com IA
│   ├── dailyTracking.js   # Acompanhamento diário
│   └── ...
├── hooks/                # Custom hooks
├── assets/               # Imagens e recursos
├── docs/                 # Documentação
│   ├── setup/           # Guias de instalação
│   ├── features/        # Documentação de features
│   ├── troubleshooting/ # Solução de problemas
│   ├── deployment/      # Guias de deploy
│   └── backend/         # Documentação do backend
├── scripts/             # Scripts utilitários
│   ├── build/          # Scripts de build
│   ├── deployment/     # Scripts de deploy
│   ├── maintenance/    # Scripts de manutenção
│   └── testing/        # Scripts de teste
├── backend/            # Backend FastAPI (opcional)
├── k8s/                # Configurações Kubernetes
└── package.json
```

## 📚 Documentação

A documentação completa está organizada na pasta `docs/`:

- **Setup**: Guias de instalação e configuração
- **Features**: Documentação detalhada das funcionalidades
- **Troubleshooting**: Solução de problemas comuns
- **Deployment**: Guias de build e deploy
- **Backend**: Documentação da API e banco de dados

## 🔔 Sistema de Notificações

O aplicativo utiliza notificações locais persistentes que funcionam mesmo quando o app está fechado:

- ✅ Notificações agendadas automaticamente
- ✅ Funcionam após reinicialização do dispositivo
- ✅ Som e vibração configuráveis
- ✅ Canais Android otimizados
- ✅ Suporte a notificações recorrentes

**Documentação completa:** `docs/features/NOTIFICACOES-BACKGROUND.md`

## 🤖 Integração com Gemini AI

O aplicativo utiliza Google Gemini AI para extração automática de dados de exames médicos:

- Extração de parâmetros, valores e unidades
- Identificação de tipo de exame
- Extração de data do exame
- Processamento de imagens e PDFs

**Documentação:** `docs/features/LLM-EXTRACAO-DADOS.md`

## 📦 Build e Deploy

### Build Local (APK)

```bash
# Usar script automatizado
.\scripts\build\build-apk.ps1

# Ou manualmente
eas build --platform android --profile production
```

**Documentação completa:** `docs/deployment/BUILD-APK.md`

### Deploy Backend (Opcional)

```bash
# Deploy com Docker
docker-compose up -d

# Deploy com Kubernetes
.\scripts\deployment\build-e-deploy-backend.ps1
```

## 🧪 Testes

```bash
# Testar backend
.\scripts\testing\testar-backend.ps1

# Testar conexão
.\scripts\testing\testar-conexao.ps1

# Ver logs
.\scripts\testing\view-logs.ps1
```

## 🔧 Manutenção

Scripts úteis para manutenção:

```bash
# Limpar Docker
.\scripts\maintenance\limpar-docker.ps1

# Verificar status
.\scripts\maintenance\verificar-status.ps1

# Limpar Kubernetes
.\scripts\maintenance\limpar-completo-kubernetes-portainer.ps1
```

## 📝 Notas Importantes

1. **Armazenamento**: Dados são salvos localmente no dispositivo usando AsyncStorage
2. **Offline**: O app funciona completamente offline
3. **Notificações**: Requerem permissão do usuário (solicitada automaticamente)
4. **WhatsApp**: Integração requer WhatsApp instalado no dispositivo
5. **Gemini AI**: Requer chave de API configurada para extração automática

## 🐛 Solução de Problemas

Consulte a documentação em `docs/troubleshooting/` para soluções de problemas comuns:

- Problemas com notificações
- Erros de build
- Problemas de conexão
- Erros de OCR/IA
- Problemas com Kubernetes/Docker

## 📄 Licença

Este projeto é privado.

## 👥 Contribuindo

Para contribuir com o projeto:

1. Crie uma branch para sua feature
2. Faça suas alterações
3. Teste completamente
4. Crie um Pull Request

## 📞 Suporte

Para suporte e dúvidas, consulte a documentação em `docs/` ou abra uma issue no repositório.

---

**Desenvolvido com ❤️ para melhorar a qualidade de vida dos idosos**
