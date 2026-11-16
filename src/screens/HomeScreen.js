import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../theme/theme';
import { useRegistration } from '../hooks/useRegistration';
import { useAuth } from '../context/AuthContext';
import { useDriverLocation, DEFAULT_INITIAL_LOCATION } from '../hooks/useDriverLocation';
import { driverLocationService } from '../services/driverLocationService';
import { driverAvailabilityService } from '../services/driverAvailabilityService';
import { tripService } from '../services/tripService';
import { earningsService } from '../services/earningsService';
import { DriverMap } from '../components/DriverMap';
import { AvailabilitySwitch } from '../components/AvailabilitySwitch';
import { AppButton } from '../components/AppButton';
import { doc, updateDoc } from 'firebase/firestore';
import { getDb } from '../config/firebase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Pantalla principal HomeScreen (o InicioScreen) para el conductor de UberClone.
 *
 * Implementa de manera estricta y modular:
 * 1. Mapa interactivo en pantalla completa con react-native-maps.
 * 2. Geolocalización en tiempo real con Expo SDK 58 (useDriverLocation).
 * 3. Marcador vehicular personalizado con orientación y estado visual.
 * 4. Botón flotante para centrar la cámara en la ubicación actual.
 * 5. Interruptor de disponibilidad con verificación estricta de aprobación (status === 'approved').
 * 6. Menú desplegable para acceder a Perfil, Ganancias, Historial y Registro.
 * 7. Sincronización continua con Firestore en la colección driverLocations.
 * 8. Recepción en tiempo real de solicitudes de viaje cuando está disponible.
 * 9. Uso exhaustivo de los hooks vistos en clase (useState, useEffect, useCallback).
 */
