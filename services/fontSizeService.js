import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_SIZE_KEY = '@app:fontSize';
const DEFAULT_FONT_SIZE = 'small'; // pequena, media, grande

export const FONT_SIZES = {
  small: 'small',
  medium: 'medium',
  large: 'large',
};

export const getFontSize = async () => {
  try {
    const fontSize = await AsyncStorage.getItem(FONT_SIZE_KEY);
    return fontSize || DEFAULT_FONT_SIZE;
  } catch (error) {
    console.error('Erro ao obter tamanho da fonte:', error);
    return DEFAULT_FONT_SIZE;
  }
};

export const setFontSize = async (fontSize) => {
  try {
    await AsyncStorage.setItem(FONT_SIZE_KEY, fontSize);
    return true;
  } catch (error) {
    console.error('Erro ao salvar tamanho da fonte:', error);
    return false;
  }
};
