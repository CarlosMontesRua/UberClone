import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles, radii, spacing, typography } from '../theme/theme';

export const TripDetailScreen = ({ route }) => {
  const trip = route?.params?.trip;

  if (!trip) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={commonStyles.center}>
          <Text style={commonStyles.subtitle}>Viaje no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const coords = Array.isArray(trip.routePolyline) ? trip.routePolyline : [];
  const origin = trip.origin;
  const destination = trip.destination;

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={commonStyles.title}>Detalle del viaje</Text>
        <Text style={commonStyles.subtitle}>
          {origin?.address} → {destination?.address}
        </Text>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: origin?.latitude || 4.6097,
              longitude: origin?.longitude || -74.0817,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
          >
            {origin?.latitude ? (
              <Marker
                coordinate={{ latitude: Number(origin.latitude), longitude: Number(origin.longitude) }}
                pinColor="#16A34A"
                title="Origen"
              />
            ) : null}
            {destination?.latitude ? (
              <Marker
                coordinate={{
                  latitude: Number(destination.latitude),
                  longitude: Number(destination.longitude),
                }}
                pinColor="#DC2626"
                title="Destino"
              />
            ) : null}
            {coords.length > 1 ? (
              <Polyline coordinates={coords} strokeColor="#2563EB" strokeWidth={4} />
            ) : null}
          </MapView>
        </View>

        <View style={styles.card}>
          <Text style={styles.row}>Distancia: {trip.distanceKm ?? '—'} km</Text>
          <Text style={styles.row}>Duración: {trip.durationMin ?? '—'} min</Text>
          <Text style={styles.row}>Categoría: {trip.category}</Text>
          <Text style={styles.row}>Tarifa: ${Number(trip.fare || 0).toLocaleString('es-CO')} COP</Text>
          <Text style={styles.row}>
            Comisión: ${Number(trip.commission || 0).toLocaleString('es-CO')} COP
          </Text>
          <Text style={styles.row}>Propina: ${Number(trip.tip || 0).toLocaleString('es-CO')} COP</Text>
          <Text style={styles.row}>
            Ganancia: ${Number(trip.driverEarnings || 0).toLocaleString('es-CO')} COP
          </Text>
          <Text style={styles.row}>Calificación pasajero: {trip.rating || '—'}</Text>
          <Text style={styles.row}>Pago: {trip.paymentMethod} ({trip.paymentStatus})</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  mapContainer: {
    height: 240,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  map: { width: '100%', height: '100%' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  row: { ...typography.body, fontSize: 14 },
});

export default TripDetailScreen;
