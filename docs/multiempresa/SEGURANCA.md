# Segurança e Privacidade - Sistema Multiempresa

## Visão Geral

O sistema multiempresa implementa múltiplas camadas de segurança para garantir isolamento completo de dados e conformidade com regulamentações de privacidade.

## Isolamento de Dados Entre Perfis

### Como Funciona

Os dados de cada perfil são completamente isolados através de:

1. **Isolamento no Banco de Dados**
   - Todas as tabelas de dados médicos têm coluna `profile_id`
   - Queries sempre filtram por `profile_id`
   - Índices garantem performance e segurança

2. **Isolamento no Backend**
   - Middleware valida `X-Profile-Id` header
   - Verificação de acesso antes de operações
   - Validação de permissões por tipo de conta

3. **Isolamento no Frontend**
   - Dados armazenados com prefixo `profile_{id}_`
   - Sincronização filtrada por perfil
   - Validação de acesso antes de exibição

### Garantias

✅ **Perfil A nunca acessa dados do Perfil B**  
✅ **Família A nunca acessa dados da Família B**  
✅ **Validação em múltiplas camadas**  
✅ **Testes automatizados garantem isolamento (100% cobertura)**

---

## Medidas de Segurança Implementadas

### 1. Isolamento de Dados

#### Camada de Banco de Dados

```sql
-- Todas as queries filtram por profile_id
SELECT * FROM medications WHERE profile_id = ?;

-- Índices garantem performance
CREATE INDEX idx_medications_profile_id ON medications(profile_id);
```

#### Camada de Aplicação

```python
# Validação de acesso
def ensure_profile_access(user, db, profile_id):
    profile = db.query(FamilyProfile).filter(
        FamilyProfile.id == profile_id,
        FamilyProfile.family_id == user.family_id
    ).first()
    
    if not profile:
        raise HTTPException(403, "Acesso negado")
```

#### Camada de Frontend

```javascript
// Chaves isoladas por perfil
const key = `profile_${profileId}_medications`;

// Sincronização filtrada
const medications = await api.get('/api/medications', {
  headers: { 'X-Profile-Id': profileId }
});
```

### 2. Controle de Acesso (RBAC)

#### Tipos de Conta e Permissões

| Tipo | Pode Criar Perfis | Pode Editar Outros | Pode Deletar | Pode Compartilhar |
|------|-------------------|-------------------|--------------|-------------------|
| `family_admin` | ✅ | ✅ | ✅ | ✅ |
| `adult_member` | ❌ | ❌ | ❌ | ❌ |
| `child` | ❌ | ❌ | ❌ | ❌ |
| `elder_under_care` | ❌ | ❌ | ❌ | ❌ |

#### Sistema de Cuidadores

Cuidadores têm níveis de acesso:

- **read_only**: Apenas visualização
- **read_write**: Visualização e edição
- **full**: Acesso completo

#### Validação de Permissões

```python
# Verificação de permissões
if user.account_type != "family_admin":
    raise HTTPException(403, "Sem permissão")

# Verificação de cuidador
caregiver = db.query(FamilyCaregiver).filter(
    FamilyCaregiver.profile_id == profile_id,
    FamilyCaregiver.caregiver_user_id == user.id
).first()

if caregiver and caregiver.access_level == "read_only" and write_access:
    raise HTTPException(403, "Sem permissão para editar")
```

### 3. Criptografia

#### Criptografia em Trânsito

- **HTTPS/TLS**: Todas as comunicações são criptografadas
- **Certificados SSL**: Certificados válidos e atualizados
- **TLS 1.2+**: Versões seguras do protocolo

#### Criptografia Zero-Knowledge (Opcional)

Dados sensíveis podem ser criptografados no cliente:

```javascript
// Criptografia no frontend
const encrypted = await encryptData(data, profileKey);

// Backend armazena sem descriptografar
await api.post('/api/medications', {
  ...medication,
  encrypted_data: encrypted
});
```

