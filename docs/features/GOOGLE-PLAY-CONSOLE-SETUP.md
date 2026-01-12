# 🎮 Guia Completo: Configurar Google Play Console para Licenças PRO

## 📋 Pré-requisitos

1. Conta Google (Gmail)
2. Conta de desenvolvedor no Google Play Console (taxa única de $25 USD)
3. Aplicativo publicado ou em teste no Google Play Console
4. Acesso ao Google Cloud Console

## 🚀 Passo 1: Criar Conta de Desenvolvedor

### 1.1 Acessar Google Play Console
1. Acesse: https://play.google.com/console
2. Faça login com sua conta Google
3. Se ainda não tiver conta de desenvolvedor:
   - Clique em "Criar conta de desenvolvedor"
   - Aceite os termos
   - Pague a taxa única de $25 USD
   - Aguarde aprovação (geralmente instantânea)

### 1.2 Criar ou Selecionar App
1. No dashboard, clique em "Criar app" ou selecione o app existente
2. Preencha:
   - **Nome do app**: SaudeNold
   - **Idioma padrão**: Português (Brasil)
   - **Tipo de app**: App
   - **Gratuito ou pago**: Gratuito (com compras in-app)

## 💰 Passo 2: Configurar Conta de Pagamento

### 2.1 Configurar Informações Fiscais
1. Vá em **Configurações** → **Conta de desenvolvedor**
2. Preencha:
   - Informações fiscais (CPF/CNPJ)
   - Endereço fiscal
   - Informações bancárias (para recebimento)

### 2.2 Aceitar Termos de Pagamento
1. Vá em **Monetização** → **Produtos e assinaturas**
2. Aceite os termos de serviço de pagamentos
3. Configure impostos (se aplicável)

## 🛍️ Passo 3: Criar Produtos In-App

### 3.1 Acessar Produtos In-App
1. No menu lateral, vá em **Monetização** → **Produtos e assinaturas**
2. Clique em **Produtos in-app**
3. Clique em **Criar produto**

### 3.2 Criar Produto: PRO 1 Mês

**ID do produto**: `pro_1_month`
- Este ID será usado no código do app

**Nome do produto**: `Licença PRO - 1 Mês`
- Nome exibido ao usuário

**Descrição**: `Acesso completo às funcionalidades PRO por 1 mês, incluindo leitura automática com Gemini AI para exames médicos e acompanhamento diário.`

**Preço**: R$ 9,90
- Configure o preço na moeda local (BRL)

**Status**: Ativo

### 3.3 Criar Produto: PRO 6 Meses

**ID do produto**: `pro_6_months`

**Nome do produto**: `Licença PRO - 6 Meses`

**Descrição**: `Acesso completo às funcionalidades PRO por 6 meses, incluindo leitura automática com Gemini AI para exames médicos e acompanhamento diário. Economia de 17% em relação ao plano mensal.`

**Preço**: R$ 49,90

**Status**: Ativo

### 3.4 Criar Produto: PRO 1 Ano

**ID do produto**: `pro_1_year`

**Nome do produto**: `Licença PRO - 1 Ano`

**Descrição**: `Acesso completo às funcionalidades PRO por 1 ano, incluindo leitura automática com Gemini AI para exames médicos e acompanhamento diário. Economia de 25% em relação ao plano mensal.`

**Preço**: R$ 89,90

**Status**: Ativo

## 🔐 Passo 4: Configurar Google Cloud Service Account

### 4.1 Acessar Google Cloud Console
1. Acesse: https://console.cloud.google.com
2. Selecione ou crie um projeto
3. Vá em **IAM e administração** → **Contas de serviço**

### 4.2 Criar Service Account
1. Clique em **Criar conta de serviço**
2. Preencha:
   - **Nome**: `saudenold-play-billing`
   - **ID**: `saudenold-play-billing`
   - **Descrição**: `Service account para Google Play Billing API`
3. Clique em **Criar e continuar**

### 4.3 Conceder Permissões
1. Na seção **Conceder acesso a este projeto**, adicione:
   - **Função**: `Editor` (ou `Service Account User`)
2. Clique em **Continuar** → **Concluído**

### 4.4 Criar e Baixar Chave JSON
1. Clique na conta de serviço criada
2. Vá na aba **Chaves**
3. Clique em **Adicionar chave** → **Criar nova chave**
4. Selecione **JSON**
5. Baixe o arquivo JSON (guardar com segurança!)

### 4.5 Vincular Service Account ao Google Play
1. Volte ao Google Play Console
2. Vá em **Configurações** → **Acesso à API**
3. Clique em **Criar novo projeto** ou selecione projeto existente
4. Em **Contas de serviço**, clique em **Conceder acesso**
5. Cole o email da service account (formato: `saudenold-play-billing@projeto.iam.gserviceaccount.com`)
6. Marque as permissões:
   - ✅ Ver informações financeiras
   - ✅ Responder a compras in-app
   - ✅ Gerenciar compras in-app
