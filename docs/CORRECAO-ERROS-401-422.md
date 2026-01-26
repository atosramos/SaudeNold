# Correção: Erros 401 e 422

## Erros Identificados

### 1. ❌ 401 Unauthorized em `/api/family/profiles`
**Problema:** O endpoint retornava 401 mesmo com token válido.

**Causa:**
- O endpoint não estava usando `verify_api_key` que valida a sessão do usuário
- Estava usando apenas `get_user_from_token` que não verifica se há sessão ativa
- O `verify_api_key` verifica se há uma sessão válida no banco (linhas 261-268)

**Correção:**
- ✅ Endpoint agora usa `verify_api_key` para validação completa
- ✅ Usa `get_request_user` que funciona com `verify_api_key`
- ✅ Adicionado rate limiting `@limiter.limit("100/minute")`

### 2. ⚠️ 422 Unprocessable Entity em `/api/medical-exams`
**Problema:** O endpoint retorna 422 ao criar exame médico.

**Causa:**
- O schema `MedicalExamCreate` requer `image_base64: str` (obrigatório)
- Se o campo estiver ausente, vazio ou inválido, retorna 422

**Possíveis causas:**
1. Campo `image_base64` não está sendo enviado no request
2. Campo está vazio (`""`)
3. Campo não é uma string válida
4. Validação de tamanho falhando (max 10MB)

**Solução:**
- Verificar se o app está enviando `image_base64` corretamente
- Verificar se o valor não está vazio
- Verificar se o tamanho da imagem não excede 10MB

## Arquivos Modificados

1. `backend/main.py` - Endpoint `/api/family/profiles` agora usa `verify_api_key`

## Como Testar

### Teste 1: Family Profiles
1. Faça login no app
2. Acesse a tela de familiares
3. Verifique se os perfis são carregados sem erro 401

### Teste 2: Medical Exams
1. Tente criar um exame médico
2. Verifique se `image_base64` está sendo enviado
3. Verifique logs do backend para ver o erro específico de validação

## Notas Técnicas

- O `verify_api_key` valida:
  - Token JWT válido
  - Sessão ativa no banco
  - Sessão não bloqueada
  - Profile ID (se fornecido) pertence à família do usuário

- O erro 422 em medical-exams é um erro de validação do Pydantic, não de autenticação
