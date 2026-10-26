/**
 * Clock times, durations and calendar dates. Pure and timezone-free: every
 * time here is a local wall-clock time at the place being looked at, so
 * nothing may pass through the server's own timezone.
 */

export type ClockStyle = "12" | "24";

export const MINUTES_PER_DAY = 1440;

/** "06:48" or "06:29:01.020" → minutes after midnight. "-:-" (never happens) → null. */
export function parseClock(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;

  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  return hours * 60 + minutes + seconds / 60;
}

/** Minutes after midnight → "6:48 AM" or "06:48". Wraps past midnight. */
export function formatClock(minutes: number, style: ClockStyle): string {
  const whole = ((Math.floor(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(whole / 60);
  const mins = String(whole % 60).padStart(2, "0");

  if (style === "24") {
    return `${String(hours).padStart(2, "0")}:${mins}`;
  }

  const suffix = hours < 12 ? "AM" : "PM";
  const twelve = hours % 12 === 0 ? 12 : hours % 12;

  return `${twelve}:${mins} ${suffix}`;
}

/** 54 → "54 min", 72 → "1 h 12 min", 120 → "2 h". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));

  if (total < 60) {
    return `${total} min`;
  }

  const hours = Math.floor(total / 60);
  const rest = total % 60;

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** "HH:MM" day length from the API → "11 h 14 min". "-:-" → null. */
export function formatDayLength(value: string): string | null {
  const minutes = parseClock(value);

  return minutes === null ? null : formatDuration(minutes);
}

// --- calendar dates (YYYY-MM-DD) ------------------------------------------

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar date in the supported range, so "2026-02-30" is refused. */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);

  if (!match) {
    return false;
  }

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    year >= MIN_YEAR &&
    year <= MAX_YEAR &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

function toUtc(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);

  return fromUtc(date);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86400000);
}

/** 1 for January 1st. */
export function dayOfYear(iso: string): number {
  const date = toUtc(iso);

  return daysBetween(`${date.getUTCFullYear()}-01-01`, iso) + 1;
}

/** "Tuesday, October 13" (with the year when it is not the reference year). */
export function formatLongDate(iso: string, referenceIso?: string): string {
  const date = toUtc(iso);
  const sameYear = !referenceIso || referenceIso.slice(0, 4) === iso.slice(0, 4);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** "Tue, Oct 13" */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(toUtc(iso));
}

export function isWeekend(iso: string): boolean {
  const day = toUtc(iso).getUTCDay();

  return day === 0 || day === 6;
}
