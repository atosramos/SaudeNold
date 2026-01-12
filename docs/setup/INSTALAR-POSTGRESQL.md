# Como Instalar e Configurar PostgreSQL no Windows

## Opção 1: Instalação via Instalador Oficial (Recomendado)

### Passo 1: Baixar PostgreSQL

1. Acesse: https://www.postgresql.org/download/windows/
2. Clique em "Download the installer"
3. Baixe o instalador para Windows (ex: `postgresql-15.x-windows-x64.exe`)

### Passo 2: Instalar

1. Execute o instalador
2. Durante a instalação:
   - **Porta**: Mantenha 5432 (padrão)
   - **Superusuário**: `postgres`
   - **Senha**: Escolha uma senha forte e anote (você precisará dela)
   - **Localização**: Mantenha o padrão ou escolha outra
   - **Componentes**: Marque "Command Line Tools" (importante para o `psql`)

3. Ao final, desmarque "Launch Stack Builder" (não é necessário)

### Passo 3: Adicionar ao PATH (Opcional, mas Recomendado)

O instalador geralmente adiciona automaticamente, mas se não funcionar:

1. Abra "Variáveis de Ambiente" (Windows + R, digite `sysdm.cpl`, Enter)
2. Vá em "Avançado" → "Variáveis de Ambiente"
3. Em "Variáveis do sistema", encontre "Path" e clique em "Editar"
4. Adicione: `C:\Program Files\PostgreSQL\15\bin` (ajuste a versão se necessário)
5. Clique em "OK" em todas as janelas

### Passo 4: Verificar Instalação

Abra um novo PowerShell e teste:

```powershell
psql --version
```

Se mostrar a versão, está funcionando!

## Opção 2: Instalação via Chocolatey

Se você tem Chocolatey instalado:

```powershell
choco install postgresql15
```

Isso instala e configura automaticamente.

## Opção 3: Usar Docker (Alternativa)

Se preferir não instalar localmente, pode usar Docker:

```powershell
docker run --name saudenold-postgres `
  -e POSTGRES_USER=saudenold `
  -e POSTGRES_PASSWORD=saudenold123 `
  -e POSTGRES_DB=saudenold `
  -p 5432:5432 `
  -d postgres:15-alpine
```

## Configurar Banco de Dados

Após instalar o PostgreSQL, você pode usar um dos scripts:

### Opção A: Script com psql (requer PostgreSQL no PATH)

```powershell
.\scripts\setup\setup-postgres.ps1
```

### Opção B: Script com Python (não requer psql no PATH)

```powershell
.\scripts\setup\setup-postgres-python.ps1
```

Este script usa Python e psycopg2, então funciona mesmo se o `psql` não estiver no PATH.

## Verificar se PostgreSQL está Rodando

### Windows Service

```powershell
Get-Service -Name "*postgres*"
```

Se não estiver rodando:

```powershell
Start-Service postgresql-x64-15  # Ajuste o nome do serviço
```

### Ou via pgAdmin

O instalador geralmente instala o pgAdmin. Você pode:
1. Abrir pgAdmin
2. Conectar ao servidor local
3. Criar o banco manualmente

## Troubleshooting

### "psql não é reconhecido como comando"

1. Verifique se está no PATH:
   ```powershell
   $env:PATH -split ';' | Select-String postgres
   ```

2. Se não estiver, adicione manualmente ao PATH (veja Opção 1, Passo 3)

3. Ou use o script Python: `.\scripts\setup\setup-postgres-python.ps1`

### "Não foi possível conectar ao servidor"

1. Verifique se o serviço está rodando:
   ```powershell
   Get-Service -Name "*postgres*"
   ```

2. Inicie o serviço se necessário:
   ```powershell
   Start-Service postgresql-x64-15
   ```

3. Verifique se a porta 5432 está livre:
   ```powershell
   netstat -ano | findstr :5432
   ```

### "Falha na autenticação"

1. Verifique se está usando a senha correta do usuário `postgres`
2. Verifique o arquivo `pg_hba.conf` (geralmente em `C:\Program Files\PostgreSQL\15\data`)
3. Certifique-se de que a autenticação está configurada como `md5` ou `password`

## Próximos Passos

Após instalar e configurar o PostgreSQL:

1. Execute o script de configuração do banco
2. Configure o backend (veja `docs/setup/RODAR-SEM-DOCKER.md`)
3. Inicie o backend e frontend
