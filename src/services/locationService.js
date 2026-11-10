import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { getDb } from '../config/firebase';

const LOCATIONS = 'driverLocations';

export const locationService = {
  /**
   * Guarda y actualiza la ubicación en tiempo real del conductor.
   */
  async updateDriverLocation(driverId, { latitude, longitude }) {
    if (!driverId) throw new Error('driverId es requerido');
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('latitude y longitude deben ser numéricos');
    }

    const db = getDb();
    const now = new Date().toISOString();
    const payload = {
      driverId,
      latitude,
      longitude,
      updatedAt: now,
    };

    await setDoc(doc(db, LOCATIONS, driverId), payload, { merge: true });
    return payload;
  },

  async getCurrentLocation(driverId) {
    if (!driverId) return null;
    const db = getDb();
    const snap = await getDoc(doc(db, LOCATIONS, driverId));
    if (!snap.exists()) return null;
    return snap.data();
  },

  subscribeToDriverLocation(driverId, callback) {
    if (!driverId) return () => {};
    const db = getDb();
    return onSnapshot(
      doc(db, LOCATIONS, driverId),
      (snap) => {
        if (snap.exists()) {
          callback(snap.data());
        } else {
          callback(null);
        }
      },
      (error) => {
        console.warn('Error suscribiendo a ubicación:', error.message);
        callback(null);
      },
    );
  },
};

export default locationService;
