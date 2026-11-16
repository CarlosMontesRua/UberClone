import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';
import { useRegistration } from '../hooks/useRegistration';
import { tripService } from '../services/tripService';
import { rangeForFilter } from '../utils/dateRanges';

const DATE_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

const PAYMENT_FILTERS = [
  { key: 'all', label: 'Pago: todos' },
  { key: 'cash', label: 'Efectivo' },
  { key: 'mercadopago', label: 'Mercado Pago' },
  { key: 'stripe', label: 'Stripe' },
];

const STATUS_COLORS = {
  completed: { color: colors.accent, bg: colors.accentSoft },
  paid: { color: colors.accent, bg: colors.accentSoft },
  cancelled: { color: colors.danger, bg: colors.dangerSoft },
  in_progress: { color: '#7C3AED', bg: '#F5F3FF' },
  accepted: { color: '#2563EB', bg: '#DBEAFE' },
  driver_arriving: { color: '#4F46E5', bg: '#EEF2FF' },
};

export const TripHistoryScreen = ({ navigation }) => {
  const { activeDriverId } = useRegistration();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const loadTrips = useCallback(async () => {
    if (!activeDriverId) {
      setLoading(false);
      return;
    }
    try {
      const { start, end } = rangeForFilter(dateFilter);
      const data = await tripService.getTripHistory(activeDriverId, {
        paymentMethod: paymentFilter,
        startDate: start || undefined,
        endDate: end || undefined,
        limit: 20,
      });
      setTrips(data);
    } catch (err) {
      console.warn('Error cargando historial de viajes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeDriverId, dateFilter, paymentFilter]);

  useEffect(() => {
    setLoading(true);
    loadTrips();
  }, [loadTrips]);

  const header = useMemo(
    () => (
      <View>
        <Text style={commonStyles.title}>Historial de carreras</Text>
        <Text style={commonStyles.subtitle}>FlatList · 20 por carga · filtros de fecha y pago.</Text>

        <View style={styles.filterRow}>
          {DATE_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setDateFilter(f.key)}
              style={[styles.chip, dateFilter === f.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, dateFilter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.filterRow}>
          {PAYMENT_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setPaymentFilter(f.key)}
              style={[styles.chip, paymentFilter === f.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, paymentFilter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    ),
    [dateFilter, paymentFilter],
  );

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      {loading ? (
        <View style={commonStyles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadTrips();
              }}
            />
          }
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No hay viajes en este filtro</Text>
              <Text style={styles.emptySubtitle}>Prueba otro rango o método de pago.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusConfig = STATUS_COLORS[item.status] || {
              color: colors.textMuted,
              bg: colors.surface,
            };
            return (
              <Pressable
                style={styles.tripCard}
                onPress={() => navigation.navigate('TripDetail', { trip: item })}
              >
                <View style={styles.tripHeader}>
                  <Text style={styles.dateText}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleString('es-CO') : '—'}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.badgeText, { color: statusConfig.color }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.routeText}>
                  {item.origin?.address || 'Origen'} → {item.destination?.address || 'Destino'}
                </Text>
                <Text style={styles.metaText}>
                  {item.category} · ${Number(item.fare || 0).toLocaleString('es-CO')} · neto $
                  {Number(item.driverEarnings || 0).toLocaleString('es-CO')} ·{' '}
                  {item.paymentMethod} ({item.paymentStatus})
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
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
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { ...typography.caption, color: colors.textMuted },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  badgeText: { ...typography.caption, fontWeight: '700' },
  routeText: { ...typography.body, fontSize: 14, marginTop: spacing.xs },
  metaText: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  emptyCard: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
  emptyTitle: { ...typography.label },
  emptySubtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});

export default TripHistoryScreen;
