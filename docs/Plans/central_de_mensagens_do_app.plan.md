Plano: Central de mensagens (alertas) no app

Situação atual





Meus medicamentos (e algumas telas como daily-tracking, medical-exams, pro-license) usam o hook [useCustomAlert](SaudeNold/hooks/useCustomAlert.js) e o componente [CustomAlert](SaudeNold/components/CustomAlert.js): modal in-app com ícone, título, mensagem e botões, com tipos success, error, warning, info.



Cuidadores, Compartilhar dados, Vacinas, Perfil, Auth, Configurações, Anamnese e outras 41 telas usam Alert.alert() do React Native: diálogo nativo do SO (no Android aparece o alerta padrão com "OK"), visual e comportamento diferentes.

Isso gera experiência inconsistente e qualquer mudança de formato exige editar dezenas de arquivos.

Abordagem

Criar uma central de alertas via contexto React que:





Mantém um único estado de alerta e uma única instância do CustomAlert no root do app.



Expõe uma API única (showAlert ou helpers showSuccess, showError, etc.) para qualquer tela.



Permite centralizar títulos padrão (ex.: "Sucesso", "Erro", "Atenção") e, opcionalmente, mensagens comuns (ex.: "Salvo com sucesso"), para alterar tudo em um lugar.

Assim, o visual e o comportamento passam a ser sempre o do CustomAlert; mudanças de estilo, ícones ou textos padrão ficam em poucos arquivos.

Arquitetura

flowchart LR
  subgraph root [Root Layout]
    Provider[AlertProvider]
    SingleAlert[CustomAlert unico]
  end
  subgraph screens [Telas]
    A[Medicamentos]
    B[Cuidadores]
    C[Compartilhar dados]
    D[Outras 38+]
  end
  Provider --> SingleAlert
  A --> useAlert
  B --> useAlert
  C --> useAlert
  D --> useAlert
  useAlert --> Provider





AlertContext: estado { visible, title, message, type, buttons } + função showAlert(title, message, type, buttons).



AlertProvider: renderiza os filhos e um único <CustomAlert ... /> (usando o estado do contexto). Pode oferecer atalhos: showSuccess(message, buttons), showError(message, buttons), showWarning(message, buttons), showInfo(message, buttons) com títulos padrão definidos no próprio contexto (ou em um arquivo de constantes).



useAlert(): hook que retorna { showAlert, showSuccess, showError, showWarning, showInfo } do contexto. Qualquer tela usa esse hook e deixa de usar Alert.alert ou o useCustomAlert local.

Implementação

1. Criar o contexto e o provider





Arquivo novo: SaudeNold/contexts/AlertContext.js





createContext para o alerta global.



AlertProvider: estado do alerta (visible, title, message, type, buttons); showAlert(title, message, type, buttons); opcionalmente showSuccess(message, buttons), showError(message, buttons), showWarning(message, buttons), showInfo(message, buttons) usando títulos fixos (ex.: "Sucesso", "Erro", "Atenção", "Info") para poder alterar todos os títulos em um único lugar.



O provider renderiza {children} e um único <CustomAlert visible={...} title={...} ... onClose={hide} />.



Hook useAlert() que consome o contexto e retorna as funções acima.

2. Integrar no layout raiz





Arquivo: SaudeNold/app/_layout.js





Envolver a árvore (por exemplo, dentro do ThemeProvider) com <AlertProvider>.



Não é necessário cada tela renderizar <AlertComponent />; o provider já renderiza o único CustomAlert.

3. Centralizar títulos (e opcionalmente mensagens comuns)





Opção A (recomendada): Títulos padrão como constantes dentro de SaudeNold/contexts/AlertContext.js (ex.: TITLES = { success: 'Sucesso', error: 'Erro', warning: 'Atenção', info: 'Info' }). Os helpers usam esses títulos.



Opção B: Arquivo SaudeNold/constants/messages.js com títulos e mensagens comuns (ex.: "Salvo com sucesso", "Não foi possível salvar") para uso nas telas e no contexto. Facilita i18n no futuro.

4. Migrar telas que usam Alert.alert

Substituir em todas as 41 telas:





Alert.alert('Erro', '...') por showError('...') ou showAlert('Erro', '...', 'error').