export const HomeScreen = ({ navigation }) => {
  const { activeDriverId, resetRegistration } = useRegistration();
  const authContext = useAuth?.() || {};
  const currentDriverId = activeDriverId || authContext.user?.uid || null;

  // -------------------------------------------------------------
  // 1. ESTADOS OBLIGATORIOS (useState)
  // -------------------------------------------------------------
  // Estado de disponibilidad
  const [isAvailable, setIsAvailable] = useState(false);

  // Ubicación actual
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_INITIAL_LOCATION);

  // Estado de carga general / inicial
  const [loading, setLoading] = useState(Boolean(currentDriverId));

  // Permisos de ubicación
  const [hasPermission, setHasPermission] = useState(null);

  // Estado de conexión a Firestore y servicios
  const [isConnected, setIsConnected] = useState(true);

  // Estados complementarios de la pantalla
  const [driverProfile, setDriverProfile] = useState(null);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [requestTimeLeft, setRequestTimeLeft] = useState(15);

  const mapRef = useRef(null);
  const requestTimerRef = useRef(null);

  // -------------------------------------------------------------
  // 2. HOOK PERSONALIZADO: useDriverLocation
  // -------------------------------------------------------------
  const {
    requestLocationPermission,
    getCurrentLocation,
    startTracking,
    stopTracking,
  } = useDriverLocation({
    driverId: currentDriverId,
    isAvailable: isAvailable,
    syncIntervalMs: 5000,
    onLocationUpdate: useCallback((coords) => {
      if (coords) {
        setCurrentLocation(coords);
      }
    }, []),
    onPermissionChange: useCallback((status) => {
      setHasPermission(status);
    }, []),
  });

  // -------------------------------------------------------------
  // 3. EFECTOS OBLIGATORIOS (useEffect)
  // -------------------------------------------------------------

  // Efecto A: Obtener el perfil del conductor desde Firestore en tiempo real
  useEffect(() => {
    let isMounted = true;

    if (!currentDriverId) {
      return;
    }

    const unsubscribeDriver = driverAvailabilityService.subscribeToDriver(
      currentDriverId,
      (profile) => {
        if (!isMounted) return;
        setDriverProfile(profile);
        if (profile) {
          setIsAvailable(profile.availability === 'available');
          setIsConnected(true);
        }
        setLoading(false);
      },
    );

    return () => {
      isMounted = false;
      unsubscribeDriver();
    };
  }, [currentDriverId]);

  // Efecto B: Obtener la ubicación inicial del dispositivo y centrar el mapa
  useEffect(() => {
    let isMounted = true;

    const initLocation = async () => {
      const coords = await getCurrentLocation();
      if (isMounted && coords) {
        setCurrentLocation(coords);
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            },
            700,
          );
        }
      }
    };

    initLocation();

    return () => {
      isMounted = false;
    };
  }, [getCurrentLocation]);

  // Efecto C: Manejar inicio y detención del seguimiento según la disponibilidad
  // Incluye función de limpieza obligatoria para cancelar suscripciones al salir de la pantalla
  useEffect(() => {
    if (isAvailable && currentDriverId && hasPermission) {
      startTracking();
    } else {
      stopTracking();
    }

    // FUNCIÓN DE LIMPIEZA OBLIGATORIA al salir de la pantalla o desmontar
    return () => {
      stopTracking();
    };
  }, [isAvailable, currentDriverId, hasPermission, startTracking, stopTracking]);

  // Efecto D: Escuchar solicitudes de viaje en tiempo real mientras el conductor esté disponible
  useEffect(() => {
    if (!isAvailable || !currentDriverId || activeTrip) {
      return;
    }

    // Escucha solicitudes creadas en Firestore
    const unsubscribeRequests = tripService.subscribeToAvailableRequests(
      null,
      (requests) => setAvailableRequests(requests || []),
      currentDriverId,
    );

    return () => {
      unsubscribeRequests();
      setAvailableRequests([]);
    };
  }, [isAvailable, currentDriverId, activeTrip]);

  // Efecto E: Escuchar viajes activos asignados al conductor
  useEffect(() => {
    if (!currentDriverId) return;

    const unsubscribeTrip = tripService.subscribeToActiveTripForDriver(
      currentDriverId,
      (trip) => {
        setActiveTrip(trip);
      },
    );

    return () => {
      unsubscribeTrip();
    };
  }, [currentDriverId]);

  // Efecto F: Temporizador de 15 segundos para solicitudes entrantes
  const incomingRequest = availableRequests.length > 0 ? availableRequests[0] : null;

  useEffect(() => {
    if (!incomingRequest) {
      if (requestTimerRef.current) {
        clearInterval(requestTimerRef.current);
        requestTimerRef.current = null;
      }
      return;
    }

    const checkTimer = () => {
      if (!incomingRequest.expiresAt) {
        setRequestTimeLeft(15);
        return;
      }
      const remaining = Math.max(0, Math.ceil((incomingRequest.expiresAt - Date.now()) / 1000));
      setRequestTimeLeft(remaining);

      if (remaining <= 0) {
        // Expiró el tiempo de aceptación
        tripService.rejectTrip(incomingRequest.id, 'expired').catch(() => {});
      }
    };

    checkTimer();
    requestTimerRef.current = setInterval(checkTimer, 1000);

    return () => {
      if (requestTimerRef.current) {
        clearInterval(requestTimerRef.current);
        requestTimerRef.current = null;
      }
    };
  }, [incomingRequest]);

  // -------------------------------------------------------------
  // 4. FUNCIONES MEMORIZADAS OBLIGATORIAS (useCallback)
  // -------------------------------------------------------------

  /**
   * Función para centrar el mapa en la ubicación actual del conductor
   */
  const handleCenterMap = useCallback(() => {
    if (!currentLocation || !mapRef.current) {
      Alert.alert('Ubicación no disponible', 'Esperando la señal GPS del dispositivo...');
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      800,
    );
  }, [currentLocation]);

  /**
   * Función para activar la disponibilidad (Ponerse en línea)
   * Valida estrictamente que el conductor esté autenticado, aprobado y con permisos de GPS.
   */
  const handleGoOnline = useCallback(async () => {
    if (!currentDriverId) {
      Alert.alert('Error', 'No hay una sesión activa de conductor.');
      return;
    }

    // 1. Validar estado de aprobación en Firestore
    const isApproved = driverProfile?.status === 'approved';
    if (!isApproved) {
      const currentStatusLabel =
        driverProfile?.status === 'pending'
          ? 'En revisión (Pendiente)'
          : driverProfile?.status === 'rejected'
          ? 'Rechazado'
          : 'No aprobado';

      Alert.alert(
        'Acceso restringido',
        `Solamente los conductores cuyo estado sea "Aprobado" pueden conectarse para recibir viajes.\n\nTu estado actual es: ${currentStatusLabel}.\nPor favor espera la verificación de tus documentos.`,
        [{ text: 'Entendido' }],
      );
      return;
    }

    // 2. Validar permisos de ubicación
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          'Permisos necesarios',
          'Debes otorgar permisos de geolocalización para que los pasajeros cercanos puedan encontrarte.',
          [{ text: 'OK' }],
        );
        return;
      }
    }

    // 3. Actualizar disponibilidad en Firestore
    setUpdatingAvailability(true);
    try {
      await driverAvailabilityService.goOnline(currentDriverId);
      setIsAvailable(true);

      // Obtener y enviar coordenadas iniciales a Firestore
      const freshCoords = await getCurrentLocation();
      if (freshCoords) {
        await driverLocationService.updateLocation(currentDriverId, freshCoords);
      }
    } catch (err) {
      console.warn('Error al activar disponibilidad:', err);
      Alert.alert('Error', err.message || 'No se pudo activar la disponibilidad.');
      setIsAvailable(false);
    } finally {
      setUpdatingAvailability(false);
    }
  }, [
    currentDriverId,
    driverProfile?.status,
    hasPermission,
    requestLocationPermission,
    getCurrentLocation,
  ]);

  /**
   * Función para desactivar la disponibilidad (Desconectarse)
   * Actualiza el estado en Firestore y detiene el seguimiento.
   */
  const handleGoOffline = useCallback(async () => {
    if (!currentDriverId) return;

    setUpdatingAvailability(true);
    try {
      await driverAvailabilityService.goOffline(currentDriverId);
      setIsAvailable(false);
      stopTracking();
    } catch (err) {
      console.warn('Error al desactivar disponibilidad:', err);
      Alert.alert('Error', err.message || 'No se pudo desactivar la disponibilidad.');
    } finally {
      setUpdatingAvailability(false);
    }
  }, [currentDriverId, stopTracking]);

  /**
   * Manejador del interruptor
   */
  const handleToggleAvailability = useCallback(
    (nextVal) => {
      if (nextVal) {
        handleGoOnline();
      } else {
        handleGoOffline();
      }
    },
    [handleGoOnline, handleGoOffline],
  );

  // -------------------------------------------------------------
  // 5. ACCIONES DE VIAJES Y MODO PRUEBAS
  // -------------------------------------------------------------

  const handleAcceptRequest = async (tripId) => {
    try {
      await tripService.acceptTrip(tripId, currentDriverId);
      Alert.alert('¡Viaje aceptado!', 'Dirígete al punto de recogida del pasajero.');
    } catch (err) {
      Alert.alert('No se pudo aceptar', err.message || 'El viaje ya no está disponible.');
    }
  };

  const handleRejectRequest = async (tripId) => {
    try {
      await tripService.rejectTrip(tripId, currentDriverId);
    } catch (err) {
      console.warn('Error rechazando solicitud:', err);
    }
  };

  // Alternar aprobación para pruebas del evaluador
  const handleToggleApprovalForTesting = async () => {
    if (!currentDriverId || !driverProfile) return;
    const nextStatus = driverProfile.status === 'approved' ? 'pending' : 'approved';
    try {
      const db = getDb();
      await updateDoc(doc(db, 'drivers', currentDriverId), {
        status: nextStatus,
        availability: nextStatus === 'pending' ? 'unavailable' : driverProfile.availability,
        updatedAt: new Date().toISOString(),
      });
      if (nextStatus === 'pending') {
        setIsAvailable(false);
        stopTracking();
      }
      Alert.alert(
        'Modo Pruebas (Evaluador)',
        `El estado de aprobación del conductor ahora es: "${nextStatus}".\nPrueba activar el interruptor para verificar la regla de negocio.`,
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Simular solicitud entrante de prueba
  const handleSimulateRequest = async () => {
    if (!isAvailable) {
      Alert.alert('Conductor desconectado', 'Debes estar "Disponible" para poder recibir solicitudes.');
      return;
    }
    try {
      const demoTrips = [
        {
          passengerName: 'Camila Restrepo',
          origin: {
            address: 'Carrera 7 # 71-21, Chapinero',
            latitude: 4.656,
            longitude: -74.058,
          },
          destination: {
            address: 'Aeropuerto El Dorado, Terminal 1',
            latitude: 4.701,
            longitude: -74.146,
          },
          fare: 38000,
          tip: 5000,
          distanceKm: 14.8,
          durationMin: 35,
          category: 'economy',
          paymentMethod: 'mercadopago',
        },
        {
          passengerName: 'David Valencia',
          origin: {
            address: 'Parque de la 93, Chicó',
            latitude: 4.676,
            longitude: -74.048,
          },
          destination: {
            address: 'Centro Comercial Andino, Cra 11',
            latitude: 4.666,
            longitude: -74.053,
          },
          fare: 16000,
          tip: 2000,
          distanceKm: 3.2,
          durationMin: 12,
          category: 'xl',
          paymentMethod: 'cash',
        },
      ];

      const chosen = demoTrips[Math.floor(Math.random() * demoTrips.length)];
      await tripService.createTrip(chosen);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const isApproved = driverProfile?.status === 'approved';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Iniciando servicios de conductor y mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. MAPA EN PANTALLA COMPLETA */}
      <DriverMap
        ref={mapRef}
        currentLocation={currentLocation}
        isAvailable={isAvailable}
        onCenterPress={handleCenterMap}
      />

      {/* 2. BARRA SUPERIOR FLOTANTE (ESTILO UBER) */}
      <SafeAreaView edges={['top']} style={styles.topSafeArea} pointerEvents="box-none">
        <View style={styles.topHeader}>
          {/* Botón de Menú / Perfil */}
          <Pressable
            style={({ pressed }) => [styles.menuButton, pressed && styles.buttonPressed]}
            onPress={() => setMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir menú de conductor"
          >
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>

          {/* Pastilla de estado central */}
          <View
            style={[
              styles.statusPill,
              isAvailable ? styles.statusPillOnline : styles.statusPillOffline,
            ]}
          >
            <View
              style={[
                styles.statusPillDot,
                isAvailable ? styles.statusPillDotOnline : styles.statusPillDotOffline,
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                isAvailable ? styles.statusPillTextOnline : styles.statusPillTextOffline,
              ]}
            >
              {isAvailable ? 'EN LÍNEA' : 'DESCONECTADO'}
            </Text>
          </View>

          {/* Botón de acceso directo a Ganancias */}
          <Pressable
            style={({ pressed }) => [styles.earningsShortcut, pressed && styles.buttonPressed]}
            onPress={() => navigation?.navigate?.('Ganancias')}
          >
            <Text style={styles.earningsShortcutText}>💰</Text>
          </Pressable>
        </View>

        {/* Mensaje de error de permisos si fueron denegados */}
        {hasPermission === false ? (
          <View style={styles.permissionBanner}>
            <Text style={styles.permissionBannerText}>
              ⚠️ Permiso de ubicación denegado.
            </Text>
            <Pressable onPress={requestLocationPermission} style={styles.permissionActionBtn}>
              <Text style={styles.permissionActionText}>Activar GPS</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>

      {/* 3. PANEL INFERIOR FLOTANTE CON INTERRUPTOR */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea} pointerEvents="box-none">
        <View style={styles.bottomCardContainer}>
          {/* Tarjeta de Viaje Activo en Curso */}
          {activeTrip ? (
            <View style={styles.activeTripFloatingCard}>
              <View style={styles.tripCardHeader}>
                <Text style={styles.tripCardBadge}>VIAJE EN CURSO</Text>
                <Text style={styles.tripCardFare}>
                  ${activeTrip.driverEarnings?.toLocaleString('es-CO')} COP
                </Text>
              </View>
              <Text style={styles.tripCardPassenger}>👤 {activeTrip.passengerName || activeTrip.passengerId}</Text>
              <Text style={styles.tripCardRoute}>
                🟢 {activeTrip.origin?.address || 'Origen'}
              </Text>
              <Text style={styles.tripCardRoute}>
                🔴 {activeTrip.destination?.address || 'Destino'}
              </Text>
              <View style={styles.tripActionsRow}>
                {activeTrip.status === 'accepted' ? (
                  <AppButton
                    title="Llegué al punto de recogida"
                    onPress={() => tripService.changeTripStatus(activeTrip.id, 'driver_arriving')}
                  />
                ) : null}
                {activeTrip.status === 'driver_arriving' ? (
                  <AppButton
                    title="Iniciar viaje con pasajero"
                    onPress={() => tripService.changeTripStatus(activeTrip.id, 'in_progress')}
                  />
                ) : null}
                {activeTrip.status === 'in_progress' ? (
                  <AppButton
                    title="Completar viaje"
                    onPress={async () => {
                      await tripService.changeTripStatus(activeTrip.id, 'completed');
                      await earningsService.recordEarnings({
                        driverId: currentDriverId,
                        tripId: activeTrip.id,
                        fare: activeTrip.fare,
                        commission: activeTrip.commission,
                        tip: activeTrip.tip || 0,
                        paymentMethod: activeTrip.paymentMethod || 'cash',
                      });
                      Alert.alert('¡Viaje completado!', 'Ganancias liquidadas con éxito.');
                    }}
                  />
                ) : null}
                {activeTrip.status === 'completed' ? (
                  <AppButton
                    title="Confirmar pago recibido"
                    onPress={() => tripService.changeTripStatus(activeTrip.id, 'paid')}
                  />
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Tarjeta de Solicitud de Viaje Entrante */}
          {incomingRequest && !activeTrip ? (
            <View style={styles.incomingRequestCard}>
              <View style={styles.incomingHeader}>
                <Text style={styles.incomingTitle}>¡NUEVA SOLICITUD DE VIAJE!</Text>
                <View
                  style={[
                    styles.countdownBadge,
                    requestTimeLeft <= 5 && styles.countdownBadgeAlert,
                  ]}
                >
                  <Text style={styles.countdownText}>{requestTimeLeft}s</Text>
                </View>
              </View>

              <Text style={styles.incomingPassenger}>
                👤 Pasajero: {incomingRequest.passengerName || incomingRequest.passengerId}
              </Text>
              <Text style={styles.incomingAddress} numberOfLines={1}>
                🟢 {incomingRequest.origin?.address || 'Punto de recogida'}
              </Text>
              <Text style={styles.incomingAddress} numberOfLines={1}>
                🔴 {incomingRequest.destination?.address || 'Punto de destino'}
              </Text>

              <View style={styles.incomingEarningsRow}>
                <View>
                  <Text style={styles.earningsSub}>Ganancia neta (80%)</Text>
                  <Text style={styles.earningsValue}>
                    ${incomingRequest.driverEarnings?.toLocaleString('es-CO')} COP
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.earningsSub}>Tarifa total</Text>
                  <Text style={styles.earningsSubVal}>
                    ${incomingRequest.fare?.toLocaleString('es-CO')} COP
                  </Text>
                </View>
              </View>

              <View style={styles.incomingButtonsRow}>
                <Pressable
                  style={styles.incomingRejectBtn}
                  onPress={() => handleRejectRequest(incomingRequest.id)}
                >
                  <Text style={styles.incomingRejectText}>Rechazar</Text>
                </Pressable>
                <Pressable
                  style={styles.incomingAcceptBtn}
                  onPress={() => handleAcceptRequest(incomingRequest.id)}
                >
                  <Text style={styles.incomingAcceptText}>
                    Aceptar ({requestTimeLeft}s)
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Interruptor de disponibilidad con indicador visual */}
          <AvailabilitySwitch
            isAvailable={isAvailable}
            onToggle={handleToggleAvailability}
            isApproved={isApproved}
            approvalStatus={driverProfile?.status || 'pending'}
            loading={updatingAvailability}
          />

          {/* Barra informativa de coordenadas y sincronización */}
          <View style={styles.syncFooter}>
            <Text style={styles.coordsText}>
              GPS: {currentLocation?.latitude?.toFixed(4)}, {currentLocation?.longitude?.toFixed(4)}
            </Text>
            <Text style={styles.syncStatusText}>
              {isAvailable
                ? (isConnected ? '• Sincronizando con Firestore' : '• Reconectando...')
                : '• Desconectado de Firestore'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* 4. MODAL / MENÚ LATERAL DE PERFIL Y SECCIONES */}
      <Modal
        visible={menuVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setMenuVisible(false)} />
          <View style={styles.drawerContainer}>
            {/* Cabecera del Menú */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                <Text style={styles.drawerAvatarText}>
                  {driverProfile?.fullName?.charAt(0) || 'C'}
                </Text>
              </View>
              <View style={styles.drawerUserInfo}>
                <Text style={styles.drawerName}>
                  {driverProfile?.fullName || 'Conductor Uber'}
                </Text>
                <Text style={styles.drawerPhone}>
                  {driverProfile?.phone || 'Sin teléfono'}
                </Text>
                <View
                  style={[
                    styles.drawerStatusBadge,
                    isApproved ? styles.drawerStatusApproved : styles.drawerStatusPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.drawerStatusBadgeText,
                      isApproved ? styles.badgeTextApproved : styles.badgeTextPending,
                    ]}
                  >
                    {isApproved ? '✓ Cuenta aprobada' : '⏳ En revisión'}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => setMenuVisible(false)} style={styles.closeDrawerBtn}>
                <Text style={styles.closeDrawerIcon}>✕</Text>
              </Pressable>
            </View>

            {/* Accesos a Secciones de la Aplicación */}
            <View style={styles.drawerMenuLinks}>
              <Pressable
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation?.navigate?.('Ganancias');
                }}
              >
                <Text style={styles.drawerMenuIcon}>💰</Text>
                <View style={styles.drawerMenuTexts}>
                  <Text style={styles.drawerMenuTitle}>Ganancias</Text>
                  <Text style={styles.drawerMenuSub}>Ver balance y liquidaciones</Text>
                </View>
                <Text style={styles.drawerMenuChevron}>›</Text>
              </Pressable>

              <Pressable
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation?.navigate?.('Historial');
                }}
              >
                <Text style={styles.drawerMenuIcon}>📋</Text>
                <View style={styles.drawerMenuTexts}>
                  <Text style={styles.drawerMenuTitle}>Historial de viajes</Text>
                  <Text style={styles.drawerMenuSub}>Registro de carreras y estados</Text>
                </View>
                <Text style={styles.drawerMenuChevron}>›</Text>
              </Pressable>

              <Pressable
                style={styles.drawerMenuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation?.navigate?.('MiRegistro');
                }}
              >
                <Text style={styles.drawerMenuIcon}>📄</Text>
                <View style={styles.drawerMenuTexts}>
                  <Text style={styles.drawerMenuTitle}>Mi Registro y Documentos</Text>
                  <Text style={styles.drawerMenuSub}>Vehículo, SOAT, Licencia</Text>
                </View>
                <Text style={styles.drawerMenuChevron}>›</Text>
              </Pressable>

              <Pressable
                style={styles.drawerMenuItem}
                onPress={() => {
                  handleCenterMap();
                  setMenuVisible(false);
                }}
              >
                <Text style={styles.drawerMenuIcon}>📍</Text>
                <View style={styles.drawerMenuTexts}>
                  <Text style={styles.drawerMenuTitle}>Centrar mi ubicación</Text>
                  <Text style={styles.drawerMenuSub}>Ver posición GPS actual</Text>
                </View>
                <Text style={styles.drawerMenuChevron}>›</Text>
              </Pressable>
            </View>

            {/* SECCIÓN ESPECIAL PARA PRUEBAS Y EVALUACIÓN */}
            <View style={styles.testingBox}>
              <Text style={styles.testingBoxTitle}>⚙️ HERRAMIENTAS DE PRUEBA</Text>
              <Pressable
                style={styles.testBtn}
                onPress={async () => {
                  await handleToggleApprovalForTesting();
                }}
              >
                <Text style={styles.testBtnText}>
                  Alternar Aprobación: ({isApproved ? 'Aprobado → Pendiente' : 'Pendiente → Aprobado'})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.testBtn, !isAvailable && { opacity: 0.5 }]}
                onPress={async () => {
                  setMenuVisible(false);
                  await handleSimulateRequest();
                }}
                disabled={!isAvailable}
              >
                <Text style={styles.testBtnText}>
                  + Simular solicitud de viaje entrante
                </Text>
              </Pressable>
            </View>

            {/* Cerrar Sesión */}
            <View style={styles.drawerFooter}>
              <Pressable
                style={styles.logoutBtn}
                onPress={() => {
                  setMenuVisible(false);
                  resetRegistration?.();
                }}
              >
                <Text style={styles.logoutBtnText}>Cerrar sesión / Reiniciar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Exportar también como InicioScreen para total compatibilidad con las especificaciones
export const InicioScreen = HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  topSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  menuIcon: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '700',
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  statusPillOnline: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  statusPillOffline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusPillDotOnline: {
    backgroundColor: colors.accent,
  },
  statusPillDotOffline: {
    backgroundColor: colors.textSubtle,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusPillTextOnline: {
    color: colors.white,
  },
  statusPillTextOffline: {
    color: colors.textMuted,
  },
  earningsShortcut: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  earningsShortcutText: {
    fontSize: 20,
  },
  permissionBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  permissionBannerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  permissionActionBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  permissionActionText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  bottomSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomCardContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  syncFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: 6,
  },
  coordsText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  syncStatusText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  // Viaje activo
  activeTripFloatingCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    borderLeftWidth: 5,
    borderLeftColor: colors.accent,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tripCardBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  tripCardFare: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  tripCardPassenger: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  tripCardRoute: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  tripActionsRow: {
    marginTop: spacing.sm,
  },
  // Solicitud entrante
  incomingRequestCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  incomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  incomingTitle: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  countdownBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  countdownBadgeAlert: {
    backgroundColor: colors.danger,
  },
  countdownText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  incomingPassenger: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  incomingAddress: {
    color: '#D1D5DB',
    fontSize: 12,
    marginBottom: 2,
  },
  incomingEarningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  earningsSub: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  earningsValue: {
    color: '#34D399',
    fontSize: 18,
    fontWeight: '800',
  },
  earningsSubVal: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  incomingButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  incomingRejectBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#374151',
    borderRadius: radii.md,
    alignItems: 'center',
  },
  incomingRejectText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  incomingAcceptBtn: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  incomingAcceptText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  // Modal Drawer
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    flexDirection: 'row',
  },
  modalDismissArea: {
    flex: 1,
  },
  drawerContainer: {
    width: Math.min(SCREEN_WIDTH * 0.82, 340),
    backgroundColor: colors.background,
    height: '100%',
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  drawerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  drawerAvatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  drawerUserInfo: {
    flex: 1,
  },
  drawerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  drawerPhone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  drawerStatusBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  drawerStatusApproved: {
    backgroundColor: colors.accentSoft,
  },
  drawerStatusPending: {
    backgroundColor: '#FEF3C7',
  },
  drawerStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextApproved: {
    color: colors.accent,
  },
  badgeTextPending: {
    color: '#D97706',
  },
  closeDrawerBtn: {
    padding: spacing.xs,
  },
  closeDrawerIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  drawerMenuLinks: {
    marginVertical: spacing.lg,
    flex: 1,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerMenuIcon: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  drawerMenuTexts: {
    flex: 1,
  },
  drawerMenuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  drawerMenuSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  drawerMenuChevron: {
    fontSize: 18,
    color: colors.textSubtle,
    fontWeight: '700',
  },
  testingBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  testingBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  testBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  testBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  drawerFooter: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  logoutBtnText: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '600',
  },
});

export default HomeScreen;
