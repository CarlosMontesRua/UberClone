import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tripService } from '../services/tripService';
import { useRegistration } from '../hooks/useRegistration';

const TripContext = createContext(null);

export const useTrip = () => {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip debe usarse dentro de TripProvider');
  return ctx;
};

export const TripProvider = ({ children }) => {
  const { activeDriverId } = useRegistration();
  const [activeTrip, setActiveTrip] = useState(null);

  useEffect(() => {
    if (!activeDriverId) {
      setActiveTrip(null);
      return undefined;
    }
    const unsubscribe = tripService.subscribeToActiveTripForDriver(
      activeDriverId,
      setActiveTrip,
    );
    return () => unsubscribe();
  }, [activeDriverId]);

  // También escuchar completed/paid recientes para pantalla de cobro
  const [lastCompletedTrip, setLastCompletedTrip] = useState(null);

  const setCompletedForPayment = useCallback((trip) => {
    setLastCompletedTrip(trip);
  }, []);

  const clearPaymentTrip = useCallback(() => {
    setLastCompletedTrip(null);
  }, []);

  const value = useMemo(
    () => ({
      activeTrip,
      setActiveTrip,
      lastCompletedTrip,
      setCompletedForPayment,
      clearPaymentTrip,
    }),
    [activeTrip, lastCompletedTrip, setCompletedForPayment, clearPaymentTrip],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
};

export default TripContext;
