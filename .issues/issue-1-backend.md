## Objetivo
Criar servidor backend para gerenciar licenças PRO, validação de chaves e integração com Google Pay.

## Tarefas
- [ ] Criar servidor Node.js/Express (ou framework preferido)
- [ ] Configurar HTTPS obrigatório
- [ ] Implementar autenticação de API (JWT ou API Keys)
- [ ] Configurar variáveis de ambiente seguras
- [ ] Implementar endpoint `POST /api/validate-license`
- [ ] Implementar endpoint `POST /api/generate-license`
- [ ] Implementar endpoint `POST /api/purchase-status/:purchaseId`
- [ ] Implementar endpoint `POST /api/webhook/google-pay`
- [ ] Criar tabela `licenses` no banco de dados
- [ ] Criar tabela `purchases` no banco de dados
- [ ] Configurar variáveis de ambiente (LICENSE_SECRET_KEY, etc.)

## Referências
- Ver documentação em: `docs/features/PRODUCAO-CHAVES-PRO-GOOGLE-PAY.md`
- Código de exemplo em: `services/proLicenseGenerator.js`

## Prioridade
🔴 Alta (MVP)
