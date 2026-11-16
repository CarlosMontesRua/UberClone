import {
  doc,
  setDoc,
} from 'firebase/firestore';
import { getDb } from '../config/firebase';
import { locationService } from './locationService';

const LOCATIONS_COLLECTION = 'driverLocations';

/**
 * Servicio especializado para gestionar la sincronización y persistencia
 * de la geolocalización de conductores en Firebase Firestore.
 */
export const driverLocationService = {
  /**
   * Actualiza o crea la ubicación del conductor en la colección driverLocations.
   * Almacena: driverId, latitude, longitude y updatedAt (ISO string).
   * Utiliza setDoc con merge para prevenir registros duplicados.
   *
   * @param {string} driverId
   * @param {{ latitude: number, longitude: number, heading?: number, speed?: number }} coords
   * @returns {Promise<{ driverId: string, latitude: number, longitude: number, updatedAt: string }>}
   */
  async updateLocation(driverId, { latitude, longitude, heading = 0, speed = 0 }) {
    if (!driverId) {
      throw new Error('driverId es requerido para actualizar la ubicación.');
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('latitude y longitude deben ser números válidos.');
    }

    const db = getDb();
    const now = new Date().toISOString();

    const payload = {
      driverId,
      latitude: parseFloat(latitude.toFixed(6)),
      longitude: parseFloat(longitude.toFixed(6)),
      heading: typeof heading === 'number' ? heading : 0,
      speed: typeof speed === 'number' ? speed : 0,
      updatedAt: now,
    };

    // Previene registros duplicados utilizando el driverId como ID único de documento
    await setDoc(doc(db, LOCATIONS_COLLECTION, driverId), payload, { merge: true });

    return payload;
  },

  /**
   * Obtiene la última ubicación guardada del conductor.
   * @param {string} driverId
   * @returns {Promise<{ latitude: number, longitude: number, updatedAt: string } | null>}
   */
  async getLocation(driverId) {
    if (!driverId) return null;
    return await locationService.getCurrentLocation(driverId);
  },

  /**
   * Suscribe en tiempo real a los cambios de ubicación del conductor.
   * @param {string} driverId
   * @param {(locationData: any) => void} callback
   * @returns {() => void} función de limpieza (unsubscribe)
   */
  subscribeToLocation(driverId, callback) {
    if (!driverId) return () => {};
    return locationService.subscribeToDriverLocation(driverId, callback);
  },
};

export default driverLocationService;
