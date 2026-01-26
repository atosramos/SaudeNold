import { StyleSheet, Text, View, TextInput } from 'react-native';
import VoiceTextInput from './VoiceTextInput';

export default function FamilyMemberForm({ values, onChange, showEmail, errors = {} }) {
  return (
    <View>
      <Text style={styles.label}>Nome</Text>
      <VoiceTextInput
        value={values.name}
        onChangeText={(value) => onChange('name', value)}
        placeholder="Nome completo"
        placeholderTextColor="#999"
        containerStyle={styles.inputRow}
        inputStyle={styles.inputField}
      />
      {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

      {/* Data de nascimento será gerenciada pela tela com DateTimePicker */}

      <Text style={styles.label}>Gênero</Text>
      <VoiceTextInput
        value={values.gender}
        onChangeText={(value) => onChange('gender', value)}
        placeholder="Ex: feminino, masculino, outro"
        placeholderTextColor="#999"
        containerStyle={styles.inputRow}
        inputStyle={styles.inputField}
      />
      {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}

      <Text style={styles.label}>Tipo sanguíneo</Text>
      <VoiceTextInput
        value={values.blood_type}
        onChangeText={(value) => onChange('blood_type', value)}
        placeholder="Ex: O+, A-"
        placeholderTextColor="#999"
        containerStyle={styles.inputRow}
        inputStyle={styles.inputField}
      />
      {errors.blood_type ? <Text style={styles.errorText}>{errors.blood_type}</Text> : null}

      {showEmail && (
        <>
          <Text style={styles.label}>Email (opcional)</Text>
          <VoiceTextInput
            value={values.email}
            onChangeText={(value) => onChange('email', value)}
            placeholder="email@exemplo.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            containerStyle={styles.inputRow}
            inputStyle={styles.inputField}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  inputRow: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: '#c53030',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 12,
  },
});
