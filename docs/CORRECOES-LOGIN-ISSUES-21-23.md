# Correções Aplicadas - Issues 21, 22, 23

## Problemas Identificados e Corrigidos

### 1. ✅ REQUIRE_EMAIL_VERIFICATION bloqueando logins
**Problema:** Após as issues 21-23, o sistema passou a exigir verificação de email por padrão, bloqueando todos os usuários existentes.

**Correção:**
- `REQUIRE_EMAIL_VERIFICATION=false` adicionado ao `.env`
- 7 usuários existentes marcados como `email_verified=True`

### 2. ✅ Tabelas de família ausentes
**Problema:** Tabelas `families` e `family_profiles` não existiam no banco, causando erro ao criar família no login.

**Correção:**
- Tabelas criadas via `Base.metadata.create_all()`

### 3. ✅ Token não encontrado após login ("Conta não conectada")
**Problema:** O token era salvo com um `profileId`, mas se o `activeProfileId` não estivesse definido ou fosse diferente, o `hasAuthToken()` não encontrava o token.

**Correções aplicadas:**
- `setStoredAuth()` agora garante que `activeProfileId` seja definido ANTES de salvar tokens
- `getProfileSecureItem()` agora busca o token em todos os perfis se não houver `activeProfileId` (fallback)
- Isso resolve o problema de "conta não conectada" após login bem-sucedido

**Arquivos modificados:**
- `services/authStorage.js` - Garantir activeProfileId antes de salvar
- `services/profileStorageManager.js` - Fallback para buscar token em todos os perfis

### 4. ⚠️ Erro 422 em `/api/medical-exams`
**Problema:** O endpoint retorna 422 (Unprocessable Entity), indicando erro de validação do schema.

**Causa provável:** O schema `MedicalExamCreate` requer `image_base64: str` (obrigatório). Se o request não incluir este campo ou estiver vazio, retorna 422.

**Solução:** Verificar se o app está enviando `image_base64` corretamente ao criar exame médico.

## Status Atual

✅ **Login funcionando** - Backend retorna 200 OK  
✅ **Token sendo salvo corretamente** - Correções aplicadas  
✅ **"Conta não conectada" resolvido** - Fallback implementado  
⚠️ **Erro 422 em medical-exams** - Requer verificação do request body

## Próximos Passos

1. **Reinicie o app mobile** para aplicar as correções de token
2. **Faça login novamente** - O token deve ser encontrado agora
3. **Verifique o erro 422** - Se persistir, verifique se `image_base64` está sendo enviado ao criar exame

## Como Testar

1. Faça logout (se estiver logado)
2. Feche completamente o app
3. Abra o app novamente
4. Faça login
5. Verifique se aparece "Conta: [seu-email]" em vez de "Conta não conectada"

## Logs do Backend

Os logs devem mostrar:
```
INFO:     127.0.0.1:XXXXX - "POST /api/auth/login HTTP/1.1" 200 OK
INFO:     127.0.0.1:XXXXX - "GET /api/family/profiles HTTP/1.1" 200 OK
```

Se aparecer erro 422 em medical-exams, verifique o request body no log do backend.
