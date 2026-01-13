# Issue #12: Sistema de Alertas e Sentry - Implementacao

## Resumo

Implementado sistema de alertas basico e preparada integracao com Sentry para monitoramento de erros.

## Sistema de Alertas

### Arquivo: `backend/alert_service.py`

Servico completo de alertas com suporte a:
- Logs em arquivo (`logs/alerts.log`)
- Webhooks (configuravel via `ALERT_WEBHOOK_URL`)
- Email (placeholder - pode ser implementado)
- Sentry (se configurado)

### Tipos de Alertas

1. **CRITICAL_ERROR** - Erros criticos do sistema
2. **FRAUD_ATTEMPT** - Tentativas de fraude detectadas
3. **PAYMENT_FAILURE** - Falhas em pagamentos
4. **RATE_LIMIT_EXCEEDED** - Rate limit excedido
5. **SUSPICIOUS_ACTIVITY** - Atividade suspeita
6. **LICENSE_EXPIRING** - Licencas proximas de expirar (futuro)
7. **SYSTEM_ERROR** - Erros gerais do sistema

### Metodos Disponiveis

```python
from alert_service import alert_service

# Erro critico
alert_service.alert_critical_error("Mensagem", error=exception)

# Tentativa de fraude
alert_service.alert_fraud_attempt("Mensagem", ip_address="1.2.3.4")

# Falha de pagamento
alert_service.alert_payment_failure(purchase_id="123", reason="Cartao recusado")

# Atividade suspeita
alert_service.alert_suspicious_activity("Mensagem", ip_address="1.2.3.4", count=5)

# Rate limit excedido
alert_service.alert_rate_limit_exceeded(ip_address="1.2.3.4", endpoint="/api/validate-license")
```

## Integracao com Sentry

### Configuracao

1. **Instalar dependencia:**
```bash
pip install sentry-sdk
```

2. **Configurar variavel de ambiente:**
```env
SENTRY_DSN=https://seu-dsn@sentry.io/projeto-id
ENVIRONMENT=production  # ou development, staging
```

3. **Sentry e configurado automaticamente** ao iniciar o backend se `SENTRY_DSN` estiver definido.

### Integracoes Ativas

- **FastApiIntegration** - Captura erros do FastAPI
- **SqlalchemyIntegration** - Captura erros do SQLAlchemy
- **Traces** - 10% das transacoes sao rastreadas

### Uso Manual

```python
import sentry_sdk

# Capturar excecao
try:
    # codigo
except Exception as e:
    sentry_sdk.capture_exception(e)

# Capturar mensagem
sentry_sdk.capture_message("Algo aconteceu", level="warning")

# Adicionar contexto
with sentry_sdk.push_scope() as scope:
    scope.set_tag("user_id", "123")
    scope.set_context("extra", {"key": "value"})
    sentry_sdk.capture_message("Mensagem com contexto")
```

## Alertas Implementados no Codigo

### 1. Atividade Suspeita
**Local:** `main.py` - Endpoint de validacao de licenca
- Dispara quando detecta multiplas tentativas falhas (>=5 em 15min)

### 2. Erros Criticos
**Local:** `main.py` - Endpoints de validacao e webhook
- Dispara quando ocorre excecao na validacao de licenca
- Dispara quando ocorre erro ao processar webhook do Google Pay

### 3. Falhas de Pagamento
**Local:** `main.py` - Webhook do Google Pay
- Dispara quando status de compra muda para 'failed'
- Dispara quando nova compra e criada com status 'failed'

## Configuracao de Variaveis de Ambiente

### Alertas

```env
# Webhook para alertas (opcional)
ALERT_WEBHOOK_URL=https://seu-webhook.com/alerts

# Email (opcional - nao implementado ainda)
ALERT_EMAIL_ENABLED=false
ALERT_EMAIL_TO=admin@exemplo.com

# Sentry
SENTRY_ENABLED=true
SENTRY_DSN=https://seu-dsn@sentry.io/projeto-id
```

## Logs de Alertas

Todos os alertas sao registrados em:
- **Arquivo:** `logs/alerts.log`
- **Formato:** Timestamp, tipo, severidade, mensagem, detalhes

Exemplo:
```
2024-01-15 10:30:00 - alerts - WARNING - [suspicious_activity] Multiplas tentativas falhas | Details: {'ip_address': '1.2.3.4', 'attempt_count': 5}
```

## Próximos Passos

### Implementar Agora:
- [ ] Envio de email via SMTP
- [ ] Dashboard web para visualizar alertas
- [ ] Alertas para licencas proximas de expirar
- [ ] Alertas para rate limit excedido (ja detectado, falta alerta)

### Futuro:
- [ ] Integracao com Slack/Discord
- [ ] Alertas via SMS (Twilio)
- [ ] Dashboard de alertas em tempo real

## Arquivos Criados/Modificados

- ✅ `backend/alert_service.py` - Servico completo de alertas
- ✅ `backend/main.py` - Integracao de alertas nos endpoints
- ✅ `backend/requirements.txt` - Adicionado sentry-sdk e requests
- ✅ `docs/features/ISSUE-12-ALERTAS-SENTRY.md` - Esta documentacao

## Status

**Implementado:**
- ✅ Sistema de alertas basico
- ✅ Integracao com Sentry (configuracao)
- ✅ Alertas para atividade suspeita
- ✅ Alertas para erros criticos
- ✅ Alertas para falhas de pagamento
- ✅ Logs em arquivo

**Pendente:**
- ⏳ Envio de email (placeholder criado)
- ⏳ Dashboard web de alertas
- ⏳ Alertas para licencas expirando
