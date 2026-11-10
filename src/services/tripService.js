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

const TRIPS = 'trips';
export const COMMISSION_RATE = 0.20; // 20% de comisión de la plataforma
export const REQUEST_EXPIRATION_SECONDS = 15; // 15 segundos para atender solicitud

export const tripService = {
  /**
   * Crea una solicitud de viaje.
   * Reglas de negocio:
   * - Comisión 20% (entero COP).
   * - Propinas 100% conductor (entero COP).
   * - driverEarnings = (fare - commission) + tip.
   * - commissionRate conservado (0.20).
   * - Estado inicial 'requested'.
   * - expiresAt a los 15 segundos.
   */
  async createTrip(tripData) {
    const db = getDb();
    const tripRef = doc(collection(db, TRIPS));
    const now = new Date();
    const nowIso = now.toISOString();

    const fare = Math.round(Number(tripData.fare) || 0);
    const tip = Math.round(Number(tripData.tip) || 0);
    const commission = Math.round(fare * COMMISSION_RATE);
    const driverEarnings = Math.round(fare - commission + tip);

    const payload = {
      id: tripRef.id,
      driverId: tripData.driverId || null,
      passengerId: tripData.passengerId || 'pasajero_demo',
      origin: tripData.origin || { address: 'Origen no especificado', latitude: 4.6097, longitude: -74.0817 },
      destination: tripData.destination || { address: 'Destino no especificado', latitude: 4.6533, longitude: -74.0836 },
      distanceKm: Number(tripData.distanceKm) || 3.5,
      durationMin: Number(tripData.durationMin) || 12,
      category: tripData.category || 'economy',
      fare,
      commission,
      tip,
      driverEarnings,
      commissionRate: COMMISSION_RATE,
      paymentMethod: tripData.paymentMethod || 'cash',
      paymentStatus: tripData.paymentStatus || 'pending',
      paymentId: tripData.paymentId || `PAY-${Date.now()}`,
      status: 'requested',
      rating: Number(tripData.rating) || 0,
      createdAt: nowIso,
      expiresAt: now.getTime() + REQUEST_EXPIRATION_SECONDS * 1000,
      completedAt: null,
      updatedAt: nowIso,
    };

    await setDoc(tripRef, payload);
    return payload;
  },

  async getTrip(tripId) {
    if (!tripId) return null;
    const db = getDb();
    const snap = await getDoc(doc(db, TRIPS, tripId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  async updateTrip(tripId, updates) {
    const db = getDb();
    await updateDoc(doc(db, TRIPS, tripId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Acepta un viaje solicitado.
   * Valida que no haya expirado (15 segundos) y esté en estado 'requested'.
   */
  async acceptTrip(tripId, driverId) {
    if (!tripId || !driverId) throw new Error('tripId y driverId son requeridos');
    const db = getDb();
    const tripSnap = await getDoc(doc(db, TRIPS, tripId));

    if (!tripSnap.exists()) {
      throw new Error('El viaje no existe.');
    }

    const trip = tripSnap.data();

    if (trip.status !== 'requested') {
      throw new Error('Esta solicitud ya fue atendida o cancelada.');
    }

    if (trip.expiresAt && Date.now() > trip.expiresAt) {
      // Expiró
      await updateDoc(doc(db, TRIPS, tripId), {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });
      throw new Error('La solicitud ha expirado (más de 15 segundos sin atender).');
    }

    await updateDoc(doc(db, TRIPS, tripId), {
      driverId,
      status: 'accepted',
      updatedAt: new Date().toISOString(),
    });

    return { ...trip, driverId, status: 'accepted' };
  },

  /**
   * Rechaza un viaje solicitado.
   */
  async rejectTrip(tripId, driverId) {
    const db = getDb();
    await updateDoc(doc(db, TRIPS, tripId), {
      status: 'cancelled',
      cancelledBy: driverId,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Transición de estados de viaje en curso:
   * accepted -> driver_arriving -> in_progress -> completed -> paid
   */
  async changeTripStatus(tripId, newStatus, additionalData = {}) {
    const db = getDb();
    const updates = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      ...additionalData,
    };

    if (newStatus === 'completed' || newStatus === 'paid') {
      if (!updates.completedAt) {
        updates.completedAt = new Date().toISOString();
      }
    }

    if (newStatus === 'paid') {
      updates.paymentStatus = 'paid';
    }

    await updateDoc(doc(db, TRIPS, tripId), updates);
  },

  subscribeToTrip(tripId, callback) {
    if (!tripId) return () => {};
    const db = getDb();
    return onSnapshot(doc(db, TRIPS, tripId), (snap) => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() });
      else callback(null);
    });
  },

  /**
   * Escucha solicitudes de viajes pendientes en tiempo real ('requested')
   * que no hayan expirado (> Date.now()).
   */
  subscribeToAvailableRequests(category, callback) {
    const db = getDb();
    const q = query(
      collection(db, TRIPS),
      where('status', '==', 'requested'),
      orderBy('createdAt', 'desc'),
    );

    return onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const available = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((t) => {
            // Filtrar solicitudes con menos de 15 segundos
            const notExpired = !t.expiresAt || t.expiresAt > now;
            const matchesCategory = !category || t.category === category;
            return notExpired && matchesCategory;
          });
        callback(available);
      },
      (error) => {
        console.warn('Error escuchando solicitudes:', error.message);
        callback([]);
      },
    );
  },

  /**
   * Escucha el viaje activo actual del conductor (accepted, driver_arriving, in_progress).
   */
  subscribeToActiveTripForDriver(driverId, callback) {
    if (!driverId) return () => {};
    const db = getDb();
    const activeStatuses = ['accepted', 'driver_arriving', 'in_progress'];
    const q = query(
      collection(db, TRIPS),
      where('driverId', '==', driverId),
      where('status', 'in', activeStatuses),
    );

    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        callback({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        callback(null);
      }
    });
  },

  /**
   * Historial de viajes con filtros (por fecha o estado).
   */
  async getTripHistory(driverId, filters = {}) {
    if (!driverId) return [];
    const db = getDb();

    let q = query(
      collection(db, TRIPS),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
    );

    const snap = await getDocs(q);
    let trips = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (filters.status && filters.status !== 'all') {
      trips = trips.filter((t) => t.status === filters.status);
    }

    if (filters.startDate) {
      trips = trips.filter((t) => new Date(t.createdAt) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      trips = trips.filter((t) => new Date(t.createdAt) <= new Date(filters.endDate));
    }

    return trips;
  },

  async deleteTrip(tripId) {
    const db = getDb();
    await deleteDoc(doc(db, TRIPS, tripId));
  },
};

export default tripService;
