import { useCallback, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { AppInput, PhotoField } from '../components/AppInput';
import { SelectField } from '../components/SelectField';
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';
import { useImagePicker, useRegistration, useRegistrationForm } from '../hooks/useRegistration';
import { validatePersonalData } from '../utils/validations';

const GENDERS = [
  { label: 'Masculino', value: 'male' },
  { label: 'Femenino', value: 'female' },
  { label: 'Otro', value: 'other' },
  { label: 'Prefiero no decirlo', value: 'undisclosed' },
];

const LANGUAGES = [
  { label: 'Español', value: 'es' },
  { label: 'Inglés', value: 'en' },
];

const MIN_BIRTH_DATE = new Date(1900, 0, 1);

const getPersonalValues = (registrationData) => ({
  profilePhoto: registrationData.profilePhoto,
  fullName: registrationData.fullName,
  documentNumber: registrationData.documentNumber,
  phone: registrationData.phone,
  birthDate: registrationData.birthDate,
  gender: registrationData.gender,
  email: registrationData.email,
  language: registrationData.language,
});

const formatDateDisplay = (isoDate) => {
  if (!isoDate) return '';

  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

const getPickerDate = (isoDate) => {
  if (!isoDate) return new Date(2000, 0, 1);

  const [year, month, day] = isoDate.split('-').map(Number);

  if (!year || !month || !day) return new Date(2000, 0, 1);

  return new Date(year, month - 1, day);
};

const toISODate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

export const PersonalDataScreen = ({ navigation }) => {
  const { registrationData, updateRegistration } = useRegistration();
  const insets = useSafeAreaInsets();
  const pickImage = useImagePicker();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);

  const handleFieldChange = useCallback(
    (field, value) => {
      updateRegistration({ [field]: value });
    },
    [updateRegistration],
  );

  const {
    values,
    errors,
    isValid,
    setFieldValue,
    markFieldTouched,
    validateForm,
  } = useRegistrationForm(
    getPersonalValues(registrationData),
    validatePersonalData,
    handleFieldChange,
  );

  const handlePickPhoto = async (source) => {
    markFieldTouched('profilePhoto');
    setIsPickingPhoto(true);

    const uri = await pickImage(source, { aspect: [1, 1] });

    if (uri) {
      setFieldValue('profilePhoto', uri);
    }

    setIsPickingPhoto(false);
  };

  const handleRemovePhoto = () => {
    setFieldValue('profilePhoto', '');
  };

  const handleOpenDatePicker = () => {
    markFieldTouched('birthDate');
    setShowDatePicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      setFieldValue('birthDate', toISODate(selectedDate));
    }
  };

  const handleContinue = () => {
    if (!validateForm()) return;

    updateRegistration(values);
    navigation.navigate('Vehicle');
  };

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
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
          <View style={commonStyles.progressTrack}>
            <View style={[commonStyles.progressFill, commonStyles.progressHalf]} />
          </View>

          <Text style={commonStyles.step}>Paso 1 de 3</Text>
          <Text style={commonStyles.title}>Datos personales</Text>
          <Text style={commonStyles.subtitle}>
            Completa tu información para iniciar el proceso de registro como conductor.
          </Text>

          {errors.form ? <Text style={commonStyles.formError}>{errors.form}</Text> : null}

          <PhotoField
            label="Foto de perfil *"
            uri={values.profilePhoto}
            onPickFromGallery={() => handlePickPhoto('gallery')}
            onPickFromCamera={() => handlePickPhoto('camera')}
            onRemove={handleRemovePhoto}
            error={errors.profilePhoto}
            hint="La foto es obligatoria. Debe mostrar tu rostro."
            loading={isPickingPhoto}
            placeholder="Agregar foto de perfil"
            frameStyle={styles.profilePhotoFrame}
          />

          <AppInput
            label="Nombre completo *"
            placeholder="Carlos Andrés Pérez"
            value={values.fullName}
            onChangeText={(value) => setFieldValue('fullName', value)}
            error={errors.fullName}
            autoCapitalize="words"
            maxLength={50}
            textContentType="name"
          />

          <AppInput
            label="Documento de identidad *"
            placeholder="1234567890"
            value={values.documentNumber}
            onChangeText={(value) => setFieldValue('documentNumber', value)}
            error={errors.documentNumber}
            keyboardType="number-pad"
            maxLength={10}
          />

          <AppInput
            label="Número de celular *"
            placeholder="3001234567"
            value={values.phone}
            onChangeText={(value) => setFieldValue('phone', value)}
            error={errors.phone}
            keyboardType="phone-pad"
            maxLength={10}
            textContentType="telephoneNumber"
          />

          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Fecha de nacimiento *</Text>
            <Pressable
              onPress={handleOpenDatePicker}
              style={[styles.dateField, errors.birthDate && styles.dateFieldError]}
              accessibilityRole="button"
              accessibilityLabel="Seleccionar fecha de nacimiento"
            >
              <Text style={values.birthDate ? styles.dateValue : styles.datePlaceholder}>
                {values.birthDate
                  ? formatDateDisplay(values.birthDate)
                  : 'Selecciona tu fecha de nacimiento'}
              </Text>
              <Text style={styles.dateChevron}>▾</Text>
            </Pressable>
            {errors.birthDate ? <Text style={styles.dateError}>{errors.birthDate}</Text> : null}
          </View>

          <SelectField
            label="Género *"
            placeholder="Selecciona tu género"
            value={values.gender}
            options={GENDERS}
            onChange={(value) => setFieldValue('gender', value)}
            error={errors.gender}
          />

          <AppInput
            label="Correo electrónico *"
            placeholder="nombre@correo.com"
            value={values.email}
            onChangeText={(value) => setFieldValue('email', value)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
          />

          <SelectField
            label="Idioma *"
            placeholder="Selecciona tu idioma"
            value={values.language}
            options={LANGUAGES}
            onChange={(value) => setFieldValue('language', value)}
            error={errors.language}
          />
        </ScrollView>

        <View style={commonStyles.footer}>
          {!isValid ? (
            <Text style={styles.requiredHint}>
              Completa todos los campos obligatorios para continuar.
            </Text>
          ) : null}
          <AppButton title="Continuar" onPress={handleContinue} disabled={!isValid} />
        </View>
      </KeyboardAvoidingView>

      {showDatePicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={getPickerDate(values.birthDate)}
          mode="date"
          display="default"
          minimumDate={MIN_BIRTH_DATE}
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      ) : null}

      <Modal
        visible={showDatePicker && Platform.OS === 'ios'}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.dateOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDatePicker(false)} />
          <View style={[styles.dateSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.dateSheetHeader}>
              <Text style={styles.dateSheetTitle}>Fecha de nacimiento</Text>
              <Pressable
                onPress={() => setShowDatePicker(false)}
                hitSlop={12}
                accessibilityRole="button"
              >
                <Text style={styles.dateDone}>Listo</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={getPickerDate(values.birthDate)}
              mode="date"
              display="spinner"
              minimumDate={MIN_BIRTH_DATE}
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  profilePhotoFrame: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignSelf: 'center',
  },
  dateContainer: {
    marginBottom: spacing.lg,
  },
  dateLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  dateField: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateFieldError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  dateValue: {
    fontSize: 15,
    color: colors.text,
  },
  datePlaceholder: {
    fontSize: 15,
    color: colors.textSubtle,
  },
  dateChevron: {
    fontSize: 16,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  dateError: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  dateOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  dateSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  dateSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dateSheetTitle: {
    ...typography.label,
    fontSize: 16,
  },
  dateDone: {
    ...typography.label,
    color: colors.accent,
  },
  requiredHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
