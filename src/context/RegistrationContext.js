import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const DRAFT_KEY = '@uberclone/registration-draft';
const REGISTRATION_KEY = '@uberclone/driver-registration';

const INITIAL_REGISTRATION = {
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

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(DRAFT_KEY)
      .then((rawDraft) => {
        if (!isMounted || !rawDraft) return;

        const draft = JSON.parse(rawDraft);
        setRegistrationData((currentData) => ({ ...currentData, ...draft }));
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
    await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
  }, []);

  const submitRegistration = useCallback(async (values) => {
    const payload = {
      ...values,
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
    };

    delete payload.password;
    delete payload.confirmPassword;

    await new Promise((resolve) => setTimeout(resolve, 900));
    await AsyncStorage.setItem(REGISTRATION_KEY, JSON.stringify(payload));

    return payload;
  }, []);

  const value = useMemo(
    () => ({
      registrationData,
      isHydrated,
      resetVersion,
      updateRegistration,
      resetRegistration,
      submitRegistration,
    }),
    [
      registrationData,
      isHydrated,
      resetVersion,
      updateRegistration,
      resetRegistration,
      submitRegistration,
    ],
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
};
