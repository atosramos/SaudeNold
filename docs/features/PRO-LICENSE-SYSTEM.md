# Sistema de Licença PRO - SaudeNold

## 📋 Visão Geral

O sistema de licença PRO permite que usuários desbloqueiem funcionalidades avançadas com inteligência artificial (Gemini) através de chaves de licença com validade de 1 mês, 6 meses ou 1 ano.

## ✨ Funcionalidades PRO

As seguintes funcionalidades requerem licença PRO ativa:

1. **📋 Exames Médicos** - Leitura automática de exames (PDFs e imagens)
2. **📊 Acompanhamento Diário** - Leitura automática de aparelhos médicos
3. **💊 Medicamentos** - Leitura automática de receitas (futuro)
4. **📝 Anamnese** - Importação de documentos médicos (futuro)
5. **📞 Contatos** - Leitura de cartões de visita (futuro)

## 🔓 Entrada Manual Sempre Disponível

**IMPORTANTE:** Mesmo sem licença PRO, todas as funcionalidades estão disponíveis através de entrada manual. A licença PRO apenas habilita a leitura automática com IA.

## 🔑 Formato de Chaves de Licença

Formato: `PRO-XXXX-XXXX-XXXX-XXXX`

- Total: 20 caracteres + 4 hífens
- Primeiro bloco: `PRO` (fixo)
- Segundo bloco: Código do tipo de licença
- Terceiro bloco: Identificador único
- Quarto bloco: Identificador único
- Quinto bloco: Checksum de validação

### Tipos de Licença

- **1 Mês:** Segundo bloco começa com `1` ou contém `1M`
- **6 Meses:** Segundo bloco começa com `6` ou contém `6M`
- **1 Ano:** Segundo bloco começa com `Y` ou contém `1Y`

## 🧪 Chaves de Teste

Para desenvolvimento e testes, use as seguintes chaves:

### 1 Mês
```
PRO-1M01-ABCD-EFGH-IJKL
PRO-1M02-WXYZ-1234-5678
```

### 6 Meses
```
PRO-6M01-ABCD-EFGH-IJKL
PRO-6M02-WXYZ-1234-5678
```

### 1 Ano
```
PRO-1Y01-ABCD-EFGH-IJKL
PRO-1Y02-WXYZ-1234-5678
```

**Nota:** Em produção, as chaves devem ser validadas em um servidor com algoritmo de checksum real e criptografia.

## 🔧 Implementação Técnica

### Serviço de Licenças

**Arquivo:** `services/proLicense.js`

**Funções principais:**
- `validateLicenseKey(key)` - Valida formato e tipo de chave
- `activateLicense(key)` - Ativa uma licença
- `hasActiveLicense()` - Verifica se há licença ativa
- `getLicenseInfo()` - Obtém informações da licença
- `deactivateLicense()` - Remove licença ativa
- `isProFeatureAvailable()` - Verifica se funcionalidade PRO está disponível

### Armazenamento

As licenças são armazenadas localmente no `AsyncStorage`:
- `pro_license` - Dados completos da licença
- `pro_license_info` - Informações para exibição

### Verificação em Funcionalidades

Todas as funcionalidades que usam Gemini verificam a licença antes de processar:

```javascript
import { isProFeatureAvailable } from '../../services/proLicense';

// Antes de usar Gemini
const hasPro = await isProFeatureAvailable();
if (!hasPro) {
  // Mostrar mensagem e permitir entrada manual
  showAlert('Funcionalidade PRO', '...', 'info');
  return;
}
```

## 📱 Tela de Licença PRO

**Arquivo:** `app/pro-license.js`

A tela permite:
- Visualizar status da licença ativa
- Ativar nova licença
- Desativar licença atual
- Ver informações sobre tipos de licença

## 🚀 Integração com Menu Principal

A tela de licença PRO está acessível através do menu principal (botão "Licença PRO").

## 🔐 Segurança

### Implementação Atual (Desenvolvimento)

- Validação local simplificada
- Formato de chave validado
- Tipo de licença extraído da chave
- Data de expiração calculada localmente

### Implementação Recomendada (Produção)

1. **Validação no Servidor:**
   ```javascript
   const response = await fetch('https://api.saudenold.com/validate-license', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ key, deviceId }),
   });
   ```

2. **Criptografia:**
   - Chaves devem ser criptografadas
   - Checksum deve usar algoritmo seguro (SHA-256)
   - Validação deve incluir timestamp e nonce

3. **Proteção contra Reversão:**
   - Validação periódica com servidor
   - Verificação de integridade do app
   - Detecção de modificações

## 📊 Fluxo de Uso

### Ativação de Licença

1. Usuário acessa "Licença PRO" no menu
2. Insere chave de licença
3. Sistema valida formato e tipo
4. Licença é ativada e salva localmente
5. Funcionalidades PRO ficam disponíveis

### Uso de Funcionalidade PRO

1. Usuário tenta usar funcionalidade com IA
2. Sistema verifica licença ativa
3. Se ativa: processa com Gemini
4. Se inativa: mostra mensagem e permite entrada manual

### Expiração

1. Sistema verifica data de expiração ao verificar licença
2. Se expirada: remove licença automaticamente
3. Funcionalidades PRO ficam indisponíveis
4. Entrada manual continua disponível

## 🧪 Testes

### Testar Validação

```javascript
import { validateLicenseKey, activateLicense, hasActiveLicense } from '../services/proLicense';

// Testar validação
const result = await validateLicenseKey('PRO-1M01-ABCD-EFGH-IJKL');
console.log(result); // { valid: true, licenseType: '1_month', ... }

// Testar ativação
const activation = await activateLicense('PRO-1M01-ABCD-EFGH-IJKL');
console.log(activation); // { success: true, licenseInfo: {...} }

// Testar verificação
const hasActive = await hasActiveLicense();
console.log(hasActive); // true ou false
```

## 📝 Notas Importantes

1. **Entrada Manual:** Sempre disponível, independente de licença
2. **Offline:** Licenças funcionam offline (validação local)
3. **Expiração:** Licenças expiradas são removidas automaticamente
4. **Múltiplos Dispositivos:** Cada dispositivo precisa de licença própria (em produção)

## 🔄 Próximos Passos

1. Implementar validação no servidor
2. Adicionar sistema de pagamento
3. Implementar geração segura de chaves
4. Adicionar analytics de uso PRO
5. Implementar funcionalidades PRO adicionais (receitas, anamnese, contatos)

---

**Última atualização:** Janeiro 2025
