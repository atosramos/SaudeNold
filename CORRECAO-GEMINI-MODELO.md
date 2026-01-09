# Correção: Modelo Gemini

## Problema
O modelo `gemini-pro` não está mais disponível na API v1beta do Gemini.

**Erro:**
```
404 (Not Found)
"models/gemini-pro is not found for API version v1beta"
```

## Solução
Atualizado para usar `gemini-1.5-flash` que é:
- ✅ Mais rápido
- ✅ Gratuito
- ✅ Disponível na API v1beta

## Modelos Disponíveis

### `gemini-1.5-flash` (Recomendado)
- Mais rápido
- Gratuito
- Boa qualidade para extração de dados

### `gemini-1.5-pro` (Alternativa)
- Mais preciso
- Mais lento
- Pode ter limites de rate

## Teste
Agora deve funcionar corretamente no browser!


