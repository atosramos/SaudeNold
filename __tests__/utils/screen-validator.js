/**
 * Utilitário para validar todas as telas do app
 * 
 * Este módulo fornece funções para verificar:
 * 1. Uso correto de useTheme()
 * 2. Validação de dados
 * 3. Tratamento de erros
 * 4. Proteção contra dados corrompidos
 */

/**
 * Lista todas as telas do app (hardcoded para funcionar nos testes)
 */
export const getAllScreens = () => {
  // Lista de todas as telas principais do app
  return [
    { name: 'daily-tracking', path: 'daily-tracking' },
    { name: 'settings', path: 'settings' },
    { name: 'medications', path: 'medications' },
    { name: 'medical-exams', path: 'medical-exams' },
    { name: 'doctor-visits', path: 'doctor-visits' },
    { name: 'emergency-contacts', path: 'emergency-contacts' },
    { name: 'vaccines', path: 'vaccines' },
    { name: 'history', path: 'history' },
    { name: 'anamnesis', path: 'anamnesis' },
    { name: 'sessions', path: 'sessions' },
    { name: 'profile-selection', path: 'profile-selection' },
    { name: 'index', path: 'index' },
    { name: 'about', path: 'about' },
    { name: 'alarm', path: 'alarm' },
    { name: 'biometric-devices', path: 'biometric-devices' },
    { name: 'pro-license', path: 'pro-license' },
    { name: 'login', path: 'auth/login' },
    { name: 'register', path: 'auth/register' },
    { name: 'forgot-password', path: 'auth/forgot-password' },
    { name: 'reset-password', path: 'auth/reset-password' },
    { name: 'verify-email', path: 'auth/verify-email' },
    { name: 'biometric-prompt', path: 'auth/biometric-prompt' },
    { name: 'biometric-suggestion', path: 'auth/biometric-suggestion' },
    { name: 'create-invite', path: 'family/create-invite' },
    { name: 'accept-invite', path: 'family/accept-invite' },
    { name: 'invites', path: 'family/invites' },
  ];
};

/**
 * Verifica se um arquivo usa useTheme corretamente
 * Nota: Esta função requer que o conteúdo do arquivo seja passado como parâmetro
 */
export const checkThemeUsage = (content) => {
  const issues = [];

  // Verificar se importa useTheme
  if (!content.includes("import") || !content.includes("useTheme")) {
    return { hasTheme: false, issues: [] };
  }

  // Verificar se extrai colors corretamente
  const hasDirectAccess = /useTheme\(\)\.colors/.test(content);
  if (hasDirectAccess) {
    issues.push('Acesso direto a useTheme().colors - deve extrair colors primeiro');
  }

  // Verificar se tem fallback
  const hasFallback = /themeContext\?\.colors\s*\|\|/.test(content) || 
                      /colors\s*=\s*themeContext\?\.colors\s*\|\|/.test(content);
  if (!hasFallback && content.includes('useTheme')) {
    issues.push('Falta fallback para colors quando useTheme retorna undefined');
  }

  // Verificar se usa destructuring
  const hasDestructuring = /const\s*\{\s*colors\s*\}/.test(content) ||
                           /const\s+themeContext\s*=/.test(content);
  if (!hasDestructuring && content.includes('useTheme')) {
    issues.push('Não está extraindo colors de useTheme() corretamente');
  }

  return { hasTheme: true, issues };
};

/**
 * Verifica se um arquivo valida dados antes de usar
 * Nota: Esta função requer que o conteúdo do arquivo seja passado como parâmetro
 */
export const checkDataValidation = (content) => {
  const issues = [];

  // Verificar validação de arrays antes de .map()
  const mapWithoutCheck = /\.map\(/g;
  const mapMatches = content.match(mapWithoutCheck) || [];
  const hasArrayCheck = /Array\.isArray\(|\(.*\|\|.*\[\]\)/.test(content);
  
  if (mapMatches.length > 0 && !hasArrayCheck) {
    issues.push('Usa .map() sem verificar se é array primeiro');
  }

  // Verificar validação de objetos antes de acessar propriedades
  const objectAccess = /\.(id|type|value|name)\b/g;
  const accessMatches = content.match(objectAccess) || [];
  const hasNullCheck = /if\s*\(.*\)|&&\s*\w+\./.test(content);
  
  if (accessMatches.length > 0 && !hasNullCheck) {
    issues.push('Acessa propriedades de objetos sem verificar se existem');
  }

  // Verificar tratamento de null/undefined
  const hasNullishCoalescing = /\?\?|!==\s*null|!==\s*undefined/.test(content);
  if (!hasNullishCoalescing && (content.includes('null') || content.includes('undefined'))) {
    issues.push('Pode não estar tratando null/undefined corretamente');
  }

  return { issues };
};

/**
 * Verifica se um arquivo trata erros em funções async
 * Nota: Esta função requer que o conteúdo do arquivo seja passado como parâmetro
 */
export const checkAsyncErrorHandling = (content) => {
  const issues = [];

  // Verificar se funções async têm try-catch
  const asyncFunctions = content.match(/async\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/g) || [];
  const hasTryCatch = /try\s*\{/.test(content);
  
  if (asyncFunctions.length > 0 && !hasTryCatch) {
    issues.push('Funções async sem try-catch - podem causar crashes');
  }

  // Verificar se estados são atualizados em finally
  const hasFinally = /finally\s*\{/.test(content);
  if (hasTryCatch && !hasFinally && content.includes('setLoading')) {
    issues.push('Loading state pode não ser resetado em caso de erro');
  }

  // Verificar se arrays são garantidos mesmo em erro
  const setStateCalls = content.match(/set\w+\(/g) || [];
  const hasArrayFallback = /\[\]|Array\.isArray/.test(content);
  
  if (setStateCalls.length > 0 && !hasArrayFallback && content.includes('useState([])')) {
    issues.push('Pode não garantir que arrays sejam válidos em caso de erro');
  }

  return { issues };
};

/**
 * Valida uma tela completa
 * Nota: Esta função requer que o conteúdo do arquivo seja passado como parâmetro
 */
export const validateScreen = (screenPath, content) => {
  if (!content) {
    return { valid: false, error: 'Conteúdo do arquivo não fornecido' };
  }

  const themeCheck = checkThemeUsage(content);
  const dataCheck = checkDataValidation(content);
  const asyncCheck = checkAsyncErrorHandling(content);

  const allIssues = [
    ...themeCheck.issues,
    ...dataCheck.issues,
    ...asyncCheck.issues,
  ];

  return {
    valid: allIssues.length === 0,
    hasTheme: themeCheck.hasTheme,
    issues: allIssues,
    path: screenPath,
  };
};

/**
 * Valida todas as telas do app
 * Nota: Esta função requer que os conteúdos dos arquivos sejam fornecidos
 */
export const validateAllScreens = (screenContents = {}) => {
  const screens = getAllScreens();
  const results = screens.map((screen) => {
    const content = screenContents[screen.path] || '';
    return validateScreen(screen.path, content);
  });
  
  return {
    total: screens.length,
    valid: results.filter(r => r.valid).length,
    invalid: results.filter(r => !r.valid).length,
    results,
  };
};