Alert.alert('Sucesso', '...') por showSuccess('...').



Alert.alert('Atenção', '...') ou Alert.alert('Aviso', '...') por showWarning('...').



Confirmações com dois botões: showAlert(title, message, 'warning', [{ text: 'Cancelar', style: 'cancel', onPress: () => {} }, { text: 'Excluir', style: 'destructive', onPress: () => handleDelete() }]). O CustomAlert já suporta buttons e onClose.

Arquivos a alterar (lista para substituição):
profile-selection.js, auth/pin-reset.js, family/caregivers.js, family/share-data.js, vaccines.js, daily-tracking.js, daily-tracking/new.js, daily-tracking/[id].js, compliance/data-export.js, compliance/data-deletion.js, compliance/audit-logs.js, privacy/settings.js, privacy/terms.js, privacy/child-consents.js, auth/biometric-prompt.js, family/create-invite.js, medical-exams/new.js, auth/login.js, auth/register.js, anamnesis.js, emergency/emergency-mode.js, emergency/emergency-settings.js, sessions.js, family/accept-invite.js, settings.js, family/add-elder.js, family/add-adult.js, family/add-child.js, family/invites.js, doctor-visits/new.js, doctor-visits/edit.js, auth/biometric-suggestion.js, medications/edit.js, emergency-contacts/new.js, emergency-contacts/edit.js, auth/verify-email.js, auth/forgot-password.js, auth/reset-password.js, biometric-devices.js, medications/debug.js (e pro-license.js já usa useCustomAlert; migrar para useAlert).

5. Migrar telas que já usam useCustomAlert





Em SaudeNold/app/medications/new.js, SaudeNold/app/daily-tracking/new.js, SaudeNold/app/daily-tracking/chart.js, SaudeNold/app/daily-tracking/[id].js, SaudeNold/app/daily-tracking/[id]/edit.js, SaudeNold/app/medical-exams/new.js, SaudeNold/app/medical-exams/[id].js, SaudeNold/app/medical-exams/parameter-timeline.js, SaudeNold/app/pro-license.js:





Remover import e uso de useCustomAlert e remover a renderização de <AlertComponent />.



Importar useAlert do AlertContext e usar showAlert / showSuccess / showError / showWarning / showInfo com a mesma assinatura (title, message, type, buttons).

6. Componentes fora de app/





SaudeNold/components/ConsentManager.js, SaudeNold/components/TermsAcceptance.js: se usarem Alert.alert, precisarão receber showAlert/showError por props ou usar useAlert() se forem usados dentro da árvore que já está sob AlertProvider.

7. Manter ou deprecar useCustomAlert e CustomAlert





CustomAlert: manter como componente de apresentação; o AlertProvider usa esse componente.



useCustomAlert: pode ser mantido como wrapper fino que usa o contexto (useAlert) e retorna a mesma API, para reduzir mudanças nas telas que já chamam showAlert(..., 'success'). Ou remover e padronizar todas as telas em useAlert() do contexto.

8. Tema (opcional)





SaudeNold/components/CustomAlert.js usa cores fixas. Para alinhar ao resto do app, pode-se usar useTheme() do ThemeContext e aplicar colors (background, texto, botões) no CustomAlert; assim, mudanças de tema passam a valer também para os alertas.

Ordem sugerida





Criar AlertContext.js (contexto + provider + useAlert + um CustomAlert no provider).



Envolver o app com AlertProvider em _layout.js.



Migrar as telas que já usam useCustomAlert para useAlert() e remover <AlertComponent /> (evita dois sistemas em paralelo).



Substituir Alert.alert pelas funções do useAlert() nas 41 telas (em lotes: família, auth, compliance, etc.).



(Opcional) Centralizar títulos/mensagens em constantes; (opcional) integrar CustomAlert ao tema.

Resultado esperado





Uma única forma de exibir sucesso, erro, aviso e confirmação em todo o app (sempre o modal do CustomAlert).



Um único ponto para alterar formato visual (CustomAlert.js) e um único ponto para alterar títulos padrão (AlertContext ou constants/messages.js).



Experiência consistente entre Meus medicamentos, Cuidadores, Compartilhar dados, Vacinas e demais telas, sem variação entre alerta nativo e modal do app.

