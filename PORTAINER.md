# 🐳 Portainer - Gerenciamento de Containers

## 📋 Informações

O Portainer foi instalado no namespace `portainer` para gerenciar containers Docker e Kubernetes via interface web.

## 🔍 Status da Instalação

```powershell
# Ver status do Portainer
kubectl get pods -n portainer

# Ver serviços
kubectl get svc -n portainer
```

## 🌐 Acesso ao Portainer

### Opção 1: Port Forward (Recomendado)

```powershell
# Iniciar port-forward (porta 9000 - HTTP)
kubectl port-forward -n portainer svc/portainer 9000:9000

# Ou usar a porta HTTPS (9443)
kubectl port-forward -n portainer svc/portainer 9443:9443
```

Depois acesse no navegador:
- **HTTP**: http://localhost:9000
- **HTTPS**: https://localhost:9443

### Opção 2: NodePort (após pod iniciar)

O Portainer está configurado como NodePort:
- **Porta 9000 (HTTP)**: NodePort `30777`
- **Porta 9443 (HTTPS)**: NodePort `30779`

Para acessar via NodePort, você precisa do IP do nó:
```powershell
# Obter IP do nó
kubectl get nodes -o wide

# Acessar: http://<IP-DO-NO>:30777
```

## 🔐 Primeiro Acesso

1. Acesse o Portainer pela primeira vez
2. Crie uma conta de administrador:
   - **Usuário**: (escolha um nome)
   - **Senha**: (escolha uma senha forte - mínimo 12 caracteres)
3. Selecione o ambiente:
   - **Docker**: Para gerenciar containers Docker diretamente
   - **Kubernetes**: Para gerenciar o cluster Kubernetes

## 📊 O Que Você Pode Fazer com Portainer

### Gerenciar Kubernetes:
- Ver e gerenciar pods, deployments, services
- Ver logs de pods
- Executar comandos em pods
- Gerenciar namespaces
- Ver uso de recursos

### Gerenciar Docker:
- Ver imagens, containers, volumes
- Executar containers
- Ver logs
- Gerenciar redes

## 🔧 Comandos Úteis

### Verificar Status
```powershell
# Ver pods do Portainer
kubectl get pods -n portainer

# Ver logs
kubectl logs -f -n portainer -l app=portainer

# Ver eventos
kubectl get events -n portainer --sort-by='.lastTimestamp'
```

### Reiniciar Portainer
```powershell
kubectl rollout restart deployment/portainer -n portainer
```

### Atualizar Portainer
```powershell
# Baixar manifestos atualizados
kubectl apply -n portainer -f https://raw.githubusercontent.com/portainer/k8s/master/deploy/manifests/portainer/portainer.yaml
```

### Remover Portainer
```powershell
kubectl delete namespace portainer
```

## ⚠️ Notas

1. **Disk Pressure**: Se o pod estiver em `Pending`, pode ser devido ao disk pressure do cluster. Resolva isso primeiro (veja `DISK-PRESSURE-FIX.md`).

2. **Storage Provisioner**: O PVC do Portainer depende do storage-provisioner funcionando. Se o provisioner estiver com erro, o PVC não será criado e o pod não iniciará.

3. **Persistent Storage**: O Portainer usa um PVC para armazenar dados. Os dados são persistidos mesmo se o pod for recriado.

3. **Segurança**: 
   - Use HTTPS (porta 9443) em produção
   - Mantenha o Portainer atualizado
   - Use senhas fortes

4. **Recursos**: O Portainer consome recursos do cluster. Em clusters pequenos, pode impactar performance.

## 📝 Troubleshooting

### Pod em Pending

O pod do Portainer pode ficar em Pending por dois motivos:

#### 1. Disk Pressure no Nó
```powershell
# Verificar disk pressure
kubectl get nodes -o json | ConvertFrom-Json | Select-Object -ExpandProperty items | Select-Object -ExpandProperty status | Select-Object -ExpandProperty conditions | Where-Object { $_.type -eq "DiskPressure" }

# Resolver disk pressure (veja DISK-PRESSURE-FIX.md)
```

#### 2. PVC Não Vinculado (Storage Provisioner com Problema)

Se o PVC estiver em Pending:
```powershell
# Verificar status do PVC
kubectl get pvc -n portainer

# Verificar storage provisioner
kubectl get pods -n kube-system | Select-String "storage-provisioner"

# Se o provisioner estiver em Error, reiniciar
kubectl delete pod -n kube-system -l app=storage-provisioner
```

**Nota**: O PVC do Portainer precisa que o storage-provisioner funcione. Se o provisioner estiver com erro, o PVC não será criado.

### Port-forward não funciona
```powershell
# Verificar se o serviço existe
kubectl get svc -n portainer

# Verificar se o pod está rodando
kubectl get pods -n portainer
```

### Esqueceu a senha
```powershell
# Deletar o deployment e recriar (perderá dados!)
kubectl delete deployment portainer -n portainer
kubectl apply -n portainer -f https://raw.githubusercontent.com/portainer/k8s/master/deploy/manifests/portainer/portainer.yaml
```

## 🔗 Links Úteis

- Documentação oficial: https://docs.portainer.io/
- GitHub: https://github.com/portainer/portainer


