import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfileCard({ profile, onPress, onLongPress, isActive }) {
  const { colors } = useTheme();
  const isProtected = profile?.pin_enabled && profile?.account_type !== 'child';
  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.surface, borderColor: isActive ? colors.primary : 'transparent' }, isActive && styles.activeCard]} 
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>{profile?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {profile?.name || 'Perfil'}
      </Text>
      <Text style={[styles.type, { color: colors.textSecondary }]} numberOfLines={1}>
        {profile?.account_type === 'family_admin' ? 'Administrador' : profile?.account_type === 'adult_member' ? 'Adulto' : profile?.account_type === 'elder_under_care' ? 'Idoso' : 'Criança'}
      </Text>
      {isProtected && (
        <View style={[styles.lockBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="lock-closed" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '45%',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  activeCard: {
    borderWidth: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  type: {
    fontSize: 12,
    marginTop: 4,
  },
  lockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 10,
    padding: 4,
  },
});
