## Objetivo
Implementar armazenamento seguro de imagens (fotos de perfil, documentos médicos) com criptografia e controle de acesso.

## Contexto Atual
App mobile (Expo/React Native) offline-first. Armazenamento local precisa continuar funcional sem backend, com sincronização posterior.

## Tarefas
- [ ] Configurar armazenamento de imagens
  - [ ] Escolher provedor (AWS S3, Google Cloud Storage, ou local)
  - [ ] Configurar bucket/container
  - [ ] Configurar políticas de acesso
  - [ ] Implementar upload seguro
  - [ ] Suportar tipos: PDF, JPG, PNG, DICOM
- [ ] Implementar criptografia de imagens
  - [ ] Criptografar imagens antes de armazenar
  - [ ] Usar AES-256 para criptografia
  - [ ] Armazenar chaves de criptografia de forma segura
  - [ ] Descriptografar apenas quando necessário
- [ ] Implementar controle de acesso
  - [ ] Validar permissões antes de servir imagens
  - [ ] URLs assinadas com expiração
  - [ ] Endpoint protegido para servir imagens (`GET /api/images/:imageId`)
  - [ ] Verificar se usuário tem permissão para acessar imagem
- [ ] Implementar upload de imagens
  - [ ] Endpoint para upload (`POST /api/images/upload`)
  - [ ] Validação de tipo de arquivo (apenas imagens)
  - [ ] Validação de tamanho (limite máximo)
  - [ ] Redimensionamento automático se necessário
  - [ ] Geração de thumbnail
  - [ ] Associação de imagem ao perfil/recorde
  - [ ] Compressão inteligente sem perder legibilidade
  - [ ] OCR automático para extrair texto pesquisável
- [ ] Implementar gerenciamento de imagens
  - [ ] Endpoint para listar imagens do usuário
  - [ ] Endpoint para deletar imagem (`DELETE /api/images/:imageId`)
  - [ ] Verificar permissões antes de deletar
  - [ ] Limpar imagens órfãs periodicamente
  - [ ] Metadados estruturados (data do exame, médico, categoria)
  - [ ] Tags personalizadas e organização cronológica
  - [ ] Busca full-text no conteúdo OCR
- [ ] Implementar segurança adicional
  - [ ] Scan de vírus/malware (opcional)
  - [ ] Sanitização de metadados EXIF
  - [ ] Rate limiting no upload
  - [ ] Logs de acesso a imagens
  - [ ] Watermark invisível com ID do usuário
  - [ ] Verificação de integridade via hash SHA-256
  - [ ] Detecção de duplicatas para economizar espaço
  - [ ] Níveis de sensibilidade: Normal, Confidencial, Muito Confidencial
  - [ ] Re-autenticação para documentos muito confidenciais
  - [ ] Compartilhamento temporário via link com expiração
  - [ ] Código de acesso único para compartilhamento presencial
  - [ ] Marca d'água "COPIA" ao exportar/compartilhar
  - [ ] Alertas de quota (80%) e limites por plano

## Arquivos a Criar/Modificar
- `backend/services/image_service.py` - Serviço de imagens
- `backend/services/encryption_service.py` - Serviço de criptografia
- `backend/routes/image_routes.py` - Rotas de imagens
- `backend/utils/image_utils.py` - Utilitários de processamento
- `frontend/services/imageService.js` - Serviço de imagens
- `frontend/components/ImageUploader.js` - Componente de upload
- `frontend/components/SecureImage.js` - Componente para exibir imagens seguras

## Variáveis de Ambiente
- `IMAGE_STORAGE_PROVIDER` - Provedor (s3, gcs, local)
- `AWS_ACCESS_KEY_ID` - Se usar S3
- `AWS_SECRET_ACCESS_KEY` - Se usar S3
- `S3_BUCKET_NAME` - Nome do bucket
- `IMAGE_ENCRYPTION_KEY` - Chave para criptografia
- `MAX_IMAGE_SIZE_MB` - Tamanho máximo (padrão: 10MB)
- `FREE_TIER_QUOTA_MB` - Quota para plano gratuito (padrão: 500MB)
- `PREMIUM_TIER_QUOTA_MB` - Quota para plano premium (padrão: 5GB)

## Referências
- Especificação técnica: Seção 7 - Recursos Avançados de Segurança
- [AWS S3 security](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security.html)
- [Image encryption best practices](https://owasp.org/www-community/vulnerabilities/Insecure_Direct_Object_References)

## Prioridade
🟡 Média
