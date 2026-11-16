const appJson = require('./app.json');

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

module.exports = {
  expo: {
    ...appJson.expo,
    ios: {
      ...appJson.expo.ios,
      infoPlist: {
        ...(appJson.expo.ios?.infoPlist || {}),
        NSLocationWhenInUseUsageDescription:
          'UberClone necesita tu ubicación para mostrarte en el mapa y enviarla mientras estás disponible.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'UberClone usa tu ubicación en segundo plano solo mientras estás disponible para recibir viajes.',
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
        },
      },
      config: {
        ...(appJson.expo.ios?.config || {}),
        googleMapsApiKey,
      },
    },
    android: {
      ...appJson.expo.android,
      // Permitir http://IP:3001 desde el celular (dev)
      usesCleartextTraffic: true,
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'FOREGROUND_SERVICE',
        'INTERNET',
      ],
      config: {
        ...(appJson.expo.android?.config || {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    plugins: [
      ...(appJson.expo.plugins || []),
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'UberClone necesita tu ubicación mientras estás disponible para recibir viajes.',
          locationWhenInUsePermission:
            'UberClone necesita tu ubicación para mostrarte en el mapa.',
        },
      ],
      [
        'react-native-maps',
        {
          iosGoogleMapsApiKey: googleMapsApiKey,
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
      'expo-notifications',
      'expo-web-browser',
    ],
  },
};
