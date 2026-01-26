## Objetivo
Implementar verificacao de autenticidade de documentos medicos e assinaturas digitais, com trilha de confianca.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Verificacao deve funcionar localmente quando possível e sincronizar validações online.

## Tarefas
- [ ] Verificacao de assinaturas digitais
  - [ ] Suporte a certificados ICP-Brasil
  - [ ] Validacao de prescricoes eletronicas
  - [ ] Verificacao de QR Code de receitas (padrao gov.br)
  - [ ] Timestamp criptografico para comprovar data de upload
- [ ] Registro imutavel (opcional/premium)
  - [ ] Hash de documentos criticos registrado em blockchain
  - [ ] Prova criptografica de existencia em determinada data
  - [ ] Armazenar apenas hash (sem conteudo)

## Arquivos a Criar/Modificar
- `backend/services/document_signature_service.py` - Validacao de assinaturas
- `backend/routes/document_signature_routes.py` - Rotas de verificacao
- `backend/services/blockchain_service.py` - Registro de hash (opcional)
- `frontend/screens/DocumentSignatureScreen.js` - Tela de verificacao

## Referencias
- Especificacao tecnica: Secao 7.5 - Assinatura digital e autenticidade

## Prioridade
🟡 Media
