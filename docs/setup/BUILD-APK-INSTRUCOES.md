# 📱 Instruções para Gerar o APK

## ⚠️ Situação Atual

O build local requer:
- ✅ Java JDK instalado
- ✅ Android SDK configurado
- ✅ Variáveis de ambiente (ANDROID_HOME, JAVA_HOME)

Como essas dependências não estão configuradas, vamos usar o **EAS Build na nuvem** (mais fácil e recomendado).

---

## 🚀 Opção 1: Script Automatizado (Recomendado)

Execute o script PowerShell que criei:

```powershell
cd C:\Users\lucia\Projetos\Saude\SaudeNold
.\build-apk.ps1
```

O script vai:
1. Verificar se EAS CLI está instalado
2. Verificar seu login
3. Configurar o projeto (se necessário)
4. Iniciar o build na nuvem
5. Fornecer link para download do APK

---

## 🔧 Opção 2: Manual (Passo a Passo)

### 1. Verificar Login EAS
```powershell
cd C:\Users\lucia\Projetos\Saude\SaudeNold
eas whoami
```

Se não estiver logado:
```powershell
eas login
```

### 2. Configurar Projeto (Primeira Vez)
```powershell
eas build:configure
```

Quando perguntado:
- ✅ **"Would you like to create a project?"** → Digite `y` e pressione Enter
- ✅ Aceite as configurações padrão

### 3. Gerar APK
```powershell
eas build --platform android --profile preview
```

### 4. Aguardar Build
- O build será feito na nuvem (15-20 minutos)
- Você verá o progresso no terminal
- Ao final, receberá um link para download

### 5. Baixar e Instalar
- Clique no link fornecido
- Baixe o arquivo `.apk`
- Transfira para o celular
- Ative "Fontes desconhecidas" nas configurações
- Instale o APK

---

## 🌐 Opção 3: Via Interface Web

1. Acesse: https://expo.dev
2. Faça login com sua conta (`atosramos`)
3. Vá em "Projects" → "SaudeNold"
4. Clique em "Builds" → "New Build"
5. Selecione:
   - Platform: **Android**
   - Profile: **preview**
   - Build Type: **APK**
6. Clique em "Build"
7. Aguarde e baixe quando estiver pronto

---

## 📋 Arquivos Criados

✅ `eas.json` - Configuração do EAS Build
✅ `build-apk.ps1` - Script automatizado
✅ `android/` - Projeto nativo (criado pelo prebuild)

---

## ⚡ Build Rápido (Se já configurado)

Se o projeto já estiver configurado, basta:

```powershell
cd C:\Users\lucia\Projetos\Saude\SaudeNold
eas build --platform android --profile preview
```

---

## 🆘 Troubleshooting

### Erro: "EAS project not configured"
Execute: `eas build:configure`

### Erro: "Not logged in"
Execute: `eas login`

### Erro: "Experience does not exist"
O projeto precisa ser criado. Execute `eas build:configure` e aceite criar o projeto.

### Build demora muito
Normal! Builds na nuvem levam 15-20 minutos na primeira vez.

---

## 📱 Após Gerar o APK

1. **Transferir para o celular:**
   - Via USB
   - Via email
   - Via nuvem (Google Drive, Dropbox, etc.)
   - Via WhatsApp

2. **Instalar:**
   - No Android: Configurações → Segurança → Ativar "Fontes desconhecidas"
   - Abrir o arquivo APK
   - Tocar em "Instalar"

3. **Testar:**
   - Abrir o app
   - Verificar se todas as funcionalidades estão funcionando

---

## 💡 Dica

Para builds futuros mais rápidos, você pode usar:
```powershell
eas build --platform android --profile preview --local
```

Mas isso requer Android SDK configurado localmente.

---

**Pronto! Execute o script `build-apk.ps1` ou siga os passos manuais acima.** 🚀









