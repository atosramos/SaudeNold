# Correção do Loop de Renderização - Tela de Exames Médicos

## 🔍 Problema Identificado

Após fazer upload de um PDF, a tela ficava piscando entre "Carregando exames..." e a tela de visualização, tornando impossível acessar o exame.

## 🐛 Causa Raiz

O problema era um **loop infinito de renderização** causado por:

1. **Dependência circular no `useFocusEffect`**: 
   - O hook tinha `[exams]` como dependência
   - Quando `loadExams()` atualizava `exams`, o `useFocusEffect` era executado novamente
   - Isso criava um ciclo infinito: atualizar → re-executar → atualizar → ...

2. **Mesmo problema na tela de detalhes**:
   - O `useFocusEffect` tinha `[exam]` como dependência
   - Quando `loadExam()` atualizava `exam`, o hook era re-executado

## ✅ Correções Aplicadas

### 1. Tela de Lista de Exames (`app/medical-exams.js`)

**Antes:**
```javascript
useFocusEffect(
  useCallback(() => {
    loadExams();
    intervalRef.current = setInterval(async () => {
      const hasPending = exams.some(...); // Usava exams diretamente
      // ...
    }, 30000);
    return () => { clearInterval(intervalRef.current); };
  }, [exams]) // ❌ Dependência causava loop
);
```

**Depois:**
```javascript
const examsRef = useRef([]); // Ref para acessar estado sem causar re-render

useEffect(() => {
  examsRef.current = exams; // Atualizar ref quando exams mudar
}, [exams]);

useFocusEffect(
  useCallback(() => {
    loadExams();
    intervalRef.current = setInterval(async () => {
      const currentExams = examsRef.current; // ✅ Usar ref
      const hasPending = currentExams.some(...);
      // ...
    }, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []) // ✅ Sem dependências que causam loop
);
```

### 2. Tela de Detalhes do Exame (`app/medical-exams/[id].js`)

**Antes:**
```javascript
useFocusEffect(
  useCallback(() => {
    if (!exam) {
      loadExam();
    } else {
      if (exam.processing_status === 'pending' || ...) {
        // ...
      }
    }
    return () => { clearInterval(intervalRef.current); };
  }, [exam]) // ❌ Dependência causava loop
);
```

**Depois:**
```javascript
const examRef = useRef(examParam ? JSON.parse(examParam) : null);

useEffect(() => {
  examRef.current = exam; // Atualizar ref quando exam mudar
}, [exam]);

useFocusEffect(
  useCallback(() => {
    const currentExam = examRef.current; // ✅ Usar ref
    if (!currentExam) {
      loadExam();
    } else {
      if (currentExam.processing_status === 'pending' || ...) {
        // ...
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [id]) // ✅ Apenas id como dependência
);
```

## 🔧 Mudanças Técnicas

1. **Adicionado `useRef` para estado**:
   - `examsRef` na tela de lista
   - `examRef` na tela de detalhes
   - Permite acessar o estado atual sem causar re-render

2. **Adicionado `useEffect` para sincronizar refs**:
   - Atualiza a ref quando o estado muda
   - Não causa loop porque não está dentro do `useFocusEffect`

3. **Removidas dependências problemáticas**:
   - `[exams]` → `[]` na tela de lista
   - `[exam]` → `[id]` na tela de detalhes

4. **Melhorado cleanup do intervalo**:
   - Define `intervalRef.current = null` após limpar
   - Previne vazamentos de memória

## 📋 Arquivos Modificados

1. `app/medical-exams.js`
   - Adicionado `useEffect` import
   - Adicionado `examsRef` useRef
   - Corrigido `useFocusEffect` para não depender de `exams`

2. `app/medical-exams/[id].js`
   - Adicionado `useEffect` import
   - Adicionado `examRef` useRef
   - Corrigido `useFocusEffect` para depender apenas de `id`

## ✅ Resultado Esperado

Após as correções:
- ✅ Tela não pisca mais
- ✅ Exames carregam normalmente após upload
- ✅ Verificação periódica de status funciona sem causar loop
- ✅ Navegação funciona corretamente
- ✅ Performance melhorada (menos re-renders)

## 🧪 Como Testar

1. Fazer upload de um PDF
2. Verificar se a tela não pisca
3. Verificar se é possível acessar o exame
4. Verificar se o status é atualizado periodicamente (sem piscar)

## 📝 Notas Técnicas

### Por que usar `useRef`?

- `useRef` não causa re-render quando atualizado
- Permite acessar o valor mais recente do estado
- Ideal para valores que precisam ser acessados em callbacks/intervals

### Por que remover dependências?

- `useFocusEffect` deve executar apenas quando a tela ganha/perde foco
- Dependências de estado causam re-execução desnecessária
- Usar refs permite acessar estado atual sem causar loop




