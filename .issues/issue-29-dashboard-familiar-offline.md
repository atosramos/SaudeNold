## Objetivo
Implementar dashboard familiar com visao consolidada e suporte offline com sincronizacao inteligente.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Dashboard deve usar dados locais e sincronizar quando possível.

## Tarefas
- [ ] Dashboard familiar
  - [ ] Lembretes de medicacao de todos os perfis
  - [ ] Agenda de consultas da familia
  - [ ] Alertas importantes (vacinas vencendo, exames pendentes)
  - [ ] Filtros por perfil e por tipo de alerta
- [ ] Sincronizacao e modo offline
  - [ ] Sincronizacao em tempo real para dados criticos
  - [ ] Modo offline funcional com fila de sincronizacao
  - [ ] Resolucao de conflitos ao voltar online
  - [ ] Indicador visual de status de atualizacao dos dados
  - [ ] Politica de cache por perfil

## Arquivos a Criar/Modificar
- `frontend/screens/FamilyDashboardScreen.js` - Dashboard familiar
- `frontend/components/FamilyAlertsPanel.js` - Painel de alertas
- `frontend/services/syncService.js` - Sincronizacao e offline
- `backend/routes/dashboard_routes.py` - Dados agregados do dashboard
- `backend/services/dashboard_service.py` - Agregacao de dados

## Referencias
- Especificacao tecnica: Secao 5 - Recursos de usabilidade

## Prioridade
🟡 Media
