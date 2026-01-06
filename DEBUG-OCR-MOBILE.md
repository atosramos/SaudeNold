# 🔍 Como Debugar Problemas de OCR no Mobile

## 📱 Problema Atual

O OCR está falhando no mobile após 2 tentativas, mas funciona no browser.

## 🛠️ Opções para Ver Logs

### Opção 1: Script PowerShell (Mais Fácil)

```powershell
cd C:\Users\lucia\Projetos\Saude\SaudeNold
.\view-logs.ps1
```

**Requisitos:**
- Celular conectado via USB
- Depuração USB ativada
- App rodando no celular

### Opção 2: Expo Dev Tools

```powershell
cd C:\Users\lucia\Projetos\Saude\SaudeNold
npx expo start
```

Depois:
1. Pressione `a` para abrir no Android
2. Os logs aparecerão no terminal automaticamente

### Opção 3: ADB Logcat Direto

```powershell
adb logcat | Select-String "SaudeNold|OCR|Gemini|processExam"
```

## 🔍 O Que Procurar nos Logs

### Logs Importantes:

1. **Verificação da Chave Gemini:**
   ```
   🔍 Verificando chave Gemini... {hasKey: true/false, ...}
   ```

2. **Tentativa Gemini Direct:**
   ```
   🚀 Tentando Gemini Direct (processamento direto do arquivo)...
   ```

3. **Leitura do Arquivo:**
   ```
   📖 Lendo arquivo do sistema de arquivos...
   ✅ Arquivo lido, tamanho base64: XXXX
   ```

4. **Tentativa OCR:**
   ```
   📄 Iniciando OCR online...
   📤 Enviando para OCR...
   ```

5. **Erros:**
   ```
   ❌ Erro no OCR: ...
   ❌ Stack trace: ...
   ```

## 🐛 Problemas Comuns e Soluções

### 1. Chave Gemini Não Disponível

**Sintoma:** Log mostra `hasKey: false`

**Solução:**
- A chave precisa estar configurada no EAS Build
- Já foi configurada com: `eas secret:create`
- Se ainda não funcionar, pode precisar fazer um novo build

### 2. Arquivo Não Lido

**Sintoma:** Log mostra `Arquivo lido está vazio` ou `Arquivo não encontrado`

**Solução:**
- Verificar se o arquivo foi selecionado corretamente
- Tentar com outro PDF
- Verificar permissões de armazenamento no Android

### 3. Erro de Conexão

**Sintoma:** Log mostra `Erro na API OCR: 429` ou `network error`

**Solução:**
- Verificar conexão com internet
- Pode ser rate limit do OCR.space (aguardar alguns minutos)
- Tentar novamente

### 4. Erro de Formato

**Sintoma:** Log mostra `Arquivo inválido` ou `formato não suportado`

**Solução:**
- Verificar se o PDF não está corrompido
- Tentar com outro PDF
- Converter PDF para imagem e tentar

## 📊 Informações de Debug no App

O app agora mostra informações de debug na mensagem de erro:

- Plataforma (android/ios)
- Tipo de arquivo (pdf/image)
- URI do arquivo (primeiros 50 caracteres)
- Mensagem de erro detalhada

## 🚀 Próximos Passos

1. **Execute o script de logs:**
   ```powershell
   .\view-logs.ps1
   ```

2. **Processe um PDF no celular**

3. **Copie os logs que aparecerem**

4. **Envie os logs para análise**

## 💡 Solução Temporária

Se o OCR continuar falhando:

- Use o browser para processar PDFs (funciona perfeitamente)
- Ou insira os dados manualmente (o app permite isso)

## 📝 Checklist de Debug

- [ ] Celular conectado via USB
- [ ] Depuração USB ativada
- [ ] Script de logs executado
- [ ] PDF processado no app
- [ ] Logs copiados
- [ ] Chave Gemini verificada nos logs
- [ ] Erro específico identificado

