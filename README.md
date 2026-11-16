# UberClone — Versión Conductor

App React Native (Expo) para conductores: registro, disponibilidad, mapa/GPS, solicitudes, rutas, cobro en efectivo (Mercado Pago pendiente) y ganancias.

## Requisitos

- Node.js 20+
- Expo Go o development build
- Proyecto Firebase + Google Maps (Routes API recomendada)

## Instalación

```bash
npm install
copy .env.example .env
# Completa las variables en .env
npx expo start -c
```

## Variables de entorno

Ver `.env.example`. Las llaves secretas de Mercado Pago/Stripe **no** van en la app; solo en backend (aún no integrado).

## Scripts

| Comando | Descripción |
|---|---|
| `npx expo start` | Metro / Expo Go |
| `npm run lint` | ESLint |

## Arquitectura rápida

- **Tabs** registro (Datos / Vehículo / Documentos)
- **Drawer** Inicio, Ganancias, Historial, Perfil, Registro
- **Stack** flujo Home → Cobro; Historial → Detalle
- **pricing.js** + `calculateFare` para tarifas
- **Hooks:** `useDriverLocation`, `useTripRequests`, `useEarnings`, `useTripRoute`

## Pagos

- **Efectivo:** pantalla Cobro → confirma recibido → `status: paid` y comisión al saldo
- **Mercado Pago Checkout Pro:**
  1. `npm run server` (lee `MERCADOPAGO_ACCESS_TOKEN` del `.env`)
  2. En celular físico, pon en `.env` tu IP LAN: `EXPO_PUBLIC_API_URL=http://192.168.x.x:3001`
  3. En Cobro → **Pagar con Mercado Pago (prueba)**
  4. Usa [tarjetas de prueba](https://www.mercadopago.com.co/developers/es/docs/checkout-pro/additional-content/test-cards)

El **access token** solo vive en el backend. La **public key** puede ir en la app (`EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY`).

## Uso de IA

Bitácora obligatoria: [docs/AI_LOG.md](docs/AI_LOG.md)

## Equipo / ramas

Cada integrante trabaja en su rama y mergea a `main` con PR.
