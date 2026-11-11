import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { getDb } from '../config/firebase';

const EARNINGS = 'driverEarnings';

export const earningsService = {
  /**
   * Registra las ganancias de un viaje completado.
   * Reglas de negocio:
   * - Propinas 100% conductor.
   * - Valores monetarios enteros en COP.
   * - netEarnings = (fare - commission) + tip.
   */
  async recordEarnings({ driverId, tripId, fare, commission, tip = 0, paymentMethod = 'cash' }) {
    if (!driverId || !tripId) throw new Error('driverId y tripId son requeridos');

    const db = getDb();
    // One immutable settlement document per trip prevents duplicate payouts.
    const earningsRef = doc(db, EARNINGS, tripId);
    const now = new Date().toISOString();

    const roundedFare = Math.round(Number(fare) || 0);
    const roundedCommission = Math.round(Number(commission) || 0);
    const roundedTip = Math.round(Number(tip) || 0);
    const netEarnings = Math.round(roundedFare - roundedCommission + roundedTip);

    const payload = {
      id: earningsRef.id,
      driverId,
      tripId,
      fare: roundedFare,
      commission: roundedCommission,
      tip: roundedTip,
      netEarnings,
      paymentMethod,
      createdAt: now,
    };

    await setDoc(earningsRef, payload);
    return payload;
  },

  async getEarningsByDriverId(driverId) {
    if (!driverId) return [];
    const db = getDb();
    const q = query(
      collection(db, EARNINGS),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /**
   * Resumen y cálculo de ganancias reales totales y desglose.
   */
  async getTotalEarningsSummary(driverId) {
    const list = await this.getEarningsByDriverId(driverId);
    return list.reduce(
      (acc, item) => ({
        totalTrips: acc.totalTrips + 1,
        totalFare: acc.totalFare + (item.fare || 0),
        totalCommission: acc.totalCommission + (item.commission || 0),
        totalTips: acc.totalTips + (item.tip || 0),
        totalNetEarnings: acc.totalNetEarnings + (item.netEarnings || 0),
      }),
      {
        totalTrips: 0,
        totalFare: 0,
        totalCommission: 0,
        totalTips: 0,
        totalNetEarnings: 0,
      },
    );
  },

  subscribeToEarnings(driverId, callback) {
    if (!driverId) return () => {};
    const db = getDb();
    const q = query(
      collection(db, EARNINGS),
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const summary = list.reduce(
          (acc, item) => ({
            totalTrips: acc.totalTrips + 1,
            totalFare: acc.totalFare + (item.fare || 0),
            totalCommission: acc.totalCommission + (item.commission || 0),
            totalTips: acc.totalTips + (item.tip || 0),
            totalNetEarnings: acc.totalNetEarnings + (item.netEarnings || 0),
          }),
          {
            totalTrips: 0,
            totalFare: 0,
            totalCommission: 0,
            totalTips: 0,
            totalNetEarnings: 0,
          },
        );
        callback({ list, summary });
      },
      (error) => {
        console.warn('Error suscribiendo a ganancias:', error.message);
        callback({
          list: [],
          summary: {
            totalTrips: 0,
            totalFare: 0,
            totalCommission: 0,
            totalTips: 0,
            totalNetEarnings: 0,
          },
        });
      },
    );
  },
};

export default earningsService;
