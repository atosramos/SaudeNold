# Documentação - Sistema Multiempresa (Perfis Familiares)

Bem-vindo à documentação completa do sistema multiempresa (perfis familiares) do SaudeNold.

## 📚 Índice da Documentação

### Para Desenvolvedores

1. **[Arquitetura do Sistema](./ARQUITETURA.md)**
   - Visão geral do sistema
   - Diagramas de arquitetura
   - Relacionamentos entre tabelas
   - Fluxos de criação e sincronização
   - Sistema de permissões (RBAC)

2. **[Documentação de API](./API.md)**
   - Todos os endpoints de família
   - Parâmetros e respostas
   - Exemplos de requisições
   - Códigos de erro
   - Casos de uso

3. **[Modelos de Dados](./MODELOS.md)**
   - Estrutura de todos os modelos
   - Relacionamentos
   - Índices e otimizações
   - Queries comuns

4. **[Guia de Migração](./MIGRACAO.md)**
   - Processo completo de migração
   - Scripts disponíveis
   - Procedimento de rollback
   - Troubleshooting

5. **[Documentação de Testes](./TESTES.md)**
   - Como executar testes
   - Estrutura de testes
   - Cobertura atual
   - Como adicionar novos testes

### Para Usuários

6. **[Guia do Usuário](./GUIA-USUARIO.md)**
   - Como criar e gerenciar perfis
   - Sistema de convites
   - Gerenciar permissões
   - Compartilhar dados
   - FAQ

### Para Conformidade

7. **[Segurança e Privacidade](./SEGURANCA.md)**
   - Isolamento de dados
   - Medidas de segurança
   - Conformidade LGPD (Brasil)
   - Conformidade HIPAA (EUA)
   - Política de privacidade

---

## 🚀 Início Rápido

### Para Desenvolvedores

1. Leia a [Arquitetura do Sistema](./ARQUITETURA.md) para entender a estrutura
2. Consulte a [Documentação de API](./API.md) para usar os endpoints
3. Veja os [Modelos de Dados](./MODELOS.md) para entender o schema
4. Execute os [Testes](./TESTES.md) para validar funcionalidades

### Para Usuários

1. Leia o [Guia do Usuário](./GUIA-USUARIO.md) para começar
2. Consulte a seção de FAQ para dúvidas comuns
3. Veja [Segurança e Privacidade](./SEGURANCA.md) para entender proteções

---

## 📊 Status da Documentação

| Documento | Status | Última Atualização |
|-----------|--------|-------------------|
| Arquitetura | ✅ Completo | Janeiro 2026 |
| API | ✅ Completo | Janeiro 2026 |
| Modelos | ✅ Completo | Janeiro 2026 |
| Migração | ✅ Completo | Janeiro 2026 |
| Testes | ✅ Completo | Janeiro 2026 |
| Guia do Usuário | ✅ Completo | Janeiro 2026 |
| Segurança | ✅ Completo | Janeiro 2026 |

---

## 🔗 Links Rápidos

### Documentação Técnica
- [Arquitetura](./ARQUITETURA.md) - Como o sistema funciona
- [API](./API.md) - Endpoints disponíveis
- [Modelos](./MODELOS.md) - Estrutura de dados
- [Testes](./TESTES.md) - Suite de testes

### Guias Práticos
- [Migração](./MIGRACAO.md) - Como migrar dados
- [Guia do Usuário](./GUIA-USUARIO.md) - Como usar o sistema
- [Segurança](./SEGURANCA.md) - Segurança e privacidade

---

## 📝 Issues Relacionadas

- **Issue #19** - Gestão de Perfis Familiares
- **Issue #20** - Sistema de Múltiplos Usuários
- **Issue #21** - Adição de Familiares
- **Issue #22** - Sistema de Convites
- **Issue #23** - Níveis de Acesso (RBAC)
- **Issue #34** - Migração de Dados Multiempresa ✅
- **Issue #35** - Testes Multiempresa ✅
- **Issue #36** - Documentação Multiempresa ✅

---

## 🎯 Conceitos Principais

### Família (Family)
Agrupamento principal que contém múltiplos perfis.

### Perfil (FamilyProfile)
Representa um membro da família com dados isolados.

### Isolamento de Dados
Garantia de que dados de um perfil não são acessíveis por outros perfis.

### Permissões (RBAC)
Sistema de controle de acesso baseado em roles (family_admin, adult_member, child, elder_under_care).

### Compartilhamento
Mecanismo para compartilhar dados entre perfis da mesma família com controle de permissões.

---

## 🔒 Segurança

O sistema implementa múltiplas camadas de segurança:

- ✅ **Isolamento completo** de dados por perfil
- ✅ **Controle de acesso** baseado em permissões
- ✅ **Criptografia** em trânsito (HTTPS/TLS)
- ✅ **Logs de auditoria** para rastreabilidade
- ✅ **Conformidade** com LGPD e HIPAA

Veja [Segurança e Privacidade](./SEGURANCA.md) para detalhes.

---

## 🧪 Testes

A suite de testes garante:

- ✅ **100% de cobertura** em testes críticos de isolamento
- ✅ **100% de cobertura** em modelos
- ✅ **100% de cobertura** em endpoints
- ✅ Testes de permissões, sincronização, performance e segurança

Veja [Documentação de Testes](./TESTES.md) para detalhes.

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte a documentação relevante
2. Verifique o [Guia de Troubleshooting](../troubleshooting/TROUBLESHOOTING.md)
3. Entre em contato com o suporte

---

## 📅 Histórico de Versões

### Janeiro 2026
- ✅ Documentação completa criada
- ✅ Todos os documentos técnicos finalizados
- ✅ Guia do usuário completo
- ✅ Documentação de segurança e conformidade

---

**Última atualização:** Janeiro 2026
