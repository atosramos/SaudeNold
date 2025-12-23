import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

export default function EmergencyContacts() {
  const router = useRouter();
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    loadContacts();
  }, []);

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

  const whatsappContact = (phone) => {
    const formattedPhone = phone.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=${formattedPhone}`);
  };

  const renderContact = ({ item }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactPhoto}>
        {item.photo ? (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person" size={60} color="#fff" />
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person" size={60} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactRelation}>{item.relation}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
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
            onPress={() => whatsappContact(item.phone)}
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
});





