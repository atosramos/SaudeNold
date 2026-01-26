import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTheme, setTheme as saveTheme, THEMES } from '../services/themeService';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(THEMES.LIGHT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await getTheme();
        setThemeState(savedTheme);
      } catch (error) {
        console.error('Erro ao carregar tema:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme) => {
    try {
      await saveTheme(newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Erro ao alterar tema:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    await setTheme(newTheme);
  };

  const isDark = theme === THEMES.DARK;

  // Cores do tema
  const colors = {
    light: {
      background: '#f5f5f5',
      surface: '#ffffff',
      text: '#333333',
      textSecondary: '#666666',
      textTertiary: '#999999',
      border: '#e0e0e0',
      primary: '#4ECDC4',
      error: '#FF6B6B',
      success: '#2ECC71',
      warning: '#E67E22',
    },
    dark: {
      background: '#121212',
      surface: '#1E1E1E',
      text: '#FFFFFF',
      textSecondary: '#B0B0B0',
      textTertiary: '#808080',
      border: '#333333',
      primary: '#4ECDC4',
      error: '#FF6B6B',
      success: '#2ECC71',
      warning: '#E67E22',
    },
  };

  const value = {
    theme,
    isDark,
    colors: colors[theme],
    setTheme,
    toggleTheme,
    isLoading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
