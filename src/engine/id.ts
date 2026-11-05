/** Small ID + date helpers shared by the engine and the store. */

export function id(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function dayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(date: Date | string): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date | string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const ms = startOfDay(new Date(b)).getTime() - startOfDay(new Date(a)).getTime();
  return Math.round(ms / 86_400_000);
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Maakye';
  if (h < 17) return 'Maaha';
  return 'Maadwo';
}

export function formatDay(date: Date | string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat('en-GB', opts).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

export default { id, dayKey, startOfDay, addDays, daysBetween, greeting, formatDay, formatTime };
