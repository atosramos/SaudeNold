# Integração com Google Pay - SaudeNold

## 📋 Visão Geral

Este documento descreve a integração do Google Pay para compra de licenças PRO no aplicativo SaudeNold.

## 🔐 Sistema de Chaves de Licença Melhorado

### Formato Novo (Seguro)

**Formato:** `PRO` + 42 caracteres alfanuméricos (total: 45 caracteres)
**Exemplo:** `PRO1M1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456`

**Características:**
- Sem hífens ou máscaras (facilita digitação)
- Assinatura digital HMAC-SHA256
- Validação no servidor
- Impossível de falsificar sem a chave secreta do servidor

### Estrutura da Chave

```
PRO + [Tipo 2 chars] + [Timestamp 8 chars] + [Random 16 chars] + [User 4 chars] + [Signature 12 chars]
```

- **Tipo:** `1M` (1 mês), `6M` (6 meses), `1Y` (1 ano)
- **Timestamp:** Últimos 8 dígitos do timestamp de geração
- **Random:** 16 caracteres hexadecimais aleatórios
- **User:** Hash do ID do usuário (4 chars) - opcional
- **Signature:** HMAC-SHA256 dos dados anteriores (12 chars)

### Geração de Chaves

As chaves são geradas no servidor usando `proLicenseGenerator.js`:

```javascript
import { generateLicenseKey } from './services/proLicenseGenerator';

// Gerar chave de 1 mês
const key = generateLicenseKey('1_month', userId, SECRET_KEY);
```

**IMPORTANTE:** A chave secreta (`SECRET_KEY`) deve ser mantida em segredo no servidor e nunca exposta no cliente.

## 💳 Integração com Google Pay

### Status Atual

A estrutura básica está implementada, mas a integração real com Google Pay ainda precisa ser completada. Atualmente:

1. ✅ Interface de compra implementada
2. ✅ Verificação de disponibilidade do Google Pay
3. ✅ Estrutura de produtos definida
4. ⏳ Integração real com Google Pay API (pendente)

### Produtos Disponíveis

| Tipo | Preço | Duração |
|------|-------|---------|
| 1 Mês | R$ 9,90 | 30 dias |
| 6 Meses | R$ 49,90 | 180 dias |
| 1 Ano | R$ 89,90 | 365 dias |

### Fluxo de Compra

1. **Usuário clica em "Comprar"**
   - Sistema verifica disponibilidade do Google Pay
   - Mostra interface de pagamento

2. **Processamento do Pagamento**
   - Google Pay processa o pagamento
   - Servidor recebe confirmação
   - Servidor gera chave de licença segura

3. **Ativação Automática**
   - Chave é enviada ao cliente
   - Licença é ativada automaticamente
   - Usuário recebe confirmação

### Implementação Futura

Para completar a integração, será necessário:

1. **Instalar biblioteca do Google Pay:**
   ```bash
   npm install @react-native-google-pay/google-pay
   # ou
   npm install react-native-purchases
   ```

2. **Configurar Google Play Console:**
   - Criar produtos in-app
   - Configurar assinaturas
   - Obter chaves de API

3. **Implementar no servidor:**
   - Endpoint para processar pagamentos
   - Webhook para receber confirmações do Google
   - Geração automática de chaves após pagamento

4. **Atualizar `googlePay.js`:**
   - Implementar chamadas reais à API do Google Pay
   - Processar respostas de pagamento
   - Integrar com backend

## 🔒 Segurança

### Validação de Chaves

1. **No Cliente (Básico):**
   - Verificação de formato
   - Extração de tipo
   - Validação básica de estrutura

2. **No Servidor (Completo):**
   - Verificação de assinatura HMAC-SHA256
   - Validação de timestamp
   - Verificação de duplicação
   - Rastreamento de uso

### Boas Práticas

1. **Nunca expor SECRET_KEY no cliente**
2. **Sempre validar chaves no servidor**
3. **Usar HTTPS para todas as comunicações**
4. **Implementar rate limiting**
5. **Logar tentativas de validação suspeitas**

## 📱 Interface do Usuário

### Tela de Licença PRO

- **Status da Licença:** Mostra se está ativa ou inativa
- **Ativação Manual:** Campo para inserir chave (sem máscaras)
- **Comprar via Google Pay:** Botões para cada tipo de licença
- **Informações:** Preços e durações

### Melhorias de UX

- ✅ Remoção automática de espaços e hífens
- ✅ Conversão automática para maiúsculas
- ✅ Limite de 45 caracteres
- ✅ Feedback visual durante compra

## 🧪 Testes

### Chaves de Teste (Desenvolvimento)

Para desenvolvimento, ainda é possível usar chaves no formato antigo:
- `PRO-1M01-ABCD-EFGH-IJKL` (1 mês)
- `PRO-6M01-ABCD-EFGH-IJKL` (6 meses)
- `PRO-1Y01-ABCD-EFGH-IJKL` (1 ano)

**Nota:** Em produção, apenas chaves geradas no servidor serão aceitas.

### Testar Geração de Chaves

```javascript
// No servidor
import { generateLicenseKey, validateGeneratedLicenseKey } from './services/proLicenseGenerator';

const SECRET_KEY = process.env.LICENSE_SECRET_KEY;
const key = generateLicenseKey('1_month', null, SECRET_KEY);
console.log('Chave gerada:', key);

// Validar
const validation = validateGeneratedLicenseKey(key, SECRET_KEY);
console.log('Validação:', validation);
```

## 📝 Próximos Passos

1. ✅ Implementar sistema de chaves seguro
2. ✅ Criar interface de compra
3. ⏳ Completar integração com Google Pay API
4. ⏳ Implementar backend para processar pagamentos
5. ⏳ Configurar produtos no Google Play Console
6. ⏳ Implementar webhooks para confirmação
7. ⏳ Adicionar analytics de vendas

## 🔗 Referências

- [Google Pay API Documentation](https://developers.google.com/pay/api)
- [React Native Google Pay](https://github.com/react-native-google-pay/google-pay)
- [HMAC-SHA256](https://en.wikipedia.org/wiki/HMAC)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)

---

**Última atualização:** Janeiro 2025
