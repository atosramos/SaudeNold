# Guia de Aplicação do Tema Escuro

## Sistema Implementado

O sistema de tema escuro está implementado e funcionando. O tema pode ser alternado na tela de **Configurações**.

## Como Aplicar o Tema em Novas Telas

### 1. Importar o Hook

```javascript
import { useTheme } from '../contexts/ThemeContext';
```

### 2. Usar o Hook no Componente

```javascript
export default function MinhaTela() {
  const { colors } = useTheme();
  // ... resto do código
}
```

### 3. Aplicar Cores Dinamicamente

Substitua cores fixas por cores do tema:

**Antes:**
```javascript
<View style={{ backgroundColor: '#fff' }}>
  <Text style={{ color: '#333' }}>Texto</Text>
</View>
```

**Depois:**
```javascript
<View style={{ backgroundColor: colors.surface }}>
  <Text style={{ color: colors.text }}>Texto</Text>
</View>
```

### 4. Atualizar StyleSheet

Remova cores fixas dos estilos e aplique dinamicamente:

**Antes:**
```javascript
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
  },
  text: {
    color: '#333',
  },
});
```

**Depois:**
```javascript
const styles = StyleSheet.create({
  container: {
    // backgroundColor removido - aplicar inline
  },
  text: {
    // color removido - aplicar inline
  },
});

// No JSX:
<View style={[styles.container, { backgroundColor: colors.background }]}>
  <Text style={[styles.text, { color: colors.text }]}>Texto</Text>
</View>
```

## Cores Disponíveis

- `colors.background` - Fundo principal da tela
- `colors.surface` - Cards, modais, superfícies elevadas
- `colors.text` - Texto principal
- `colors.textSecondary` - Texto secundário
- `colors.textTertiary` - Texto terciário (menos importante)
- `colors.border` - Bordas e divisores
- `colors.primary` - Cor primária (mantida igual em ambos temas)
- `colors.error` - Cor de erro
- `colors.success` - Cor de sucesso
- `colors.warning` - Cor de aviso

## Valores das Cores

### Tema Claro (Light)
- Background: `#f5f5f5`
- Surface: `#ffffff`
- Text: `#333333`
- Text Secondary: `#666666`
- Text Tertiary: `#999999`
- Border: `#e0e0e0`

### Tema Escuro (Dark)
- Background: `#121212`
- Surface: `#1E1E1E`
- Text: `#FFFFFF`
- Text Secondary: `#B0B0B0`
- Text Tertiary: `#808080`
- Border: `#333333`

## Telas Já Atualizadas

- ✅ `app/index.js` - Tela principal
- ✅ `app/settings.js` - Configurações
- ✅ `app/medications.js` - Medicamentos
- ✅ `app/_layout.js` - Header do app

## Telas que Precisam Atualização

- `app/anamnesis.js`
- `app/emergency-contacts.js`
- `app/doctor-visits.js`
- `app/medical-exams.js`
- `app/vaccines.js`
- `app/daily-tracking.js`
- `app/profile-selection.js`
- `app/auth/login.js`
- E outras telas do app

## Exemplo Completo

```javascript
import { useTheme } from '../contexts/ThemeContext';

export default function MinhaTela() {
  const { colors } = useTheme();
  
  return (
    <ScrollView style={{ backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.surface, padding: 16 }}>
        <Text style={{ color: colors.text }}>Título</Text>
        <Text style={{ color: colors.textSecondary }}>Subtítulo</Text>
      </View>
    </ScrollView>
  );
}
```

## Notas Importantes

1. **Cores de Ação**: Cores de botões de ação (primary, error, success) são mantidas iguais em ambos os temas para consistência visual.

2. **Contraste**: O sistema garante contraste adequado entre texto e fundo em ambos os temas.

3. **Performance**: O tema é carregado uma vez e fica disponível via Context, sem impacto significativo na performance.

4. **Persistência**: O tema escolhido é salvo em AsyncStorage e mantido entre sessões.
