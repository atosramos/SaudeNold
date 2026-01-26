# Licença PRO e Sistema de Convites Familiares

## Requisito de Licença PRO

**IMPORTANTE:** Quando os dados estão armazenados no servidor, é **obrigatório** ter uma licença PRO ativa para criar convites familiares.

## Justificativa

O armazenamento de dados no servidor requer recursos de infraestrutura e segurança adicionais. A licença PRO garante que:

1. **Recursos de Servidor:** Usuários com licença PRO contribuem para a manutenção da infraestrutura necessária para armazenar dados de múltiplos perfis familiares no servidor.

2. **Segurança:** A licença PRO permite implementar medidas de segurança mais robustas para dados sensíveis armazenados no servidor.

3. **Escalabilidade:** Limita o uso de recursos do servidor a usuários que adquiriram a licença, garantindo melhor performance para todos.

## Implementação

### Validação no Backend

O endpoint `POST /api/family/invite-adult` verifica automaticamente se o usuário possui licença PRO ativa antes de permitir a criação de convites:

```python
# Verificação automática em backend/main.py
has_pro_license = check_user_has_active_pro_license(db, user)
if not has_pro_license:
    raise HTTPException(
        status_code=403,
        detail="Licença PRO necessária para criar convites quando dados estão armazenados no servidor."
    )
```

### Função de Verificação

A função `check_user_has_active_pro_license()` verifica:
- Se existe uma licença associada ao usuário
- Se a licença está ativa (`is_active == True`)
- Se a licença não expirou (`expiration_date > now()`)

## Comportamento

### Com Licença PRO Ativa
- ✅ Usuário pode criar convites familiares
- ✅ Dados são armazenados no servidor
- ✅ Sincronização entre dispositivos funciona
- ✅ Backup automático no servidor

### Sem Licença PRO
- ❌ Não pode criar convites familiares
- ✅ Pode usar o app normalmente com dados locais
- ✅ Todas as funcionalidades de entrada manual disponíveis
- ⚠️ Dados ficam apenas no dispositivo (sem sincronização)

## Mensagem de Erro

Quando um usuário sem licença PRO tenta criar um convite, recebe a seguinte mensagem:

```
Licença PRO necessária para criar convites quando dados estão armazenados no servidor. 
Adquira uma licença PRO para continuar.
```

## Logs de Segurança

Todas as tentativas de criar convites sem licença PRO são registradas nos logs de segurança:

```
Tentativa de criar convite sem licença PRO - usuário {user_id}
```

## Exceções

Atualmente, não há exceções para este requisito. Todos os usuários que desejam criar convites quando dados estão no servidor devem ter licença PRO ativa.

## Relacionamento com Outras Funcionalidades

- **Armazenamento Local:** Não requer licença PRO (dados ficam apenas no dispositivo)
- **Armazenamento no Servidor:** **REQUER licença PRO ativa** (conformidade LGPD/HIPAA)
- **Funcionalidades PRO (IA):** Requerem licença PRO (exames, OCR, etc.)
- **Convites Familiares:** Requerem licença PRO quando dados estão no servidor
- **Sincronização para Servidor:** Requer licença PRO ativa
- **Sincronização do Servidor:** Permite buscar dados mesmo sem licença PRO (para usuários que tiveram licença antes)

## Referências

- Issue #22: Sistema de Convites
- Issue #20: Sistema de Múltiplos Usuários
- `docs/features/PRO-LICENSE-SYSTEM.md` - Sistema de Licenças PRO
- `backend/main.py` - Implementação da validação

---

**Última atualização:** Janeiro 2025
