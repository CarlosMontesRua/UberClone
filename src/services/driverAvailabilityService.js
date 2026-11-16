import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDb } from '../config/firebase';
import { driverService } from './driverService';

const DRIVERS_COLLECTION = 'drivers';

/**
 * Servicio para gestionar la disponibilidad y validación de aprobación
 * de los conductores en Firebase Firestore.
 */
export const driverAvailabilityService = {
  /**
   * Consulta el estado de aprobación y disponibilidad actual del conductor.
   * @param {string} driverId
   * @returns {Promise<{ isApproved: boolean, status: string, availability: string, fullName: string }>}
   */
  async getDriverStatus(driverId) {
    if (!driverId) {
      throw new Error('driverId es requerido');
    }

    const db = getDb();
    const snap = await getDoc(doc(db, DRIVERS_COLLECTION, driverId));

    if (!snap.exists()) {
      throw new Error('El perfil de conductor no existe en Firestore.');
    }

    const data = snap.data();
    return {
      isApproved: data.status === 'approved',
      status: data.status || 'pending',
      availability: data.availability || 'unavailable',
      fullName: data.fullName || '',
      category: data.category || '',
    };
  },

  /**
   * Establece el estado de disponibilidad del conductor en Firestore.
   * REGLA ESTRICTA DE NEGOCIO:
   * Solamente conductores con status 'approved' pueden ponerse en estado 'available'.
   * Si el estado es 'pending' o 'rejected', se lanza una excepción controlada.
   *
   * @param {string} driverId
   * @param {'available' | 'unavailable'} availability
   * @returns {Promise<{ availability: string, updatedAt: string }>}
   */
  async setAvailability(driverId, availability) {
    if (!driverId) {
      throw new Error('driverId es requerido');
    }

    const normalizedAvailability = availability === 'available' ? 'available' : 'unavailable';

    const db = getDb();
    const driverSnap = await getDoc(doc(db, DRIVERS_COLLECTION, driverId));

    if (!driverSnap.exists()) {
      throw new Error('El conductor no fue encontrado en la base de datos.');
    }

    const driverData = driverSnap.data();

    // Validación de seguridad y regla de negocio
    if (normalizedAvailability === 'available' && driverData.status !== 'approved') {
      const statusLabel =
        driverData.status === 'pending'
          ? 'En revisión (Pendiente)'
          : driverData.status === 'rejected'
          ? 'Rechazado'
          : driverData.status || 'No aprobado';

      throw new Error(
        `Solamente un conductor aprobado puede ponerse disponible. Tu estado actual es: ${statusLabel}.`,
      );
    }

    const now = new Date().toISOString();
    await updateDoc(doc(db, DRIVERS_COLLECTION, driverId), {
      availability: normalizedAvailability,
      updatedAt: now,
    });

    return {
      availability: normalizedAvailability,
      updatedAt: now,
    };
  },

  /**
   * Pone al conductor disponible (Online).
   * @param {string} driverId
   */
  async goOnline(driverId) {
    return this.setAvailability(driverId, 'available');
  },

  /**
   * Pone al conductor no disponible (Offline).
   * @param {string} driverId
   */
  async goOffline(driverId) {
    return this.setAvailability(driverId, 'unavailable');
  },

  /**
   * Escucha cambios en tiempo real del perfil del conductor (incluyendo status y availability).
   * @param {string} driverId
   * @param {(data: any) => void} callback
   * @returns {() => void} función de desuscripción
   */
  subscribeToDriver(driverId, callback) {
    if (!driverId) return () => {};
    return driverService.subscribeToDriver(driverId, callback);
  },
};

export default driverAvailabilityService;
