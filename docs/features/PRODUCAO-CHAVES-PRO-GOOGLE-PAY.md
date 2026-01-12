# Próximos Passos para Produção - Sistema de Licenças PRO e Google Pay

## 📋 Checklist Completo para Produção

### 🔐 1. Configuração do Servidor Backend

#### 1.1 Criar API Backend
- [ ] Criar servidor Node.js/Express ou usar framework preferido
- [ ] Configurar HTTPS obrigatório
- [ ] Implementar autenticação de API (JWT ou API Keys)
- [ ] Configurar variáveis de ambiente seguras

#### 1.2 Endpoints Necessários

**POST `/api/validate-license`**
```javascript
// Validar chave de licença
{
  "key": "PRO1M1234567890...",
  "deviceId": "unique-device-id"
}

// Resposta:
{
  "valid": true,
  "licenseType": "1_month",
  "expirationDate": "2025-02-15T00:00:00.000Z",
  "activatedAt": "2025-01-15T00:00:00.000Z"
}
```

**POST `/api/generate-license`** (apenas para administradores)
```javascript
// Gerar nova chave (após pagamento confirmado)
{
  "licenseType": "1_month",
  "userId": "user-id",
  "purchaseId": "google-pay-purchase-id"
}

// Resposta:
{
  "success": true,
  "licenseKey": "PRO1M1234567890...",
  "expirationDate": "2025-02-15T00:00:00.000Z"
}
```

**POST `/api/purchase-status/:purchaseId`**
```javascript
// Verificar status de compra
// Resposta:
{
  "status": "completed",
  "licenseKey": "PRO1M1234567890...",
  "purchaseDate": "2025-01-15T00:00:00.000Z"
}
```

**POST `/api/webhook/google-pay`**
```javascript
// Webhook para receber confirmações do Google Pay
// Processar pagamento e gerar chave automaticamente
```

#### 1.3 Configurar Variáveis de Ambiente no Servidor
```env
# .env do servidor
LICENSE_SECRET_KEY=seu-secret-key-super-seguro-aqui-minimo-32-caracteres
GOOGLE_PAY_MERCHANT_ID=seu-merchant-id
GOOGLE_PAY_API_KEY=sua-api-key
DATABASE_URL=sua-connection-string
JWT_SECRET=jwt-secret-key
```

#### 1.4 Implementar Banco de Dados
- [ ] Criar tabela `licenses`:
  ```sql
  CREATE TABLE licenses (
    id UUID PRIMARY KEY,
    license_key VARCHAR(45) UNIQUE NOT NULL,
    license_type VARCHAR(20) NOT NULL,
    user_id VARCHAR(255),
    device_id VARCHAR(255),
    purchase_id VARCHAR(255),
    activated_at TIMESTAMP NOT NULL,
    expiration_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  
  CREATE INDEX idx_license_key ON licenses(license_key);
  CREATE INDEX idx_user_id ON licenses(user_id);
  CREATE INDEX idx_expiration_date ON licenses(expiration_date);
  ```

- [ ] Criar tabela `purchases`:
  ```sql
  CREATE TABLE purchases (
    id UUID PRIMARY KEY,
    purchase_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255),
    license_type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    status VARCHAR(20) NOT NULL,
    google_pay_transaction_id VARCHAR(255),
    license_key VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```

---

### 💳 2. Configuração do Google Pay

#### 2.1 Google Play Console
- [ ] Criar conta de desenvolvedor no Google Play Console
- [ ] Configurar conta de pagamento
- [ ] Aceitar termos de serviço de pagamentos

#### 2.2 Criar Produtos In-App
1. Acessar: **Monetização > Produtos > Produtos in-app**
2. Criar 3 produtos:
   - **ID:** `pro_1_month`
     - Nome: "Licença PRO - 1 Mês"
     - Preço: R$ 9,90
     - Tipo: Produto consumível
   
   - **ID:** `pro_6_months`
     - Nome: "Licença PRO - 6 Meses"
     - Preço: R$ 49,90
     - Tipo: Produto consumível
   
   - **ID:** `pro_1_year`
     - Nome: "Licença PRO - 1 Ano"
     - Preço: R$ 89,90
     - Tipo: Produto consumível

