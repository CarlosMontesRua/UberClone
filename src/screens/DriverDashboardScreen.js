import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Pressable,
  Platform,
  Image,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';
import { useRegistration } from '../hooks/useRegistration';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { useTripRoute } from '../hooks/useTripRoute';
import { useTripRequests } from '../hooks/useTripRequests';
import { useTrip } from '../context/TripContext';
import { driverService } from '../services/driverService';
import { tripService } from '../services/tripService';
import { notificationService } from '../services/notificationService';
import { calculateFare } from '../config/pricing';
import { MEDELLIN_CENTER, pickRandomMedellinRoute } from '../data/medellinRoutes';
import { doc, updateDoc } from 'firebase/firestore';
import { getDb } from '../config/firebase';

// AI-assisted: see docs/AI_LOG.md #1

const STATUS_LABELS = {
  pending: { label: 'En revisión (Pendiente)', color: colors.warning || '#D97706', bg: '#FEF3C7' },
  approved: { label: 'Aprobado y Verificado', color: colors.accent, bg: colors.accentSoft },
  rejected: { label: 'Rechazado', color: colors.danger, bg: colors.dangerSoft },
};

const TRIP_STATUS_LABELS = {
  requested: 'Solicitado',
  accepted: 'Aceptado (dirígete al origen)',
  driver_arriving: 'Llegando al punto de recogida',
  in_progress: 'Viaje en curso',
  completed: 'Viaje completado',
  paid: 'Pagado',
  cancelled: 'Cancelado',
};

const PAYMENT_STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  cash: 'Efectivo',
};

