## Objetivo
Implementar criptografia end-to-end para dados medicos sensiveis com chaves por perfil e comunicacao segura.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Criptografia deve funcionar localmente com sincronização opcional.

## Tarefas
- [x] Criptografia end-to-end por perfil
  - [x] Chaves simetricas por perfil (AES-256)
  - [x] Rotacao de chaves conforme politica de seguranca (90 dias)
  - [x] Armazenar chaves no Keychain/Keystore
  - [x] Servidor nao tem acesso a chaves de descriptografia (frontend implementado)
- [x] Criptografia em transito
  - [x] Forcar HTTPS/TLS para todas as comunicacoes (enforcement no cliente)
  - [ ] Configurar TLS 1.3 quando suportado (requer configuração do servidor)
  - [x] Rejeitar conexoes inseguras no cliente (em produção)
- [x] Segregacao de dados por perfil
  - [x] Dados medicos criptografados por perfil (localmente)
  - [x] Cache local segregado por usuario
  - [x] Sincronizacao segura por perfil

## Notas de Implementação

### Criptografia Local (Frontend) ✅
- ✅ Serviço de criptografia AES-256 implementado em `services/cryptoService.js`
- ✅ Dados sensíveis criptografados antes de salvar no AsyncStorage:
  - medications, medicalExams, doctorVisits, emergencyContacts, medicationLogs, anamnesis
- ✅ Rotação automática de chaves a cada 90 dias
- ✅ Chaves armazenadas no SecureStore (Keychain/Keystore)
- ✅ Compatibilidade com dados não criptografados (migração gradual)

### Criptografia em Trânsito ✅
- ✅ Enforcement de HTTPS no cliente (rejeita HTTP em produção)
- ✅ Security headers no backend (Strict-Transport-Security)
- ⚠️ TLS 1.3 requer configuração do servidor web (Nginx/Apache)

### Zero-Knowledge (Backend) ⚠️
- ⚠️ Backend atual armazena dados em texto plano
- ⚠️ Para zero-knowledge completo, backend precisa:
  - Aceitar dados criptografados do frontend
  - Armazenar dados criptografados sem descriptografar
  - Retornar dados criptografados quando solicitado
  - Não ter acesso às chaves de descriptografia

## Arquivos a Criar/Modificar
- `backend/services/encryption_service.py` - Servico de criptografia
- `backend/middleware/tls_enforcement.py` - Forcar TLS
- `frontend/services/cryptoService.js` - Criptografia no app
- `frontend/services/secureStorage.js` - Chaves no Keychain/Keystore

## Referencias
- Especificacao tecnica: Secao 1 - Caracteristicas de seguranca

## Prioridade
🔴 Alta (MVP)
