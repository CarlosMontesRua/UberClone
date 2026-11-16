import { useCallback, useEffect, useRef, useState } from 'react';
import { tripService } from '../services/tripService';

/**
 * Solicitudes entrantes + temporizador 15s.
 * Cleanup: limpia intervalo y unsubscribes.
 */
export const useTripRequests = ({ enabled = false, category = null } = {}) => {
  const [requests, setRequests] = useState([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);

  const currentRequest = requests.length > 0 ? requests[0] : null;

  useEffect(() => {
    if (!enabled) {
      setRequests([]);
      return undefined;
    }

    const unsubscribe = tripService.subscribeToAvailableRequests(category, setRequests);
    return () => unsubscribe();
  }, [enabled, category]);

  useEffect(() => {
    if (!currentRequest) {
      setTimeLeft(15);
      if (timerRef.current) clearInterval(timerRef.current);
      return undefined;
    }

    const tick = () => {
      if (!currentRequest.expiresAt) {
        setTimeLeft(15);
        return;
      }
      const secs = Math.max(0, Math.ceil((currentRequest.expiresAt - Date.now()) / 1000));
      setTimeLeft(secs);
      if (secs <= 0) {
        tripService.rejectTrip(currentRequest.id, 'expired').catch(() => {});
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentRequest]);

  const acceptRequest = useCallback(async (driverId) => {
    if (!currentRequest?.id || !driverId) return null;
    return tripService.acceptTrip(currentRequest.id, driverId);
  }, [currentRequest]);

  const rejectRequest = useCallback(async (driverId) => {
    if (!currentRequest?.id) return;
    await tripService.rejectTrip(currentRequest.id, driverId || 'driver');
  }, [currentRequest]);

  return {
    requests,
    currentRequest,
    timeLeft,
    acceptRequest,
    rejectRequest,
  };
};

export default useTripRequests;