**Características:**
- Chaves de criptografia por perfil
- Backend não tem acesso às chaves
- Descriptografia apenas no dispositivo do usuário

### 4. Logs de Auditoria

#### O que é Logado

- ✅ Criação de perfis
- ✅ Modificação de dados
- ✅ Acessos a dados sensíveis
- ✅ Tentativas de acesso não autorizado
- ✅ Criação/aceitação de convites
- ✅ Compartilhamento de dados
- ✅ Revogação de compartilhamentos

#### Formato de Logs

```
2026-01-26 10:00:00 - INFO - Usuário 1 acessou dados do perfil 2
2026-01-26 10:01:00 - WARNING - Tentativa de acesso não autorizado: usuário 3 → perfil 1
2026-01-26 10:02:00 - INFO - Compartilhamento criado: perfil 1 → perfil 2
```

#### Retenção de Logs

- **Logs de segurança**: 90 dias
- **Logs de auditoria**: 1 ano
- **Logs de erro**: 30 dias

---

## Conformidade com LGPD (Brasil)

### Tratamento de Dados Sensíveis

#### Dados de Saúde

Dados de saúde são considerados **dados sensíveis** pela LGPD (Art. 5º, II) e requerem:

- ✅ **Consentimento explícito**: Usuário deve consentir ao compartilhar dados
- ✅ **Medidas de segurança adequadas**: Isolamento, criptografia, logs
- ✅ **Finalidade específica**: Dados usados apenas para gestão de saúde
- ✅ **Retenção limitada**: Dados mantidos apenas enquanto necessário

#### Direitos do Titular

O sistema implementa os seguintes direitos:

1. **Acesso aos Dados**
   - Usuário pode visualizar todos os seus dados
   - Exportação de dados (planejado)

2. **Correção de Dados**
   - Usuário pode editar seus dados a qualquer momento
   - Histórico de alterações mantido

3. **Exclusão de Dados**
   - Usuário pode deletar seu perfil
   - Dados são removidos permanentemente (planejado)

4. **Portabilidade**
   - Exportação de dados em formato estruturado (planejado)

5. **Revogação de Consentimento**
   - Usuário pode revogar compartilhamentos
   - Compartilhamentos são imediatamente desativados

### Consentimento

#### Compartilhamento de Dados

Quando um perfil compartilha dados com outro:

1. **Consentimento Explícito**
   - Administrador deve criar compartilhamento explicitamente
   - Permissões são definidas claramente

2. **Revogação**
   - Compartilhamento pode ser revogado a qualquer momento
   - Acesso é imediatamente bloqueado

3. **Transparência**
   - Usuário pode ver todos os compartilhamentos ativos
   - Logs registram todas as ações

---

## Conformidade com HIPAA (EUA)

### Protected Health Information (PHI)

Dados de saúde são considerados **PHI** pelo HIPAA e requerem:

#### Controles Administrativos

- ✅ **Controle de Acesso**: Baseado em permissões (RBAC)
- ✅ **Logs de Auditoria**: Todas as operações são registradas
- ✅ **Políticas de Segurança**: Documentadas e implementadas

#### Controles Físicos

- ✅ **Servidor Seguro**: PostgreSQL em ambiente controlado
- ✅ **Backup Seguro**: Backups criptografados e protegidos
- ✅ **Controle de Acesso Físico**: Apenas pessoal autorizado

#### Controles Técnicos

- ✅ **Criptografia em Trânsito**: HTTPS/TLS
- ✅ **Autenticação Obrigatória**: JWT para todas as requisições
- ✅ **Isolamento de Dados**: Por perfil e família
- ✅ **Integridade de Dados**: Validações e constraints

### Business Associate Agreement (BAA)

Se o sistema for usado por entidades cobertas pelo HIPAA:

- ✅ **BAA disponível**: Contrato de associado comercial
- ✅ **Conformidade documentada**: Medidas de segurança documentadas
- ✅ **Notificação de violações**: Processo para notificar violações

---

## Política de Privacidade para Perfis Familiares

