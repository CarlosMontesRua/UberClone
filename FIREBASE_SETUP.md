
## 1. Configuración de Firebase

### Paso 1: Crear el proyecto en Firebase Console
1. Ingresa a [Firebase Console](https://console.firebase.google.com/).
2. Haz clic en **"Agregar proyecto"** y asígnale un nombre (ej. `uberclone-driver`).
3. En la sección **Compilación (Build)**:
   * **Authentication:** Habilita el proveedor de acceso **Correo electrónico / Contraseña**.
   * **Firestore Database:** Crea una base de datos en modo producción (o prueba para desarrollo) seleccionando una región cercana (ej. `us-central1` o `southamerica-east1`).

### Paso 2: Obtener las Credenciales
1. Ve a **Configuración del proyecto** (ícono de engranaje) $\rightarrow$ **General**.
2. En la sección "Tus apps", crea una aplicación **Web** (`</>`).
3. Copia el objeto de configuración generado.

### Paso 3: Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto basándote en el archivo [.env.example](file:///c:/Users/luisb/OneDrive/Escritorio/final%20movil/UberClone/.env.example):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef...
```

---

## 2. Estructura de la Base de Datos (Colecciones Firestore)

### 1. `drivers`
* `id` *(String)*: UID del conductor.
* `fullName` *(String)*: Nombre completo.
* `documentNumber` *(String)*: Documento de identidad.
* `phone` *(String)*: Celular.
* `birthDate` *(String, YYYY-MM-DD)*: Fecha de nacimiento.
* `gender` *(String)*: Género.
* `email` *(String)*: Correo electrónico.
* `profilePhoto` *(String)*: URI/URL de foto de perfil.
* `language` *(String)*: Idioma ('es' | 'en').
* `status` *(String)*: `'pending'` | `'approved'` | `'rejected'` *(Inicia en `'pending'`)*.
* `availability` *(String)*: `'available'` | `'unavailable'` *(Inicia en `'unavailable'`)*.
* `createdAt` *(String ISO)*.
* `updatedAt` *(String ISO)*.

### 2. `vehicles`
* `id` *(String)*: ID autogenerado del vehículo.
* `driverId` *(String)*: Referencia al UID del conductor.
* `category` *(String)*: `'economy'` | `'xl'` | `'premium'`.
* `plate` *(String)*: Placa colombiana (ABC123).
* `brand` *(String)*: Marca.
* `model` *(String)*: Modelo.
* `year` *(String)*: Año.
* `color` *(String)*: Color.
* `passengerCapacity` *(Number)*: Capacidad de pasajeros.
* `vehiclePhoto` *(String)*: Foto del vehículo.
* `createdAt`, `updatedAt` *(String ISO)*.

### 3. `documents`
* `id` *(String)*: ID autogenerado del registro de documentos.
* `driverId` *(String)*: Referencia al UID del conductor.
* `licenseNumber` *(String)*: Número de licencia.
* `licensePhoto` *(String)*: Foto de licencia.
* `licenseExpiration` *(String)*: Fecha de vencimiento de licencia.
* `soatPhoto` *(String)*: Foto del SOAT.
* `soatExpiration` *(String)*: Vencimiento del SOAT.
* `technicalInspectionPhoto` *(String)*: Foto de tecnomecánica.
* `technicalInspectionExpiration` *(String)*: Vencimiento de tecnomecánica.
* `mercadopagoEmail` *(String)*: Correo de Mercado Pago.
* `termsAccepted` *(Boolean)*: Aceptación de términos y condiciones.
* `createdAt`, `updatedAt` *(String ISO)*.

### 4. `trips`
* `id` *(String)*: ID autogenerado del viaje.
* `driverId` *(String | null)*: Conductor asignado.
* `passengerId` *(String)*: Identificador del pasajero.
* `origin` *(Object)*: `{ address, latitude, longitude }`.
* `destination` *(Object)*: `{ address, latitude, longitude }`.
* `distanceKm` *(Number)*: Distancia en km.
* `durationMin` *(Number)*: Duración estimada en minutos.
* `category` *(String)*: Categoría del viaje.
* `fare` *(Number)*: Tarifa total cobrada en COP (entero).
* `commission` *(Number)*: Comisión de la plataforma del 20% en COP (entero).
* `tip` *(Number)*: Propina 100% para el conductor en COP (entero).
* `driverEarnings` *(Number)*: Ganancia neta `(fare - commission) + tip` en COP (entero).
* `commissionRate` *(Number)*: 0.20 fijo.
* `paymentMethod` *(String)*: `'cash'` | `'mercadopago'`.
* `paymentStatus` *(String)*: `'pending'` | `'paid'`.
* `paymentId` *(String)*: ID de transacción de pago.
* `status` *(String)*: `'requested'` | `'accepted'` | `'driver_arriving'` | `'in_progress'` | `'completed'` | `'paid'` | `'cancelled'`.
* `rating` *(Number)*: Calificación (1 - 5).
* `createdAt` *(String ISO)*.
* `expiresAt` *(Number ms)*: Timestamp de expiración (15 segundos para atender solicitud).
* `completedAt` *(String ISO | null)*.

### 5. `driverLocations`
* `driverId` *(String, ID del documento)*: UID del conductor.
* `latitude` *(Number)*: Latitud actual.
* `longitude` *(Number)*: Longitud actual.
* `updatedAt` *(String ISO)*: Timestamp de sincronización.

### 6. `driverEarnings`
* `id` *(String)*: ID de la liquidación.
* `driverId` *(String)*: Conductor.
* `tripId` *(String)*: Viaje liquidado.
* `fare` *(Number)*: Tarifa (COP entero).
* `commission` *(Number)*: Comisión retenida 20% (COP entero).
* `tip` *(Number)*: Propina recibida (COP entero).
* `netEarnings` *(Number)*: Ganancia neta depositada (COP entero).
* `paymentMethod` *(String)*: Método de pago.
* `createdAt` *(String ISO)*.

---

## 3. Despliegue de Reglas de Seguridad

El archivo [firestore.rules](file:///c:/Users/luisb/OneDrive/Escritorio/final%20movil/UberClone/firestore.rules) implementa las políticas de acceso:
1. **Acceso al perfil:** Cada conductor solo consulta y modifica sus propios datos.
2. **Protección de aprobación:** Un conductor no puede modificar su propio campo `status` de aprobación.
3. **Control de disponibilidad:** Solamente cuando `status == 'approved'`, Firestore permite actualizar `availability` a `'available'`.
4. **Viajes y solicitudes:** Solo los conductores autenticados pueden ver viajes abiertos (`'requested'`) o asignados a su UID.
5. **Ganancias inmutables:** Los registros en `driverEarnings` solo se pueden crear, no editar ni borrar.

Para desplegar las reglas a Firebase:
```bash
npm install -g firebase-tools
firebase login
firebase use tu-proyecto-id
firebase deploy --only firestore:rules
```

---

## 4. Ejecución de Pruebas Automatizadas

Se incluyó una suite de validación en [tests/verify_business_rules.js](file:///c:/Users/luisb/OneDrive/Escritorio/final%20movil/UberClone/tests/verify_business_rules.js). Para ejecutarla:

```bash
node tests/verify_business_rules.js
```

Esta suite valida:
* Cálculo exacto de la comisión del 20% en COP entero.
* Asignación del 100% de propinas al conductor.
* Restricción estricta de disponibilidad solo para conductores aprobados.
* Temporizador de expiración de 15 segundos para solicitudes.
* Presencia de todos los campos y colecciones requeridas.

---

## 5. Ejecución del Proyecto

Para iniciar la aplicación en Expo:

```bash
# Iniciar el servidor de desarrollo Expo
npx expo start
```

Presiona `w` para abrir en la web, `a` para emulador Android, o escanea el código QR con Expo Go en tu dispositivo móvil.

