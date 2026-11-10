import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';
import { useRegistration } from '../hooks/useRegistration';
import { tripService } from '../services/tripService';

const STATUS_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'completed', label: 'Completados' },
  { key: 'paid', label: 'Pagados' },
  { key: 'cancelled', label: 'Cancelados' },
];

const STATUS_COLORS = {
  requested: { color: '#D97706', bg: '#FEF3C7' },
  accepted: { color: '#2563EB', bg: '#DBEAFE' },
  driver_arriving: { color: '#4F46E5', bg: '#EEF2FF' },
  in_progress: { color: '#7C3AED', bg: '#F5F3FF' },
  completed: { color: colors.accent, bg: colors.accentSoft },
  paid: { color: colors.accent, bg: colors.accentSoft },
  cancelled: { color: colors.danger, bg: colors.dangerSoft },
};

export const TripHistoryScreen = () => {
  const { activeDriverId } = useRegistration();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const loadTrips = useCallback(async () => {
    if (!activeDriverId) {
      setLoading(false);
      return;
    }
    try {
      const data = await tripService.getTripHistory(activeDriverId, {
        status: activeFilter,
      });
      setTrips(data);
    } catch (err) {
      console.warn('Error cargando historial de viajes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeDriverId, activeFilter]);

  useEffect(() => {
    setLoading(true);
    loadTrips();
  }, [loadTrips]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <ScrollView
        style={commonStyles.flex}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={commonStyles.title}>Historial de viajes</Text>
        <Text style={commonStyles.subtitle}>
          Consulta todos tus viajes registrados y filtra según su estado.
        </Text>

        {/* Barra de Filtros */}
        <View style={styles.filterScroll}>
          {STATUS_FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ marginTop: spacing.sm, color: colors.textMuted }}>Cargando viajes...</Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No se encontraron viajes</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter !== 'all'
                ? `No tienes viajes con estado "${activeFilter}".`
                : 'Aún no has realizado viajes con esta cuenta.'}
            </Text>
          </View>
        ) : (
          trips.map((trip) => {
            const statusConfig = STATUS_COLORS[trip.status] || { color: colors.textMuted, bg: colors.surface };
            return (
              <View key={trip.id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.passengerText}>👤 {trip.passengerId || 'Pasajero'}</Text>
                    <Text style={styles.tripDate}>
                      {trip.createdAt ? new Date(trip.createdAt).toLocaleString('es-CO') : ''}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                      {trip.status}
                    </Text>
                  </View>
                </View>

                {/* Rutas */}
                <View style={styles.routeContainer}>
                  <Text style={styles.routeText}>🟢 {trip.origin?.address || 'Origen'}</Text>
                  <Text style={styles.routeText}>🔴 {trip.destination?.address || 'Destino'}</Text>
                </View>

                {/* Métricas y Finanzas */}
                <View style={styles.metricsRow}>
                  <View>
                    <Text style={styles.metricLabel}>Distancia / Tiempo</Text>
                    <Text style={styles.metricValue}>
                      {trip.distanceKm} km • {trip.durationMin} min
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.metricLabel}>Tu Ganancia Neta</Text>
                    <Text style={styles.earningsValue}>
                      ${trip.driverEarnings?.toLocaleString('es-CO')} COP
                    </Text>
                  </View>
                </View>

                {/* Desglose inferior */}
                <View style={styles.cardFooter}>
                  <Text style={styles.footerText}>
                    Tarifa: ${trip.fare?.toLocaleString('es-CO')} | Comisión (20%): -${trip.commission?.toLocaleString('es-CO')}
                    {trip.tip > 0 ? ` | Propina: +$${trip.tip?.toLocaleString('es-CO')}` : ''}
                  </Text>
                  <Text style={styles.footerSub}>
                    Pago: {trip.paymentMethod === 'cash' ? 'Efectivo' : 'Mercado Pago'} ({trip.paymentStatus})
                    {trip.rating > 0 ? ` • Calificación: ⭐ ${trip.rating}/5` : ''}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.primaryText,
  },
  centerBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  tripCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  passengerText: {
    ...typography.label,
    fontSize: 15,
  },
  tripDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  routeContainer: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginVertical: spacing.sm,
  },
  routeText: {
    ...typography.body,
    fontSize: 13,
    marginVertical: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  metricValue: {
    ...typography.body,
    fontWeight: '600',
    marginTop: 1,
  },
  earningsValue: {
    ...typography.label,
    color: colors.accent,
    fontSize: 15,
    marginTop: 1,
  },
  cardFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  footerSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});

export default TripHistoryScreen;

