import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { colors, radii, spacing } from '../theme/theme';

/**
 * Componente interactivo y visual del Interruptor de Disponibilidad
 * Inspirado en la interfaz de conductores de Uber.
 *
 * Muestra:
 * - Indicador visual con punto verde/gris de estado.
 * - Interruptor deslizante nativo con soporte de carga.
 * - Mensaje de aviso cuando el conductor no está aprobado (pending o rejected).
 */
export const AvailabilitySwitch = ({
  isAvailable = false,
  onToggle,
  isApproved = false,
  approvalStatus = 'pending',
  loading = false,
  disabled = false,
  style,
}) => {
  const handleToggle = (value) => {
    if (loading || disabled) return;
    if (onToggle) {
      onToggle(value);
    }
  };

  const statusTitle = isAvailable ? 'Estás disponible' : 'Estás desconectado';
  const statusSubtitle = isAvailable
    ? 'En línea • Buscando solicitudes de viajes'
    : 'Desconectado • Conéctate para recibir viajes';

  const isRejected = approvalStatus === 'rejected';

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View style={styles.statusIndicatorWrapper}>
          <View
            style={[
              styles.statusDot,
              isAvailable ? styles.statusDotOnline : styles.statusDotOffline,
            ]}
          />
          <View style={styles.textContainer}>
            <Text style={styles.statusTitle}>{statusTitle}</Text>
            <Text style={styles.statusSubtitle}>{statusSubtitle}</Text>
          </View>
        </View>

        <View style={styles.switchWrapper}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />
          ) : (
            <Switch
              value={isAvailable}
              onValueChange={handleToggle}
              disabled={disabled || loading}
              trackColor={{
                false: '#D1D5DB',
                true: colors.accent,
              }}
              thumbColor={colors.white}
              ios_backgroundColor="#D1D5DB"
            />
          )}
        </View>
      </View>

      {/* Alerta si el conductor no está aprobado */}
      {!isApproved ? (
        <View
          style={[
            styles.noticeBox,
            isRejected ? styles.noticeBoxDanger : styles.noticeBoxWarning,
          ]}
        >
          <Text style={styles.noticeIcon}>{isRejected ? '🚫' : '⏳'}</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.noticeTitle,
                isRejected ? styles.noticeTitleDanger : styles.noticeTitleWarning,
              ]}
            >
              {isRejected
                ? 'Cuenta no aprobada'
                : 'Aprobación en revisión'}
            </Text>
            <Text style={styles.noticeBody}>
              {isRejected
                ? 'Tu solicitud fue rechazada. Revisa tus documentos para poder conectarte.'
                : 'Tu cuenta está en proceso de verificación por la administración. No puedes ponerte disponible hasta ser aprobado.'}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 229, 234, 0.8)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.sm,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: spacing.md,
  },
  statusDotOnline: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDotOffline: {
    backgroundColor: colors.textSubtle,
  },
  textContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  statusSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  switchWrapper: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  loader: {
    padding: spacing.xs,
  },
  noticeBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noticeBoxWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noticeBoxDanger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  noticeIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
    marginTop: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  noticeTitleWarning: {
    color: '#B45309',
  },
  noticeTitleDanger: {
    color: colors.danger,
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 16,
    color: '#4B5563',
  },
});

export default AvailabilitySwitch;
