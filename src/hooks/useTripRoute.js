import { useEffect, useMemo, useState } from 'react';
import { directionsService } from '../services/directionsService';

/**
 * Loads Google Directions polyline for the active trip phase.
 * - accepted / driver_arriving → to pickup
 * - in_progress → to dropoff
 */
export const useTripRoute = ({ trip, driverLocation }) => {
  const [coordinates, setCoordinates] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const endpoints = useMemo(
    () => directionsService.getRouteEndpoints({ trip, driverLocation }),
    [
      trip?.id,
      trip?.status,
      trip?.origin?.latitude,
      trip?.origin?.longitude,
      trip?.destination?.latitude,
      trip?.destination?.longitude,
      // Round so tiny GPS jitter does not spam Directions API
      driverLocation
        ? `${driverLocation.latitude.toFixed(4)},${driverLocation.longitude.toFixed(4)}`
        : null,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!endpoints) {
        setCoordinates([]);
        setMeta(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const route = await directionsService.fetchDrivingRoute(
          endpoints.origin,
          endpoints.destination,
        );
        if (cancelled) return;
        setCoordinates(route.coordinates);
        setMeta({
          mode: endpoints.mode,
          label: endpoints.label,
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
        });
      } catch (err) {
        if (cancelled) return;
        console.warn('Directions error:', err.message);
        setCoordinates([]);
        setMeta({ mode: endpoints.mode, label: endpoints.label });
        setError('No se pudo calcular la ruta');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [endpoints]);

  return {
    coordinates,
    meta,
    error,
    loading,
    endpoints,
  };
};

export default useTripRoute;
