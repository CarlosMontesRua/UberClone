export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // lunes
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfMonth(date = new Date()) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function isInRange(isoDate, start, end) {
  if (!isoDate) return false;
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return false;
  if (start && t < start.getTime()) return false;
  if (end && t > end.getTime()) return false;
  return true;
}

export function rangeForFilter(filterKey) {
  const now = new Date();
  if (filterKey === 'today') return { start: startOfDay(now), end: now };
  if (filterKey === 'week') return { start: startOfWeek(now), end: now };
  if (filterKey === 'month') return { start: startOfMonth(now), end: now };
  return { start: null, end: null };
}
