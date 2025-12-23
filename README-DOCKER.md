# SaudeNold - Docker Setup

## 🐳 Estrutura Docker

O projeto utiliza Docker Compose com:
- **PostgreSQL 15**: Banco de dados (porta 5432)
- **FastAPI Backend**: API REST (porta 8000)

## 🚀 Como Executar

### 1. Subir os Containers

```bash
docker-compose up -d
```

Isso irá:
- Criar e iniciar o container do PostgreSQL
- Criar e iniciar o container do backend FastAPI
- Criar o banco de dados automaticamente

### 2. Verificar Status

```bash
docker-compose ps
```

### 3. Ver Logs

```bash
# Logs de todos os serviços
docker-compose logs -f

# Logs apenas do backend
docker-compose logs -f backend

# Logs apenas do PostgreSQL
docker-compose logs -f postgres
```

### 4. Parar os Containers

```bash
docker-compose down
```

### 5. Parar e Remover Volumes (limpar dados)

```bash
docker-compose down -v
```

## 📊 Acessar o Banco de Dados

### Via Docker

```bash
docker-compose exec postgres psql -U saudenold -d saudenold
```

### Via Host (localhost:5432)

- **Host**: localhost
- **Porta**: 5432
- **Usuário**: saudenold
- **Senha**: saudenold123
- **Database**: saudenold

### Exemplo de Conexão

```bash
psql -h localhost -p 5432 -U saudenold -d saudenold
```

## 🔌 API Backend

O backend estará disponível em: `http://localhost:8000`

### Documentação Automática:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Endpoints Principais:

- `GET /health` - Health check
- `GET /api/medications` - Listar medicamentos
- `POST /api/medications` - Criar medicamento
- `GET /api/medication-logs` - Listar logs
- `GET /api/emergency-contacts` - Listar contatos
- `GET /api/doctor-visits` - Listar visitas

## 🔄 Sincronização

O app faz sincronização automática ao abrir:

1. **Envia dados locais** (AsyncStorage) → Backend
2. **Baixa dados atualizados** do Backend → AsyncStorage

Se o backend não estiver disponível, o app continua funcionando apenas com dados locais.

## 🛠️ Desenvolvimento

### Rebuild após mudanças no backend

```bash
docker-compose up -d --build backend
```

### Acessar shell do container backend

```bash
docker-compose exec backend bash
```

### Instalar nova dependência Python

1. Adicione em `backend/requirements.txt`
2. Rebuild: `docker-compose up -d --build backend`

## ⚠️ Problemas Comuns

### Porta já em uso

Se a porta 5432 ou 8000 já estiver em uso:

1. Edite `docker-compose.yml`
2. Altere as portas no formato `"NOVA_PORTA:PORTA_CONTAINER"`

### Banco não inicializa

```bash
docker-compose down -v
docker-compose up -d
```

### Backend não conecta ao banco

Verifique se o PostgreSQL está saudável:
```bash
docker-compose ps
```

Deve mostrar `postgres` com status `healthy`.





