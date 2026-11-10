import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { driverService } from '../services/driverService';
import { vehicleService } from '../services/vehicleService';
import { documentService } from '../services/documentService';
import { authService } from '../services/authService';

const DRAFT_KEY = '@uberclone/registration-draft';
const REGISTRATION_KEY = '@uberclone/driver-registration';
const CURRENT_DRIVER_KEY = '@uberclone/current-driver-id';

export const INITIAL_REGISTRATION = {
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
  profilePhoto: '',
  fullName: '',
  documentNumber: '',
  birthDate: '',
  gender: '',
  language: '',
  category: '',
  plate: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  passengerCapacity: '',
  vehiclePhoto: '',
  licenseNumber: '',
  licensePhoto: '',
  licenseExpiry: '',
  soatPhoto: '',
  soatExpiry: '',
  techInspectionPhoto: '',
  techInspectionExpiry: '',
  mercadoPagoEmail: '',
};

const hasRegistrationData = (data) =>
  Object.values(data).some((value) =>
    typeof value === 'string' ? value.trim().length > 0 : value === true,
  );

export const RegistrationContext = createContext(null);

export const RegistrationProvider = ({ children }) => {
  const [registrationData, setRegistrationData] = useState(INITIAL_REGISTRATION);
  const [isHydrated, setIsHydrated] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [activeDriverId, setActiveDriverId] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  // Cargar borrador e ID de conductor actual desde AsyncStorage
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      AsyncStorage.getItem(DRAFT_KEY),
      AsyncStorage.getItem(CURRENT_DRIVER_KEY),
      AsyncStorage.getItem(REGISTRATION_KEY),
    ])
      .then(([rawDraft, savedDriverId, rawSavedRegistration]) => {
        if (!isMounted) return;

        if (savedDriverId) {
          setActiveDriverId(savedDriverId);
          setIsRegistered(true);
        }

        if (rawDraft) {
          try {
            const draft = JSON.parse(rawDraft);
            setRegistrationData((currentData) => ({ ...currentData, ...draft }));
          } catch {}
        } else if (rawSavedRegistration) {
          try {
            const saved = JSON.parse(rawSavedRegistration);
            setRegistrationData((currentData) => ({ ...currentData, ...saved }));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('Error hidratando RegistrationContext:', err);
      })
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Guardar borrador automáticamente al cambiar los campos
  useEffect(() => {
    if (!isHydrated) return;

    if (!hasRegistrationData(registrationData)) {
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      return;
    }

    const draft = { ...registrationData };
    delete draft.password;
    delete draft.confirmPassword;

    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [registrationData, isHydrated]);

  const updateRegistration = useCallback((values) => {
    setRegistrationData((currentData) => ({ ...currentData, ...values }));
  }, []);

  const resetRegistration = useCallback(async () => {
    setRegistrationData(INITIAL_REGISTRATION);
    setResetVersion((currentVersion) => currentVersion + 1);
    setIsRegistered(false);
    setActiveDriverId(null);
    await AsyncStorage.multiRemove([DRAFT_KEY, REGISTRATION_KEY, CURRENT_DRIVER_KEY]).catch(
      () => {},
    );
  }, []);

  /**
   * Envía y persiste el registro completo en Firebase Firestore en las colecciones:
   * 1. drivers
   * 2. vehicles
   * 3. documents
   */
  const submitRegistration = useCallback(async (allValues) => {
    const data = { ...registrationData, ...allValues };

    // 1. Obtener o crear ID de autenticación
    let driverId = authService.getCurrentUser()?.uid;

    if (!driverId) {
      if (data.email && data.password && data.password.length >= 8) {
        try {
          const user = await authService.register(data.email, data.password);
          driverId = user.uid;
        } catch {
          // Si el correo ya existe, intentar iniciar sesión
          try {
            const user = await authService.login(data.email, data.password);
            driverId = user.uid;
          } catch {
            driverId = 'driver_' + Date.now();
          }
        }
      } else {
        // ID único generado para el conductor
        driverId = 'driver_' + (data.documentNumber || Date.now());
      }
    }

    // 2. Guardar en Colección drivers
    await driverService.createDriver(driverId, {
      fullName: data.fullName,
      documentNumber: data.documentNumber,
      phone: data.phone,
      birthDate: data.birthDate,
      gender: data.gender,
      email: data.email,
      profilePhoto: data.profilePhoto,
      language: data.language || 'es',
    });

    // 3. Guardar en Colección vehicles
    await vehicleService.createVehicle({
      driverId,
      category: data.category || 'economy',
      plate: data.plate,
      brand: data.brand,
      model: data.model,
      year: data.year,
      color: data.color,
      passengerCapacity: data.passengerCapacity,
      vehiclePhoto: data.vehiclePhoto,
    });

    // 4. Guardar en Colección documents
    await documentService.createDocument({
      driverId,
      licenseNumber: data.licenseNumber,
      licensePhoto: data.licensePhoto,
      licenseExpiration: data.licenseExpiry,
      soatPhoto: data.soatPhoto,
      soatExpiration: data.soatExpiry,
      technicalInspectionPhoto: data.techInspectionPhoto,
      technicalInspectionExpiration: data.techInspectionExpiry,
      mercadopagoEmail: data.mercadoPagoEmail,
      termsAccepted: data.acceptTerms,
    });

    // 5. Persistir localmente estado completado
    await AsyncStorage.setItem(CURRENT_DRIVER_KEY, driverId);
    await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    await AsyncStorage.setItem(
      REGISTRATION_KEY,
      JSON.stringify({ ...data, password: '', confirmPassword: '' }),
    );

    setActiveDriverId(driverId);
    setIsRegistered(true);

    return { driverId, success: true };
  }, [registrationData]);

  const value = useMemo(
    () => ({
      registrationData,
      isHydrated,
      resetVersion,
      activeDriverId,
      isRegistered,
      setActiveDriverId,
      setIsRegistered,
      updateRegistration,
      resetRegistration,
      submitRegistration,
    }),
    [
      registrationData,
      isHydrated,
      resetVersion,
      activeDriverId,
      isRegistered,
      updateRegistration,
      resetRegistration,
      submitRegistration,
    ],
  );

  return (
    <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
  );
};

export default RegistrationContext;
