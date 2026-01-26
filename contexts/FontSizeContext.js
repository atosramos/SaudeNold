import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFontSize, setFontSize, FONT_SIZES } from '../services/fontSizeService';

// Exportar FONT_SIZES para uso em outros componentes
export { FONT_SIZES };

const FontSizeContext = createContext();

export const FontSizeProvider = ({ children }) => {
  const [fontSize, setFontSizeState] = useState(FONT_SIZES.small);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFontSize();
  }, []);

  const loadFontSize = async () => {
    try {
      const savedFontSize = await getFontSize();
      setFontSizeState(savedFontSize);
    } catch (error) {
      console.error('Erro ao carregar tamanho da fonte:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFontSize = async (newFontSize) => {
    try {
      const success = await setFontSize(newFontSize);
      if (success) {
        setFontSizeState(newFontSize);
      }
      return success;
    } catch (error) {
      console.error('Erro ao atualizar tamanho da fonte:', error);
      return false;
    }
  };

  // Multiplicadores de tamanho de fonte
  const multipliers = {
    [FONT_SIZES.small]: 1.0,    // Tamanho atual (base)
    [FONT_SIZES.medium]: 1.2,   // 20% maior
    [FONT_SIZES.large]: 1.4,    // 40% maior
  };

  const getMultiplier = () => multipliers[fontSize] || 1.0;

  // Função helper para calcular tamanho de fonte
  const scaleFontSize = (baseSize) => {
    return Math.round(baseSize * getMultiplier());
  };

  const value = {
    fontSize,
    updateFontSize,
    scaleFontSize,
    getMultiplier,
    isLoading,
    isSmall: fontSize === FONT_SIZES.small,
    isMedium: fontSize === FONT_SIZES.medium,
    isLarge: fontSize === FONT_SIZES.large,
  };

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize deve ser usado dentro de FontSizeProvider');
  }
  return context;
};
