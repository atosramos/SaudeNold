## Objetivo
Implementar funcionalidade para adicionar familiares ao sistema, incluindo perfis para crianças e adultos, com validações e permissões apropriadas.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Adição de familiares deve funcionar localmente e sincronizar quando online.

## Tarefas
- [x] Implementar adição de criança
  - [x] Tela `AddChildScreen` com formulário (`app/family/add-child.js`)
  - [x] Campos: nome, data de nascimento, gênero, tipo sanguíneo
  - [x] Validação de idade (deve ser menor de 18 anos)
  - [x] Endpoint `POST /api/family/add-child`
  - [x] Criar perfil com `account_type: 'child'`
  - [x] Definir permissões restritas para criança
  - [x] Adicionar criador como cuidador com acesso 'full'
  - [x] Associar à família do criador
  - [x] Permitir criação direta sem convite para menores
- [x] Implementar adição de adulto
  - [x] Tela `AddAdultScreen` com formulário (`app/family/add-adult.js`)
  - [x] Campos: nome, data de nascimento, email (opcional), gênero, tipo sanguíneo
  - [x] Validação de idade (deve ser maior ou igual a 18 anos)
  - [x] Endpoint `POST /api/family/add-adult`
  - [x] Criar perfil com `account_type: 'adult_member'`
  - [x] Definir permissões para adulto
  - [x] Associar à família do criador
- [x] Implementar adição de idoso sob cuidados
  - [x] Tela `AddElderScreen` com formulário (`app/family/add-elder.js`)
  - [x] Campos similares ao adulto
  - [x] Endpoint `POST /api/family/add-elder`
  - [x] Criar perfil com `account_type: 'elder_under_care'`
  - [x] Definir permissões apropriadas
  - [x] Adicionar criador como cuidador
- [x] Implementar validações
  - [x] Verificar se usuário tem permissão para adicionar membros (apenas family_admin)
  - [x] Verificar limite de 8 a 10 membros por família (MAX_FAMILY_PROFILES)
  - [x] Validar dados de entrada
  - [x] Verificar duplicatas (mesmo nome/data nascimento)
- [x] Implementar UI/UX
  - [x] Formulários intuitivos e acessíveis (usando FamilyMemberForm)
  - [x] Validação em tempo real
  - [x] Mensagens de erro claras
  - [x] Confirmação antes de criar perfil (via Alert)
  - [x] Feedback de sucesso

## Arquivos Criados/Modificados
- ✅ `app/family/add-child.js` - Tela de adicionar criança
- ✅ `app/family/add-adult.js` - Tela de adicionar adulto
- ✅ `app/family/add-elder.js` - Tela de adicionar idoso
- ✅ `components/FamilyMemberForm.js` - Formulário reutilizável (já existia, atualizado)
- ✅ `backend/main.py` - Endpoints de adição (`/api/family/add-child`, `/api/family/add-adult`, `/api/family/add-elder`)
- ✅ `services/familyService.js` - Funções para adicionar familiares
- ✅ `app/profile-selection.js` - Integração com modal de adicionar familiar

## Referências
- Especificação técnica: Seção 2.3 - Adição de Familiares
- [React Native Date Picker](https://github.com/react-native-datetimepicker/datetimepicker)

## Prioridade
🔴 Alta (MVP)
