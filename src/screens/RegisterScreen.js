import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';
import { useRegistration, useRegistrationForm } from '../hooks/useRegistration';
import { validateRegister } from '../utils/validations';

const getAccountValues = (registrationData) => ({
  email: registrationData.email,
  phone: registrationData.phone,
  password: registrationData.password,
  confirmPassword: registrationData.confirmPassword,
  acceptTerms: registrationData.acceptTerms,
});

export const RegisterScreen = ({ navigation }) => {
  const { registrationData, updateRegistration } = useRegistration();

  const { values, errors, setFieldValue, resetValues, validateForm } = useRegistrationForm(
    getAccountValues(registrationData),
    validateRegister,
  );

  useFocusEffect(
    useCallback(() => {
      resetValues(getAccountValues(registrationData));
    }, [registrationData, resetValues]),
  );

  const handleContinue = useCallback(() => {
    if (!validateForm()) return;

    updateRegistration(values);
    navigation.navigate('PersonalData');
  }, [navigation, updateRegistration, validateForm, values]);

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={commonStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={commonStyles.flex}
          contentContainerStyle={commonStyles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={commonStyles.step}>Paso 1 de 4</Text>
          <Text style={commonStyles.title}>Crea tu cuenta</Text>
          <Text style={commonStyles.subtitle}>
            Regístrate como conductor y empieza a recibir viajes con UberClone.
          </Text>

          {errors.form ? <Text style={commonStyles.formError}>{errors.form}</Text> : null}

          <AppInput
            label="Correo electrónico"
            placeholder="nombre@correo.com"
            value={values.email}
            onChangeText={(value) => setFieldValue('email', value)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
          />

          <AppInput
            label="Teléfono"
            placeholder="+57 300 000 0000"
            value={values.phone}
            onChangeText={(value) => setFieldValue('phone', value)}
            error={errors.phone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />

          <AppInput
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            value={values.password}
            onChangeText={(value) => setFieldValue('password', value)}
            error={errors.password}
            secureTextEntry
            textContentType="newPassword"
          />

          <AppInput
            label="Confirmar contraseña"
            placeholder="Repite tu contraseña"
            value={values.confirmPassword}
            onChangeText={(value) => setFieldValue('confirmPassword', value)}
            error={errors.confirmPassword}
            secureTextEntry
            textContentType="newPassword"
          />

          <Pressable
            onPress={() => setFieldValue('acceptTerms', !values.acceptTerms)}
            style={styles.termsRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: values.acceptTerms }}
          >
            <View style={[styles.checkbox, values.acceptTerms && styles.checkboxChecked]}>
              {values.acceptTerms ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.termsLabel}>
              Acepto los términos y condiciones y la política de privacidad de UberClone.
            </Text>
          </Pressable>

          {errors.acceptTerms ? (
            <Text style={styles.termsError}>{errors.acceptTerms}</Text>
          ) : null}

          <Text style={styles.legal}>
            Usaremos tus datos para verificar tu perfil y mantener segura tu cuenta.
          </Text>
        </ScrollView>

        <View style={commonStyles.footer}>
          <AppButton title="Continuar" onPress={handleContinue} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  termsLabel: {
    ...typography.body,
    flex: 1,
  },
  termsError: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.lg,
    marginLeft: 34,
  },
  legal: {
    ...typography.caption,
    color: colors.textSubtle,
  },
});
