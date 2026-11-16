import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { AppInput, PhotoField } from '../components/AppInput';
import { SelectField } from '../components/SelectField';
import { colors, commonStyles, spacing, typography } from '../theme/theme';
import { useImagePicker, useRegistration, useRegistrationForm } from '../hooks/useRegistration';
import { validatePersonalData, validateVehicle } from '../utils/validations';

const CATEGORIES = [
  { label: 'Económico', value: 'economy' },
  { label: 'XL', value: 'xl' },
  { label: 'Premium', value: 'premium' },
];

const COLORS = [
  { label: 'Blanco', value: 'white' },
  { label: 'Negro', value: 'black' },
  { label: 'Gris', value: 'gray' },
  { label: 'Plata', value: 'silver' },
  { label: 'Rojo', value: 'red' },
  { label: 'Azul', value: 'blue' },
  { label: 'Otro', value: 'other' },
];

const formatPlateInput = (value) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);

const formatYearInput = (value) => value.replace(/\D/g, '').slice(0, 4);

const formatCapacityInput = (value) => value.replace(/\D/g, '').slice(0, 2);

const getVehicleValues = (registrationData) => ({
  category: registrationData.category,
  plate: registrationData.plate,
  brand: registrationData.brand,
  model: registrationData.model,
  year: registrationData.year,
  color: registrationData.color,
  passengerCapacity: registrationData.passengerCapacity,
  vehiclePhoto: registrationData.vehiclePhoto,
});

export const VehicleScreen = ({ navigation }) => {
  const { registrationData, updateRegistration } = useRegistration();
  const pickImage = useImagePicker();
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
    getVehicleValues(registrationData),
    validateVehicle,
    handleFieldChange,
  );

  const isPersonalValid = Object.keys(validatePersonalData(registrationData)).length === 0;

  const handlePickPhoto = async (source) => {
    markFieldTouched('vehiclePhoto');
    setIsPickingPhoto(true);

    const uri = await pickImage(source, { aspect: [16, 9] });

    if (uri) {
      setFieldValue('vehiclePhoto', uri);
    }

    setIsPickingPhoto(false);
  };

  const handleRemovePhoto = () => {
    setFieldValue('vehiclePhoto', '');
  };

  const handleContinue = () => {
    if (!validateForm()) return;

    if (!isPersonalValid) {
      navigation.navigate('PersonalData');
      return;
    }

    updateRegistration(values);
    navigation.navigate('Documents');
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

          <Text style={commonStyles.step}>Paso 3 de 4</Text>
          <Text style={commonStyles.title}>Tu vehículo</Text>
          <Text style={commonStyles.subtitle}>
            Registra los datos del vehículo con el que prestarás el servicio.
          </Text>

          {errors.form ? <Text style={commonStyles.formError}>{errors.form}</Text> : null}

          {!isPersonalValid ? (
            <Text style={commonStyles.formError}>
              Completa tus datos personales en la pestaña anterior para finalizar el registro.
            </Text>
          ) : null}

          <SelectField
            label="Categoría *"
            placeholder="Selecciona una categoría"
            value={values.category}
            options={CATEGORIES}
            onChange={(value) => setFieldValue('category', value)}
            error={errors.category}
          />

          <AppInput
            label="Placa *"
            placeholder="ABC123"
            value={values.plate}
            onChangeText={(value) => setFieldValue('plate', formatPlateInput(value))}
            error={errors.plate}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />

          <AppInput
            label="Marca *"
            placeholder="Chevrolet"
            value={values.brand}
            onChangeText={(value) => setFieldValue('brand', value)}
            error={errors.brand}
            autoCapitalize="words"
            maxLength={30}
          />

          <AppInput
            label="Modelo *"
            placeholder="Spark"
            value={values.model}
            onChangeText={(value) => setFieldValue('model', value)}
            error={errors.model}
            autoCapitalize="words"
            maxLength={30}
          />

          <AppInput
            label="Año *"
            placeholder="2022"
            value={values.year}
            onChangeText={(value) => setFieldValue('year', formatYearInput(value))}
            error={errors.year}
            keyboardType="number-pad"
            maxLength={4}
          />

          <SelectField
            label="Color *"
            placeholder="Selecciona el color"
            value={values.color}
            options={COLORS}
            onChange={(value) => setFieldValue('color', value)}
            error={errors.color}
          />

          <AppInput
            label="Capacidad de pasajeros *"
            placeholder="4"
            value={values.passengerCapacity}
            onChangeText={(value) =>
              setFieldValue('passengerCapacity', formatCapacityInput(value))
            }
            error={errors.passengerCapacity}
            keyboardType="number-pad"
            maxLength={2}
            hint="Para la categoría XL se requieren mínimo 6 pasajeros."
          />

          <PhotoField
            label="Foto del vehículo *"
            uri={values.vehiclePhoto}
            onPickFromGallery={() => handlePickPhoto('gallery')}
            onPickFromCamera={() => handlePickPhoto('camera')}
            onRemove={handleRemovePhoto}
            error={errors.vehiclePhoto}
            hint="La foto es obligatoria y debe mostrar claramente la placa del vehículo."
            loading={isPickingPhoto}
            placeholder="Agregar foto del vehículo"
          />
        </ScrollView>

        <View style={commonStyles.footer}>
          {!isValid ? (
            <Text style={styles.requiredHint}>
              Completa todos los campos obligatorios para finalizar.
            </Text>
          ) : null}
          <View style={styles.footerRow}>
            <AppButton
              title="Regresar"
              variant="outline"
              onPress={() => navigation.navigate('PersonalData')}
              style={styles.footerButton}
            />
            <AppButton
              title="Continuar"
              onPress={handleContinue}
              disabled={!isValid || !isPersonalValid}
              style={styles.footerButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
  requiredHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
