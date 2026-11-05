import { useCallback, useContext, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { RegistrationContext } from '../context/RegistrationContext';

export const useRegistration = () => {
  const context = useContext(RegistrationContext);

  if (!context) {
    throw new Error('useRegistration debe usarse dentro de RegistrationProvider');
  }

  return context;
};

export const useRegistrationForm = (initialValues, validate, onChange) => {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validationErrors = useMemo(() => validate(values), [validate, values]);
  const isValid = Object.keys(validationErrors).length === 0;

  const errors = useMemo(() => {
    const visibleErrors = {};

    Object.keys(validationErrors).forEach((field) => {
      if (touched[field]) visibleErrors[field] = validationErrors[field];
    });

    if (formError) visibleErrors.form = formError;

    return visibleErrors;
  }, [formError, touched, validationErrors]);

  const setFieldValue = useCallback(
    (field, value) => {
      setValues((currentValues) => ({ ...currentValues, [field]: value }));
      setTouched((currentTouched) => ({ ...currentTouched, [field]: true }));
      setFormError('');
      onChange?.(field, value);
    },
    [onChange],
  );

  const markFieldTouched = useCallback((field) => {
    setTouched((currentTouched) => ({ ...currentTouched, [field]: true }));
  }, []);

  const resetValues = useCallback((nextValues) => {
    setValues(nextValues);
    setTouched({});
    setFormError('');
  }, []);

  const validateForm = useCallback(() => {
    setTouched(
      Object.keys(values).reduce(
        (allTouched, field) => ({ ...allTouched, [field]: true }),
        {},
      ),
    );

    return isValid;
  }, [isValid, values]);

  return {
    values,
    errors,
    validationErrors,
    isValid,
    submitting,
    setFieldValue,
    markFieldTouched,
    setFormError,
    setSubmitting,
    resetValues,
    validateForm,
  };
};

export const useImagePicker = () => {
  const pickImage = useCallback(async (source, options = {}) => {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permiso denegado',
          source === 'camera'
            ? 'Necesitamos acceso a la cámara para tomar la fotografía. Habilita el permiso desde la configuración del dispositivo.'
            : 'Necesitamos acceso a la galería para seleccionar la fotografía. Habilita el permiso desde la configuración del dispositivo.',
        );
        return null;
      }

      const pickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: options.aspect ?? [1, 1],
        quality: 0.7,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets?.length) return null;

      return result.assets[0].uri;
    } catch {
      Alert.alert(
        'No se pudo abrir la imagen',
        'Ocurrió un error al acceder a la cámara o galería. Inténtalo de nuevo.',
      );
      return null;
    }
  }, []);

  return pickImage;
};
