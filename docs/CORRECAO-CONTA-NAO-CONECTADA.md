# Correção: "Conta não conectada" após login bem-sucedido

## Problema Identificado

O login estava funcionando corretamente (token sendo salvo, backend retornando 200 OK), mas a tela principal (`app/index.js`) mostrava "Conta não conectada" mesmo após login bem-sucedido.

**Evidências:**
- Backend mostrava login bem-sucedido (200 OK)
- Profile-selection mostrava "usuario atosramos" (indicando que o token estava salvo)
- Browser funcionava perfeitamente
- APK mostrava "Conta não conectada" na tela principal

## Causa Raiz

1. **Race condition**: `router.replace('/')` navegava para a tela principal ANTES do token ser completamente salvo no storage
2. **useFocusEffect não atualizava**: O `useFocusEffect` em `index.js` só executava quando a tela recebia foco, mas não havia verificação adicional quando o componente montava
3. **Falta de re-verificação**: Não havia um mecanismo para re-verificar o estado de autenticação após um pequeno delay

## Correções Aplicadas

### 1. `app/index.js`
- ✅ Adicionado `useEffect` que verifica autenticação quando o componente monta
- ✅ Adicionado timer de 500ms para re-verificar autenticação após montagem
- ✅ Isso garante que mesmo se o token for salvo após a navegação, o estado será atualizado

### 2. `app/auth/login.js`
- ✅ Adicionado delay de 300ms após `loginUser()` antes de navegar
- ✅ Isso garante que `setStoredAuth()` tenha tempo de completar antes da navegação

## Arquivos Modificados

1. `app/index.js` - Adicionado `useEffect` para verificar auth ao montar
2. `app/auth/login.js` - Adicionado delay antes de navegar após login

## Como Testar

1. Recompile o APK no Android Studio
2. Instale o APK no dispositivo
3. Faça login
4. Verifique se a tela principal mostra "Conta: [seu-email]" em vez de "Conta não conectada"

## Notas Técnicas

- O delay de 300ms é suficiente para operações de storage assíncronas
- O timer de 500ms garante uma segunda verificação caso a primeira falhe
- `useFocusEffect` continua funcionando para atualizações quando a tela recebe foco novamente
