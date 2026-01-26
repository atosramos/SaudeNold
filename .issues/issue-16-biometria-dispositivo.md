## Objetivo
Implementar autenticação biométrica (Face ID, Touch ID, impressão digital) para login rápido e seguro no dispositivo.

## Contexto Atual
App mobile (Expo/React Native) offline-first com dados locais. Backend é opcional; autenticação deve funcionar localmente e sincronizar quando possível.

## Tarefas
- [ ] Configurar biblioteca de biometria no frontend
  - [ ] Instalar `react-native-biometrics`
  - [ ] Verificar disponibilidade de biometria no dispositivo
  - [ ] Implementar função `enableBiometricLogin()` para registrar chaves
  - [ ] Criar chaves no Keychain/Keystore do dispositivo
  - [ ] Habilitar biometria somente após primeiro login bem-sucedido
- [ ] Implementar registro de biometria
  - [ ] Endpoint para registrar chave pública (`POST /api/user/biometric/register`)
  - [ ] Armazenar publicKey e deviceId no backend
  - [ ] Associar biometria ao usuário
  - [ ] Permitir múltiplos dispositivos
- [ ] Implementar autenticação biométrica
  - [ ] Função `authenticateWithBiometric()` no frontend
  - [ ] Gerar challenge para assinatura
  - [ ] Criar assinatura com chave privada
  - [ ] Endpoint para validar assinatura (`POST /api/auth/biometric`)
  - [ ] Verificar assinatura no backend
  - [ ] Gerar tokens JWT após validação
- [ ] Implementar gerenciamento de dispositivos biométricos
  - [ ] Listar dispositivos registrados
  - [ ] Endpoint para remover dispositivo (`DELETE /api/user/biometric/device/:deviceId`)
  - [ ] UI para gerenciar dispositivos
- [ ] Tratamento de erros e fallback
  - [ ] Fallback para PIN quando biometria falhar
  - [ ] Mensagens de erro adequadas
  - [ ] Verificar se biometria está disponível antes de usar

## Arquivos a Criar/Modificar
- `frontend/services/biometricService.js` - Serviço de biometria
- `frontend/components/BiometricSetup.js` - Componente de configuração
- `backend/services/biometric_service.py` - Validação de biometria
- `backend/routes/auth_routes.py` - Rota de autenticação biométrica
- `backend/routes/user_routes.py` - Rotas de gerenciamento de biometria
- `backend/models/user_model.py` - Adicionar campo para dispositivos biométricos

## Referências
- Especificação técnica: Seção 1.1.4 - Biometria do Dispositivo
- [react-native-biometrics](https://github.com/SelfLender/react-native-biometrics)
- [iOS Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [Android Keystore](https://developer.android.com/training/articles/keystore)

## Prioridade
🟡 Média
