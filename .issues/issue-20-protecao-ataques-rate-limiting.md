## Objetivo
Implementar proteções contra ataques comuns, incluindo rate limiting para prevenir brute force e outros ataques automatizados.

## Contexto Atual
Backend opcional para app mobile offline-first. Proteções devem focar endpoints expostos quando houver sincronização online.

## Tarefas
- [x] Configurar Redis para rate limiting
  - [x] Instalar e configurar Redis
  - [x] Conectar backend ao Redis
  - [x] Criar cliente Redis reutilizável
- [x] Implementar rate limiting no login
  - [x] Decorator `@rate_limit` para limitar tentativas
  - [x] Máximo de 5 tentativas por IP em 15 minutos
  - [x] Armazenar contador no Redis com TTL
  - [x] Retornar erro 429 quando limite excedido
  - [x] Incluir tempo de espera na mensagem de erro
  - [x] Resetar contador após login bem-sucedido
  - [x] Bloqueio temporário de login após 5 tentativas incorretas (15 minutos)
- [x] Implementar rate limiting em outros endpoints críticos
  - [x] Cadastro de usuário (3 tentativas por IP/hora)
  - [x] Recuperação de senha (3 tentativas por email/hora) ✅ Implementado
  - [ ] Verificação de 2FA (5 tentativas por usuário/15 minutos) - 2FA não implementado (fora do escopo)
  - [x] Envio de emails (10 emails por usuário/dia) ✅ Implementado
- [x] Implementar proteção contra CSRF
  - [x] Gerar tokens CSRF para formulários
  - [x] Validar tokens em requisições POST/PUT/DELETE
  - [x] Middleware de validação CSRF
- [x] Implementar validação de entrada
  - [x] Sanitização de inputs ✅ `utils/validation.py`
  - [x] Validação de tipos e formatos ✅ Pydantic + validação customizada
  - [x] Limitar tamanho de payloads ✅ `ValidationMiddleware`
  - [x] Proteção contra SQL injection (usar ORM)
  - [x] Proteção contra XSS (sanitizar outputs) ✅ `sanitize_html()`
- [x] Implementar logging de tentativas suspeitas
  - [x] Registrar tentativas de login falhadas
  - [x] Registrar quando rate limit é excedido
  - [x] Alertar administradores sobre atividade suspeita
  - [x] Incluir IP, user-agent, timestamp nos logs

## Arquivos a Criar/Modificar
- ✅ `backend/services/rate_limit_service.py` - Serviço de rate limiting por email/usuário
- ✅ `backend/middleware/validation_middleware.py` - Middleware de validação de payloads
- ✅ `backend/utils/validation.py` - Utilitários de validação e sanitização
- ✅ `backend/config/redis_config.py` - Configuração do Redis
- ✅ `backend/main.py` - Endpoints atualizados com rate limiting por email e limite diário de emails

## Variáveis de Ambiente
- `REDIS_HOST` - Host do Redis ✅
- `REDIS_PORT` - Porta do Redis ✅
- `REDIS_PASSWORD` - Senha do Redis (se necessário) ✅

## Referências
- Especificação técnica: Seção 1.3 - Proteção Contra Ataques
- [Redis documentation](https://redis.io/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Prioridade
🔴 Alta (MVP)
