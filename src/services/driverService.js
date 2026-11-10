import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { getDb } from '../config/firebase';

const DRIVERS = 'drivers';

export const driverService = {
  /**
   * Crea o actualiza el perfil del conductor.
   * Regla de negocio: Todo conductor nuevo inicia en estado 'pending' y disponibilidad 'unavailable'.
   */
  async createDriver(driverId, driverData) {
    if (!driverId) throw new Error('driverId es requerido');
    const db = getDb();
    const now = new Date().toISOString();
    const docRef = doc(db, DRIVERS, driverId);

    const payload = {
      id: driverId,
      fullName: driverData.fullName || '',
      documentNumber: driverData.documentNumber || '',
      phone: driverData.phone || '',
      birthDate: driverData.birthDate || '',
      gender: driverData.gender || '',
      email: driverData.email || '',
      profilePhoto: driverData.profilePhoto || '',
      language: driverData.language || 'es',
      status: 'pending', // Regla de negocio: siempre 'pending' al registrarse
      availability: 'unavailable',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, payload, { merge: true });
    return payload;
  },

  async getDriver(driverId) {
    if (!driverId) return null;
    const db = getDb();
    const snap = await getDoc(doc(db, DRIVERS, driverId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  async updateDriver(driverId, updates) {
    if (!driverId) throw new Error('driverId es requerido');
    const db = getDb();
    // Protegemos el campo status: un conductor no puede auto-aprobarse
    const safeUpdates = { ...updates };
    delete safeUpdates.status;
    delete safeUpdates.id;

    await updateDoc(doc(db, DRIVERS, driverId), {
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Cambia la disponibilidad del conductor.
   * Regla de negocio: Solamente un conductor con status 'approved' puede ponerse 'available'.
   */
  async setAvailability(driverId, availability) {
    if (!driverId) throw new Error('driverId es requerido');
    const db = getDb();
    const driverSnap = await getDoc(doc(db, DRIVERS, driverId));

    if (!driverSnap.exists()) {
      throw new Error('Conductor no encontrado');
    }

    const driver = driverSnap.data();

    if (availability === 'available' && driver.status !== 'approved') {
      throw new Error('Solamente un conductor aprobado puede ponerse disponible.');
    }

    await updateDoc(doc(db, DRIVERS, driverId), {
      availability: availability === 'available' ? 'available' : 'unavailable',
      updatedAt: new Date().toISOString(),
    });

    return availability;
  },

  subscribeToDriver(driverId, callback) {
    if (!driverId) return () => {};
    const db = getDb();
    return onSnapshot(doc(db, DRIVERS, driverId), (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    });
  },

  async getAllDrivers() {
    const db = getDb();
    const q = query(collection(db, DRIVERS), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getDriversByStatus(status) {
    const db = getDb();
    const q = query(
      collection(db, DRIVERS),
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async deleteDriver(driverId) {
    const db = getDb();
    await deleteDoc(doc(db, DRIVERS, driverId));
  },
};

export default driverService;
