# Testes do Frontend - SaudeNold

Este diretório contém os testes para o frontend React Native do SaudeNold, focados em verificar problemas que causavam crashes no app.

## Estrutura

```
__tests__/
├── components/
│   ├── theme-safety.test.js          # Testes de uso correto de useTheme()
│   ├── data-validation.test.js        # Testes de validação de dados
│   └── async-error-handling.test.js  # Testes de tratamento de erros assíncronos
├── screens/
│   ├── daily-tracking.test.js        # Testes específicos da tela de Acompanhamento Diário
│   └── all-screens-safety.test.js    # Validação automática de todas as telas
└── utils/
    └── screen-validator.js           # Utilitário para validar telas automaticamente
```

## Tipos de Testes

### 1. Theme Safety Tests
Verifica que todos os componentes que usam `useTheme()`:
- Extraem `colors` corretamente
- Têm fallback caso `useTheme()` retorne `undefined`
- Não acessam `colors` diretamente sem destructuring

### 2. Data Validation Tests
Verifica que componentes:
- Validam arrays antes de usar `.map()`, `.filter()`, etc.
- Verificam objetos antes de acessar propriedades
- Tratam `null` e `undefined` corretamente
- Filtram dados corrompidos antes de renderizar

### 3. Async Error Handling Tests
Verifica que funções assíncronas:
- Têm `try-catch` para tratar erros
- Atualizam estados corretamente mesmo em caso de erro
- Garantem que arrays sejam sempre válidos
- Gerenciam loading states corretamente

### 4. Screen-Specific Tests
Testes específicos para telas críticas, como `daily-tracking`, que verificam:
- Uso correto de hooks
- Validação de dados específicos da tela
- Tratamento de erros específicos

### 5. All Screens Safety Tests
Validação automática de todas as telas do app para identificar:
- Problemas no uso de `useTheme()`
- Falta de validação de dados
- Tratamento inadequado de erros

## Pré-requisitos

Instale as dependências de desenvolvimento:

```bash
npm install
```

## Executando os Testes

### Executar todos os testes

```bash
npm test
```

### Executar testes específicos

```bash
# Testes de segurança de tema
npm test -- __tests__/components/theme-safety.test.js

# Testes de validação de dados
npm test -- __tests__/components/data-validation.test.js

# Testes de tratamento de erros
npm test -- __tests__/components/async-error-handling.test.js

# Testes de uma tela específica
npm test -- __tests__/screens/daily-tracking.test.js

# Validação de todas as telas
npm test -- __tests__/screens/all-screens-safety.test.js
```

### Executar com watch mode

```bash
npm test -- --watch
```

### Executar com cobertura

```bash
npm test -- --coverage
```

### Usar script PowerShell (Windows)

```powershell
.\scripts\test\run-frontend-tests.ps1
```

## Problemas Verificados

Os testes foram criados para verificar os seguintes problemas que causavam crashes:

1. **Uso incorreto de `useTheme()`**
   - Acesso direto a `useTheme().colors` sem extrair primeiro
   - Falta de fallback quando `useTheme()` retorna `undefined`

2. **Falta de validação de dados**
   - Uso de `.map()` em arrays que podem ser `null` ou `undefined`
   - Acesso a propriedades de objetos sem verificar se existem
   - Dados corrompidos sendo renderizados diretamente

3. **Tratamento inadequado de erros**
   - Funções `async` sem `try-catch`
   - Estados não sendo resetados em caso de erro
   - Arrays não sendo garantidos como válidos mesmo em erro

4. **Proteção contra dados corrompidos**
   - Registros inválidos sendo renderizados
   - Datas inválidas causando crashes
   - Objetos sem propriedades obrigatórias

## Adicionando Novos Testes

Para adicionar testes para uma nova tela:

1. Crie um arquivo em `__tests__/screens/[nome-da-tela].test.js`
2. Siga o padrão dos testes existentes
3. Verifique especialmente:
   - Uso de `useTheme()`
   - Validação de dados
   - Tratamento de erros assíncronos

## Cobertura de Testes

Os testes visam cobrir:
- ✅ Uso correto de `useTheme()` em todas as telas
- ✅ Validação de dados antes de renderizar
- ✅ Tratamento de erros em funções assíncronas
- ✅ Proteção contra dados corrompidos
- ✅ Validação de props e estados

## Notas

- Os testes usam mocks para `useTheme()`, `expo-router`, e outros módulos
- Testes de validação de telas são não-destrutivos (não falham, apenas reportam)
- Use `npm test -- --verbose` para ver detalhes dos testes
