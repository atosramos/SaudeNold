## Guia de contribuicao

### Fluxo basico
1. Crie um branch a partir do branch atual.
2. Faça alteracoes pequenas e objetivas.
3. Atualize ou crie documentacao quando necessario.
4. Rode testes relevantes.
5. Abra o PR com resumo e plano de testes.

### Padroes gerais
- Preferir mensagens claras e curtas.
- Evitar mudanças nao relacionadas na mesma PR.
- Manter compatibilidade com mobile e offline-first.

### Checklist antes do PR
- Codigo testado localmente quando aplicavel.
- Documentacao atualizada.
- Sem chaves ou segredos em arquivos versionados.

### Sistema Multiempresa (Perfis Familiares)

Ao trabalhar com funcionalidades de multiempresa, siga estas diretrizes:

#### Como Adicionar Novos Endpoints de Família

1. **Sempre valide `profile_id`**
   ```python
   profile_id = get_profile_context(request, db)
   if not profile_id:
       raise HTTPException(400, "Profile ID requerido")
   ```

2. **Use `ensure_profile_access()` antes de operações**
   ```python
   ensure_profile_access(user, db, profile_id, write_access=True)
   ```

3. **Filtre queries por `profile_id`**
   ```python
   medications = db.query(Medication).filter(
       Medication.profile_id == profile_id
   ).all()
   ```

4. **Teste isolamento de dados**
   - Crie testes que verificam que perfil A não acessa dados do perfil B
   - Teste acesso não autorizado
   - Execute `test_profile_isolation.py` antes de commitar

#### Como Garantir Isolamento de Dados

1. **Frontend**: Sempre use prefixo `profile_{id}_` nas chaves do AsyncStorage
2. **Backend**: Sempre inclua `X-Profile-Id` header nas requisições
3. **Database**: Todas as queries devem filtrar por `profile_id`
4. **Validação**: Use `ensure_profile_access()` em todas as operações

#### Como Testar Funcionalidades Multiempresa

1. **Execute testes de isolamento primeiro**
   ```bash
   python -m pytest tests/test_profile_isolation.py -v
   ```

2. **Execute testes específicos do seu endpoint**
   ```bash
   python -m pytest tests/test_family_endpoints.py::TestSeuEndpoint -v
   ```

3. **Verifique cobertura**
   ```bash
   python -m pytest tests/test_family_*.py --cov=backend
   ```

#### Padrões de Código para Multiempresa

1. **Nomenclatura**
   - Use `profile_id` (não `profileId` ou `profile`)
   - Use `family_id` (não `familyId`)

2. **Validação**
   - Sempre valide que perfil pertence à família do usuário
   - Sempre valide permissões antes de operações

3. **Erros**
   - Use códigos HTTP apropriados (403 para acesso negado, 404 para não encontrado)
   - Mensagens de erro claras e específicas

4. **Logs**
   - Registre todas as operações críticas
   - Registre tentativas de acesso não autorizado

#### Referências

- [Arquitetura do Sistema Multiempresa](./multiempresa/ARQUITETURA.md)
- [Documentação de API](./multiempresa/API.md)
- [Documentação de Testes](./multiempresa/TESTES.md)
- [Guia de Segurança](./multiempresa/SEGURANCA.md)

### Sugestao de template de PR
## Resumo
- O que foi feito e por que

## Plano de testes
- [ ] Testes manuais
- [ ] Testes automatizados

