import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors } from '../theme/theme';
import { RegistrationProvider } from '../context/RegistrationContext';
import { useRegistration } from '../hooks/useRegistration';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { PersonalDataScreen } from '../screens/PersonalDataScreen';
import { VehicleScreen } from '../screens/VehicleScreen';
import { validateDocuments, validatePersonalData, validateVehicle } from '../utils/validations';

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

const TabIcon = ({ step, active, completed }) => (
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
      {completed ? '✓' : step}
    </Text>
  </View>
);

const RegistrationTabs = () => {
  const { isHydrated, registrationData, resetVersion } = useRegistration();

  if (!isHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  const isPersonalValid = Object.keys(validatePersonalData(registrationData)).length === 0;
  const isVehicleValid =
    isPersonalValid && Object.keys(validateVehicle(registrationData)).length === 0;
  const isDocumentsValid = Object.keys(validateDocuments(registrationData)).length === 0;

  return (
    <Tab.Navigator
      key={resetVersion}
      initialRouteName="PersonalData"
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
        name="PersonalData"
        component={PersonalDataScreen}
        options={{
          title: 'Datos personales',
          tabBarIcon: ({ focused }) => (
            <TabIcon step={1} active={focused} completed={isPersonalValid} />
          ),
        }}
      />
      <Tab.Screen
        name="Vehicle"
        component={VehicleScreen}
        options={{
          title: 'Vehículo',
          tabBarIcon: ({ focused }) => (
            <TabIcon step={2} active={focused} completed={isVehicleValid} />
          ),
        }}
      />
      <Tab.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{
          title: 'Documentos',
          tabBarIcon: ({ focused }) => (
            <TabIcon step={3} active={focused} completed={isDocumentsValid} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => (
  <RegistrationProvider>
    <NavigationContainer theme={navigationTheme}>
      <RegistrationTabs />
    </NavigationContainer>
  </RegistrationProvider>
);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  tabIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
});
