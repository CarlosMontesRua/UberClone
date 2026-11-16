import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const notifiedTripIds = new Set();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Notificaciones locales (Expo). FCM nativo requiere development build.
 */
export async function ensureNotificationPermissions() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/** Una sola notificación por tripId (evita duplicados por re-renders / snapshots). */
export async function notifyNewTripRequest(trip) {
  const tripId = trip?.id;
  if (!tripId) return;
  if (notifiedTripIds.has(tripId)) return;
  notifiedTripIds.add(tripId);

  const ok = await ensureNotificationPermissions();
  if (!ok) return;

  // Evita apilar varias alertas locales
  await Notifications.dismissAllNotificationsAsync().catch(() => {});
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Nueva solicitud de viaje',
      body: `${trip?.origin?.address || 'Origen'} → ${trip?.destination?.address || 'Destino'}`,
      data: { tripId },
      sound: true,
    },
    trigger: null,
    identifier: `trip-request-${tripId}`,
  });
}

export async function getExpoPushTokenSafe() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('trips', {
        name: 'Solicitudes de viaje',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const token = await Notifications.getExpoPushTokenAsync();
    return token?.data || null;
  } catch (err) {
    console.warn(
      'Token push no disponible (usa Expo Go / FCM en build nativo):',
      err.message,
    );
    return null;
  }
}

export const notificationService = {
  ensureNotificationPermissions,
  notifyNewTripRequest,
  getExpoPushTokenSafe,
};

export default notificationService;
