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

const VEHICLES = 'vehicles';

export const vehicleService = {
  async createVehicle(vehicleData) {
    if (!vehicleData.driverId) throw new Error('driverId es requerido para registrar un vehículo');
    const db = getDb();
    const vehicleRef = doc(collection(db, VEHICLES));
    const now = new Date().toISOString();

    const payload = {
      id: vehicleRef.id,
      driverId: vehicleData.driverId,
      category: vehicleData.category || 'economy',
      plate: (vehicleData.plate || '').toUpperCase().trim(),
      brand: vehicleData.brand || '',
      model: vehicleData.model || '',
      year: vehicleData.year ? String(vehicleData.year) : '',
      color: vehicleData.color || '',
      passengerCapacity: Number(vehicleData.passengerCapacity) || 4,
      vehiclePhoto: vehicleData.vehiclePhoto || '',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(vehicleRef, payload);
    return payload;
  },

  async getVehicle(vehicleId) {
    const db = getDb();
    const snap = await getDoc(doc(db, VEHICLES, vehicleId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  async getVehiclesByDriverId(driverId) {
    if (!driverId) return [];
    const db = getDb();
    const q = query(
      collection(db, VEHICLES),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getPrimaryVehicleByDriverId(driverId) {
    const list = await this.getVehiclesByDriverId(driverId);
    return list.length > 0 ? list[0] : null;
  },

  async updateVehicle(vehicleId, updates) {
    const db = getDb();
    await updateDoc(doc(db, VEHICLES, vehicleId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteVehicle(vehicleId) {
    const db = getDb();
    await deleteDoc(doc(db, VEHICLES, vehicleId));
  },

  subscribeToVehicle(vehicleId, callback) {
    const db = getDb();
    return onSnapshot(doc(db, VEHICLES, vehicleId), (snap) => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() });
      else callback(null);
    });
  },

  subscribeToVehiclesByDriverId(driverId, callback) {
    if (!driverId) return () => {};
    const db = getDb();
    const q = query(
      collection(db, VEHICLES),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  },
};

export default vehicleService;
