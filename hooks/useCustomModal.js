import { useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const useCustomModal = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info', // 'info', 'success', 'error', 'warning', 'confirm'
    buttons: [],
    icon: null,
    iconColor: null,
  });

  const showModal = useCallback((title, message, type = 'info', buttons = [], icon = null, iconColor = null) => {
    setModalConfig({
      title,
      message,
      type,
      buttons: buttons.length > 0 ? buttons : [{ text: 'OK', onPress: () => {} }],
      icon,
      iconColor,
    });
    setModalVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const getIconAndColor = () => {
    if (modalConfig.icon && modalConfig.iconColor) {
      return { icon: modalConfig.icon, color: modalConfig.iconColor };
    }

    switch (modalConfig.type) {
      case 'success':
        return { icon: 'checkmark-circle', color: '#4ECDC4' };
      case 'error':
        return { icon: 'close-circle', color: '#FF6B6B' };
      case 'warning':
        return { icon: 'warning', color: '#FFA07A' };
      case 'confirm':
        return { icon: 'help-circle', color: '#95E1D3' };
      default:
        return { icon: 'information-circle', color: '#4ECDC4' };
    }
  };

  const ModalComponent = useCallback(() => {
    const { icon, color } = getIconAndColor();

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name={icon} size={48} color={color} />
              {modalConfig.title && (
                <Text style={styles.modalTitle}>{modalConfig.title}</Text>
              )}
              {modalConfig.message && (
                <Text style={styles.modalSubtitle}>{modalConfig.message}</Text>
              )}
            </View>

            <View style={styles.modalButtons}>
              {modalConfig.buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalButton,
                    button.style === 'destructive' && styles.destructiveButton,
                    button.style === 'cancel' && styles.cancelButton,
                    button.style === 'default' && styles.defaultButton,
                    modalConfig.buttons.length === 1 && styles.singleButton
                  ]}
                  onPress={() => {
                    if (button.onPress) {
                      button.onPress();
                    }
                    hideModal();
                  }}
                >
                  <Text style={[
                    styles.modalButtonText,
                    button.style === 'cancel' && styles.cancelButtonText
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {modalConfig.buttons.length > 1 && (
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={hideModal}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  }, [modalVisible, modalConfig, hideModal]);

  return { showModal, hideModal, ModalComponent };
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 22,
    color: '#666',
    textAlign: 'center',
  },
  modalButtons: {
    width: '100%',
    gap: 16,
    marginBottom: 16,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    gap: 12,
    minHeight: 80,
  },
  singleButton: {
    width: '100%',
  },
  defaultButton: {
    backgroundColor: '#4ECDC4',
  },
  destructiveButton: {
    backgroundColor: '#FF6B6B',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  modalButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  cancelButtonText: {
    color: '#333',
  },
  modalCancelButton: {
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 24,
    color: '#999',
    fontWeight: '600',
  },
});







