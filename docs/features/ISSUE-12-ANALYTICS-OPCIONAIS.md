# Issue #12: Analytics Opcionais - Google Analytics e LogRocket

## Resumo

Implementada estrutura completa para Google Analytics e LogRocket no frontend, com tracking de eventos importantes do sistema.

## Google Analytics

### Configuracao

1. **Adicionar script no HTML (quando disponivel):**
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

2. **Configurar variavel de ambiente:**
```env
EXPO_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Eventos Rastreados

- `license_activated` - Quando uma licenca e ativada
- `purchase` - Quando uma compra e realizada
- `license_validation` - Quando uma licenca e validada
- `error` - Quando ocorre um erro
- `pro_feature_used` - Quando uma feature PRO e usada

## LogRocket

### Configuracao

1. **Instalar dependencia (quando necessario):**
```bash
npm install logrocket
```

2. **Configurar variavel de ambiente:**
```env
EXPO_PUBLIC_LOGROCKET_APP_ID=seu-app-id
```

3. **Adicionar script no HTML (quando disponivel):**
```html
<script src="https://cdn.logrocket.io/LogRocket.min.js"></script>
<script>window.LogRocket && window.LogRocket.init('seu-app-id');</script>
```

### Funcionalidades

- **Gravacao de sessoes** - Grava interacoes do usuario
- **Replay de sessoes** - Permite ver exatamente o que o usuario fez
- **Tracking de eventos** - Eventos customizados
- **Identificacao de usuarios** - Associar sessoes a usuarios

## Servico de Analytics

### Arquivo: `services/analytics.js`

Servico centralizado que gerencia:
- Inicializacao do Google Analytics
- Inicializacao do LogRocket
- Tracking de eventos
- Identificacao de usuarios

### Funcoes Disponiveis

```javascript
import {
  initGoogleAnalytics,
  initLogRocket,
  trackEvent,
  logRocketTrack,
  identifyUser,
  trackLicenseActivation,
  trackPurchase,
  trackLicenseValidation,
  trackError,
  trackProFeatureUsage
} from '../services/analytics';

// Inicializar (ja feito no _layout.js)
initGoogleAnalytics();
initLogRocket();

// Rastrear eventos
trackEvent('custom_event', { param1: 'value1' });
logRocketTrack('Custom Event', { param1: 'value1' });

// Identificar usuario
identifyUser('user-123', { name: 'Joao', email: 'joao@exemplo.com' });

// Eventos especificos
trackLicenseActivation('1_month', 'user-123');
trackPurchase('1_month', 9.90, 'BRL');
trackLicenseValidation(true);
trackError('Erro ao processar', { context: 'payment' });
trackProFeatureUsage('gemini_medical_exam_extraction');
```

## Eventos Implementados

### 1. Ativacao de Licenca
**Local:** `services/proLicense.js`
- Rastreia quando uma licenca e ativada com sucesso
- Inclui tipo de licenca e device ID

### 2. Compra
**Local:** `services/googlePay.js`
- Rastreia compras bem-sucedidas
- Inclui tipo de licenca, valor e moeda

### 3. Validacao de Licenca
**Local:** `services/proLicense.js`
- Rastreia tentativas de validacao
- Inclui sucesso/falha e tipo de erro

### 4. Erros
**Local:** `services/proLicense.js`, `services/googlePay.js`
- Rastreia erros importantes
- Inclui mensagem de erro e contexto

### 5. Uso de Features PRO
**Local:** `app/medical-exams/new.js`, `app/daily-tracking/new.js`
- Rastreia quando features PRO sao usadas
- Inclui nome da feature

## Integracao no App

### Inicializacao Automatica

O analytics e inicializado automaticamente no `app/_layout.js` quando o app inicia.

### Tracking Automatico

Os eventos sao rastreados automaticamente em:
- Ativacao de licencas
- Compras
- Validacoes
- Erros
- Uso de features PRO

## Configuracao de Variaveis de Ambiente

### Frontend (.env ou app.json)

```env
# Google Analytics
EXPO_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# LogRocket
EXPO_PUBLIC_LOGROCKET_APP_ID=seu-app-id
```

### app.json

```json
{
  "expo": {
    "extra": {
      "gaMeasurementId": "G-XXXXXXXXXX",
      "logRocketAppId": "seu-app-id"
    }
  }
}
```

## Próximos Passos

### Quando Google Play Console Estiver Ativo:

1. **Configurar Google Analytics:**
   - Criar propriedade no Google Analytics
   - Obter Measurement ID
   - Adicionar script no HTML (se web)
   - Configurar eventos de conversao

2. **Configurar LogRocket:**
   - Criar conta no LogRocket
   - Obter App ID
   - Adicionar script no HTML (se web)
   - Configurar filtros e alertas

3. **Testar Tracking:**
   - Verificar eventos no Google Analytics
   - Verificar sessoes no LogRocket
   - Validar que todos os eventos estao sendo rastreados

## Arquivos Criados/Modificados

- ✅ `services/analytics.js` - Servico completo de analytics
- ✅ `app/_layout.js` - Inicializacao automatica
- ✅ `services/proLicense.js` - Tracking de ativacoes e validacoes
- ✅ `services/googlePay.js` - Tracking de compras
- ✅ `app/medical-exams/new.js` - Tracking de uso de feature PRO
- ✅ `app/daily-tracking/new.js` - Tracking de uso de feature PRO
- ✅ `docs/features/ISSUE-12-ANALYTICS-OPCIONAIS.md` - Esta documentacao

## Status

**Implementado:**
- ✅ Estrutura completa de analytics
- ✅ Servico centralizado
- ✅ Tracking de eventos principais
- ✅ Integracao automatica no app
- ✅ Suporte a Google Analytics e LogRocket

**Pendente (requer Google Play Console):**
- ⏳ Configuracao real do Google Analytics
- ⏳ Configuracao real do LogRocket
- ⏳ Testes com eventos reais

**Nota:** A estrutura esta completa e pronta. Quando o Google Play Console estiver ativo, basta configurar as variaveis de ambiente e os scripts HTML (se aplicavel).
