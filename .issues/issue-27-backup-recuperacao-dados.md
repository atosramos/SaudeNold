## Objetivo
Implementar backup criptografado e recuperacao de conta/dados com foco em zero-knowledge e resiliencia.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Backup local deve funcionar sem backend; sincronização em nuvem é opcional.

## Tarefas
- [ ] Backup criptografado em nuvem
  - [ ] Criptografia AES-256 antes do upload
  - [ ] Chave derivada da senha + salt unico (PBKDF2)
  - [ ] Servidor sem acesso a chaves de descriptografia (zero-knowledge)
  - [ ] Backups incrementais diarios automaticos
  - [ ] Retencao de 30 dias de historico
- [ ] Recuperacao de conta
  - [ ] Gerar codigo de recuperacao de 24 palavras no cadastro
  - [ ] Exigir armazenamento seguro pelo usuario
  - [ ] Perguntas de seguranca como backup secundario
  - [ ] Recuperacao via 2FA se ainda houver acesso
  - [ ] Verificacao de identidade com documento (processo manual)
- [ ] Backup local opcional
  - [ ] Exportacao criptografada para armazenamento do usuario
  - [ ] Formato FHIR quando aplicavel
  - [ ] ZIP protegido por senha forte
  - [ ] Incluir documentos, imagens e metadados

## Arquivos a Criar/Modificar
- `backend/services/backup_service.py` - Servico de backup
- `backend/routes/backup_routes.py` - Rotas de backup/recuperacao
- `backend/services/recovery_service.py` - Logica de recuperacao
- `frontend/screens/BackupSettingsScreen.js` - Tela de backup
- `frontend/screens/RecoveryScreen.js` - Tela de recuperacao

## Referencias
- Especificacao tecnica: Secao 7.2 - Backup e recuperacao de dados
- [FHIR overview](https://www.hl7.org/fhir/overview.html)

## Prioridade
🟡 Media
