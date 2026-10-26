/**
 * Turns the sky model into what the page shows: the next golden hour, the
 * selected day's windows, and one planner row per day. Pure.
 */

import { formatClock, MINUTES_PER_DAY, parseClock, type ClockStyle } from "@/lib/clock";
import type { Phase, Sky, Window } from "@/lib/sky";

export type Status =
  | { kind: "now"; window: Window; left: number }
  | { kind: "next"; window: Window; until: number }
  | { kind: "none" };

/** Golden hour relative to moment t: on now, coming up, or not in the fetched days. */
export function statusAt(windows: Window[], t: number): Status {
  const current = windows.find((window) => window.start <= t && t < window.end);

  if (current) {
    return { kind: "now", window: current, left: current.end - t };
  }

  const next = windows.find((window) => window.start > t && !window.startOpen);

  return next ? { kind: "next", window: next, until: next.start - t } : { kind: "none" };
}

/** Where a window sits in one day, so it can be put in the right column. */
export type Slot = "morning" | "evening" | "allday";

export type Placed = { window: Window; slot: Slot };

/**
 * The windows that touch a day, each placed before or after solar noon. A
 * window that spans noon (the sun never climbs out of the band) fills the
 * whole day.
 */
export function placeWindows(sky: Sky, windows: Window[], dayIndex: number): Placed[] {
  const dayStart = dayIndex * MINUTES_PER_DAY;
  const dayEnd = dayStart + MINUTES_PER_DAY;
  const noon = dayStart + (parseClock(sky.days[dayIndex]?.solar_noon) ?? 720);

  return windows
    .filter((window) => window.start < dayEnd && window.end > dayStart)
    .map((window) => ({
      window,
      slot: window.start <= noon && window.end >= noon ? "allday" : window.end <= noon ? "morning" : "evening",
    }));
}

export type Moment = { clock: string; dayOffset: number; open: boolean };

/** A timeline moment as a wall-clock time, plus how many days off the reference day it falls. */
export function moment(t: number, referenceDay: number, style: ClockStyle, open = false): Moment {
  const day = Math.floor(t / MINUTES_PER_DAY);

  return { clock: formatClock(t - day * MINUTES_PER_DAY, style), dayOffset: day - referenceDay, open };
}

export type Marker = { t: number; label: string; kind: "golden" | "blue" | "sun" | "noon" };

/**
 * Labelled moments for the day's sky column: where golden and blue hour
 * start and end, sunrise, solar noon and sunset. Relative to the day's
 * midnight.
 */
export function dayMarkers(sky: Sky, dayIndex: number): Marker[] {
  const dayStart = dayIndex * MINUTES_PER_DAY;
  const runs = sky.runs(dayStart, dayStart + MINUTES_PER_DAY);
  const markers: Marker[] = [];

  for (let index = 1; index < runs.length; index += 1) {
    const label = transitionLabel(runs[index - 1].phase, runs[index].phase);

    if (label) {
      markers.push({ t: runs[index].start - dayStart, ...label });
    }
  }

  const { sunrise, sunset } = sky.horizonEvents(dayIndex);
  const noon = parseClock(sky.days[dayIndex]?.solar_noon);

  if (sunrise !== null) {
    markers.push({ t: sunrise, label: "Sunrise", kind: "sun" });
  }

  if (noon !== null && sky.above(-0.833, dayStart + noon)) {
    markers.push({ t: noon, label: "Solar noon", kind: "noon" });
  }

  if (sunset !== null) {
    markers.push({ t: sunset, label: "Sunset", kind: "sun" });
  }

  return markers.sort((a, b) => a.t - b.t);
}

function transitionLabel(from: Phase, to: Phase): Omit<Marker, "t"> | null {
  const key = `${from}>${to}`;
  const labels: Record<string, Omit<Marker, "t">> = {
    "nautical>blue": { label: "Blue hour begins", kind: "blue" },
    "blue>golden": { label: "Golden hour begins", kind: "golden" },
    "golden>day": { label: "Golden hour ends", kind: "golden" },
    "day>golden": { label: "Golden hour begins", kind: "golden" },
    "golden>blue": { label: "Golden hour ends", kind: "golden" },
    "blue>nautical": { label: "Blue hour ends", kind: "blue" },
  };

  return labels[key] ?? null;
}

/**
 * Spreads labels so none overlap: each keeps its own position where it can,
 * and is pushed down (then the whole column up, if it runs off the end) only
 * as far as needed to keep `gap` between neighbours.
 */
export function spreadLabels(positions: number[], gap: number, min: number, max: number): number[] {
  const placed: number[] = [];

  for (const position of positions) {
    const floor = placed.length > 0 ? placed[placed.length - 1] + gap : min;
    placed.push(Math.max(position, floor));
  }

  // Pull back from the bottom edge, keeping the gaps.
  for (let index = placed.length - 1; index >= 0; index -= 1) {
    const ceiling = index === placed.length - 1 ? max : placed[index + 1] - gap;
    placed[index] = Math.min(placed[index], ceiling);
  }

  return placed.map((position) => Math.max(min, position));
}

/**
 * A shorter span for the planner table: "6:48 to 7:42 AM", "10:06 PM to
 * 4:52 AM next day", "Until 4:52 AM".
 */
export function compactSpan(window: Window, referenceDay: number, style: ClockStyle): string {
  const start = moment(window.start, referenceDay, style);
  const end = moment(window.end, referenceDay, style);
  const endText = `${end.clock}${end.dayOffset === 1 ? " next day" : end.dayOffset > 1 ? ` (+${end.dayOffset} days)` : ""}`;

  if (window.startOpen && window.endOpen) {
    return "All day";
  }

  if (window.startOpen || start.dayOffset < 0) {
    return window.endOpen ? "All day" : `Until ${endText}`;
  }

  if (window.endOpen) {
    return `From ${start.clock}`;
  }

  if (style === "12" && end.dayOffset === 0 && start.clock.slice(-2) === end.clock.slice(-2)) {
    return `${start.clock.slice(0, -3)} to ${end.clock}`;
  }

  return `${start.clock} to ${endText}`;
}

/**
 * Under the midnight sun the day's only sunset can come in its first minutes
 * (it is the end of the previous evening), which reads oddly next to a 3 AM
 * sunrise unless it is said.
 */
export function sunsetNote(sunset: number | null, solarNoon: number | null): string {
  return sunset !== null && solarNoon !== null && sunset < solarNoon ? ", after midnight" : "";
}
