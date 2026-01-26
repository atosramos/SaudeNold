import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'app_theme';
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

/**
 * Obtém o tema atual salvo
 */
export const getTheme = async () => {
  try {
    const theme = await AsyncStorage.getItem(THEME_KEY);
    return theme || THEMES.LIGHT; // Padrão: light
  } catch (error) {
    console.error('Erro ao obter tema:', error);
    return THEMES.LIGHT;
  }
};

/**
 * Salva o tema selecionado
 */
export const setTheme = async (theme) => {
  try {
    if (theme !== THEMES.LIGHT && theme !== THEMES.DARK) {
      throw new Error('Tema inválido');
    }
    await AsyncStorage.setItem(THEME_KEY, theme);
    return true;
  } catch (error) {
    console.error('Erro ao salvar tema:', error);
    return false;
  }
};

/**
 * Verifica se o tema atual é escuro
 */
export const isDarkTheme = async () => {
  const theme = await getTheme();
  return theme === THEMES.DARK;
};
