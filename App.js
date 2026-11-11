import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { AppNavigator } from './src/navigation/AppNavigator';
import { getMissingFirebaseConfig, isFirebaseConfigured } from './src/config/firebase';

export default function App() {
  if (!isFirebaseConfigured()) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>Falta configurar Firebase</Text>
          <Text style={styles.setupMessage}>
            Copia .env.example a .env, completa los datos de la app web de Firebase y reinicia Expo.
          </Text>
          <Text style={styles.setupFields}>
            Variables faltantes: {getMissingFirebaseConfig().join(', ')}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  setupTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  setupMessage: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 24,
  },
  setupFields: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 16,
  },
});
