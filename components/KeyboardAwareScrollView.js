import React from 'react';
import { KeyboardAvoidingView, ScrollView, Platform } from 'react-native';

/**
 * Componente que combina KeyboardAvoidingView e ScrollView
 * para garantir que campos de entrada não sejam cobertos pelo teclado
 */
export default function KeyboardAwareScrollView({ children, style, contentContainerStyle, ...props }) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={[{ flex: 1 }, style]}
        contentContainerStyle={[
          { paddingBottom: 100 }, // Espaço extra no final para o teclado
          contentContainerStyle
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
