export const SLOT_HOURS = 2;
export const SLOTS_PER_DAY = 24 / SLOT_HOURS; // 12
export const MAX_CONSECUTIVE_SLOTS = 3; // 6 hours max
export const BAY_IDS = [1, 2, 3] as const;
export type BayId = (typeof BAY_IDS)[number];

export function slotIndexToHour(slotIndex: number): number {
  return slotIndex * SLOT_HOURS;
}

export function formatHour(hour: number): string {
  const h = hour % 24;
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

export function formatSlotRange(slotIndex: number): string {
  const start = slotIndexToHour(slotIndex);
  const end = (start + SLOT_HOURS) % 24;
  return `${formatHour(start)} – ${formatHour(end === 0 ? 24 : end)}`;
}

/** ISO date string (YYYY-MM-DD) helpers operating in local time. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, delta: number): string {
  const d = fromIsoDate(iso);
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

/** Convert a slot on a given date to a UTC ISO timestamp range. */
export function slotToTimestamps(
  isoDate: string,
  slotIndex: number,
): { start: Date; end: Date } {
  const base = fromIsoDate(isoDate);
  const start = new Date(base);
  start.setHours(slotIndexToHour(slotIndex), 0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + SLOT_HOURS);
  return { start, end };
}
