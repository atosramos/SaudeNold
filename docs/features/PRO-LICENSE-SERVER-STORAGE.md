# Licença PRO e Armazenamento no Servidor

## Requisito de Licença PRO para Armazenamento no Servidor

**IMPORTANTE:** Quando o usuário ativa a licença PRO no mobile, os dados de saúde passam a ser gravados também no servidor, respeitando todas as regras de conformidade LGPD (Brasil) e HIPAA (Estados Unidos).

## Justificativa Legal e de Conformidade

### LGPD (Lei Geral de Proteção de Dados - Brasil)
- Dados de saúde são considerados **dados sensíveis** (Art. 5º, II)
- Requer medidas de segurança técnicas e administrativas adequadas (Art. 46)
- Armazenamento em servidor requer infraestrutura segura e auditável
- Licença PRO garante recursos para implementar medidas de conformidade

### HIPAA (Health Insurance Portability and Accountability Act - EUA)
- Dados de saúde protegidos (Protected Health Information - PHI)
- Requer medidas de segurança físicas, técnicas e administrativas
- Armazenamento em servidor requer criptografia e controles de acesso
- Licença PRO garante implementação de controles HIPAA

## Comportamento do Sistema

### Com Licença PRO Ativa

Quando o usuário ativa a licença PRO:

1. **Armazenamento Duplo:**
   - ✅ Dados são salvos localmente (AsyncStorage) - sempre disponível
   - ✅ Dados são sincronizados e salvos no servidor PostgreSQL
   - ✅ Sincronização automática em background

2. **Conformidade:**
   - ✅ Dados criptografados em trânsito (HTTPS/TLS)
   - ✅ Dados isolados por perfil (`profile_id` em todas as tabelas)
   - ✅ Dados isolados por família (`family_id` em tabelas familiares)
   - ✅ Logs de auditoria para rastreabilidade
   - ✅ Controles de acesso baseados em permissões

3. **Funcionalidades:**
   - ✅ Sincronização entre dispositivos
   - ✅ Backup automático no servidor
   - ✅ Recuperação de dados em caso de perda do dispositivo
   - ✅ Compartilhamento seguro entre perfis familiares

### Sem Licença PRO

Quando o usuário não tem licença PRO ativa:

1. **Armazenamento Apenas Local:**
   - ✅ Dados são salvos localmente (AsyncStorage)
   - ❌ Dados **NÃO** são salvos no servidor
   - ❌ Sem sincronização entre dispositivos
   - ❌ Sem backup automático

2. **Funcionalidades Disponíveis:**
   - ✅ Todas as funcionalidades de entrada manual
   - ✅ Uso completo do app offline
   - ✅ Dados privados no dispositivo
   - ❌ Sem sincronização
   - ❌ Sem backup na nuvem

## Implementação Técnica

### Verificação de Licença PRO na Sincronização

A função `syncToBackend()` verifica licença PRO antes de enviar dados:

```javascript
// services/sync.js
const hasProLicense = await hasActiveLicense();
if (!hasProLicense) {
  console.log('[Sync] Licença PRO não ativa - dados serão salvos apenas localmente');
  return false; // Não sincroniza com servidor
}
```

### Fluxo de Salvamento

1. **Usuário cria/edita dado (ex: medicamento):**
   - Dado é salvo localmente imediatamente (AsyncStorage)
   - App funciona normalmente offline

2. **Sincronização Automática:**
   - Se licença PRO ativa: dado é enviado ao servidor
   - Se licença PRO inativa: dado fica apenas local

3. **Sincronização do Servidor:**
   - Permite buscar dados mesmo sem licença PRO (para usuários que tiveram licença antes)
   - Não permite enviar novos dados sem licença PRO

## Medidas de Conformidade Implementadas

### LGPD (Brasil)

1. **Isolamento de Dados:**
   - Dados isolados por perfil (`profile_id`)
   - Dados isolados por família (`family_id`)
   - Validação de acesso antes de operações

2. **Segurança:**
   - Criptografia em trânsito (HTTPS/TLS)
   - Chaves de criptografia por perfil
   - Logs de auditoria

3. **Direitos do Titular:**
   - Exportação de dados (planejado)
   - Exclusão de dados (planejado)
   - Portabilidade (planejado)

### HIPAA (EUA)

1. **Controles Administrativos:**
   - Controle de acesso baseado em permissões
   - Logs de auditoria
   - Políticas de segurança

2. **Controles Físicos:**
   - Servidor PostgreSQL local (controle físico)
   - Backup seguro

3. **Controles Técnicos:**
   - Criptografia em trânsito
   - Autenticação obrigatória
   - Isolamento de dados por perfil

## Tabelas no PostgreSQL com Dados de Saúde

Todas as tabelas seguem critérios de segurança:

- `medications` - Medicamentos (com `profile_id`)
- `medication_logs` - Logs de medicação (com `profile_id`)
- `emergency_contacts` - Contatos de emergência (com `profile_id`)
- `doctor_visits` - Visitas ao médico (com `profile_id`)
- `medical_exams` - Exames médicos (com `profile_id`)
- `exam_data_points` - Dados de exames (com `profile_id`)

Todas as tabelas têm:
- ✅ Coluna `profile_id` para isolamento
- ✅ Índices para performance e segurança
- ✅ Constraints para integridade
- ✅ Timestamps para auditoria

## Logs e Auditoria

Todas as operações são registradas:
- Criação de dados
- Atualização de dados
- Exclusão de dados
- Acessos a dados sensíveis
- Tentativas de acesso não autorizado

## Próximos Passos para Conformidade Completa

Conforme issues #31, #33, #24:

- [ ] Criptografia end-to-end (AES-256) - Issue #33
- [ ] Logs de auditoria completos - Issue #31
- [ ] Política de privacidade e termos - Issue #24
- [ ] Direito ao esquecimento (exclusão) - Issue #24
- [ ] Exportação de dados - Issue #24
- [ ] Certificação ISO 27001 (planejamento) - Issue #31

## Referências

- Issue #31: Conformidade e Auditoria
- Issue #33: Criptografia de Dados Médicos
- Issue #24: Privacidade e Consentimento
- [LGPD](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [HIPAA](https://www.hhs.gov/hipaa/index.html)

---

**Última atualização:** Janeiro 2025
