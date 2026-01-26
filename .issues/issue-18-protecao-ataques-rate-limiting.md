## Objetivo
Implementar proteções contra ataques comuns, incluindo rate limiting para prevenir brute force e outros ataques automatizados.

## Contexto Atual
Backend opcional para app mobile offline-first. Proteções devem focar endpoints expostos quando houver sincronização online.

## Tarefas
- [ ] Configurar Redis para rate limiting
  - [ ] Instalar e configurar Redis
  - [ ] Conectar backend ao Redis
  - [ ] Criar cliente Redis reutilizável
- [ ] Implementar rate limiting no login
  - [ ] Decorator `@rate_limit` para limitar tentativas
  - [ ] Máximo de 5 tentativas por IP em 15 minutos
  - [ ] Armazenar contador no Redis com TTL
  - [ ] Retornar erro 429 quando limite excedido
  - [ ] Incluir tempo de espera na mensagem de erro
  - [ ] Resetar contador após login bem-sucedido
  - [ ] Bloqueio temporário de login após 5 tentativas incorretas (15 minutos)
- [ ] Implementar rate limiting em outros endpoints críticos
  - [ ] Cadastro de usuário (3 tentativas por IP/hora)
  - [ ] Recuperação de senha (3 tentativas por email/hora)
  - [ ] Verificação de 2FA (5 tentativas por usuário/15 minutos)
  - [ ] Envio de emails (10 emails por usuário/dia)
- [ ] Implementar proteção contra CSRF
  - [ ] Gerar tokens CSRF para formulários
  - [ ] Validar tokens em requisições POST/PUT/DELETE
  - [ ] Middleware de validação CSRF
- [ ] Implementar validação de entrada
  - [ ] Sanitização de inputs
  - [ ] Validação de tipos e formatos
  - [ ] Limitar tamanho de payloads
  - [ ] Proteção contra SQL injection (usar ORM)
  - [ ] Proteção contra XSS (sanitizar outputs)
- [ ] Implementar logging de tentativas suspeitas
  - [ ] Registrar tentativas de login falhadas
  - [ ] Registrar quando rate limit é excedido
  - [ ] Alertar administradores sobre atividade suspeita
  - [ ] Incluir IP, user-agent, timestamp nos logs

## Arquivos a Criar/Modificar
- `backend/services/rate_limit_service.py` - Serviço de rate limiting
- `backend/middleware/rate_limit_middleware.py` - Middleware de rate limiting
- `backend/middleware/security_middleware.py` - Middleware de segurança
- `backend/utils/validation.py` - Utilitários de validação
- `backend/config/redis_config.py` - Configuração do Redis

## Variáveis de Ambiente
- `REDIS_HOST` - Host do Redis
- `REDIS_PORT` - Porta do Redis
- `REDIS_PASSWORD` - Senha do Redis (se necessário)

## Referências
- Especificação técnica: Seção 1.3 - Proteção Contra Ataques
- [Redis documentation](https://redis.io/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Prioridade
🔴 Alta (MVP)
