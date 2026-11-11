import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { driverLocationService } from '../services/driverLocationService';

// Coordenadas de respaldo para mapa inicial en caso de demoras del hardware (Bogotá, Colombia)
export const DEFAULT_INITIAL_LOCATION = {
  latitude: 4.60971,
  longitude: -74.08175,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
  heading: 0,
  speed: 0,
};

/**
 * Hook personalizado para manejar la geolocalización del conductor en Expo SDK 58.
 *
 * Administra:
 * - Solicitud y validación de permisos de ubicación.
 * - Obtención de coordenadas en tiempo real.
 * - Seguimiento continuo (watchPosition) y sincronización con Firestore cuando el conductor está disponible.
 * - Limpieza obligatoria de suscripciones y temporizadores al cambiar de estado o desmontar.
 *
 * @param {{
 *   driverId: string | null,
 *   isAvailable: boolean,
 *   syncIntervalMs?: number,
 *   onLocationUpdate?: (coords: any) => void,
 *   onPermissionChange?: (hasPermission: boolean) => void,
 * }} options
 */
export const useDriverLocation = ({
  driverId = null,
  isAvailable = false,
  syncIntervalMs = 5000,
  onLocationUpdate = null,
  onPermissionChange = null,
} = {}) => {
  const [location, setLocation] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [locationPermission, setLocationPermission] = useState('undetermined');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  // Referencias para suscripciones y temporizadores activos
  const watcherSubscriptionRef = useRef(null);
  const syncTimerRef = useRef(null);
  const lastSyncCoordsRef = useRef(null);
  const isAvailableRef = useRef(isAvailable);
  const driverIdRef = useRef(driverId);

  // Mantener referencias actualizadas
  useEffect(() => {
    isAvailableRef.current = isAvailable;
    driverIdRef.current = driverId;
  }, [isAvailable, driverId]);

  /**
   * Sincroniza las coordenadas en Firestore evitando escrituras repetidas idénticas
   */
  const syncLocationToFirestore = useCallback(
    async (coords) => {
      const currentDriverId = driverIdRef.current;
      if (!currentDriverId || !coords) return;

      // Prevenir actualizaciones innecesarias si la diferencia de posición es insignificante (< 1 metro)
      const last = lastSyncCoordsRef.current;
      if (
        last &&
        Math.abs(last.latitude - coords.latitude) < 0.00001 &&
        Math.abs(last.longitude - coords.longitude) < 0.00001
      ) {
        return;
      }

      try {
        await driverLocationService.updateLocation(currentDriverId, {
          latitude: coords.latitude,
          longitude: coords.longitude,
          heading: coords.heading ?? 0,
          speed: coords.speed ?? 0,
        });
        lastSyncCoordsRef.current = coords;
      } catch (err) {
        console.warn('Error al sincronizar ubicación en Firestore:', err?.message || err);
      }
    },
    [],
  );

  /**
   * Solicita permisos de ubicación en primer plano al usuario.
   */
  const requestLocationPermission = useCallback(async () => {
    try {
      setLoadingLocation(true);
      setLocationError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';

      setLocationPermission(status);
      setHasPermission(granted);
      if (onPermissionChange) {
        onPermissionChange(granted);
      }

      if (!granted) {
        setLocationError(
          'Permiso de ubicación denegado. Para poder conectarte y recibir viajes, debes otorgar acceso a la ubicación en Ajustes.',
        );
        setLoadingLocation(false);
        return false;
      }

      return true;
    } catch (err) {
      const errMsg = err?.message || 'Error solicitando permisos de ubicación.';
      setLocationError(errMsg);
      setHasPermission(false);
      setLoadingLocation(false);
      return false;
    }
  }, [onPermissionChange]);

  /**
   * Obtiene la posición actual inmediata del dispositivo.
   */
  const getCurrentLocation = useCallback(async () => {
    try {
      // Verificar permisos actuales
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        const reqResult = await Location.requestForegroundPermissionsAsync();
        permission = reqResult;
      }

      if (permission.status !== 'granted') {
        setHasPermission(false);
        setLocationPermission(permission.status);
        if (onPermissionChange) {
          onPermissionChange(false);
        }
        setLocationError(
          'No se pudo obtener la ubicación porque los permisos fueron denegados.',
        );
        setLoadingLocation(false);
        return null;
      }

      setHasPermission(true);
      setLocationPermission('granted');
      if (onPermissionChange) {
        onPermissionChange(true);
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading ?? 0,
        speed: position.coords.speed ?? 0,
        accuracy: position.coords.accuracy ?? 0,
        updatedAt: new Date(position.timestamp).toISOString(),
      };

      setLocation(coords);
      setLoadingLocation(false);

      if (onLocationUpdate) {
        onLocationUpdate(coords);
      }

      // Si el conductor ya está disponible, sincronizar inmediatamente
      if (isAvailableRef.current && driverIdRef.current) {
        syncLocationToFirestore(coords);
      }

      return coords;
    } catch (err) {
      console.warn('Error obteniendo ubicación actual:', err?.message || err);
      setLocationError(
        'No se pudo determinar la ubicación del dispositivo. Revisa que el GPS esté activo.',
      );
      setLoadingLocation(false);
      return null;
    }
  }, [onLocationUpdate, onPermissionChange, syncLocationToFirestore]);

  /**
   * Detiene el seguimiento continuo de ubicación y limpia suscripciones y timers.
   */
  const stopTracking = useCallback(() => {
    if (watcherSubscriptionRef.current) {
      try {
        watcherSubscriptionRef.current.remove();
      } catch (e) {
        console.warn('Error removiendo watcher de ubicación:', e);
      }
      watcherSubscriptionRef.current = null;
    }

    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    setIsTracking(false);
  }, []);

  /**
   * Inicia el seguimiento continuo de ubicación y la sincronización con Firestore.
   */
  const startTracking = useCallback(async () => {
    // Limpiar suscripciones previas si las hay
    if (watcherSubscriptionRef.current) {
      try {
        watcherSubscriptionRef.current.remove();
      } catch {}
      watcherSubscriptionRef.current = null;
    }

    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    try {
      // Verificar permisos antes de iniciar
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        const requested = await requestLocationPermission();
        if (!requested) return;
      }

      // Iniciar el observador nativo de cambio de posición
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 4000,
          distanceInterval: 5,
        },
        (pos) => {
          const newCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading ?? 0,
            speed: pos.coords.speed ?? 0,
            accuracy: pos.coords.accuracy ?? 0,
            updatedAt: new Date(pos.timestamp).toISOString(),
          };

          setLocation(newCoords);

          if (onLocationUpdate) {
            onLocationUpdate(newCoords);
          }

          // Si el conductor está disponible, enviar a Firestore
          if (isAvailableRef.current && driverIdRef.current) {
            syncLocationToFirestore(newCoords);
          }
        },
      );

      watcherSubscriptionRef.current = subscription;

      // Actualizar estado de tracking de forma asíncrona para no bloquear el ciclo de render
      setTimeout(() => {
        setIsTracking(true);
      }, 0);

      // Temporizador periódico de seguridad para asegurar actualización cada N segundos
      syncTimerRef.current = setInterval(() => {
        if (isAvailableRef.current && driverIdRef.current) {
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
            .then((p) => {
              const freshCoords = {
                latitude: p.coords.latitude,
                longitude: p.coords.longitude,
                heading: p.coords.heading ?? 0,
                speed: p.coords.speed ?? 0,
                accuracy: p.coords.accuracy ?? 0,
                updatedAt: new Date(p.timestamp).toISOString(),
              };
              setLocation(freshCoords);
              syncLocationToFirestore(freshCoords);
            })
            .catch(() => {});
        }
      }, syncIntervalMs);
    } catch (err) {
      console.warn('Error iniciando seguimiento de ubicación:', err?.message || err);
      setLocationError('Error iniciando seguimiento GPS: ' + (err?.message || 'Error desconocido'));
      setIsTracking(false);
    }
  }, [onLocationUpdate, requestLocationPermission, syncIntervalMs, syncLocationToFirestore]);

  // Efecto 1: Carga inicial de ubicación al montar el hook
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const coords = await getCurrentLocation();
      if (!isMounted || !coords) return;
    })();

    return () => {
      isMounted = false;
    };
  }, [getCurrentLocation]);

  // Efecto 2: Iniciar seguimiento cuando pasa a Disponible; detenerlo cuando pasa a No disponible.
  // Limpieza OBLIGATORIA al desmontar o cambiar disponibilidad.
  useEffect(() => {
    if (isAvailable && driverId) {
      const initTracking = async () => {
        await startTracking();
      };
      initTracking().catch(() => {});
    }

    // Función de limpieza obligatoria al desmontar o pasar a No disponible
    return () => {
      stopTracking();
    };
  }, [isAvailable, driverId, startTracking, stopTracking]);

  return {
    location,
    hasPermission,
    locationPermission,
    loadingLocation,
    locationError,
    isTracking,
    requestLocationPermission,
    getCurrentLocation,
    startTracking,
    stopTracking,
  };
};

export default useDriverLocation;
