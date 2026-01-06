# Setup Completo - SaudeNold com Docker e PostgreSQL

## ✅ O que foi implementado:

### 1. 🐳 Docker Compose
- PostgreSQL 15 (porta 5432)
- FastAPI Backend (porta 8000)
- Volumes persistentes para dados

### 2. 📦 Backend FastAPI
- API REST completa
- Modelos SQLAlchemy
- Schemas Pydantic
- Endpoints CRUD para todas as entidades

### 3. 💾 Solução Híbrida de Dados
- **AsyncStorage** (local) + **PostgreSQL** (servidor)
- Sincronização automática ao abrir o app
- Funciona offline (usa dados locais)
- Sincroniza quando backend disponível

### 4. 🔄 Serviços de Sincronização
- `services/api.js` - Cliente HTTP para API
- `services/sync.js` - Lógica de sincronização bidirecional

## 🚀 Como usar:

### Passo 1: Subir Docker

```bash
cd SaudeNold
docker-compose up -d
```

### Passo 2: Verificar se está rodando

```bash
docker-compose ps
```

Deve mostrar:
- ✅ saudenold-postgres (healthy)
- ✅ saudenold-backend (running)

### Passo 3: Testar API

Acesse: http://localhost:8000/docs

### Passo 4: Rodar o App

```bash
npm start
```

O app vai:
1. Tentar sincronizar ao abrir
2. Se backend disponível → sincroniza
3. Se não disponível → usa dados locais

## 📊 Estrutura de Dados

### PostgreSQL Tables:
- `medications`
- `medication_logs`
- `emergency_contacts`
- `doctor_visits`

### AsyncStorage Keys:
- `medications`
- `medicationLogs`
- `emergencyContacts`
- `doctorVisits`
- `lastSync`

## 🔄 Fluxo de Sincronização

1. **Ao abrir o app:**
   - Envia dados locais → Backend
   - Baixa dados atualizados ← Backend
   - Salva no AsyncStorage

2. **Ao salvar dados:**
   - Salva primeiro no AsyncStorage (funciona offline)
   - Se backend disponível → também salva no backend

3. **Se backend offline:**
   - App continua funcionando normalmente
   - Dados ficam apenas no AsyncStorage
   - Na próxima sincronização, dados serão enviados

## 📝 Credenciais Banco de Dados

- **Host:** localhost (ou `postgres` dentro do Docker)
- **Porta:** 5432
- **Usuário:** saudenold
- **Senha:** saudenold123
- **Database:** saudenold

## 🛠️ Comandos Úteis

```bash
# Ver logs
docker-compose logs -f

# Parar tudo
docker-compose down

# Parar e limpar dados
docker-compose down -v

# Rebuild backend
docker-compose up -d --build backend

# Acessar banco
docker-compose exec postgres psql -U saudenold -d saudenold
```

## ⚠️ Notas Importantes

1. **Primeira execução:** As tabelas são criadas automaticamente
2. **Porta 5432:** Certifique-se que não está em uso
3. **Porta 8000:** Certifique-se que não está em uso
4. **Sincronização:** É silenciosa, não interrompe o uso do app

## 🎯 Próximos Passos (Opcional)

- [ ] Implementar autenticação de usuários
- [ ] Adicionar timestamps de modificação para sync inteligente
- [ ] Implementar retry automático de sincronização
- [ ] Adicionar indicador visual de sincronização




















