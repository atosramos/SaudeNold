# Como Testar LLM no Browser

## ✅ Configuração

1. **Criar arquivo `.env` na raiz do projeto `SaudeNold/`:**

```env
EXPO_PUBLIC_GEMINI_API_KEY=sua-chave-gemini-aqui
EXPO_PUBLIC_GROQ_API_KEY=sua-chave-groq-aqui
```

2. **Reiniciar o servidor Expo:**
   - Pare o servidor atual (Ctrl+C)
   - Execute: `npm start` ou `npx expo start`
   - Pressione `w` para abrir no browser

## 🧪 Como Testar

### 1. Abrir Console do Browser
- Pressione `F12` ou `Ctrl+Shift+I`
- Vá para a aba "Console"

### 2. Processar um Exame
1. Vá para "Exames Médicos" → "Adicionar Novo"
2. Selecione um PDF ou imagem
3. Clique em "Processar Exame"

### 3. Verificar Logs

**Se a chave estiver configurada corretamente, você verá:**

```
🔍 Tentando LLMs disponíveis... {hasGeminiKey: true, hasGroqKey: false, platform: 'web', ...}
🚀 Tentando Gemini...
Tentando extrair dados usando Google Gemini...
✅ Gemini extraiu X parâmetros
```

**Se a chave NÃO estiver configurada:**

```
🔍 Tentando LLMs disponíveis... {hasGeminiKey: false, hasGroqKey: false, platform: 'web', ...}
❌ Todas as LLMs falharam, usando método tradicional
LLM não retornou dados suficientes, usando método tradicional (regex)...
```

## 🔧 Troubleshooting

### Problema: Chave não está sendo lida

**Solução:**
1. Verifique se o arquivo `.env` está na raiz de `SaudeNold/`
2. Verifique se a variável começa com `EXPO_PUBLIC_`
3. **Reinicie o servidor Expo** (importante!)
4. Verifique no console se `hasGeminiKey: true`

### Problema: Erro de CORS

**Solução:**
- Gemini e Groq funcionam no browser (têm CORS habilitado)
- Se der erro de CORS, pode ser problema de rede/firewall

### Problema: LLM não está sendo chamada

**Verifique:**
1. Console mostra `hasGeminiKey: true`?
2. Console mostra `🚀 Tentando Gemini...`?
3. Há algum erro após essa mensagem?

## 📝 Exemplo de Logs Esperados

### ✅ Sucesso (com chave):
```
🔍 Tentando LLMs disponíveis... {hasGeminiKey: true, ...}
🚀 Tentando Gemini...
Tentando extrair dados usando Google Gemini...
✅ Gemini extraiu 8 parâmetros
✅ LLM extraiu 8 parâmetros (ignorou dados irrelevantes)
```

### ❌ Sem chave:
```
🔍 Tentando LLMs disponíveis... {hasGeminiKey: false, ...}
❌ Todas as LLMs falharam, usando método tradicional
LLM não retornou dados suficientes, usando método tradicional (regex)...
Extraídos 6 parâmetros do texto OCR
```

## 🎯 Próximos Passos

Se funcionar, você verá que a LLM:
- ✅ Ignora telefones, endereços, CPF, RG
- ✅ Extrai apenas dados médicos relevantes
- ✅ Retorna dados mais precisos que regex