7. Clique em **Enviar convite** → **Aceitar convite**

## 🔗 Passo 5: Configurar OAuth 2.0

### 5.1 Habilitar APIs Necessárias
1. No Google Cloud Console, vá em **APIs e serviços** → **Biblioteca**
2. Procure e habilite:
   - **Google Play Android Developer API**
   - **Google Play Billing API**

### 5.2 Configurar Tela de Consentimento OAuth
1. Vá em **APIs e serviços** → **Tela de consentimento OAuth**
2. Selecione **Externo** (para desenvolvimento)
3. Preencha:
   - **Nome do app**: SaudeNold
   - **Email de suporte**: seu-email@exemplo.com
   - **Logo**: (opcional)
4. Adicione escopos:
   - `https://www.googleapis.com/auth/androidpublisher`
5. Salve e continue

## 📡 Passo 6: Configurar Webhook (Real-time Developer Notifications)

### 6.1 Obter URL do Webhook
O webhook deve ser acessível publicamente via HTTPS:
```
https://seu-backend.com/api/webhook/google-pay
```

### 6.2 Configurar no Google Play Console
1. Vá em **Monetização** → **Produtos e assinaturas**
2. Clique em **Configurações**
3. Em **Notificações em tempo real do desenvolvedor**, clique em **Configurar**
4. Cole a URL do webhook
5. Clique em **Salvar**

### 6.3 Testar Webhook
1. Use a ferramenta de teste do Google Play Console
2. Ou use o ambiente de teste (sandbox) para testar compras

## 🧪 Passo 7: Configurar Ambiente de Teste

### 7.1 Adicionar Contas de Teste
1. Vá em **Configurações** → **Contas de teste**
2. Adicione emails de contas Google que podem testar compras sem cobrança
3. Essas contas receberão emails de teste do Google Play

### 7.2 Testar Compra
1. Instale o app em um dispositivo de teste
2. Faça login com uma conta de teste
3. Tente comprar uma licença PRO
4. Verifique se o webhook recebe a notificação

## 📝 Passo 8: Obter Credenciais para o Backend

### 8.1 Variáveis de Ambiente Necessárias

Crie um arquivo `.env` no backend com:

```env
# Google Play Billing
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=/caminho/para/service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.atosramos.SaudeNold

# Ou se preferir variáveis individuais:
GOOGLE_PLAY_CLIENT_EMAIL=saudenold-play-billing@projeto.iam.gserviceaccount.com
GOOGLE_PLAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PLAY_PROJECT_ID=seu-projeto-id

# Webhook
GOOGLE_PAY_WEBHOOK_URL=https://seu-backend.com/api/webhook/google-pay
GOOGLE_PAY_WEBHOOK_SECRET=sua-chave-secreta-para-validar-webhooks
```

### 8.2 Mapeamento de Produtos

No código do backend, mapeie os IDs dos produtos:

```python
PRODUCT_ID_TO_LICENSE_TYPE = {
    "pro_1_month": "1_month",
    "pro_6_months": "6_months",
    "pro_1_year": "1_year",
}

LICENSE_TYPE_TO_PRICE = {
    "1_month": 9.90,
    "6_months": 49.90,
    "1_year": 89.90,
}
```

## ✅ Checklist Final

- [ ] Conta de desenvolvedor criada e paga
- [ ] App criado no Google Play Console
- [ ] Conta de pagamento configurada
- [ ] 3 produtos in-app criados (pro_1_month, pro_6_months, pro_1_year)
- [ ] Service Account criada no Google Cloud
- [ ] Chave JSON baixada e segura
- [ ] Service Account vinculada ao Google Play Console
- [ ] APIs habilitadas no Google Cloud
- [ ] OAuth 2.0 configurado
- [ ] Webhook configurado no Google Play Console
- [ ] Contas de teste adicionadas
- [ ] Teste de compra realizado com sucesso
- [ ] Credenciais configuradas no backend

## 🔒 Segurança

⚠️ **IMPORTANTE:**
- Nunca commite o arquivo JSON da service account no Git
- Use variáveis de ambiente ou secrets do Kubernetes
- Mantenha as chaves privadas seguras
- Revise permissões regularmente
- Use HTTPS obrigatório para webhooks

## 📚 Referências

- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Real-time Developer Notifications](https://developer.android.com/google/play/billing/rtdn-reference)

## 🆘 Troubleshooting

### Erro: "Service account não tem permissão"
- Verifique se a service account foi vinculada ao Google Play Console
- Verifique se as permissões corretas foram concedidas

### Erro: "Produto não encontrado"
- Verifique se o ID do produto está correto
- Verifique se o produto está ativo no Google Play Console

### Webhook não recebe notificações
- Verifique se a URL está acessível publicamente
- Verifique se está usando HTTPS
- Verifique os logs do backend
