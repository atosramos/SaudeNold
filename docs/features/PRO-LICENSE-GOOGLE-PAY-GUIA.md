## Guia - Comprar Licenca PRO via Google Pay

### Status atual
A interface de compra existe, mas a integracao completa depende do backend e do Google Play Console. Veja `docs/features/GOOGLE-PAY-INTEGRATION.md` para detalhes tecnicos.

### Quando estiver habilitado
1. Abra o app e toque em **"Licenca PRO"**.
2. Escolha o plano (1 mes, 6 meses, 1 ano).
3. Confirme o pagamento no Google Pay.
4. A licenca e ativada automaticamente.

### Requisitos
- Conta Google com metodo de pagamento configurado.
- App instalado a partir de build com configuracao do Google Play.
- Backend configurado para processar pagamentos.

### Problemas comuns
- **Google Pay indisponivel:** verifique suporte do dispositivo e conta.
- **Compra nao concluida:** tente novamente e verifique conexao.
- **Licenca nao ativou:** aguarde a sincronizacao e tente abrir a tela "Licenca PRO" novamente.

