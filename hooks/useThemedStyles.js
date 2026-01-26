import { useTheme } from '../contexts/ThemeContext';
import { StyleSheet } from 'react-native';

/**
 * Hook para criar estilos que se adaptam automaticamente ao tema
 * 
 * @param {Function} styleFunction - Função que recebe `colors` e retorna um objeto de estilos
 * @returns {Object} Objeto de estilos do StyleSheet
 * 
 * @example
 * const styles = useThemedStyles((colors) => ({
 *   container: {
 *     backgroundColor: colors.background,
 *   },
 *   text: {
 *     color: colors.text,
 *   },
 * }));
 */
export const useThemedStyles = (styleFunction) => {
  const { colors } = useTheme();
  return StyleSheet.create(styleFunction(colors));
};
