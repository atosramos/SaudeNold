import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useCustomModal } from '../hooks/useCustomModal';

export default function EmergencyContacts() {
  const router = useRouter();
  const { showModal, ModalComponent } = useCustomModal();
  const [contacts, setContacts] = useState([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [])
  );

  const loadContacts = async () => {
    try {
      const stored = await AsyncStorage.getItem('emergencyContacts');
      if (stored) {
        setContacts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    }
  };

  const callContact = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const whatsappChat = async (phone) => {
    const formattedPhone = phone.replace(/\D/g, '');
    // Usa formato https://wa.me/ que funciona tanto no app quanto no navegador
    try {
      await Linking.openURL(`https://wa.me/${formattedPhone}`);
    } catch (err) {
      console.error('Erro ao abrir WhatsApp chat:', err);
      showModal('Erro', 'Não foi possível abrir o WhatsApp', 'error');
      throw err;
    }
  };

  const whatsappCall = async (phone) => {
    const formattedPhone = phone.replace(/\D/g, '');
    
    // O WhatsApp não tem deep link oficial para ligação direta
    // Vamos tentar abrir o chat primeiro, que é a forma mais confiável
    try {
      // Abre o chat do WhatsApp
      await whatsappChat(phone);
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      showModal('Erro', 'Não foi possível abrir o WhatsApp. Verifique se o aplicativo está instalado.', 'error');
    }
  };

  const showWhatsAppOptions = (phone) => {
    setSelectedPhone(phone);
    setShowWhatsAppModal(true);
  };

  const handleWhatsAppChat = () => {
    setShowWhatsAppModal(false);
    whatsappChat(selectedPhone);
  };

  const handleWhatsAppCall = () => {
    setShowWhatsAppModal(false);
    whatsappCall(selectedPhone);
  };

  const deleteContact = async (id) => {
    showModal(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este contato?',
      'confirm',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = contacts.filter(c => c.id !== id);
              await AsyncStorage.setItem('emergencyContacts', JSON.stringify(updated));
              setContacts(updated);
            } catch (error) {
              console.error('Erro ao excluir contato:', error);
              showModal('Erro', 'Não foi possível excluir o contato', 'error');
            }
          }
        }
      ]
    );
  };

  const renderContact = ({ item }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactPhoto}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.contactPhotoImage} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person" size={60} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <View style={styles.contactHeaderText}>
            <Text style={styles.contactName}>{item.name}</Text>
            <Text style={styles.contactRelation}>{item.relation}</Text>
            <Text style={styles.contactPhone}>{item.phone}</Text>
          </View>
          <View style={styles.contactCardActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push({
                pathname: '/emergency-contacts/edit',
                params: { id: item.id, contact: JSON.stringify(item) }
              })}
            >
              <Ionicons name="create-outline" size={24} color="#FF6B6B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteContact(item.id)}
            >
              <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.contactActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => callContact(item.phone)}
          >
            <Ionicons name="call" size={32} color="#fff" />
            <Text style={styles.actionButtonText}>Ligar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.whatsappButton]}
            onPress={() => showWhatsAppOptions(item.phone)}
          >
            <Ionicons name="logo-whatsapp" size={32} color="#fff" />
            <Text style={styles.actionButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const canAddContact = contacts.length < 5;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={32} color="#FF6B6B" />
        </TouchableOpacity>
        <Text style={styles.title}>Contatos de Emergência</Text>
        <Text style={styles.subtitle}>Máximo de 5 contatos</Text>
      </View>

      {contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="call-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum contato cadastrado</Text>
          <Text style={styles.emptySubtext}>Toque no botão + para adicionar</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
        />
      )}

      {canAddContact ? (
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/emergency-contacts/new')}
        >
          <Ionicons name="add" size={40} color="#fff" />
          <Text style={styles.addButtonText}>Adicionar Contato</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.limitMessage}>
          <Text style={styles.limitText}>Limite de 5 contatos atingido</Text>
        </View>
      )}

      {/* Modal customizado para escolha do WhatsApp */}
      <Modal
        visible={showWhatsAppModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWhatsAppModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="logo-whatsapp" size={48} color="#25D366" />
              <Text style={styles.modalTitle}>WhatsApp</Text>
              <Text style={styles.modalSubtitle}>Escolha uma opção</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.chatButton]}
                onPress={handleWhatsAppChat}
              >
                <Ionicons name="chatbubbles" size={40} color="#fff" />
                <Text style={styles.modalButtonText}>Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.callButton]}
                onPress={handleWhatsAppCall}
              >
                <Ionicons name="call" size={40} color="#fff" />
                <Text style={styles.modalButtonText}>Ligação</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowWhatsAppModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ModalComponent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#666',
  },
  list: {
    padding: 24,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderLeftWidth: 6,
    borderLeftColor: '#FF6B6B',
  },
  contactPhoto: {
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    alignItems: 'center',
    width: '100%',
  },
  contactHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  contactHeaderText: {
    flex: 1,
    alignItems: 'center',
  },
  contactCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  contactPhotoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
  },
  contactName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  contactRelation: {
    fontSize: 22,
    color: '#666',
    marginBottom: 8,
  },
  contactPhone: {
    fontSize: 24,
    color: '#333',
    marginBottom: 16,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
  },
  actionButton: {
    backgroundColor: '#4ECDC4',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  actionButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 22,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    margin: 24,
    borderRadius: 16,
    minHeight: 80,
  },
  addButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  limitMessage: {
    padding: 24,
    alignItems: 'center',
  },
  limitText: {
    fontSize: 22,
    color: '#999',
    textAlign: 'center',
  },
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
  },
  modalSubtitle: {
    fontSize: 22,
    color: '#666',
  },
  modalButtons: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 16,
    gap: 12,
    minHeight: 100,
  },
  chatButton: {
    backgroundColor: '#25D366',
  },
  callButton: {
    backgroundColor: '#4ECDC4',
  },
  modalButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
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