### Coleta de Dados

O sistema coleta apenas dados necessários:

- **Dados de Identificação**: Nome, email (para convites)
- **Dados de Saúde**: Medicamentos, exames, visitas médicas
- **Dados de Contato**: Contatos de emergência
- **Dados de Uso**: Logs de acesso (para segurança)

### Uso de Dados

Dados são usados apenas para:

- ✅ Gestão de saúde pessoal/familiar
- ✅ Sincronização entre dispositivos
- ✅ Compartilhamento controlado (com consentimento)
- ✅ Melhoria do serviço (dados agregados e anonimizados)

### Compartilhamento de Dados

Dados são compartilhados apenas:

- ✅ Entre perfis da mesma família (com consentimento)
- ✅ Com serviços de terceiros (apenas com consentimento explícito)
- ✅ Para conformidade legal (quando exigido por lei)

### Retenção de Dados

- **Dados ativos**: Mantidos enquanto o perfil existir
- **Dados deletados**: Removidos permanentemente após 30 dias
- **Logs**: Mantidos conforme política de retenção

---

## Compartilhamento de Dados e Consentimento

### Como Funciona

1. **Criação de Compartilhamento**
   - Administrador cria compartilhamento
   - Define permissões (view, edit, delete)
   - Compartilhamento fica ativo

2. **Acesso aos Dados Compartilhados**
   - Perfil que recebe pode acessar dados conforme permissões
   - Acesso é registrado em logs
   - Dados permanecem isolados (não são copiados)

3. **Revogação**
   - Administrador pode revogar a qualquer momento
   - Acesso é imediatamente bloqueado
   - Dados não são removidos (apenas acesso bloqueado)

### Consentimento Explícito

- ✅ Compartilhamento requer ação explícita do administrador
- ✅ Permissões são claramente definidas
- ✅ Usuário pode ver todos os compartilhamentos ativos
- ✅ Revogação é imediata e permanente

---

## Medidas de Segurança Adicionais

### Rate Limiting

Endpoints críticos têm rate limiting:

- `GET /api/family/profiles`: 100/min
- `POST /api/family/invite-adult`: 5/min
- `DELETE /api/family/profiles/{id}`: 10/min

### Validação de Entrada

- ✅ Sanitização de strings
- ✅ Validação de tipos
- ✅ Proteção contra SQL injection
- ✅ Proteção contra XSS

### Autenticação Forte

- ✅ JWT com expiração
- ✅ Refresh tokens
- ✅ CSRF protection
- ✅ Validação de sessão

---

## Incidentes de Segurança

### Notificação de Violações

Em caso de violação de dados:

1. **Detecção**: Sistema detecta tentativas de acesso não autorizado
2. **Análise**: Logs são analisados para determinar escopo
3. **Notificação**: Usuários afetados são notificados (se aplicável)
4. **Correção**: Medidas corretivas são implementadas
5. **Documentação**: Incidente é documentado

### Processo de Resposta

1. **Isolamento**: Sistema isola área afetada
2. **Análise**: Determina causa e escopo
3. **Correção**: Implementa correções
4. **Verificação**: Testa correções
5. **Monitoramento**: Monitora por tentativas similares

---

## Boas Práticas de Segurança

### Para Usuários

1. **Use senhas fortes**
2. **Não compartilhe sua conta**
3. **Revise compartilhamentos regularmente**
4. **Use acesso rápido apenas em dispositivos confiáveis**
5. **Mantenha o app atualizado**

### Para Desenvolvedores

1. **Sempre valide `profile_id`**
2. **Use `ensure_profile_access()` antes de operações**
3. **Filtre queries por `profile_id`**
4. **Teste isolamento de dados**
5. **Documente permissões**

---

## Referências

- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [HIPAA - Health Insurance Portability and Accountability Act](https://www.hhs.gov/hipaa/index.html)
- [Arquitetura do Sistema](./ARQUITETURA.md)
- [Documentação de API](./API.md)

---

**Última atualização:** Janeiro 2026
