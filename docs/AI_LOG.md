# Bitácora de uso de IA — UberClone Conductor

> Cada integrante agrega entradas en su rama y las mergea a `main` por PR.

## Entrada #1

| Campo             | Valor                                                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fecha             | 2026-11-11 / 2026-11-16                                                                                                                                                      |
| Herramienta       | Antigravity y OpenCode (Composer / Agent)                                                                                                                                    |
| Prompt            | (resumen) Configurar mapa GPS real, rutas recogida/destino, quitar GPS falso, índices Firestore, y completar faltantes del enunciado excepto Mercado Pago                    |
| Resumen respuesta | Se implementó `expo-location`, `react-native-maps`, Routes/OSRM, hooks, pricing, Drawer/Stack, cobro efectivo, ganancias/historial, Cloudinary opcional, notificaciones Expo |
| Usado tal cual    | Estructura de hooks y servicio de Directions/OSRM                                                                                                                            |
| Modificado        | Ajustes de permisos, Apple Maps en iOS Expo Go, fallback OSRM, flujo de cobro sin MP                                                                                         |
| Descartado        | Integración Mercado Pago Checkout (sin credenciales)                                                                                                                         |
| Archivos          | `src/config/pricing.js`, `src/hooks/*`, `src/navigation/AppNavigator.js`, `src/screens/*`, `src/services/*`, `docs/AI_LOG.md`, `README.md`                                   |
| Commit            | Pendiente / ver historial de rama `Mena`                                                                                                                                     |
| Verificación      | Expo Go iOS: mapa, aceptar viaje, polyline OSRM, filtros ganancias/historial                                                                                                 |

## Declaración

Se usó IA para acelerar implementación. Los bloques marcados con `// AI-assisted: see docs/AI_LOG.md #N` deben poder explicarse en sustentación.
