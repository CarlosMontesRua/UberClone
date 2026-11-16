/** Parámetros de tarifa (COP enteros). Editable en un solo lugar. */
export const PRICING = {
  baseFare: 3500,
  perKm: 1200,
  perMin: 250,
  minimumFare: 6000,
  commissionRate: 0.2,
  categoryMultiplier: {
    economy: 1.0,
    xl: 1.4,
    premium: 1.8,
  },
};

export function roundToNearest100(value) {
  return Math.round(Number(value) / 100) * 100;
}

/**
 * Función pura de tarifa (estimación y cierre de viaje).
 * @returns {{ fare: number, commission: number, driverEarnings: number, commissionRate: number }}
 */
export function calculateFare({ distanceKm, durationMin, category = 'economy', tip = 0 }) {
  const distance = Math.max(0, Number(distanceKm) || 0);
  const duration = Math.max(0, Number(durationMin) || 0);
  const tipAmount = Math.round(Number(tip) || 0);
  const multiplier =
    PRICING.categoryMultiplier[category] ?? PRICING.categoryMultiplier.economy;

  const raw =
    (PRICING.baseFare + distance * PRICING.perKm + duration * PRICING.perMin) * multiplier;
  const fare = Math.max(PRICING.minimumFare, roundToNearest100(raw));
  const commission = Math.round(fare * PRICING.commissionRate);
  const driverEarnings = Math.round(fare - commission + tipAmount);

  return {
    fare,
    commission,
    driverEarnings,
    commissionRate: PRICING.commissionRate,
  };
}

export default { PRICING, calculateFare, roundToNearest100 };