#### 2.3 Obter Credenciais
- [ ] Obter **Service Account JSON** do Google Cloud
- [ ] Configurar **OAuth 2.0** para API
- [ ] Obter **Merchant ID** do Google Pay

#### 2.4 Configurar Webhooks
- [ ] Configurar URL de webhook no Google Play Console
- [ ] Implementar verificação de assinatura do webhook
- [ ] Testar recebimento de notificações

---

### 📱 3. Atualizar Aplicativo React Native

#### 3.1 Instalar Dependências
```bash
npm install react-native-purchases
# ou
npm install @react-native-google-pay/google-pay
```

#### 3.2 Configurar RevenueCat ou Google Play Billing
**Opção A: RevenueCat (Recomendado - mais fácil)**
```bash
npm install react-native-purchases
```

**Opção B: Google Play Billing Direto**
```bash
npm install react-native-iap
```

#### 3.3 Atualizar `services/googlePay.js`
```javascript
import Purchases from 'react-native-purchases';

// Inicializar RevenueCat
await Purchases.configure({
  apiKey: 'your-revenuecat-api-key',
});

// Comprar produto
const purchase = await Purchases.purchaseProduct('pro_1_month');
```

#### 3.4 Atualizar Variáveis de Ambiente do App
```env
# .env
EXPO_PUBLIC_API_URL=https://api.saudenold.com
EXPO_PUBLIC_REVENUECAT_API_KEY=sua-revenuecat-key
# ou
EXPO_PUBLIC_GOOGLE_PAY_MERCHANT_ID=seu-merchant-id
```

#### 3.5 Implementar Verificação de Receitas
- [ ] Verificar compras pendentes na inicialização
- [ ] Sincronizar com servidor
- [ ] Ativar licenças automaticamente

---

### 🔒 4. Segurança e Validação

#### 4.1 Implementar Rate Limiting
```javascript
// No servidor
const rateLimit = require('express-rate-limit');

const licenseValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10 // máximo 10 tentativas
});
```

#### 4.2 Implementar Logging e Monitoramento
- [ ] Logar todas as tentativas de validação
- [ ] Alertar sobre tentativas suspeitas
- [ ] Monitorar taxa de sucesso/falha

