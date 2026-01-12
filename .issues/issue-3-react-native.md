## Objetivo
Completar integração do Google Pay no aplicativo React Native para permitir compra de licenças PRO diretamente no app.

## Tarefas
- [ ] Instalar biblioteca de pagamentos (`react-native-purchases` ou `react-native-iap`)
- [ ] Atualizar `services/googlePay.js` com integração real
- [ ] Configurar RevenueCat (recomendado) ou Google Play Billing direto
- [ ] Implementar inicialização do serviço de pagamentos
- [ ] Implementar função de compra real (`purchaseLicenseWithGooglePay`)
- [ ] Implementar verificação de compras pendentes
- [ ] Sincronizar compras com servidor backend
- [ ] Ativar licenças automaticamente após compra confirmada
- [ ] Configurar variáveis de ambiente do app
- [ ] Testar fluxo completo de compra

## Arquivos a Modificar
- `services/googlePay.js`
- `app/pro-license.js`
- `.env` (variáveis de ambiente)

## Referências
- Ver documentação em: `docs/features/PRODUCAO-CHAVES-PRO-GOOGLE-PAY.md`
- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [React Native Purchases](https://github.com/RevenueCat/react-native-purchases)

## Prioridade
🔴 Alta (MVP)
