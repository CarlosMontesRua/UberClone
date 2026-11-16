import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';
import { useRegistration } from '../hooks/useRegistration';
import { useEarnings } from '../hooks/useEarnings';

const PERIODS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'all', label: 'Todo' },
];

export const EarningsScreen = () => {
  const { activeDriverId } = useRegistration();
  const { list, loading, periods, balance } = useEarnings(activeDriverId);
  const [period, setPeriod] = useState('today');
  const summary = periods[period] || periods.all;

  if (loading) {
    return (
      <View style={commonStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textMuted }}>Cargando ganancias...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <View>
            <Text style={commonStyles.title}>Tus ganancias</Text>
            <Text style={commonStyles.subtitle}>
              Totales por período con useMemo · saldo simulado de liquidación.
            </Text>

            <View style={styles.heroCard}>
              <Text style={styles.heroSubtitle}>Saldo del conductor</Text>
              <Text style={styles.heroAmount}>
                ${Number(balance).toLocaleString('es-CO')}{' '}
                <Text style={styles.currency}>COP</Text>
              </Text>
              <Text style={styles.heroHint}>
                Pasarela (+neto) − comisiones de viajes en efectivo
              </Text>
            </View>

            <View style={styles.filters}>
              {PERIODS.map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  style={[styles.chip, period === p.key && styles.chipActive]}
                >
                  <Text style={[styles.chipText, period === p.key && styles.chipTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>Resumen ({PERIODS.find((p) => p.key === period)?.label})</Text>
              <Row label="Viajes" value={String(summary.totalTrips)} />
              <Row label="Total facturado" value={`$${summary.totalFare.toLocaleString('es-CO')}`} />
              <Row label="Comisiones" value={`-$${summary.totalCommission.toLocaleString('es-CO')}`} />
              <Row label="Propinas" value={`+$${summary.totalTips.toLocaleString('es-CO')}`} />
              <Row label="Ganancia neta" value={`$${summary.totalNetEarnings.toLocaleString('es-CO')}`} />
              <Row label="Promedio / viaje" value={`$${summary.averagePerTrip.toLocaleString('es-CO')}`} />
            </View>

            <Text style={styles.sectionTitle}>Historial de liquidaciones</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Sin ganancias aún</Text>
            <Text style={styles.emptySubtitle}>Completa y cobra un viaje para ver movimientos.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemTitle}>Viaje {item.tripId?.slice(0, 8) || item.id.slice(0, 8)}</Text>
            <Text style={styles.itemSub}>
              Neto: ${Number(item.netEarnings || 0).toLocaleString('es-CO')} COP
            </Text>
            <Text style={styles.itemMethod}>
              {item.paymentMethod === 'cash' ? 'Efectivo' : item.paymentMethod} ·{' '}
              {item.createdAt ? new Date(item.createdAt).toLocaleString('es-CO') : ''}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroSubtitle: { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
  heroAmount: { ...typography.title, color: colors.white, fontSize: 28, marginTop: spacing.xs },
  currency: { fontSize: 14 },
  heroHint: { ...typography.caption, color: 'rgba(255,255,255,0.75)', marginTop: spacing.sm },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.primaryText },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  sectionTitle: { ...typography.label, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { ...typography.caption, color: colors.textMuted },
  rowValue: { ...typography.caption, fontWeight: '700' },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemTitle: { ...typography.label },
  itemSub: { ...typography.caption, marginTop: 2 },
  itemMethod: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
  emptyTitle: { ...typography.label },
  emptySubtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});

export default EarningsScreen;
