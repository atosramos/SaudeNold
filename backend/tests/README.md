# Testes Unitários - SaudeNold Backend

Este diretório contém os testes unitários para a API do SaudeNold.

## Estrutura

- `conftest.py`: Configuração compartilhada do pytest (fixtures, configuração de banco de testes)
- `test_medications.py`: Testes para endpoints de medicamentos
- `test_emergency_contacts.py`: Testes para endpoints de contatos de emergência
- `test_doctor_visits.py`: Testes para endpoints de visitas ao médico
- `test_medication_logs.py`: Testes para endpoints de logs de medicamentos
- `test_auth_and_security.py`: Testes para autenticação, validações e segurança

## Pré-requisitos

Certifique-se de ter as dependências instaladas:

```bash
cd backend
pip install -r requirements.txt
```

## Executando os Testes

### Executar todos os testes

```bash
pytest
```

### Executar testes com saída verbosa

```bash
pytest -v
```

### Executar um arquivo específico de testes

```bash
pytest tests/test_medications.py
```

### Executar um teste específico

```bash
pytest tests/test_medications.py::TestMedications::test_create_medication_success
```

### Executar testes com cobertura

```bash
pytest --cov=. --cov-report=html
```

## Configuração

Os testes usam SQLite em memória como banco de dados de teste, configurado automaticamente pelo `conftest.py`. Isso garante que:

- Cada teste executa em isolamento
- Não há necessidade de configurar um banco de dados externo
- Os testes são rápidos e não deixam dados residuais

## API Key para Testes

A API key para testes é definida automaticamente como `test-api-key-123` no fixture `client`. Certifique-se de que a variável de ambiente `API_KEY` esteja definida ou que o código use a chave padrão.

## Notas

- Os testes são executados em um banco de dados SQLite em memória
- Cada teste recebe uma sessão de banco de dados limpa
- A autenticação é mockada usando a API key de teste
- Todos os testes são independentes e podem ser executados em qualquer ordem

