import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors, spacing, typography } from '../theme/theme';
import { RegistrationProvider } from '../context/RegistrationContext';
import { AuthProvider } from '../context/AuthContext';
import { useRegistration } from '../hooks/useRegistration';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { PersonalDataScreen } from '../screens/PersonalDataScreen';
import { VehicleScreen } from '../screens/VehicleScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { TripHistoryScreen } from '../screens/TripHistoryScreen';
import { validateDocuments, validatePersonalData, validateRegister, validateVehicle } from '../utils/validations';

const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

const TabIcon = ({ step, active, completed, symbol }) => (
  <View
    style={[
      styles.tabIcon,
      active && styles.tabIconActive,
      completed && !active && styles.tabIconCompleted,
    ]}
  >
    <Text
      style={[
        styles.tabIconText,
        active && styles.tabIconTextActive,
        completed && !active && styles.tabIconTextCompleted,
      ]}
    >
      {symbol || (completed ? '✓' : step)}
    </Text>
  </View>
);

const RegistrationTabs = () => {
  const { isHydrated, registrationData, resetVersion, activeDriverId, setIsRegistered } =
    useRegistration();

  if (!isHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  const isAccountValid = Object.keys(
    validateRegister({
      email: registrationData.email,
      phone: registrationData.phone,
      password: registrationData.password,
      confirmPassword: registrationData.confirmPassword,
      acceptTerms: registrationData.acceptTerms,
    }),
  ).length === 0;
  const isPersonalValid = Object.keys(validatePersonalData(registrationData)).length === 0;
  const isVehicleValid =
    isPersonalValid && Object.keys(validateVehicle(registrationData)).length === 0;
  const isDocumentsValid = Object.keys(validateDocuments(registrationData)).length === 0;

  return (
    <View style={{ flex: 1 }}>
      {activeDriverId ? (
        <View style={styles.topBanner}>
          <Text style={styles.topBannerText}>Ya tienes un registro activo.</Text>
          <Pressable onPress={() => setIsRegistered(true)} style={styles.topBannerBtn}>
            <Text style={styles.topBannerBtnText}>Ir al Panel de Conductor →</Text>
          </Pressable>
        </View>
      ) : null}

      <Tab.Navigator
        key={resetVersion}
        initialRouteName="Register"
        backBehavior="initialRoute"
        screenOptions={{
          headerShown: false,
          lazy: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginBottom: 2,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
        }}
      >
        <Tab.Screen
          name="Register"
          component={RegisterScreen}
          options={{
            title: 'Cuenta',
            tabBarIcon: ({ focused }) => (
              <TabIcon step={1} active={focused} completed={isAccountValid} />
            ),
          }}
        />
        <Tab.Screen
          name="PersonalData"
          component={PersonalDataScreen}
          options={{
            title: 'Datos personales',
            tabBarIcon: ({ focused }) => (
              <TabIcon step={2} active={focused} completed={isPersonalValid} />
            ),
          }}
        />
        <Tab.Screen
          name="Vehicle"
          component={VehicleScreen}
          options={{
            title: 'Vehículo',
            tabBarIcon: ({ focused }) => (
              <TabIcon step={3} active={focused} completed={isVehicleValid} />
            ),
          }}
        />
        <Tab.Screen
          name="Documents"
          component={DocumentsScreen}
          options={{
            title: 'Documentos',
            tabBarIcon: ({ focused }) => (
              <TabIcon step={4} active={focused} completed={isDocumentsValid} />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

const DriverAppTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="Conducir"
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Conducir"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🚗" active={focused} />,
        }}
      />
      <Tab.Screen
        name="Ganancias"
        component={EarningsScreen}
        options={{
          title: 'Ganancias',
          tabBarIcon: ({ focused }) => <TabIcon symbol="💰" active={focused} />,
        }}
      />
      <Tab.Screen
        name="Historial"
        component={TripHistoryScreen}
        options={{
          title: 'Historial',
          tabBarIcon: ({ focused }) => <TabIcon symbol="📋" active={focused} />,
        }}
      />
      <Tab.Screen
        name="MiRegistro"
        component={RegistrationTabs}
        options={{
          title: 'Mi Registro',
          tabBarIcon: ({ focused }) => <TabIcon symbol="👤" active={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const RootNavigation = () => {
  const { isHydrated, isRegistered } = useRegistration();

  if (!isHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return isRegistered ? <DriverAppTabs /> : <RegistrationTabs />;
};

export const AppNavigator = () => (
  <AuthProvider>
    <RegistrationProvider>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigation />
      </NavigationContainer>
    </RegistrationProvider>
  </AuthProvider>
);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  tabIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabIconCompleted: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  tabIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabIconTextActive: {
    color: colors.primaryText,
  },
  tabIconTextCompleted: {
    color: colors.accent,
  },
  topBanner: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBannerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  topBannerBtn: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  topBannerBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accent,
  },
});

export default AppNavigator;
