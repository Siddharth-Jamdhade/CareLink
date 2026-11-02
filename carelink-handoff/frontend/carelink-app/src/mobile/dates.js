export const EDD_HELP = 'Estimated using Naegele’s formula: first day of LMP + 9 calendar months + 7 days.';
export function calculateEDD(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.toISOString().slice(0, 10) !== value) return null;
  const target = new Date(Date.UTC(year, month - 1 + 9, 1));
  const end = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, end) + 7);
  return target.toISOString().slice(0, 10);
}
export function displayDate(value) {
  if (!value) return 'Not recorded';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
