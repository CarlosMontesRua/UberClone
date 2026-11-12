import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { locationService } from '../services/locationService';

const DEFAULT_INTERVAL_MS = 5000;

/**
 * GPS only when `tracking` is true (driver Available).
 * Map can render without requesting permission on mount.
 */
export const useDriverLocation = ({
  driverId,
  tracking = false,
  intervalMs = DEFAULT_INTERVAL_MS,
} = {}) => {
  const [location, setLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);
  const subscriptionRef = useRef(null);
  const lastSyncRef = useRef(0);

  const stopWatching = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  }, []);

  const syncToFirestore = useCallback(
    async (coords) => {
      if (!driverId || !coords) return;
      const now = Date.now();
      if (now - lastSyncRef.current < intervalMs) return;
      lastSyncRef.current = now;
      try {
        await locationService.updateDriverLocation(driverId, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      } catch (err) {
        console.warn('No se pudo sincronizar ubicación:', err.message);
      }
    },
    [driverId, intervalMs],
  );

  const openSettings = useCallback(() => {
    Alert.alert(
      'Ubicación desactivada',
      'Activa el permiso de ubicación para UberClone en Ajustes del dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
      ],
    );
  }, []);

  const requestPermission = useCallback(async () => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === 'denied' && !current.canAskAgain) {
      setPermissionStatus('denied');
      openSettings();
      return false;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status);

    if (status === 'granted') {
      setError(null);
      setRestartNonce((n) => n + 1);
      return true;
    }

    if (!current.canAskAgain || status === 'denied') {
      openSettings();
    }
    return false;
  }, [openSettings]);

  useEffect(() => {
    let cancelled = false;

    const startWatching = async () => {
      stopWatching();
      setError(null);

      if (!tracking || !driverId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setError('Activa el GPS / ubicación del dispositivo');
          setLoading(false);
          return;
        }

        const existing = await Location.getForegroundPermissionsAsync();
        let status = existing.status;

        if (status !== 'granted') {
          const requested = await Location.requestForegroundPermissionsAsync();
          status = requested.status;
        }

        if (cancelled) return;
        setPermissionStatus(status);

        if (status !== 'granted') {
          setError('Permiso de ubicación necesario para estar Disponible');
          setLoading(false);
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        });
        if (cancelled) return;

        const coords = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        setLocation(coords);
        lastSyncRef.current = 0;
        await syncToFirestore(coords);

        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: intervalMs,
            distanceInterval: 10,
            ...(Platform.OS === 'android' ? { mayShowUserSettingsDialog: true } : null),
          },
          (position) => {
            if (cancelled) return;
            const next = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setLocation(next);
            syncToFirestore(next);
          },
        );
      } catch (err) {
        if (!cancelled) {
          console.warn('GPS error:', err);
          setError(err.message || 'Error iniciando seguimiento GPS');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    startWatching();

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, [tracking, driverId, intervalMs, restartNonce, stopWatching, syncToFirestore]);

  return {
    location,
    permissionStatus,
    error,
    loading,
    requestPermission,
  };
};

export default useDriverLocation;
