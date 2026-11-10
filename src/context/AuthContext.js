import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { authService } from '../services/authService';
import { driverService } from '../services/driverService';
import { colors } from '../theme/theme';

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Escuchar cambios de autenticación
  useEffect(() => {
    let unsubscribeDriver = null;

    const unsubscribeAuth = authService.subscribeToAuthState(async (currentUser) => {
      setUser(currentUser);

      if (currentUser?.uid) {
        // Suscribirse a los datos del conductor en Firestore en tiempo real
        unsubscribeDriver = driverService.subscribeToDriver(currentUser.uid, (profile) => {
          setDriverProfile(profile);
          setLoading(false);
        });
      } else {
        if (unsubscribeDriver) unsubscribeDriver();
        setDriverProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDriver) unsubscribeDriver();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const loggedUser = await authService.login(email, password);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const newUser = await authService.register(email, password);
      return newUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setDriverProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.uid) {
      const profile = await driverService.getDriver(user.uid);
      setDriverProfile(profile);
      return profile;
    }
    return null;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      driverProfile,
      loading,
      isAuthenticated: Boolean(user),
      isApproved: driverProfile?.status === 'approved',
      driverStatus: driverProfile?.status || 'pending',
      driverAvailability: driverProfile?.availability || 'unavailable',
      login,
      register,
      logout,
      refreshProfile,
      setDriverProfile,
    }),
    [user, driverProfile, loading, login, register, logout, refreshProfile],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default AuthContext;
