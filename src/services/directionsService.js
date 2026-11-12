const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/** Decode Google/OSRM encoded polyline → [{ latitude, longitude }] */
export function decodePolyline(encoded) {
  if (!encoded) return [];

  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

function toWaypoint(point) {
  return {
    location: {
      latLng: {
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
      },
    },
  };
}

async function fetchGoogleRoute(origin, destination) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Falta EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
  }

  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask':
        'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: toWaypoint(origin),
      destination: toWaypoint(destination),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      languageCode: 'es-CO',
      units: 'METRIC',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `Routes API HTTP ${response.status}`);
  }

  const route = data.routes?.[0];
  if (!route?.polyline?.encodedPolyline) {
    throw new Error('Routes API no devolvió una ruta');
  }

  const durationSec = route.duration
    ? Number(String(route.duration).replace('s', ''))
    : null;

  return {
    coordinates: decodePolyline(route.polyline.encodedPolyline),
    distanceKm: route.distanceMeters != null ? route.distanceMeters / 1000 : null,
    durationMin: durationSec != null ? Math.round(durationSec / 60) : null,
    provider: 'google',
  };
}

/** Free fallback (enunciado opcional OSRM) when Google key blocks Routes API */
async function fetchOsrmRoute(origin, destination) {
  const url =
    'https://router.project-osrm.org/route/v1/driving/' +
    `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
    '?overview=full&geometries=polyline';

  const response = await fetch(url);
  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error(data.message || `OSRM: ${data.code || 'error'}`);
  }

  const route = data.routes[0];
  return {
    coordinates: decodePolyline(route.geometry),
    distanceKm: route.distance != null ? route.distance / 1000 : null,
    durationMin: route.duration != null ? Math.round(route.duration / 60) : null,
    provider: 'osrm',
  };
}

/**
 * Real road route: Google Routes API first, OSRM fallback.
 * Roads API is NOT for A→B routing.
 */
export async function fetchDrivingRoute(origin, destination) {
  if (!origin?.latitude || !destination?.latitude) {
    throw new Error('Origen y destino son requeridos');
  }

  try {
    return await fetchGoogleRoute(origin, destination);
  } catch (googleError) {
    console.warn('Google Routes falló, usando OSRM:', googleError.message);
    return await fetchOsrmRoute(origin, destination);
  }
}

/**
 * Pickup: driver → passenger origin
 * Dropoff: driver (or pickup) → destination
 */
export function getRouteEndpoints({ trip, driverLocation }) {
  if (!trip?.origin || !trip?.destination) return null;

  const pickup = {
    latitude: Number(trip.origin.latitude),
    longitude: Number(trip.origin.longitude),
  };
  const dropoff = {
    latitude: Number(trip.destination.latitude),
    longitude: Number(trip.destination.longitude),
  };

  const driverPoint = driverLocation
    ? {
        latitude: Number(driverLocation.latitude),
        longitude: Number(driverLocation.longitude),
      }
    : null;

  if (trip.status === 'accepted' || trip.status === 'driver_arriving') {
    return {
      mode: 'pickup',
      origin: driverPoint || pickup,
      destination: pickup,
      label: 'Ruta a recogida',
    };
  }

  if (trip.status === 'in_progress') {
    return {
      mode: 'dropoff',
      origin: driverPoint || pickup,
      destination: dropoff,
      label: 'Ruta al destino',
    };
  }

  return null;
}

export const directionsService = {
  fetchDrivingRoute,
  getRouteEndpoints,
  decodePolyline,
};

export default directionsService;
