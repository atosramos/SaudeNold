import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function CustomAlert({ visible, title, message, type = 'info', buttons = [], onClose }) {
  const { colors } = useTheme();

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle', color: colors.success };
      case 'error':
        return { name: 'close-circle', color: colors.error };
      case 'warning':
        return { name: 'warning', color: colors.warning };
      default:
        return { name: 'information-circle', color: colors.primary };
    }
  };

  const icon = getIcon();

  // Se não houver botões, adiciona um botão padrão "OK"
  const displayButtons = buttons.length > 0 ? buttons : [{ text: 'OK', onPress: onClose }];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.alertContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon.name} size={64} color={icon.color} />
          </View>
          
          {title && (
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          )}
          
          {message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          )}

          <View style={styles.buttonsContainer}>
            {displayButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  { backgroundColor: colors.primary },
                  button.style === 'destructive' && { backgroundColor: colors.error },
                  button.style === 'cancel' && [styles.cancelButton, { backgroundColor: colors.border }],
                  displayButtons.length === 1 && styles.singleButton
                ]}
                onPress={() => {
                  if (button.onPress) {
                    button.onPress();
                  }
                  if (onClose) {
                    onClose();
                  }
                }}
              >
                <Text style={[
                  styles.buttonText,
                  button.style === 'destructive' && styles.destructiveButtonText,
                  button.style === 'cancel' && [styles.cancelButtonText, { color: colors.text }]
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 30,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  singleButton: {
    flex: 0,
    minWidth: 120,
  },
  cancelButton: {},
  buttonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  destructiveButtonText: {
    color: '#fff',
  },
  cancelButtonText: {},
});







