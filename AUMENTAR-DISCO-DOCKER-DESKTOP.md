# 🔧 Como Aumentar o Tamanho do Disco do Docker Desktop

## 🔴 Problema Identificado

O disco virtual do Docker Desktop está com apenas **129.3MB**, o que é extremamente pequeno e está causando o problema de DiskPressure.

### Evidências:
- ✅ Disco do host: 779GB livres
- ❌ Disco virtual do Docker Desktop: 129.3MB (muito pequeno!)
- ❌ Volume Docker usando 240.4GB (não cabe no disco virtual)
- ❌ Kubelet detectando DiskPressure constantemente

## 📊 Tamanho Atual

- **Disco principal (docker_data.vhdx)**: 833.49GB ✅
- **Disco secundário (ext4.vhdx)**: 0.09GB (90MB) ❌ **MUITO PEQUENO!**
- **Volume Docker usando**: 240.4GB
- **Espaço disponível no disco raiz (/):** 129.3MB ❌ **MUITO PEQUENO!**

### Problema Identificado

O disco secundário (`ext4.vhdx`) está com apenas 90MB, o que é extremamente pequeno. O sistema de arquivos raiz (`/`) do Docker Desktop está usando esse disco pequeno, causando o DiskPressure mesmo com o disco principal tendo 833GB.

## ✅ Solução: Aumentar o Disco do Docker Desktop

### Método 1: Através da Interface do Docker Desktop (Recomendado)

1. **Abrir Docker Desktop**
2. **Ir em Settings** (ícone de engrenagem no canto superior direito)
3. **Selecionar "Resources"** no menu lateral
4. **Clicar em "Advanced"**
5. **Verificar "Disk image size"** ou "Virtual disk limit"
6. **Aumentar para pelo menos 100GB** (recomendado: 200GB ou mais)
7. **Clicar em "Apply & Restart"**
8. **Aguardar o Docker Desktop reiniciar** (pode levar alguns minutos)

### Método 2: Através de Arquivo de Configuração

Se o Docker Desktop não tiver a opção na interface, você pode editar manualmente:

1. **Fechar Docker Desktop completamente**
2. **Localizar o arquivo de configuração**:
   - Windows: `%LOCALAPPDATA%\Docker\settings.json`
   - Ou: `C:\Users\<seu-usuario>\AppData\Local\Docker\settings.json`

3. **Editar o arquivo** (se existir):
   ```json
   {
     "diskSizeGB": 200,
     "diskSizeMiB": 204800
   }
   ```

4. **Abrir Docker Desktop novamente**

### Método 3: Aumentar o Disco WSL do Docker Desktop (ext4.vhdx)

O disco secundário `ext4.vhdx` está muito pequeno (90MB). Para aumentá-lo:

1. **Fechar Docker Desktop completamente**

2. **Parar todas as distribuições WSL**:
   ```powershell
   wsl --shutdown
   ```

3. **Localizar e aumentar o disco ext4.vhdx**:
   ```powershell
   # Localizar o arquivo ext4.vhdx
   $ext4Disk = Get-Item "$env:LOCALAPPDATA\Docker\wsl\main\ext4.vhdx"
   
   # Aumentar para 50GB (ajuste conforme necessário)
   # Nota: Isso requer o Hyper-V PowerShell module
   Resize-VHD -Path $ext4Disk.FullName -SizeBytes 50GB
   ```

4. **Abrir Docker Desktop novamente**

**⚠️ ATENÇÃO:** Este método requer permissões de administrador e pode não estar disponível em todas as versões do Windows.

## 📋 Tamanho Recomendado

Para o seu caso específico:
- **Disco principal (docker_data.vhdx)**: Já tem 833GB ✅ (suficiente)
- **Disco secundário (ext4.vhdx)**: Precisa ser aumentado de 90MB para **pelo menos 10GB** (recomendado: 20-50GB)
- **Volume Docker atual**: 240.4GB (cabe no disco principal)

## ⚠️ Importante

1. **Fazer backup** antes de aumentar o disco (se possível)
2. **Fechar Docker Desktop** antes de fazer alterações
3. **Aguardar alguns minutos** após aumentar o disco para o Docker Desktop processar
4. **Verificar após reiniciar**:
   ```powershell
   wsl -d docker-desktop df -h /
   kubectl describe node docker-desktop | Select-String "ephemeral-storage"
   ```

## 🔍 Verificar Após Aumentar

Após aumentar o disco, verifique:

```powershell
# Verificar espaço no WSL do Docker Desktop
wsl -d docker-desktop df -h /

# Verificar capacidade do nó Kubernetes
kubectl describe node docker-desktop | Select-String "ephemeral-storage"

# Verificar se DiskPressure foi resolvido
kubectl describe node docker-desktop | Select-String "DiskPressure"

# Verificar pods
kubectl get pods -n saudenold
```

## 🎯 Próximos Passos

1. **Aumentar o disco do Docker Desktop** para 300-500GB
2. **Reiniciar Docker Desktop**
3. **Aguardar Kubernetes inicializar**
4. **Verificar se DiskPressure foi resolvido**
5. **Os pods devem iniciar automaticamente**

---

**Status:** Disco virtual muito pequeno (129.3MB) é a causa raiz do problema. Aumentar para 300-500GB deve resolver o DiskPressure.

