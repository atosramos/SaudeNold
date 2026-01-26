## Objetivo
Implementar auditoria completa e conformidade regulatoria para dados sensiveis de saude.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Logs locais devem funcionar offline, com sincronização opcional.

## Tarefas
- [ ] Logs de auditoria completos
  - [ ] Registrar visualizacao, edicao, compartilhamento e exclusao
  - [ ] Rastreabilidade: quem, quando, de onde (IP + dispositivo)
  - [ ] Logs imutaveis armazenados separadamente dos dados principais
  - [ ] Retencao de 7 anos (requisitos legais de saude)
  - [ ] Visualizacao do proprio historico de auditoria
- [ ] Conformidade regulatoria
  - [ ] LGPD (Brasil) e HIPAA (EUA) quando aplicavel
  - [ ] Politica de privacidade clara e acessivel
  - [ ] Termo de consentimento explicito para dados sensiveis
  - [ ] Certificacao ISO 27001 (planejamento e checklist)
- [ ] Direitos do titular dos dados
  - [ ] Exportacao completa em formato portavel (JSON + ZIP)
  - [ ] Exclusao permanente (direito ao esquecimento)
  - [ ] Retificacao de informacoes incorretas
  - [ ] Portabilidade para outros sistemas de saude
  - [ ] Relatorio de acessos nos ultimos 12 meses

## Arquivos a Criar/Modificar
- `backend/models/audit_log_model.py` - Modelo de auditoria
- `backend/routes/audit_routes.py` - Rotas de auditoria
- `backend/services/audit_service.py` - Servico de auditoria
- `backend/config/compliance_policy.py` - Politicas de conformidade
- `frontend/screens/AuditLogScreen.js` - Tela de auditoria

## Referencias
- Especificacao tecnica: Secao 7.6 - Conformidade e auditoria
- [LGPD](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [HIPAA](https://www.hhs.gov/hipaa/index.html)
- [ISO 27001](https://www.iso.org/isoiec-27001-information-security.html)

## Prioridade
🟡 Media
