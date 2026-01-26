// Inicializar UIManager antes do jest-expo tentar usá-lo
const { NativeModules } = require('react-native');
if (!NativeModules.UIManager) {
  NativeModules.UIManager = {};
}

// Mock do AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock do expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useFocusEffect: (callback) => {
    // Simular focus effect
    if (typeof callback === 'function') {
      callback();
    }
  },
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  useSegments: () => [],
  Link: 'Link',
  Stack: {
    Screen: 'Screen',
  },
}));

// Mock do ThemeContext será sobrescrito nos testes individuais
// Mantemos um mock padrão aqui para outros testes
jest.mock('./contexts/ThemeContext', () => {
  const actualModule = jest.requireActual('./contexts/ThemeContext');
  return {
    ...actualModule,
    useTheme: jest.fn(() => ({
      theme: 'light',
      isDark: false,
      colors: {
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
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
      isLoading: false,
    })),
    ThemeProvider: ({ children }) => children,
  };
});

// Mock do FontSizeContext
jest.mock('./contexts/FontSizeContext', () => ({
  useFontSize: jest.fn(() => ({
    fontSize: 'medium',
    scaleFontSize: (size) => size,
    setFontSize: jest.fn(),
  })),
  FontSizeProvider: ({ children }) => children,
}));

// Mock do expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock do expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock do Alert
jest.spyOn(require('react-native'), 'Alert').mockImplementation((title, message, buttons) => {
  if (buttons && buttons.length > 0) {
    buttons.forEach((button) => {
      if (button.onPress) {
        button.onPress();
      }
    });
  }
});

// Silenciar console.warn e console.error durante os testes (opcional)
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
