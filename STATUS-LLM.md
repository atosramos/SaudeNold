# Status das LLMs - Extração de Dados

## Situação Atual

### ❌ **NÃO está sendo enviado para Gemini ou outras LLMs**

**Motivos:**

1. **Browser**: LLM desabilitada por CORS
   - Log mostra: `⚠️ Browser detectado: LLM desabilitada (CORS). Usando método tradicional.`
   - **Status**: Funcionando como esperado (usa regex)

2. **Mobile**: LLMs implementadas mas não funcionando
   - **Gemini**: Retorna `null` diretamente (não implementada completamente)
   - **Hugging Face**: Implementada, mas pode ter problemas de CORS no mobile também
   - **OpenRouter**: Retorna `null` (não implementada)

## Implementação Atual

### ✅ Hugging Face (Implementada)
- **Status**: Implementada
- **Chave**: Não requer
- **Problema**: Pode ter CORS no mobile também
- **Modelo**: `mistralai/Mistral-7B-Instruct-v0.2`

### ❌ Gemini (Não Implementada)
- **Status**: Retorna `null` diretamente
- **Chave**: Requer (mas tem tier gratuito)
- **Problema**: Função não implementada

### ❌ OpenRouter (Não Implementada)
- **Status**: Retorna `null` diretamente
- **Chave**: Depende do modelo
- **Problema**: Função não implementada

### ✅ Groq (Implementada, mas requer chave)
- **Status**: Implementada
- **Chave**: Requer (tier gratuito generoso)
- **Problema**: Não está sendo chamada (precisa de chave)

## Como Ativar LLMs

### Opção 1: Gemini (Recomendado)

1. Obter chave gratuita: https://makersuite.google.com/app/apikey
2. Adicionar no arquivo `.env` ou variável de ambiente:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=sua-chave-aqui
   ```
3. Reiniciar o app

### Opção 2: Groq (Mais Rápido)

1. Obter chave gratuita: https://console.groq.com/
2. Adicionar no arquivo `.env`:
   ```
   EXPO_PUBLIC_GROQ_API_KEY=sua-chave-aqui
   ```
3. Reiniciar o app

### Opção 3: Hugging Face (Gratuita, mas pode ter CORS)

- Já implementada
- Não requer chave
- Pode falhar por CORS no mobile

## Logs para Verificar

Quando processar um exame no **mobile**, você deve ver:

```
Tentando extrair dados com LLM...
Tentando LLMs disponíveis... {hasGeminiKey: false, hasGroqKey: false, platform: 'android'}
Tentando extrair dados usando Hugging Face...
⚠️ LLM falhou: [erro]
❌ Todas as LLMs falharam, usando método tradicional
```

Se tiver chave configurada:
```
Tentando LLMs disponíveis... {hasGeminiKey: true, hasGroqKey: false, platform: 'android'}
Tentando extrair dados usando Google Gemini...
✅ Gemini extraiu X parâmetros
```

## Conclusão

**Atualmente, NENHUMA LLM está sendo usada efetivamente:**
- Browser: Desabilitada (CORS)
- Mobile: Tentando Hugging Face, mas provavelmente falhando por CORS também

**Para usar LLM de verdade:**
1. Obter chave do Gemini ou Groq (gratuitas)
2. Configurar variável de ambiente
3. Reiniciar app


