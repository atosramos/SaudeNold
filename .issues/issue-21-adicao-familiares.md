## Objetivo
Implementar funcionalidade para adicionar familiares ao sistema, incluindo perfis para crianças e adultos, com validações e permissões apropriadas.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Adição de familiares deve funcionar localmente e sincronizar quando online.

## Tarefas
- [ ] Implementar adição de criança
  - [ ] Tela `AddChildScreen` com formulário
  - [ ] Campos: nome, data de nascimento, gênero, tipo sanguíneo
  - [ ] Validação de idade (deve ser menor de 18 anos)
  - [ ] Endpoint `POST /api/family/add-child`
  - [ ] Criar perfil com `account_type: 'child'`
  - [ ] Definir permissões restritas para criança
  - [ ] Adicionar criador como cuidador com acesso 'full'
  - [ ] Associar à família do criador
  - [ ] Permitir criação direta sem convite para menores
- [ ] Implementar adição de adulto
  - [ ] Tela `AddAdultScreen` com formulário
  - [ ] Campos: nome, data de nascimento, email (opcional), gênero, tipo sanguíneo
  - [ ] Validação de idade (deve ser maior ou igual a 18 anos)
  - [ ] Endpoint `POST /api/family/add-adult`
  - [ ] Criar perfil com `account_type: 'adult_member'`
  - [ ] Definir permissões para adulto
  - [ ] Associar à família do criador
- [ ] Implementar adição de idoso sob cuidados
  - [ ] Tela `AddElderScreen` com formulário
  - [ ] Campos similares ao adulto
  - [ ] Endpoint `POST /api/family/add-elder`
  - [ ] Criar perfil com `account_type: 'elder_under_care'`
  - [ ] Definir permissões apropriadas
  - [ ] Adicionar criador como cuidador
- [ ] Implementar validações
  - [ ] Verificar se usuário tem permissão para adicionar membros
  - [ ] Verificar limite de 8 a 10 membros por família
  - [ ] Validar dados de entrada
  - [ ] Verificar duplicatas (mesmo nome/data nascimento)
- [ ] Implementar UI/UX
  - [ ] Formulários intuitivos e acessíveis
  - [ ] Validação em tempo real
  - [ ] Mensagens de erro claras
  - [ ] Confirmação antes de criar perfil
  - [ ] Feedback de sucesso

## Arquivos a Criar/Modificar
- `frontend/screens/AddChildScreen.js` - Tela de adicionar criança
- `frontend/screens/AddAdultScreen.js` - Tela de adicionar adulto
- `frontend/screens/AddElderScreen.js` - Tela de adicionar idoso
- `frontend/components/FamilyMemberForm.js` - Formulário reutilizável
- `backend/routes/family_routes.py` - Endpoints de adição
- `backend/services/family_service.py` - Lógica de negócio
- `backend/utils/validation.py` - Validações de idade e dados

## Referências
- Especificação técnica: Seção 2.3 - Adição de Familiares
- [React Native Date Picker](https://github.com/react-native-datetimepicker/datetimepicker)

## Prioridade
🔴 Alta (MVP)
