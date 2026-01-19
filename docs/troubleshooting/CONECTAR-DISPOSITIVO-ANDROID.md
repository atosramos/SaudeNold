# 📱 Como Conectar Dispositivo Android para Depuração

## ✅ Pré-requisitos

1. **Cabo USB** conectando o dispositivo ao computador
2. **Modo Desenvolvedor** ativado no dispositivo
3. **Depuração USB** ativada

## 🔧 Passo a Passo

### 1. Ativar Modo Desenvolvedor

1. Abrir **Configurações** no dispositivo Android
2. Ir em **Sobre o telefone** (ou **Sobre o dispositivo**)
3. Encontrar **Número da compilação** (ou **Build number**)
4. **Tocar 7 vezes** no número da compilação
5. Aparecerá a mensagem: "Você agora é um desenvolvedor!"

### 2. Ativar Depuração USB

1. Voltar para **Configurações**
2. Ir em **Opções do desenvolvedor** (ou **Developer options**)
3. Ativar **Depuração USB** (ou **USB debugging**)
4. Confirmar o aviso de segurança (se aparecer)

### 3. Conectar ao Computador

1. **Conectar o cabo USB** ao dispositivo e ao computador
2. No dispositivo, aparecerá um popup: **"Permitir depuração USB?"**
3. Marcar **"Sempre permitir deste computador"**
4. Tocar em **"Permitir"** ou **"OK"**

### 4. Verificar Conexão

Execute no PowerShell:

```powershell
cd SaudeNold
.\scripts\utils\instalar-app.ps1 -Action install
```

Ou diretamente:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

**Resultado esperado:**
```
List of devices attached
ABC123XYZ    device
```

Se aparecer `unauthorized`, você precisa autorizar no dispositivo (passo 3).

## 🐛 Problemas Comuns

### Dispositivo não aparece

**Solução 1: Verificar drivers USB**
- Windows pode precisar instalar drivers do dispositivo
- Conectar o dispositivo e verificar no Gerenciador de Dispositivos
- Se aparecer como "Dispositivo desconhecido", instalar drivers do fabricante

**Solução 2: Tentar outro cabo USB**
- Alguns cabos são apenas para carregamento
- Usar cabo de dados USB

**Solução 3: Reiniciar ADB**
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" kill-server
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" start-server
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

### Aparece "unauthorized"

1. **Desconectar e reconectar** o cabo USB
2. **Autorizar novamente** no popup do dispositivo
3. Marcar **"Sempre permitir deste computador"**

### Aparece "offline"

1. **Desativar e reativar** a depuração USB no dispositivo
2. **Reiniciar o ADB** (comandos acima)
3. **Reconectar** o dispositivo

### Windows não reconhece o dispositivo

1. **Instalar drivers do fabricante:**
   - Samsung: Samsung USB Driver
   - Xiaomi: Mi USB Driver
   - Outros: Verificar site do fabricante

2. **Ou usar modo PTP:**
   - No dispositivo, quando conectar USB, escolher **PTP** ou **Transferência de arquivos**
   - Não usar **Apenas carregamento**

## 📋 Checklist Rápido

Antes de tentar instalar o app, verifique:

- [ ] Modo desenvolvedor ativado
- [ ] Depuração USB ativada
- [ ] Dispositivo conectado via USB
- [ ] Popup de autorização aceito
- [ ] `adb devices` mostra o dispositivo como `device` (não `unauthorized` ou `offline`)

## 🔗 Comandos Úteis

```powershell
# Ver dispositivos conectados
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices

# Reiniciar servidor ADB
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" kill-server
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" start-server

# Verificar se dispositivo está autorizado
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices -l
```

## 💡 Dica: Usar Wi-Fi (Avançado)

Se preferir não usar cabo USB, você pode usar Wi-Fi:

1. **Conectar via USB primeiro** (uma vez)
2. **Autorizar depuração USB**
3. **Obter IP do dispositivo:**
   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" tcpip 5555
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" connect <IP_DO_DISPOSITIVO>:5555
   ```
4. **Desconectar USB** - agora funciona via Wi-Fi!

Para encontrar o IP: **Configurações → Sobre o telefone → Status → Endereço IP**
