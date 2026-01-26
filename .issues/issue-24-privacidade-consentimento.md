## Objetivo
Implementar sistema de privacidade e consentimento, permitindo que usuários controlem como seus dados são compartilhados e usados.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Consentimentos devem funcionar localmente e sincronizar quando houver backend.

## Tarefas
- [ ] Implementar termos de uso e política de privacidade
  - [ ] Criar documentos de termos e política
  - [ ] Tela para exibir termos e política
  - [ ] Requer aceitação no cadastro
  - [ ] Armazenar timestamp de aceitação
  - [ ] Notificar sobre atualizações de termos
- [ ] Implementar consentimento granular
  - [ ] Permitir usuário escolher o que compartilhar
  - [ ] Opções: dados básicos, histórico médico, emergências, etc.
  - [ ] Interface para gerenciar consentimentos
  - [ ] Endpoint para atualizar consentimentos
  - [ ] Respeitar consentimentos em compartilhamentos
  - [ ] Revogação de acesso a qualquer momento
- [ ] Implementar controle de dados para crianças
  - [ ] Pais/responsáveis controlam dados de crianças
  - [ ] Interface para pais gerenciarem consentimentos de filhos
  - [ ] Log de acessos aos dados de crianças
  - [ ] Migração automática ao completar 18 anos (com consentimento)
- [ ] Implementar direito ao esquecimento (GDPR)
  - [ ] Endpoint para solicitar exclusão de dados (`DELETE /api/user/data`)
  - [ ] Processo de exclusão completo
  - [ ] Manter apenas dados necessários para compliance
  - [ ] Confirmar exclusão por email
- [ ] Implementar exportação de dados
  - [ ] Endpoint para exportar todos os dados do usuário (`GET /api/user/export-data`)
  - [ ] Formato JSON estruturado + ZIP quando necessário
  - [ ] Incluir todos os dados relacionados ao usuário
  - [ ] Permitir download do arquivo
- [ ] Implementar direitos do titular
  - [ ] Retificação de dados incorretos
  - [ ] Portabilidade para outros sistemas
  - [ ] Relatório de acessos dos últimos 12 meses
- [ ] Implementar logs de acesso
  - [ ] Registrar todos os acessos a dados sensíveis
  - [ ] Campos: quem acessou, quando, que dados, motivo
  - [ ] Endpoint para visualizar logs (`GET /api/user/access-logs`)
  - [ ] UI para visualizar histórico de acessos

## Arquivos a Criar/Modificar
- `backend/models/consent_model.py` - Modelo de consentimento
- `backend/models/access_log_model.py` - Modelo de log de acesso
- `backend/routes/privacy_routes.py` - Rotas de privacidade
- `backend/services/privacy_service.py` - Serviço de privacidade
- `frontend/screens/PrivacySettingsScreen.js` - Tela de configurações
- `frontend/screens/TermsAndPrivacyScreen.js` - Tela de termos
- `frontend/components/ConsentManager.js` - Gerenciador de consentimentos

## Referências
- [GDPR compliance](https://gdpr.eu/)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [HIPAA guidance](https://www.hhs.gov/hipaa/index.html)

## Prioridade
🟡 Média