#### 4.3 Validação de Assinatura HMAC
```javascript
// No servidor - validar assinatura da chave
const crypto = require('crypto');

function validateLicenseSignature(key, secretKey) {
  // Extrair componentes
  const typeCode = key.substring(3, 5);
  const timestamp = key.substring(5, 13);
  const random = key.substring(13, 29);
  const user = key.substring(29, 33);
  const signature = key.substring(33, 45);
  
  // Reconstruir payload
  const payload = `${typeCode}${timestamp}${random}${user}`;
  
  // Calcular HMAC
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex').toUpperCase().substring(0, 12);
  
  // Comparação segura (timing-safe)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

#### 4.4 Verificar Duplicação de Chaves
- [ ] Verificar se chave já foi usada
- [ ] Limitar número de dispositivos por licença
- [ ] Implementar sistema de revogação

---

### 🧪 5. Testes

#### 5.1 Testes de Integração
- [ ] Testar geração de chaves no servidor
- [ ] Testar validação de chaves
- [ ] Testar fluxo completo de compra
- [ ] Testar webhooks do Google Pay

#### 5.2 Testes no Google Play Console
- [ ] Usar contas de teste
- [ ] Testar compras com cartões de teste
- [ ] Verificar recebimento de webhooks
- [ ] Testar cancelamentos e reembolsos

#### 5.3 Testes de Segurança
- [ ] Tentar falsificar chaves
- [ ] Testar rate limiting
- [ ] Verificar proteção contra SQL injection
- [ ] Testar validação de entrada

---

### 📊 6. Analytics e Monitoramento

#### 6.1 Implementar Analytics
- [ ] Rastrear ativações de licenças
- [ ] Rastrear compras realizadas
- [ ] Rastrear taxas de conversão
- [ ] Rastrear erros e falhas

#### 6.2 Dashboard de Monitoramento
- [ ] Criar dashboard para visualizar:
  - Licenças ativas
  - Compras realizadas
  - Receita gerada
  - Taxa de ativação
  - Erros comuns

---

### 📝 7. Documentação e Suporte

#### 7.1 Documentação Técnica
- [ ] Documentar API endpoints
- [ ] Criar guia de integração
- [ ] Documentar fluxo de pagamento
- [ ] Criar diagramas de arquitetura

#### 7.2 Documentação para Usuários
- [ ] Criar FAQ sobre licenças
- [ ] Guia de como ativar licença
- [ ] Guia de como comprar via Google Pay
- [ ] Política de reembolso

#### 7.3 Suporte
- [ ] Criar sistema de tickets
- [ ] Treinar equipe de suporte
- [ ] Criar respostas automáticas para problemas comuns

---

### 🚀 8. Deploy e Lançamento

#### 8.1 Preparação do Servidor
- [ ] Configurar servidor de produção
- [ ] Configurar SSL/HTTPS
- [ ] Configurar backup automático
- [ ] Configurar monitoramento (Sentry, LogRocket, etc.)

#### 8.2 Deploy do Backend
- [ ] Deploy da API
- [ ] Configurar variáveis de ambiente
- [ ] Testar endpoints em produção
- [ ] Configurar CI/CD

#### 8.3 Deploy do App
- [ ] Build de produção do app
- [ ] Upload para Google Play Console
- [ ] Configurar versão de teste (Internal Testing)
- [ ] Testar em dispositivos reais

#### 8.4 Lançamento Gradual
- [ ] Fase 1: Teste interno (10 usuários)
- [ ] Fase 2: Teste fechado (100 usuários)
- [ ] Fase 3: Lançamento gradual (10% → 50% → 100%)
- [ ] Monitorar métricas e erros

---

### 🔄 9. Manutenção Contínua

#### 9.1 Monitoramento Diário
- [ ] Verificar logs de erros
- [ ] Monitorar taxa de sucesso de pagamentos
- [ ] Verificar licenças expiradas
- [ ] Monitorar tentativas de fraude

#### 9.2 Atualizações
- [ ] Atualizar dependências regularmente
- [ ] Aplicar patches de segurança
- [ ] Melhorar baseado em feedback
- [ ] Adicionar novos recursos

#### 9.3 Backup e Recuperação
- [ ] Backup diário do banco de dados
- [ ] Testar restauração de backup
- [ ] Plano de recuperação de desastres
- [ ] Documentar procedimentos de emergência

---

## 📋 Checklist Rápido

### Prioridade Alta (MVP)
- [ ] Backend API básico funcionando
- [ ] Geração e validação de chaves
- [ ] Integração Google Pay básica
- [ ] Testes em ambiente de staging

### Prioridade Média
- [ ] Webhooks do Google Pay
- [ ] Dashboard de monitoramento
- [ ] Sistema de logs
- [ ] Documentação completa

### Prioridade Baixa (Melhorias)
- [ ] Analytics avançado
- [ ] Sistema de suporte
- [ ] Otimizações de performance
- [ ] Recursos adicionais

---

## 🔗 Recursos Úteis

### Documentação Oficial
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [React Native Purchases](https://github.com/RevenueCat/react-native-purchases)
- [HMAC-SHA256](https://nodejs.org/api/crypto.html#crypto_crypto_createhmac_algorithm_key_options)

### Ferramentas Recomendadas
- **RevenueCat**: Facilita integração de pagamentos
- **Sentry**: Monitoramento de erros
- **Postman**: Testar APIs
- **Google Play Console**: Gerenciar produtos

---

## ⚠️ Avisos Importantes

1. **Nunca exponha SECRET_KEY no cliente**
2. **Sempre use HTTPS em produção**
3. **Valide todas as entradas do usuário**
4. **Implemente rate limiting**
5. **Monitore tentativas de fraude**
6. **Faça backup regularmente**
7. **Teste extensivamente antes do lançamento**

---

**Última atualização:** Janeiro 2025
