import { useCallback, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Alert,
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
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';
import { useImagePicker, useRegistration, useRegistrationForm } from '../hooks/useRegistration';
import { validateDocuments } from '../utils/validations';

const COMMISSION_PERCENT = 20;
const TECH_REVIEW_VEHICLE_AGE_LIMIT = 5;
const HELP_TEXT =
  'Ingresa el correo electrónico asociado a tu cuenta de Mercado Pago. Allí recibirás tus pagos.';
const MIN_DATE = new Date();
const MAX_DATE = new Date(2100, 0, 1);

MIN_DATE.setDate(MIN_DATE.getDate() + 1);

const formatDateDisplay = (isoDate) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

const getPickerDate = (isoDate) => {
  if (!isoDate) return new Date();
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const toISODate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const getDocumentsValues = (registrationData) => ({
  licenseNumber: registrationData.licenseNumber,
  licensePhoto: registrationData.licensePhoto,
  licenseExpiry: registrationData.licenseExpiry,
  soatPhoto: registrationData.soatPhoto,
  soatExpiry: registrationData.soatExpiry,
  techInspectionPhoto: registrationData.techInspectionPhoto,
  techInspectionExpiry: registrationData.techInspectionExpiry,
  mercadoPagoEmail: registrationData.mercadoPagoEmail,
  acceptTerms: registrationData.acceptTerms,
  year: registrationData.year,
});

export const DocumentsScreen = ({ navigation }) => {
  const { registrationData, updateRegistration } = useRegistration();
  const insets = useSafeAreaInsets();
  const pickImage = useImagePicker();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState(null);
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
    getDocumentsValues(registrationData),
    validateDocuments,
    handleFieldChange,
  );

  const currentYear = new Date().getFullYear();
  const isTechRequired =
    values.year && /^\d{4}$/.test(values.year) ? currentYear - Number(values.year) > TECH_REVIEW_VEHICLE_AGE_LIMIT : false;

  const handlePickPhoto = async (field, source) => {
    markFieldTouched(field);
    setIsPickingPhoto(true);

    const uri = await pickImage(source, { aspect: [4, 3] });

    if (uri) {
      setFieldValue(field, uri);
    }

    setIsPickingPhoto(false);
  };

  const handleRemovePhoto = (field) => {
    setFieldValue(field, '');
  };

  const handleOpenDatePicker = (field) => {
    markFieldTouched(field);
    setActiveDateField(field);
    setShowDatePicker(true);
  };

  const handleCloseDatePicker = () => {
    setShowDatePicker(false);
    setActiveDateField(null);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      setFieldValue(activeDateField, toISODate(selectedDate));
    }

    if (Platform.OS !== 'ios') {
      setActiveDateField(null);
    }
  };

  const handleToggleTerms = () => {
    setFieldValue('acceptTerms', !values.acceptTerms);
  };

  const handleContinue = () => {
    if (!validateForm()) return;

    updateRegistration(values);

    Alert.alert(
      'Información guardada',
      'Tus documentos y datos de pago fueron registrados correctamente.',
      [{ text: 'Aceptar' }],
    );
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
            <View style={[commonStyles.progressFill, commonStyles.progressFull]} />
          </View>

          <Text style={commonStyles.step}>Paso 3 de 3</Text>
          <Text style={commonStyles.title}>Documentos y pagos</Text>
          <Text style={commonStyles.subtitle}>
            Completa tus documentos y datos de pago para continuar con el proceso de verificación.
          </Text>

          {errors.form ? <Text style={commonStyles.formError}>{errors.form}</Text> : null}

          {/* Licencia de conducción */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>Licencia de conducción</Text>
            </View>

            <AppInput
              label="Número de licencia de conducción *"
              placeholder="ABCD12345"
              value={values.licenseNumber}
              onChangeText={(value) => setFieldValue('licenseNumber', value)}
              error={errors.licenseNumber}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />

            <PhotoField
              label="Fotografía de la licencia *"
              uri={values.licensePhoto}
              onPickFromGallery={() => handlePickPhoto('licensePhoto', 'gallery')}
              onPickFromCamera={() => handlePickPhoto('licensePhoto', 'camera')}
              onRemove={() => handleRemovePhoto('licensePhoto')}
              error={errors.licensePhoto}
              hint="Fotografía obligatoria de tu licencia de conducción."
              loading={isPickingPhoto}
              placeholder="Agregar foto de la licencia"
            />

            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>Fecha de vencimiento de la licencia *</Text>
              <Pressable
                onPress={() => handleOpenDatePicker('licenseExpiry')}
                style={[styles.dateField, errors.licenseExpiry && styles.dateFieldError]}
                accessibilityRole="button"
                accessibilityLabel="Seleccionar fecha de vencimiento de la licencia"
              >
                <Text style={values.licenseExpiry ? styles.dateValue : styles.datePlaceholder}>
                  {values.licenseExpiry
                    ? formatDateDisplay(values.licenseExpiry)
                    : 'Selecciona la fecha de vencimiento'}
                </Text>
                <Text style={styles.dateChevron}>▾</Text>
              </Pressable>
              {errors.licenseExpiry ? <Text style={styles.dateError}>{errors.licenseExpiry}</Text> : null}
            </View>
          </View>

          {/* SOAT */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>SOAT</Text>
            </View>

            <PhotoField
              label="Fotografía del SOAT *"
              uri={values.soatPhoto}
              onPickFromGallery={() => handlePickPhoto('soatPhoto', 'gallery')}
              onPickFromCamera={() => handlePickPhoto('soatPhoto', 'camera')}
              onRemove={() => handleRemovePhoto('soatPhoto')}
              error={errors.soatPhoto}
              hint="Fotografía obligatoria de tu SOAT."
              loading={isPickingPhoto}
              placeholder="Agregar foto del SOAT"
            />

            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>Fecha de vencimiento del SOAT *</Text>
              <Pressable
                onPress={() => handleOpenDatePicker('soatExpiry')}
                style={[styles.dateField, errors.soatExpiry && styles.dateFieldError]}
                accessibilityRole="button"
                accessibilityLabel="Seleccionar fecha de vencimiento del SOAT"
              >
                <Text style={values.soatExpiry ? styles.dateValue : styles.datePlaceholder}>
                  {values.soatExpiry
                    ? formatDateDisplay(values.soatExpiry)
                    : 'Selecciona la fecha de vencimiento'}
                </Text>
                <Text style={styles.dateChevron}>▾</Text>
              </Pressable>
              {errors.soatExpiry ? <Text style={styles.dateError}>{errors.soatExpiry}</Text> : null}
            </View>
          </View>

          {/* Revisión técnico-mecánica */}
          {isTechRequired ? (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionBar} />
                <Text style={styles.sectionTitle}>Revisión técnico-mecánica</Text>
              </View>
              <Text style={styles.techHint}>
                Obligatorio por normativa colombiana para vehículos con más de {TECH_REVIEW_VEHICLE_AGE_LIMIT} años.
              </Text>

              <PhotoField
                label="Fotografía de la revisión técnico-mecánica *"
                uri={values.techInspectionPhoto}
                onPickFromGallery={() => handlePickPhoto('techInspectionPhoto', 'gallery')}
                onPickFromCamera={() => handlePickPhoto('techInspectionPhoto', 'camera')}
                onRemove={() => handleRemovePhoto('techInspectionPhoto')}
                error={errors.techInspectionPhoto}
                hint="Fotografía obligatoria de la revisión técnico-mecánica."
                loading={isPickingPhoto}
                placeholder="Agregar foto de la revisión"
              />

              <View style={styles.dateContainer}>
                <Text style={styles.dateLabel}>Fecha de vencimiento de la revisión *</Text>
                <Pressable
                  onPress={() => handleOpenDatePicker('techInspectionExpiry')}
                  style={[
                    styles.dateField,
                    errors.techInspectionExpiry && styles.dateFieldError,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar fecha de vencimiento de la revisión"
                >
                  <Text style={values.techInspectionExpiry ? styles.dateValue : styles.datePlaceholder}>
                    {values.techInspectionExpiry
                      ? formatDateDisplay(values.techInspectionExpiry)
                      : 'Selecciona la fecha de vencimiento'}
                  </Text>
                  <Text style={styles.dateChevron}>▾</Text>
                </Pressable>
                {errors.techInspectionExpiry ? (
                  <Text style={styles.dateError}>{errors.techInspectionExpiry}</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionBar} />
                <Text style={styles.sectionTitle}>Revisión técnico-mecánica</Text>
              </View>
              <Text style={styles.techHint}>
                Exento: tu vehículo tiene menos de {TECH_REVIEW_VEHICLE_AGE_LIMIT} años y no requiere revisión técnico-mecánica.
              </Text>
            </View>
          )}

          {/* Correo de Mercado Pago */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>Correo de Mercado Pago</Text>
            </View>

            <AppInput
              label="Correo electrónico de Mercado Pago *"
              placeholder="tu@correo.com"
              value={values.mercadoPagoEmail}
              onChangeText={(value) => setFieldValue('mercadoPagoEmail', value)}
              error={errors.mercadoPagoEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />
            <Text style={styles.hint}>{HELP_TEXT}</Text>
          </View>

          {/* Términos y condiciones */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>Términos y condiciones</Text>
            </View>

            <Pressable
              onPress={handleToggleTerms}
              style={styles.termsRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: values.acceptTerms }}
            >
              <View style={[styles.checkbox, values.acceptTerms && styles.checkboxChecked]}>
                {values.acceptTerms ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.termsLabel}>
                Acepto los términos y condiciones de UberClone.
              </Text>
            </Pressable>

            {errors.acceptTerms ? <Text style={styles.termsError}>{errors.acceptTerms}</Text> : null}

            <View style={styles.commissionRow}>
              <Text style={styles.commissionLabel}>
                Comisión de la plataforma: {COMMISSION_PERCENT}%
              </Text>
              <Text style={styles.commissionNote}>
                Se aplica sobre cada viaje completado.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={commonStyles.footer}>
          <Text style={styles.requiredHint}>
            Completa todos los campos obligatorios para continuar.
          </Text>
          <AppButton title="Guardar y continuar" onPress={handleContinue} disabled={!isValid} />
        </View>
      </KeyboardAvoidingView>

      {showDatePicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={getPickerDate(activeDateField ? values[activeDateField] : '')}
          mode="date"
          display="default"
          minimumDate={MIN_DATE}
          maximumDate={MAX_DATE}
          onChange={handleDateChange}
        />
      ) : null}

      <Modal
        visible={showDatePicker && Platform.OS === 'ios'}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleCloseDatePicker}
      >
        <View style={styles.dateOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseDatePicker} />
          <View style={[styles.dateSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.dateSheetHeader}>
              <Text style={styles.dateSheetTitle}>Fecha de vencimiento</Text>
              <Pressable onPress={handleCloseDatePicker} hitSlop={12} accessibilityRole="button">
                <Text style={styles.dateDone}>Listo</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={getPickerDate(activeDateField ? values[activeDateField] : '')}
              mode="date"
              display="spinner"
              minimumDate={MIN_DATE}
              maximumDate={MAX_DATE}
              onChange={handleDateChange}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionBar: {
    width: 3,
    height: 20,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
  },
  sectionTitle: {
    ...typography.label,
    marginLeft: spacing.md,
  },
  techHint: {
    ...typography.caption,
    marginBottom: spacing.sm,
    color: colors.textMuted,
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
  commissionRow: {
    marginBottom: spacing.lg,
  },
  commissionLabel: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  commissionNote: {
    ...typography.caption,
    color: colors.textMuted,
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  requiredHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
