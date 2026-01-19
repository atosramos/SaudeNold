# 🛒 Issue #9: Integração Google Pay no App React Native

## 📋 Estratégia de Implementação

### ✅ O que podemos fazer AGORA (sem Issue #8 completa):

1. **Instalar biblioteca de pagamentos**
   - `react-native-iap` (Google Play Billing direto)
   - Ou `react-native-purchases` (RevenueCat - mais fácil)

2. **Implementar código de integração**
   - Função de compra
   - Verificação de compras pendentes
   - Sincronização com backend

3. **Testar com ambiente sandbox**
   - Google Play permite testar sem produtos reais
   - Usar contas de teste

4. **Conectar com backend**
   - Backend já está pronto (Issue #7)
   - Endpoints funcionando

### ⏳ O que precisa da Issue #8:

1. **Produtos criados no Google Play Console**
   - IDs: `pro_1_month`, `pro_6_months`, `pro_1_year`
   - Necessário para testes reais

2. **Service Account configurada**
   - Necessário apenas para validação server-side
   - Pode ser feito depois

## 🚀 Plano de Implementação

### Opção 1: react-native-iap (Recomendado para Google Play direto)

**Vantagens:**
- ✅ Integração direta com Google Play Billing
- ✅ Não requer serviço externo
- ✅ Controle total

**Desvantagens:**
- ❌ Mais código para gerenciar
- ❌ Precisa lidar com validação server-side

### Opção 2: react-native-purchases (RevenueCat)

**Vantagens:**
- ✅ Mais fácil de implementar
- ✅ Gerencia validação server-side
- ✅ Dashboard para gerenciar produtos

**Desvantagens:**
- ❌ Requer conta no RevenueCat
- ❌ Serviço externo (pode ter custos)

## 📝 Decisão: Usar react-native-iap

Vamos usar `react-native-iap` porque:
1. Não requer serviço externo
2. Integração direta com Google Play
3. Backend já está pronto para validar

## 🔧 Passos de Implementação

1. Instalar `react-native-iap`
2. Configurar permissões no `app.json`
3. Atualizar `services/googlePay.js`
4. Atualizar `app/pro-license.js`
5. Implementar verificação de compras pendentes
6. Testar com ambiente sandbox

## 🧪 Testes

- Testar compra com conta de teste
- Verificar se webhook recebe notificação
- Verificar se licença é ativada automaticamente
- Testar restauração de compras
