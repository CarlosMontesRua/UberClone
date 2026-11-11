import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';
import { useRegistration } from '../hooks/useRegistration';
import { driverService } from '../services/driverService';
import { tripService } from '../services/tripService';
import { locationService } from '../services/locationService';
import { earningsService } from '../services/earningsService';
import { doc, updateDoc } from 'firebase/firestore';
import { getDb } from '../config/firebase';

const STATUS_LABELS = {
  pending: { label: 'En revisión (Pendiente)', color: colors.warning || '#D97706', bg: '#FEF3C7' },
  approved: { label: 'Aprobado y Verificado', color: colors.accent, bg: colors.accentSoft },
  rejected: { label: 'Rechazado', color: colors.danger, bg: colors.dangerSoft },
};

const TRIP_STATUS_LABELS = {
  requested: 'Solicitado',
  accepted: 'Aceptado (Dirígete al origen)',
  driver_arriving: 'Llegando al punto de recogida',
  in_progress: 'Viaje en curso',
  completed: 'Viaje completado',
  paid: 'Pagado',
  cancelled: 'Cancelado',
};

export const DriverDashboardScreen = ({ navigation }) => {
  const { activeDriverId, resetRegistration } = useRegistration();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [driverLocation, setDriverLocation] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);

  // 1. Suscripción en tiempo real al perfil del conductor
  useEffect(() => {
    if (!activeDriverId) return;

    const unsubscribe = driverService.subscribeToDriver(activeDriverId, (data) => {
      setDriver(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeDriverId]);

  // 2. Suscripción en tiempo real a la ubicación del conductor
  useEffect(() => {
    if (!activeDriverId) return;

    const unsubscribe = locationService.subscribeToDriverLocation(activeDriverId, (loc) => {
      setDriverLocation(loc);
    });

    return () => unsubscribe();
  }, [activeDriverId]);

  // 3. Suscripción en tiempo real al viaje activo
  useEffect(() => {
    if (!activeDriverId) return;

    const unsubscribe = tripService.subscribeToActiveTripForDriver(activeDriverId, (trip) => {
      setActiveTrip(trip);
    });

    return () => unsubscribe();
  }, [activeDriverId]);

  // 4. Suscripción a solicitudes entrantes en tiempo real ('requested')
  useEffect(() => {
    if (driver?.availability !== 'available' || activeTrip || !activeDriverId) return;

    const unsubscribe = tripService.subscribeToAvailableRequests(
      null,
      (requests) => setAvailableRequests(requests),
      activeDriverId,
    );

    return () => unsubscribe();
  }, [driver?.availability, activeTrip, activeDriverId]);

  // 5. Temporizador regresivo de 15 segundos para la solicitud activa
  const currentRequest =
    driver?.availability === 'available' && !activeTrip && availableRequests.length > 0
      ? availableRequests[0]
      : null;

  useEffect(() => {
    if (!currentRequest) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const updateTimer = () => {
      if (!currentRequest.expiresAt) {
        setTimeLeft(15);
        return;
      }
      const remainingSecs = Math.max(0, Math.ceil((currentRequest.expiresAt - Date.now()) / 1000));
      setTimeLeft(remainingSecs);

      if (remainingSecs <= 0) {
        // Expiró
        tripService.rejectTrip(currentRequest.id, 'expired').catch(() => {});
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentRequest]);

  // Cambiar disponibilidad (Regla de negocio: Solo approved puede ser available)
  const handleToggleAvailability = async (newVal) => {
    if (!driver) return;

    if (newVal && driver.status !== 'approved') {
      Alert.alert(
        'Acceso denegado',
        'Solamente un conductor aprobado puede ponerse disponible para recibir viajes. Tu estado actual es: ' +
          (driver.status === 'pending' ? 'En revisión' : 'Rechazado') +
          '.',
      );
      return;
    }

    setUpdatingAvailability(true);
    try {
      await driverService.setAvailability(activeDriverId, newVal ? 'available' : 'unavailable');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdatingAvailability(false);
    }
  };

  // Simular cambio de estado de aprobación para pruebas
  const handleToggleApprovalStatus = async () => {
    if (!driver) return;
    const nextStatus = driver.status === 'approved' ? 'pending' : 'approved';
    try {
      const db = getDb();
      await updateDoc(doc(db, 'drivers', activeDriverId), {
        status: nextStatus,
        availability: nextStatus === 'pending' ? 'unavailable' : driver.availability,
        updatedAt: new Date().toISOString(),
      });
      Alert.alert('Estado actualizado (Pruebas)', `El estado del conductor ahora es: ${nextStatus}`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Actualizar ubicación del conductor
  const handleUpdateLocation = async () => {
    if (!activeDriverId) return;
    // Generar coordenadas ligeramente desplazadas alrededor de Bogotá para simular GPS real
    const baseLat = 4.6097;
    const baseLng = -74.0817;
    const randomOffset = (Math.random() - 0.5) * 0.02;

    try {
      await locationService.updateDriverLocation(activeDriverId, {
        latitude: parseFloat((baseLat + randomOffset).toFixed(6)),
        longitude: parseFloat((baseLng + randomOffset).toFixed(6)),
      });
      Alert.alert('Ubicación actualizada', 'Se guardaron las nuevas coordenadas en driverLocations.');
    } catch (err) {
      Alert.alert('Error actualizando ubicación', err.message);
    }
  };

  // Simular creación de una nueva solicitud de viaje en tiempo real
  const handleSimulateNewRequest = async () => {
    try {
      const demoTrips = [
        {
          passengerName: 'María Gómez',
          origin: { address: 'Calle 72 # 11-86, Zona Rosa', latitude: 4.657, longitude: -74.058 },
          destination: { address: 'Aeropuerto El Dorado, T1', latitude: 4.701, longitude: -74.146 },
          fare: 35000,
          tip: 5000,
          distanceKm: 14.2,
          durationMin: 32,
          category: 'economy',
          paymentMethod: 'mercadopago',
        },
        {
          passengerName: 'Andrés Castro',
          origin: { address: 'Parque de la 93, Cra 13', latitude: 4.676, longitude: -74.048 },
          destination: { address: 'Centro Comercial Unicentro', latitude: 4.702, longitude: -74.041 },
          fare: 18000,
          tip: 2000,
          distanceKm: 5.8,
          durationMin: 18,
          category: 'xl',
          paymentMethod: 'cash',
        },
      ];

      const chosen = demoTrips[Math.floor(Math.random() * demoTrips.length)];
      await tripService.createTrip(chosen);
      Alert.alert('Solicitud enviada', 'Se creó una nueva solicitud de viaje en Firestore con temporizador de 15s.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Aceptar viaje
  const handleAcceptTrip = async (tripId) => {
    try {
      await tripService.acceptTrip(tripId, activeDriverId);
      Alert.alert('¡Viaje aceptado!', 'Iniciando el seguimiento del viaje.');
    } catch (err) {
      Alert.alert('No se pudo aceptar', err.message);
    }
  };

  // Rechazar viaje
  const handleRejectTrip = async (tripId) => {
    try {
      await tripService.rejectTrip(tripId, activeDriverId);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Transición de estados del viaje en curso
  const handleAdvanceTripStatus = async () => {
    if (!activeTrip) return;

    if (activeTrip.status === 'accepted') {
      await tripService.changeTripStatus(activeTrip.id, 'driver_arriving');
    } else if (activeTrip.status === 'driver_arriving') {
      await tripService.changeTripStatus(activeTrip.id, 'in_progress');
    } else if (activeTrip.status === 'in_progress') {
      // Al completar el viaje: pasar a 'completed' y registrar automáticamente ganancias
      await tripService.changeTripStatus(activeTrip.id, 'completed');
      await earningsService.recordEarnings({
        driverId: activeDriverId,
        tripId: activeTrip.id,
        fare: activeTrip.fare,
        commission: activeTrip.commission,
        tip: activeTrip.tip || 0,
        paymentMethod: activeTrip.paymentMethod || 'cash',
      });
      Alert.alert('Viaje completado', 'Las ganancias del viaje fueron registradas exitosamente en driverEarnings.');
    } else if (activeTrip.status === 'completed') {
      // Registrar pago
      await tripService.changeTripStatus(activeTrip.id, 'paid');
      Alert.alert('Pago confirmado', 'El viaje ha quedado marcado como pagado.');
    }
  };

  const handleCancelActiveTrip = async () => {
    if (!activeTrip) return;
    Alert.alert('Cancelar viaje', '¿Estás seguro de cancelar el viaje actual?', [
      { text: 'No' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          await tripService.changeTripStatus(activeTrip.id, 'cancelled');
        },
      },
    ]);
  };

  if (loading && activeDriverId) {
    return (
      <View style={commonStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textMuted }}>Cargando datos de Firestore...</Text>
      </View>
    );
  }

  const statusConfig = STATUS_LABELS[driver?.status || 'pending'];

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <ScrollView
        style={commonStyles.flex}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera del Conductor */}
        <View style={styles.headerCard}>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver?.fullName || 'Conductor UberClone'}</Text>
            <Text style={styles.driverDoc}>C.C. {driver?.documentNumber || 'Sin documento'}</Text>
            <Text style={styles.driverPhone}>Tel: {driver?.phone || 'Sin teléfono'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Interruptor de Disponibilidad */}
        <View style={styles.card}>
          <View style={styles.availabilityRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Disponibilidad</Text>
              <Text style={styles.cardSubtitle}>
                {driver?.availability === 'available'
                  ? 'Estás conectado y visible para recibir viajes'
                  : 'Desconectado. No recibirás solicitudes'}
              </Text>
            </View>
            <Switch
              value={driver?.availability === 'available'}
              onValueChange={handleToggleAvailability}
              disabled={updatingAvailability}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.white}
            />
          </View>

          {driver?.status !== 'approved' ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Solo conductores aprobados pueden ponerse disponibles.
              </Text>
            </View>
          ) : null}

          {/* Botón de ayuda para pruebas: cambiar aprobación */}
          <Pressable onPress={handleToggleApprovalStatus} style={styles.adminToggle}>
            <Text style={styles.adminToggleText}>
              ⚙️ Modo Pruebas: Cambiar a {driver?.status === 'approved' ? 'Pendiente' : 'Aprobado'}
            </Text>
          </Pressable>
        </View>

        {/* Ubicación en tiempo real */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Ubicación en tiempo real</Text>
            <Pressable onPress={handleUpdateLocation} style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Actualizar GPS</Text>
            </Pressable>
          </View>
          <Text style={styles.locationText}>
            Lat: {driverLocation?.latitude ?? 4.60971} | Lng: {driverLocation?.longitude ?? -74.08175}
          </Text>
          <Text style={styles.locationSub}>
            Última sync: {driverLocation?.updatedAt ? new Date(driverLocation.updatedAt).toLocaleTimeString() : 'Automática'}
          </Text>
        </View>

        {/* Solicitud Entrante con temporizador de 15 segundos */}
        {currentRequest && !activeTrip ? (
          <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestAlert}>¡NUEVA SOLICITUD DE VIAJE!</Text>
              <View style={[styles.timerBadge, timeLeft <= 5 && styles.timerBadgeWarning]}>
                <Text style={styles.timerText}>{timeLeft}s</Text>
              </View>
            </View>

            <View style={styles.tripDetails}>
              <Text style={styles.tripPassenger}>👤 Pasajero: {currentRequest.passengerName || currentRequest.passengerId}</Text>
              <Text style={styles.tripRoute}>🟢 Origen: {currentRequest.origin?.address || 'Ubicación origen'}</Text>
              <Text style={styles.tripRoute}>🔴 Destino: {currentRequest.destination?.address || 'Ubicación destino'}</Text>

              <View style={styles.fareBreakdown}>
                <View style={styles.fareItem}>
                  <Text style={styles.fareLabel}>Tarifa total</Text>
                  <Text style={styles.fareValue}>${currentRequest.fare?.toLocaleString('es-CO')} COP</Text>
                </View>
                <View style={styles.fareItem}>
                  <Text style={styles.fareLabel}>Comisión (20%)</Text>
                  <Text style={styles.fareValue}>-${currentRequest.commission?.toLocaleString('es-CO')} COP</Text>
                </View>
                <View style={styles.fareItem}>
                  <Text style={styles.fareLabel}>Tu ganancia neta</Text>
                  <Text style={[styles.fareValue, styles.fareNet]}>
                    ${currentRequest.driverEarnings?.toLocaleString('es-CO')} COP
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <AppButton
                title="Rechazar"
                variant="outline"
                onPress={() => handleRejectTrip(currentRequest.id)}
                style={styles.halfBtn}
              />
              <AppButton
                title={`Aceptar (${timeLeft}s)`}
                onPress={() => handleAcceptTrip(currentRequest.id)}
                style={styles.halfBtn}
              />
            </View>
          </View>
        ) : null}

        {/* Viaje en curso activo */}
        {activeTrip ? (
          <View style={styles.activeTripCard}>
            <Text style={styles.activeTripHeader}>VIAJE EN CURSO</Text>
            <View style={styles.activeTripBadge}>
              <Text style={styles.activeTripBadgeText}>
                Estado: {TRIP_STATUS_LABELS[activeTrip.status] || activeTrip.status}
              </Text>
            </View>

            <View style={styles.activeTripBody}>
              <Text style={styles.tripPassenger}>👤 {activeTrip.passengerName || activeTrip.passengerId}</Text>
              <Text style={styles.tripRoute}>🟢 {activeTrip.origin?.address}</Text>
              <Text style={styles.tripRoute}>🔴 {activeTrip.destination?.address}</Text>

              <View style={styles.tripFinancials}>
                <Text style={styles.financialText}>
                  Ganancia estimada: <Text style={{ fontWeight: '700' }}>${activeTrip.driverEarnings?.toLocaleString('es-CO')} COP</Text>
                </Text>
                <Text style={styles.financialText}>
                  Pago: {activeTrip.paymentMethod === 'cash' ? 'Efectivo' : 'Mercado Pago'} ({activeTrip.paymentStatus})
                </Text>
              </View>
            </View>

            <View style={styles.activeTripActions}>
              {activeTrip.status === 'accepted' ? (
                <AppButton title="Llegué al punto de encuentro" onPress={handleAdvanceTripStatus} />
              ) : null}
              {activeTrip.status === 'driver_arriving' ? (
                <AppButton title="Iniciar viaje con pasajero" onPress={handleAdvanceTripStatus} />
              ) : null}
              {activeTrip.status === 'in_progress' ? (
                <AppButton title="Finalizar viaje y liquidar" onPress={handleAdvanceTripStatus} />
              ) : null}
              {activeTrip.status === 'completed' ? (
                <AppButton title="Confirmar pago recibido" onPress={handleAdvanceTripStatus} />
              ) : null}
              {activeTrip.status === 'paid' ? (
                <Text style={{ textAlign: 'center', color: colors.accent, fontWeight: '700' }}>
                  ✓ Viaje completado y pagado
                </Text>
              ) : null}

              {activeTrip.status !== 'completed' && activeTrip.status !== 'paid' ? (
                <Pressable onPress={handleCancelActiveTrip} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancelar viaje</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Botón para simular solicitud de viaje */}
        <View style={styles.simulationCard}>
          <Text style={styles.simulationTitle}>Simulador de viajes en tiempo real</Text>
          <Text style={styles.simulationSub}>
            Envía una solicitud de viaje de prueba para ver la sincronización en Firestore.
          </Text>
          <AppButton
            title="+ Generar solicitud de viaje entrante"
            variant="outline"
            onPress={handleSimulateNewRequest}
          />
        </View>

        {/* Reiniciar o cerrar sesión */}
        <View style={styles.logoutContainer}>
          <Pressable onPress={resetRegistration}>
            <Text style={styles.logoutText}>Cerrar sesión / Reiniciar registro local</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  headerCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    ...typography.title,
    fontSize: 18,
    color: colors.text,
  },
  driverDoc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  driverPhone: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  statusBadgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...typography.label,
    fontSize: 16,
    color: colors.text,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  warningBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderRadius: radii.sm,
  },
  warningText: {
    ...typography.caption,
    color: '#92400E',
    fontWeight: '600',
  },
  adminToggle: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  adminToggleText: {
    ...typography.caption,
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkButton: {
    padding: spacing.xs,
  },
  linkButtonText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
  locationText: {
    ...typography.body,
    fontSize: 14,
    marginTop: spacing.xs,
    color: colors.text,
  },
  locationSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  requestCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requestAlert: {
    ...typography.label,
    color: '#B45309',
    fontWeight: '800',
    fontSize: 14,
  },
  timerBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  timerBadgeWarning: {
    backgroundColor: colors.danger,
  },
  timerText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  tripDetails: {
    marginBottom: spacing.md,
  },
  tripPassenger: {
    ...typography.label,
    marginBottom: 4,
  },
  tripRoute: {
    ...typography.body,
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  fareBreakdown: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fareItem: {
    alignItems: 'center',
  },
  fareLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  fareValue: {
    ...typography.caption,
    fontWeight: '700',
    marginTop: 2,
  },
  fareNet: {
    color: colors.accent,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfBtn: {
    flex: 1,
  },
  activeTripCard: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  activeTripHeader: {
    ...typography.label,
    color: colors.accent,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  activeTripBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  activeTripBadgeText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
  activeTripBody: {
    marginBottom: spacing.md,
  },
  tripFinancials: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  financialText: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  activeTripActions: {
    gap: spacing.sm,
  },
  cancelBtn: {
    alignItems: 'center',
    padding: spacing.xs,
  },
  cancelBtnText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  simulationCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  simulationTitle: {
    ...typography.label,
    marginBottom: 2,
  },
  simulationSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  logoutContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  logoutText: {
    ...typography.caption,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});

export default DriverDashboardScreen;

