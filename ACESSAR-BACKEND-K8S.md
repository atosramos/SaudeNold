# Como Acessar o Backend no Kubernetes

## 🔍 Situação Atual

O backend está rodando no Kubernetes na **porta 8000**, mas como o Service é do tipo `ClusterIP`, ele só é acessível **dentro do cluster**.

## ✅ Soluções

### Opção 1: Port Forward (Recomendado para Desenvolvimento)

A porta continua sendo **8000**, mas você precisa fazer port-forward:

```bash
kubectl port-forward -n saudenold svc/backend 8000:8000
```

Depois disso, acesse: `http://localhost:8000`

**Vantagens:**
- ✅ Mantém a porta 8000
- ✅ Não precisa mudar código
- ✅ Mais seguro (só você acessa)

**Desvantagens:**
- ❌ Precisa manter o comando rodando em um terminal

### Opção 2: Mudar para NodePort (Porta Fixa Externa)

Se quiser uma porta externa fixa sem precisar do port-forward, podemos mudar o Service para NodePort. Isso exporia uma porta no nó (ex: 30080).

### Opção 3: Usar LoadBalancer (Se disponível)

Apenas se seu cluster suportar LoadBalancer (ex: cloud providers).

## 🚀 Como Usar Agora (Port Forward)

```bash
# 1. Fazer port-forward em um terminal (deixe rodando)
kubectl port-forward -n saudenold svc/backend 8000:8000

# 2. Em outro terminal, rodar o app
cd SaudeNold
npm start
```

O app está configurado para usar `http://localhost:8000`, então funcionará normalmente.

## 📝 Para Verificar

```bash
# Ver qual porta o service está usando
kubectl get svc backend -n saudenold

# Testar se está acessível (com port-forward rodando)
curl http://localhost:8000/health
```

## 💡 Dica

Crie um alias ou script para facilitar:

```bash
# No PowerShell, adicione ao perfil:
function k8s-backend {
    kubectl port-forward -n saudenold svc/backend 8000:8000
}
```




















