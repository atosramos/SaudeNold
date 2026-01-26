import { StyleSheet, Text, View } from 'react-native';

const requirements = [
  { key: 'length', label: 'Minimo 8 caracteres', test: (v) => v.length >= 8 },
  { key: 'lower', label: 'Letra minuscula', test: (v) => /[a-z]/.test(v) },
  { key: 'upper', label: 'Letra maiuscula', test: (v) => /[A-Z]/.test(v) },
  { key: 'number', label: 'Numero', test: (v) => /\d/.test(v) },
  { key: 'special', label: 'Caractere especial (!@#$%^&*)', test: (v) => /[!@#$%^&*]/.test(v) },
];

export const getPasswordStrength = (password) => {
  if (!password) {
    return { score: 0, checks: requirements.map((req) => ({ ...req, ok: false })) };
  }
  const checks = requirements.map((req) => ({ ...req, ok: req.test(password) }));
  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / requirements.length) * 100);
  return { score, checks };
};

export const isPasswordStrong = (password) => {
  return getPasswordStrength(password).score === 100;
};

export default function PasswordStrengthIndicator({ password }) {
  const { score, checks } = getPasswordStrength(password || '');
  const barColor = score === 100 ? '#4ECDC4' : score >= 60 ? '#FFA500' : '#FF6B6B';

  return (
    <View style={styles.container}>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${score}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.scoreText}>Forca da senha: {score}%</Text>
      {checks.map((check) => (
        <Text key={check.key} style={[styles.checkItem, check.ok ? styles.ok : styles.fail]}>
          {check.ok ? '✓' : '•'} {check.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  barBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    marginBottom: 6,
  },
  checkItem: {
    fontSize: 12,
    marginBottom: 2,
  },
  ok: {
    color: '#4ECDC4',
  },
  fail: {
    color: '#999',
  },
});
