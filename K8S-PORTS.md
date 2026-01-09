# Portas no Kubernetes - SaudeNold

## 📊 Status Atual

Você tem **duas formas** de acessar o backend no Kubernetes:

### 1. Via Port Forward (Recomendado para desenvolvimento)

```bash
kubectl port-forward -n saudenold svc/backend 8000:8000
```

**URL:** `http://localhost:8000`

Esta é a forma mais simples para desenvolvimento. O `app.json` já está configurado para usar `http://localhost:8000`.

### 2. Via Ingress (Porta 80)

Você tem um Ingress configurado:
- **Host:** `saudenold-backend.local`
- **Porta:** 80 (HTTP)
- **URL:** `http://saudenold-backend.local`

**Para usar o Ingress, você precisa:**

1. Adicionar ao arquivo hosts:
   ```
   127.0.0.1  saudenold-backend.local
   ```

2. Atualizar o `app.json` para usar:
   ```json
   "apiUrl": "http://saudenold-backend.local"
   ```

## 🔧 Soluções

### Solução 1: Usar Port Forward (Mais fácil)

Mantenha o port-forward rodando e use `localhost:8000`:

```bash
# Em um terminal, deixe rodando:
kubectl port-forward -n saudenold svc/backend 8000:8000
```

O app já está configurado para isso.

### Solução 2: Expor via NodePort

Se quiser uma porta fixa sem precisar do port-forward, podemos mudar o Service para NodePort.

### Solução 3: Usar Ingress

Atualizar o app para usar o Ingress e adicionar ao hosts.

## 📝 Verificar Porta Atual

```bash
# Ver serviços
kubectl get svc -n saudenold

# Ver Ingress
kubectl get ingress -n saudenold

# Ver qual porta está exposta no Ingress
kubectl get ingress backend-ingress -n saudenold -o yaml
```




















