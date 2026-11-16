import { useEffect, useMemo, useState } from 'react';
import { earningsService } from '../services/earningsService';
import { isInRange, rangeForFilter } from '../utils/dateRanges';

function summarize(list) {
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

  return {
    ...summary,
    averagePerTrip:
      summary.totalTrips > 0
        ? Math.round(summary.totalNetEarnings / summary.totalTrips)
        : 0,
  };
}

/**
 * Ganancias en tiempo real + totales por período (useMemo) + saldo.
 * Saldo = net de pasarela − comisiones de viajes en efectivo.
 */
export const useEarnings = (driverId) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) {
      setList([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = earningsService.subscribeToEarnings(driverId, (data) => {
      setList(data.list || []);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [driverId]);

  const periods = useMemo(() => {
    const build = (key) => {
      const { start, end } = rangeForFilter(key);
      const filtered = list.filter((item) => isInRange(item.createdAt, start, end));
      return summarize(filtered);
    };

    return {
      all: summarize(list),
      today: build('today'),
      week: build('week'),
      month: build('month'),
    };
  }, [list]);

  const balance = useMemo(() => {
    return list.reduce((acc, item) => {
      const method = item.paymentMethod || 'cash';
      if (method === 'cash') {
        return acc - (item.commission || 0);
      }
      // Pasarela (mercadopago/stripe): suma ganancia neta al saldo
      return acc + (item.netEarnings || 0);
    }, 0);
  }, [list]);

  return {
    list,
    loading,
    periods,
    balance,
  };
};

export default useEarnings;
