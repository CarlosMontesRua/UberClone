import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors, spacing } from '../theme/theme';

const DEFAULT_REGION = {
  latitude: 4.60971,
  longitude: -74.08175,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

/**
 * Componente del mapa principal para conductores de UberClone.
 * Ocupa prácticamente toda la pantalla y muestra:
 * - Mapa interactivo con react-native-maps.
 * - Marcador personalizado del vehículo con rotación según orientación (heading).
 * - Indicador visual de estado (pulso verde al estar disponible / anillo oscuro al estar desconectado).
 * - Botón flotante para centrar la vista en la ubicación actual.
 */
export const DriverMap = forwardRef(
  (
    {
      currentLocation,
      isAvailable = false,
      onCenterPress,
      showsUserLocation = false,
      style,
      children,
    },
    ref,
  ) => {
    const internalMapRef = useRef(null);
    const [tracksViewChanges, setTracksViewChanges] = useState(true);

    // Exponer métodos del MapView a través de ref (por ejemplo animateToRegion)
    useImperativeHandle(ref, () => ({
      animateToRegion: (region, duration = 800) => {
        internalMapRef.current?.animateToRegion(region, duration);
      },
      animateCamera: (camera, duration = 800) => {
        internalMapRef.current?.animateCamera(camera, { duration });
      },
      fitToCoordinates: (coords, options) => {
        internalMapRef.current?.fitToCoordinates(coords, options);
      },
      getMapRef: () => internalMapRef.current,
    }));

    // Optimización de rendimiento para el marcador personalizado
    useEffect(() => {
      setTracksViewChanges(true);
      const timer = setTimeout(() => {
        setTracksViewChanges(false);
      }, 500);
      return () => clearTimeout(timer);
    }, [currentLocation?.latitude, currentLocation?.longitude, isAvailable]);

    const activeRegion = currentLocation
      ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }
      : DEFAULT_REGION;

    const handleCenter = () => {
      if (onCenterPress) {
        onCenterPress();
        return;
      }

      if (currentLocation && internalMapRef.current) {
        internalMapRef.current.animateToRegion(
          {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          },
          700,
        );
      }
    };

    const heading = currentLocation?.heading || 0;

    return (
      <View style={[styles.container, style]}>
        <MapView
          ref={internalMapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_DEFAULT}
          initialRegion={activeRegion}
          showsCompass={false}
          showsMyLocationButton={false}
          showsUserLocation={showsUserLocation}
          toolbarEnabled={false}
          rotateEnabled={true}
          pitchEnabled={true}
          mapPadding={{ top: 80, right: 16, bottom: 220, left: 16 }}
        >
          {/* Marcador personalizado del vehículo */}
          {currentLocation ? (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat={true}
              rotation={heading}
              tracksViewChanges={tracksViewChanges}
            >
              <View style={styles.markerContainer}>
                {/* Halo de disponibilidad */}
                {isAvailable ? (
                  <View style={styles.onlinePulse} />
                ) : (
                  <View style={styles.offlineHalo} />
                )}

                {/* Cuerpo del marcador del vehículo */}
                <View
                  style={[
                    styles.vehicleBubble,
                    isAvailable ? styles.vehicleBubbleOnline : styles.vehicleBubbleOffline,
                  ]}
                >
                  <Text style={styles.vehicleIcon}>🚘</Text>
                  {/* Flecha indicadora de dirección */}
                  <View
                    style={[
                      styles.directionArrow,
                      isAvailable ? styles.arrowOnline : styles.arrowOffline,
                    ]}
                  />
                </View>
              </View>
            </Marker>
          ) : null}

          {children}
        </MapView>

        {/* Botón flotante para centrar mapa en ubicación actual */}
        <View style={styles.controlsOverlay} pointerEvents="box-none">
          <Pressable
            onPress={handleCenter}
            style={({ pressed }) => [
              styles.centerButton,
              pressed && styles.centerButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Centrar mapa en mi ubicación"
          >
            <Text style={styles.centerButtonIcon}>⌖</Text>
          </Pressable>
        </View>
      </View>
    );
  },
);

DriverMap.displayName = 'DriverMap';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E5E7EB',
  },
  markerContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlinePulse: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(14, 159, 110, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(14, 159, 110, 0.6)',
  },
  offlineHalo: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(107, 114, 128, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.4)',
  },
  vehicleBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  vehicleBubbleOnline: {
    backgroundColor: colors.primary,
    borderWidth: 2.5,
    borderColor: colors.accent,
  },
  vehicleBubbleOffline: {
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#9CA3AF',
  },
  vehicleIcon: {
    fontSize: 20,
    textAlign: 'center',
  },
  directionArrow: {
    position: 'absolute',
    top: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 7,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowOnline: {
    borderBottomColor: colors.accent,
  },
  arrowOffline: {
    borderBottomColor: '#9CA3AF',
  },
  controlsOverlay: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 230,
    alignItems: 'flex-end',
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  centerButtonPressed: {
    backgroundColor: colors.surfaceStrong,
    transform: [{ scale: 0.95 }],
  },
  centerButtonIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginTop: -2,
  },
});

export default DriverMap;
