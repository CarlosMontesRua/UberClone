import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';
import { useRegistration } from '../hooks/useRegistration';
import { earningsService } from '../services/earningsService';

export const EarningsScreen = () => {
  const { activeDriverId } = useRegistration();
  const [earningsData, setEarningsData] = useState({
    list: [],
    summary: {
      totalTrips: 0,
      totalFare: 0,
      totalCommission: 0,
      totalTips: 0,
      totalNetEarnings: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeDriverId) return;

    const unsubscribe = earningsService.subscribeToEarnings(activeDriverId, (data) => {
      setEarningsData(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeDriverId]);

  if (loading && activeDriverId) {
    return (
      <View style={commonStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textMuted }}>Cargando ganancias...</Text>
      </View>
    );
  }

  const { summary, list } = earningsData;

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <ScrollView
        style={commonStyles.flex}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={commonStyles.title}>Tus ganancias</Text>
        <Text style={commonStyles.subtitle}>
          Resumen detallado de tus viajes realizados y liquidación en pesos colombianos.
        </Text>

        {/* Tarjeta Principal de Ganancias Netas */}
        <View style={styles.heroCard}>
          <Text style={styles.heroSubtitle}>Ganancias Netas Totales</Text>
          <Text style={styles.heroAmount}>
            ${summary.totalNetEarnings.toLocaleString('es-CO')} <Text style={styles.currency}>COP</Text>
          </Text>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>{summary.totalTrips} viajes completados</Text>
          </View>
        </View>

        {/* Desglose de Reglas de Negocio */}
        <View style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>Desglose financiero</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Total tarifas cobradas</Text>
            <Text style={styles.breakdownValue}>${summary.totalFare.toLocaleString('es-CO')} COP</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.danger }]}>Comisión plataforma (20%)</Text>
            <Text style={[styles.breakdownValue, { color: colors.danger }]}>
              -${summary.totalCommission.toLocaleString('es-CO')} COP
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.accent }]}>Propinas (100% conductor)</Text>
            <Text style={[styles.breakdownValue, { color: colors.accent }]}>
              +${summary.totalTips.toLocaleString('es-CO')} COP
            </Text>
          </View>

          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Ganancia neta final</Text>
            <Text style={styles.totalValue}>
              ${summary.totalNetEarnings.toLocaleString('es-CO')} COP
            </Text>
          </View>
        </View>

        {/* Historial de Liquidaciones */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Últimas liquidaciones de viajes</Text>

        {list.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aún no tienes viajes completados registrados.</Text>
            <Text style={styles.emptySub}>
              Cuando completes viajes en la pestaña &ldquo;Conducir&rdquo;, aquí aparecerá el desglose en tiempo real.
            </Text>
          </View>
        ) : (
          list.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemId}>Viaje #{item.tripId ? item.tripId.slice(-6) : item.id.slice(-6)}</Text>
                <Text style={styles.itemDate}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                </Text>
              </View>

              <View style={styles.itemBody}>
                <View>
                  <Text style={styles.itemSub}>Tarifa: ${item.fare?.toLocaleString('es-CO')} COP</Text>
                  <Text style={styles.itemSub}>Comisión (20%): -${item.commission?.toLocaleString('es-CO')} COP</Text>
                  {item.tip > 0 ? (
                    <Text style={[styles.itemSub, { color: colors.accent }]}>
                      Propina: +${item.tip?.toLocaleString('es-CO')} COP
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.itemNetLabel}>Neto</Text>
                  <Text style={styles.itemNetValue}>${item.netEarnings?.toLocaleString('es-CO')}</Text>
                  <Text style={styles.itemMethod}>{item.paymentMethod === 'cash' ? 'Efectivo' : 'Mercado Pago'}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroAmount: {
    ...typography.title,
    fontSize: 34,
    color: colors.primaryText,
    marginVertical: spacing.sm,
  },
  currency: {
    fontSize: 16,
    color: colors.textMuted,
  },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  heroPillText: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: '700',
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  breakdownLabel: {
    ...typography.body,
    color: colors.text,
  },
  breakdownValue: {
    ...typography.body,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: {
    ...typography.label,
  },
  totalValue: {
    ...typography.label,
    color: colors.accent,
    fontSize: 17,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.label,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySub: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  itemId: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  itemDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  itemBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  itemNetLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  itemNetValue: {
    ...typography.label,
    color: colors.accent,
    fontSize: 16,
  },
  itemMethod: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
});

export default EarningsScreen;

