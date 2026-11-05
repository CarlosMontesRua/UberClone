import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '../config/theme';

export const AppInput = ({
  label,
  error,
  hint,
  secureTextEntry = false,
  multiline = false,
  containerStyle,
  onFocus,
  onBlur,
  ...inputProps
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (event) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          multiline && styles.inputWrapperMultiline,
          isFocused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
        ]}
      >
        <TextInput
          {...inputProps}
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholderTextColor={colors.textSubtle}
          secureTextEntry={secureTextEntry ? isSecure : false}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {secureTextEntry ? (
          <Pressable
            onPress={() => setIsSecure((currentValue) => !currentValue)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={isSecure ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            <Text style={styles.toggleText}>{isSecure ? 'Ver' : 'Ocultar'}</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

export const PhotoField = ({
  label,
  uri,
  onPickFromGallery,
  onPickFromCamera,
  onRemove,
  error,
  hint,
  loading = false,
  placeholder = 'Agregar fotografía',
  frameStyle,
}) => (
  <View style={styles.photoContainer}>
    {label ? <Text style={styles.label}>{label}</Text> : null}

    <View style={[styles.photoFrame, frameStyle, error && styles.photoFrameError]}>
      {uri ? (
        <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoPlus}>+</Text>
          <Text style={styles.photoPlaceholderText}>{placeholder}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.photoLoading}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : null}
    </View>

    <View style={styles.photoActions}>
      <Pressable
        onPress={onPickFromGallery}
        disabled={loading}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.photoAction,
          pressed && styles.photoActionPressed,
          loading && styles.photoActionDisabled,
        ]}
      >
        <Text style={styles.photoActionText}>Galería</Text>
      </Pressable>

      <Pressable
        onPress={onPickFromCamera}
        disabled={loading}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.photoAction,
          pressed && styles.photoActionPressed,
          loading && styles.photoActionDisabled,
        ]}
      >
        <Text style={styles.photoActionText}>Cámara</Text>
      </Pressable>

      {uri ? (
        <Pressable
          onPress={onRemove}
          disabled={loading}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.photoRemove,
            pressed && styles.photoActionPressed,
            loading && styles.photoActionDisabled,
          ]}
        >
          <Text style={styles.photoRemoveText}>Eliminar</Text>
        </Pressable>
      ) : null}
    </View>

    {error ? (
      <Text style={styles.errorText}>{error}</Text>
    ) : hint ? (
      <Text style={styles.hintText}>{hint}</Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapperMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  inputWrapperError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  hintText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  photoContainer: {
    marginBottom: spacing.lg,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFrameError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  photoPlus: {
    fontSize: 34,
    lineHeight: 38,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  photoPlaceholderText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  photoLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  photoAction: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  photoActionPressed: {
    opacity: 0.6,
  },
  photoActionDisabled: {
    opacity: 0.5,
  },
  photoActionText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  photoRemove: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  photoRemoveText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.danger,
  },
});
