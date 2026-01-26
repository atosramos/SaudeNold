# Implementar Issue #35 - Criptografia de Dados Médicos

## Status Atual

### Implementado Parcialmente:
- ✅ Chaves de criptografia por perfil existem (`ensureProfileEncryptionKey`)
- ✅ Chaves armazenadas no SecureStore (Keychain/Keystore)
- ✅ Security headers no backend (Strict-Transport-Security)
- ✅ Segregação de dados por perfil (profile_id)

### Não Implementado:
- ❌ Criptografia AES-256 real dos dados médicos
- ❌ Serviço de criptografia completo (cryptoService.js)
- ❌ Rotação de chaves conforme política de segurança
- ❌ Enforcement de HTTPS/TLS no cliente (rejeitar HTTP)
- ❌ Criptografia de dados antes de salvar no AsyncStorage
- ❌ Criptografia de dados antes de enviar ao servidor

## Tarefas a Implementar

### 1. Instalar Dependência de Criptografia
- Adicionar `crypto-js` ao `package.json`
- Executar `npm install`

### 2. Criar Serviço de Criptografia no Frontend
- Criar `services/cryptoService.js` com:
  - `encryptData(data, profileId)` - AES-256
  - `decryptData(encryptedData, profileId)`
  - `rotateEncryptionKey(profileId)`
  - `getEncryptionKey(profileId)`

### 3. Modificar ProfileStorageManager
- Criptografar dados sensíveis antes de salvar
- Descriptografar ao ler
- Lista de chaves: medications, medicalExams, doctorVisits, emergencyContacts, medicationLogs, anamnesis

### 4. Implementar Rotação de Chaves
- Rotacionar após 90 dias (configurável)
- Migrar dados com chave antiga para nova chave

### 5. Enforcement de HTTPS no Cliente
- Rejeitar HTTP em produção
- Validar que API_URL usa HTTPS em produção

### 6. Criptografar Dados Antes de Enviar ao Servidor
- Modificar `sync.js` para criptografar payloads
- Backend armazena dados criptografados (zero-knowledge)

### 7. Atualizar Issue #35 no GitHub
- Marcar tarefas concluídas

## Arquivos a Criar/Modificar
- `package.json` - Adicionar crypto-js
- `services/cryptoService.js` - NOVO
- `services/profileStorageManager.js` - Usar criptografia
- `services/api.js` - Enforcement HTTPS
- `services/sync.js` - Criptografar antes de enviar
