# Configuración de Firebase para UberClone

## 1. Crear y preparar el proyecto

En [Firebase Console](https://console.firebase.google.com/):

1. Crea o selecciona el proyecto de UberClone.
2. La configuración del proyecto habilita **Correo electrónico/Contraseña** durante el despliegue de Firebase CLI.
3. En **Firestore Database**, crea la base de datos `(default)` en modo producción. Para Bogotá puedes elegir `southamerica-east1`; la región no se puede cambiar después.
4. En **Configuración del proyecto → General → Tus apps**, registra una app web y copia sus seis valores de configuración.

Firestore no requiere crear las colecciones manualmente: aparecen cuando la app guarda su primer documento. La creación de la base `(default)` sí se hace desde Firebase Console.

## 2. Conectar la app

Copia `.env.example` como `.env` en la raíz y completa los valores de tu app web:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

`.env` está excluido de Git. Reinicia Expo después de guardarlo:

```bash
npx expo start --clear
```

La app muestra una pantalla de configuración si faltan variables o siguen teniendo los valores de ejemplo. Estos valores identifican el proyecto; la seguridad depende de Authentication y las reglas de Firestore. No pongas claves de cuenta de servicio ni claves privadas en la app.

## 3. Desplegar reglas e índices

El `.firebaserc` asocia este directorio al mismo `projectId` de `.env`. Inicia sesión con una cuenta que tenga permisos de edición sobre ese proyecto y despliega Authentication, las reglas y los índices:

```bash
npx firebase-tools login
npx firebase-tools deploy --only auth,firestore
```

`firebase.json` activa Email/Password y enlaza `firestore.rules` y `firestore.indexes.json`. La base debe existir en Firebase Console antes del despliegue.

## 4. Colecciones usadas

| Colección | ID del documento | Uso |
|---|---|---|
| `drivers` | UID de Firebase Auth | Perfil, aprobación y disponibilidad del conductor |
| `vehicles` | Autogenerado | Vehículos asociados a `driverId` |
| `documents` | Autogenerado | Documentos asociados a `driverId` |
| `trips` | Autogenerado | Solicitudes, asignación y estado del viaje |
| `driverLocations` | UID del conductor | Última ubicación del conductor |
| `driverEarnings` | ID del viaje | Una liquidación inmutable por viaje completado |

Los documentos del conductor, vehículo y documentos se crean al terminar el registro. Las solicitudes de demostración guardan el UID autenticado en `passengerId` y el nombre mostrado en `passengerName`.

## 5. Acceso y límites actuales

- Cada conductor solo lee sus propios vehículos, documentos, perfil y ubicación.
- Solo un conductor aprobado y disponible puede leer/aceptar solicitudes abiertas.
- Los conductores no pueden cambiar su propio estado de aprobación. Un administrador debe aprobarlos desde Firebase Console o un backend confiable.
- Las ganancias solo pueden guardarse para un viaje completado, con importes iguales al viaje, y el ID del documento evita liquidaciones duplicadas.
- La app todavía crea solicitudes de demostración y calcula tarifas en el cliente. Antes de usar pasajeros o pagos reales, esa creación y el cálculo de tarifas deben pasar a un backend confiable; las reglas no pueden verificar que una tarifa calculada en el dispositivo sea legítima.

Para comprobar la conexión, registra una cuenta de prueba y confirma en Firebase Console que aparezcan sus documentos en `drivers`, `vehicles` y `documents`. Las colecciones restantes se crean al usar sus funciones por primera vez.
