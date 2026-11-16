/**
 * Rutas populares solo en Medellín (y área metro).
 * Usadas por el simulador de solicitudes del conductor.
 */
export const MEDELLIN_CENTER = {
  latitude: 6.2442,
  longitude: -75.5812,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export const MEDELLIN_ROUTES = [
  {
    id: "poblado-aeropuerto",
    passengerId: "María Restrepo",
    origin: {
      address: "Parque Lleras, El Poblado",
      latitude: 6.2088,
      longitude: -75.5675,
    },
    destination: {
      address: "Aeropuerto José María Córdova (Rionegro)",
      latitude: 6.1645,
      longitude: -75.4231,
    },
    tip: 5000,
    distanceKm: 28.5,
    durationMin: 45,
    category: "premium",
    paymentMethod: "mercadopago",
  },
  {
    id: "udea-santafe",
    passengerId: "Andrés Castro",
    origin: {
      address: "Universidad de Antioquia, Ciudad Universitaria",
      latitude: 6.2674,
      longitude: -75.5688,
    },
    destination: {
      address: "Centro Comercial Santafé, El Poblado",
      latitude: 6.2302,
      longitude: -75.574,
    },
    tip: 2000,
    distanceKm: 7.2,
    durationMin: 22,
    category: "economy",
    paymentMethod: "cash",
  },
  {
    id: "laureles-unicentro",
    passengerId: "Camila Hoyos",
    origin: {
      address: "Primer Parque de Laureles",
      latitude: 6.2454,
      longitude: -75.5956,
    },
    destination: {
      address: "Unicentro Medellín",
      latitude: 6.2411,
      longitude: -75.5892,
    },
    tip: 1500,
    distanceKm: 2.4,
    durationMin: 12,
    category: "economy",
    paymentMethod: "cash",
  },
  {
    id: "envigado-premium",
    passengerId: "Julián Giraldo",
    origin: {
      address: "Parque de Envigado",
      latitude: 6.1695,
      longitude: -75.5855,
    },
    destination: {
      address: "Premium Plaza, El Poblado",
      latitude: 6.2286,
      longitude: -75.5716,
    },
    tip: 3000,
    distanceKm: 9.8,
    durationMin: 28,
    category: "xl",
    paymentMethod: "mercadopago",
  },
  {
    id: "estadio-botero",
    passengerId: "Valentina Muñoz",
    origin: {
      address: "Estadio Atanasio Girardot",
      latitude: 6.2569,
      longitude: -75.5903,
    },
    destination: {
      address: "Plaza Botero / Museo de Antioquia",
      latitude: 6.2525,
      longitude: -75.5683,
    },
    tip: 1000,
    distanceKm: 4.1,
    durationMin: 18,
    category: "economy",
    paymentMethod: "cash",
  },
  {
    id: "sabaneta-mayorca",
    passengerId: "Santiago Vélez",
    origin: {
      address: "Parque de Sabaneta",
      latitude: 6.1514,
      longitude: -75.6164,
    },
    destination: {
      address: "Centro Comercial Mayorca, Sabaneta",
      latitude: 6.1816,
      longitude: -75.5831,
    },
    tip: 2000,
    distanceKm: 6.5,
    durationMin: 20,
    category: "economy",
    paymentMethod: "cash",
  },
  {
    id: "floresta-oviedo",
    passengerId: "Laura Cardona",
    origin: {
      address: "Estación Floresta (Metro)",
      latitude: 6.2586,
      longitude: -75.5958,
    },
    destination: {
      address: "Centro Comercial Oviedo, El Poblado",
      latitude: 6.2108,
      longitude: -75.5708,
    },
    tip: 2500,
    distanceKm: 8.3,
    durationMin: 25,
    category: "xl",
    paymentMethod: "mercadopago",
  },
  {
    id: "belen-plaza-mayor",
    passengerId: "Carlos Ríos",
    origin: {
      address: "Parque de Belén",
      latitude: 6.2328,
      longitude: -75.5969,
    },
    destination: {
      address: "Plaza Mayor Medellín",
      latitude: 6.2434,
      longitude: -75.5765,
    },
    tip: 1500,
    distanceKm: 3.6,
    durationMin: 15,
    category: "economy",
    paymentMethod: "cash",
  },
];

export function pickRandomMedellinRoute() {
  return MEDELLIN_ROUTES[Math.floor(Math.random() * MEDELLIN_ROUTES.length)];
}

export default MEDELLIN_ROUTES;
