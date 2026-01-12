# Instruções de Setup

## Configuração do Git (Primeira vez)

Antes de fazer o primeiro push, configure seu git:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

Ou apenas para este repositório (sem --global):

```bash
git config user.name "Seu Nome"
git config user.email "seu@email.com"
```

## Primeiro Push

Após configurar o git, faça o commit e push:

```bash
git add .
git commit -m "Initial commit: SaudeNold app structure"
git branch -M main  # Renomeia a branch para main se necessário
git push -u origin main
```

**Nota**: Se o Git criar a branch como `master`, use `git branch -M main` para renomear antes do push.

## Repositório Remoto

O repositório remoto já está configurado:
- **URL**: https://github.com/atosramos/SaudeNold
- **Remote**: origin