export const DriverDashboardScreen = ({ navigation }) => {
  const { activeDriverId, resetRegistration } = useRegistration();
  const { activeTrip, setCompletedForPayment } = useTrip();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [carCoord, setCarCoord] = useState(null);
  const [tracksCar, setTracksCar] = useState(true);
  const [routeArrived, setRouteArrived] = useState(false);
  const mapRef = useRef(null);
  const notifiedRequestId = useRef(null);
  const routeAnimRef = useRef(null);
  const fittedRouteKey = useRef(null);

  const isAvailable = driver?.availability === 'available';
  const {
    location: driverLocation,
    error: locationError,
    loading: locationLoading,
    permissionStatus,
    requestPermission,
  } = useDriverLocation({
    driverId: activeDriverId,
    tracking: Boolean(activeDriverId && isAvailable),
  });

  const {
    coordinates: routeCoordinates,
    meta: routeMeta,
    error: routeError,
    loading: routeLoading,
  } = useTripRoute({ trip: activeTrip, driverLocation });

  const { currentRequest, timeLeft, acceptRequest, rejectRequest } = useTripRequests({
    enabled: Boolean(isAvailable && !activeTrip),
  });

  // 1. Suscripción en tiempo real al perfil del conductor
  useEffect(() => {
    if (!activeDriverId) {
      setLoading(false);
      return;
    }

    const unsubscribe = driverService.subscribeToDriver(activeDriverId, (data) => {
      setDriver(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeDriverId]);

  // Notificación local: una sola vez por solicitud
  useEffect(() => {
    const id = currentRequest?.id;
    if (!id || notifiedRequestId.current === id) return;
    notifiedRequestId.current = id;
    notificationService.notifyNewTripRequest(currentRequest).catch(() => {});
  }, [currentRequest?.id]);

  // GPS solo sin viaje activo (con viaje, el carro sigue la animación de ruta)
  useEffect(() => {
    if (activeTrip) return;
    if (driverLocation) {
      setCarCoord(driverLocation);
      return;
    }
    setCarCoord((prev) =>
      prev || {
        latitude: MEDELLIN_CENTER.latitude,
        longitude: MEDELLIN_CENTER.longitude,
      },
    );
  }, [driverLocation?.latitude, driverLocation?.longitude, activeTrip]);

  // Animar el carro; al llegar habilita el botón de la siguiente acción
  useEffect(() => {
    if (routeAnimRef.current) {
      clearInterval(routeAnimRef.current);
      routeAnimRef.current = null;
    }

    if (!activeTrip || routeCoordinates.length < 2) {
      setRouteArrived(false);
      return undefined;
    }

    // En "accepted" el botón de salir no depende de llegar
    if (activeTrip.status === 'accepted') {
      setRouteArrived(true);
      return undefined;
    }

    // Si acabamos de llegar a recogida, el carro ya está en el origen de la nueva ruta
    const startAt =
      activeTrip.status === 'in_progress' && carCoord
        ? carCoord
        : routeCoordinates[0];

    let index = 0;
    setRouteArrived(false);
    setCarCoord(startAt);
    setTracksCar(true);

    routeAnimRef.current = setInterval(() => {
      index += Math.max(1, Math.floor(routeCoordinates.length / 40));
      if (index >= routeCoordinates.length - 1) {
        index = routeCoordinates.length - 1;
        setCarCoord(routeCoordinates[index]);
        clearInterval(routeAnimRef.current);
        routeAnimRef.current = null;
        setTracksCar(false);
        setRouteArrived(true);
        return;
      }
      setCarCoord(routeCoordinates[index]);
    }, 600);

    return () => {
      if (routeAnimRef.current) clearInterval(routeAnimRef.current);
    };
  }, [activeTrip?.id, activeTrip?.status, routeCoordinates]);

  // Ajustar mapa UNA vez por ruta (permite zoom manual después)
  useEffect(() => {
    if (!mapRef.current) return;

    if (routeCoordinates.length > 1) {
      const key = `${activeTrip?.id || 'x'}-${activeTrip?.status || 's'}-${routeCoordinates.length}`;
      if (fittedRouteKey.current === key) return;
      fittedRouteKey.current = key;
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
      return;
    }

    if (activeTrip) return;
    const focus = carCoord || driverLocation || MEDELLIN_CENTER;
    mapRef.current.animateToRegion(
      {
        latitude: focus.latitude,
        longitude: focus.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      500,
    );
  }, [routeCoordinates, activeTrip?.id, activeTrip?.status]);

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

    if (newVal) {
      const granted = await requestPermission();
      if (!granted) return;
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

  // Simular solicitud con rutas populares de Medellín
  const handleSimulateNewRequest = async () => {
    try {
      const chosen = pickRandomMedellinRoute();
      const priced = calculateFare(chosen);
      await tripService.createTrip({ ...chosen, ...priced });
      Alert.alert(
        'Solicitud Medellín',
        `${chosen.origin.address} → ${chosen.destination.address}`,
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAcceptTrip = useCallback(async () => {
    try {
      await acceptRequest(activeDriverId);
      Alert.alert('¡Viaje aceptado!', 'Ruta a recogida activa.');
    } catch (err) {
      Alert.alert('No se pudo aceptar', err.message);
    }
  }, [acceptRequest, activeDriverId]);

  const handleRejectTrip = useCallback(async () => {
    try {
      await rejectRequest(activeDriverId);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, [rejectRequest, activeDriverId]);

  // Transición de estados → al completar navega a cobro (efectivo; MP pendiente)
  const handleAdvanceTripStatus = async () => {
    if (!activeTrip) return;

    if (activeTrip.status === 'accepted') {
      await tripService.changeTripStatus(activeTrip.id, 'driver_arriving');
    } else if (activeTrip.status === 'driver_arriving') {
      await tripService.changeTripStatus(activeTrip.id, 'in_progress');
    } else if (activeTrip.status === 'in_progress') {
      const completed = await tripService.completeTripWithFare(activeTrip.id, {
        distanceKm: activeTrip.distanceKm,
        durationMin: activeTrip.durationMin,
        category: activeTrip.category,
        tip: activeTrip.tip || 0,
        routePolyline: routeCoordinates,
      });
      setCompletedForPayment(completed);
      navigation.navigate('TripPayment', { trip: completed });
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

  if (loading) {
    return (
      <View style={commonStyles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textMuted }}>
          Cargando datos del conductor...
        </Text>
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
          {driver?.profilePhoto ? (
            <Image source={{ uri: driver.profilePhoto }} style={styles.driverAvatar} />
          ) : (
            <View style={[styles.driverAvatar, styles.driverAvatarEmpty]}>
              <Text style={styles.driverAvatarInitial}>
                {(driver?.fullName || 'C').trim().charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
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

        {/* Mapa: carro + ruta real (recogida / destino) */}
        <View style={styles.mapCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Mapa</Text>
            <Text style={styles.locationSub}>
              {routeLoading
                ? 'Calculando ruta...'
                : routeMeta?.label
                  ? routeMeta.label
                  : isAvailable
                    ? locationLoading
                      ? 'Activando GPS...'
                      : 'GPS activo'
                    : 'Activa Disponible para enviar GPS'}
            </Text>
          </View>

          {routeMeta?.durationMin != null ? (
            <Text style={styles.routeMetaText}>
              {routeMeta.distanceKm?.toFixed(1)} km · {routeMeta.durationMin} min ·{' '}
              {routeMeta.mode === 'pickup'
                ? 'En camino al pasajero'
                : 'En camino al destino'}
            </Text>
          ) : null}

          {isAvailable && permissionStatus === 'denied' ? (
            <View style={styles.permissionBox}>
              <Text style={styles.warningText}>
                Para estar Disponible hace falta permiso de ubicación.
              </Text>
              <AppButton title="Permitir ubicación" onPress={requestPermission} style={{ marginTop: spacing.sm }} />
            </View>
          ) : null}

          {isAvailable && locationError ? (
            <Text style={[styles.warningText, { marginBottom: spacing.sm }]}>{locationError}</Text>
          ) : null}

          {routeError ? (
            <Text style={[styles.warningText, { marginBottom: spacing.sm }]}>
              Ruta: {routeError}
            </Text>
          ) : null}

          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              mapType="standard"
              showsUserLocation={false}
              showsMyLocationButton={false}
              zoomEnabled
              scrollEnabled
              pitchEnabled
              rotateEnabled
              initialRegion={MEDELLIN_CENTER}
            >
              {carCoord ? (
                <Marker
                  coordinate={{
                    latitude: carCoord.latitude,
                    longitude: carCoord.longitude,
                  }}
                  title="Conductor"
                  description="Tu vehículo"
                  anchor={{ x: 0.5, y: 0.5 }}
                  flat
                  tracksViewChanges={tracksCar}
                >
                  <View style={styles.carMarker}>
                    <Text style={styles.carEmoji}>🚗</Text>
                  </View>
                </Marker>
              ) : null}

              {activeTrip?.origin?.latitude ? (
                <Marker
                  coordinate={{
                    latitude: Number(activeTrip.origin.latitude),
                    longitude: Number(activeTrip.origin.longitude),
                  }}
                  title="Recogida"
                  description={activeTrip.origin.address}
                  pinColor="#16A34A"
                />
              ) : null}

              {activeTrip?.destination?.latitude &&
              (activeTrip.status === 'in_progress' ||
                activeTrip.status === 'accepted' ||
                activeTrip.status === 'driver_arriving') ? (
                <Marker
                  coordinate={{
                    latitude: Number(activeTrip.destination.latitude),
                    longitude: Number(activeTrip.destination.longitude),
                  }}
                  title="Destino"
                  description={activeTrip.destination.address}
                  pinColor="#DC2626"
                />
              ) : null}

              {routeCoordinates.length > 1 ? (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor={routeMeta?.mode === 'dropoff' ? '#2563EB' : '#0E9F6E'}
                  strokeWidth={5}
                />
              ) : null}
            </MapView>
          </View>

          <Text style={styles.locationText}>
            Lat: {driverLocation?.latitude?.toFixed(6) ?? '—'} | Lng:{' '}
            {driverLocation?.longitude?.toFixed(6) ?? '—'}
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
              <Text style={styles.tripPassenger}>👤 Pasajero: {currentRequest.passengerId}</Text>
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
                onPress={handleRejectTrip}
                style={styles.halfBtn}
              />
              <AppButton
                title={`Aceptar (${timeLeft}s)`}
                onPress={handleAcceptTrip}
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
              <Text style={styles.tripPassenger}>👤 {activeTrip.passengerId}</Text>
              <Text style={styles.tripRoute}>🟢 {activeTrip.origin?.address}</Text>
              <Text style={styles.tripRoute}>🔴 {activeTrip.destination?.address}</Text>

              <View style={styles.tripFinancials}>
                <Text style={styles.financialText}>
                  Ganancia estimada: <Text style={{ fontWeight: '700' }}>${activeTrip.driverEarnings?.toLocaleString('es-CO')} COP</Text>
                </Text>
                <Text style={styles.financialText}>
                  Pago:{' '}
                  {activeTrip.paymentMethod === 'cash'
                    ? 'Efectivo'
                    : activeTrip.paymentMethod === 'mercadopago'
                      ? 'Mercado Pago'
                      : activeTrip.paymentMethod}{' '}
                  (
                  {PAYMENT_STATUS_LABELS[activeTrip.paymentStatus] ||
                    activeTrip.paymentStatus ||
                    'Pendiente'}
                  )
                </Text>
              </View>
            </View>

            <View style={styles.activeTripActions}>
              {activeTrip.status === 'accepted' ? (
                <AppButton
                  title="Voy a recoger al pasajero"
                  onPress={handleAdvanceTripStatus}
                />
              ) : null}

              {activeTrip.status === 'driver_arriving' ? (
                <>
                  {!routeArrived ? (
                    <Text style={styles.waitHint}>
                      El botón se habilita cuando el carro llegue al punto de recogida…
                    </Text>
                  ) : null}
                  <AppButton
                    title="Pasajero a bordo"
                    onPress={handleAdvanceTripStatus}
                    disabled={!routeArrived}
                  />
                </>
              ) : null}

              {activeTrip.status === 'in_progress' ? (
                <>
                  {!routeArrived ? (
                    <Text style={styles.waitHint}>
                      El botón se habilita cuando el carro llegue al destino…
                    </Text>
                  ) : null}
                  <AppButton
                    title="Finalizar viaje y cobrar"
                    onPress={handleAdvanceTripStatus}
                    disabled={!routeArrived}
                  />
                </>
              ) : null}

              <Pressable onPress={handleCancelActiveTrip} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancelar viaje</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Botón para simular solicitud de viaje */}
        <View style={styles.simulationCard}>
          <Text style={styles.simulationTitle}>Simulador Medellín</Text>
          <Text style={styles.simulationSub}>
            Genera una solicitud con rutas populares de Medellín (Poblado, Laureles, Envigado, etc.).
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
    gap: spacing.md,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceStrong,
  },
  driverAvatarEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarInitial: {
    ...typography.title,
    fontSize: 22,
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
  mapCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  mapContainer: {
    height: 280,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
    backgroundColor: '#E5E7EB',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  permissionBox: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderRadius: radii.sm,
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
  routeMetaText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  carMarker: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  carEmoji: {
    fontSize: 28,
  },
  waitHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
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

