/**
 * Where the sun is, phase by phase, across a run of days. Pure, so it can be
 * unit tested against captured API responses.
 *
 * The Astronomy API reports each phase boundary as the moment the sun
 * crosses an angle, inside one local calendar day: morning.* fields are the
 * sun rising through an angle, evening.* fields are it sinking through one,
 * whatever the clock says (Reykjavik's midsummer "sunset" is at 00:03, and
 * it is the previous evening's). "-:-" means the sun does not cross that
 * angle that day.
 *
 * So instead of reading "morning golden hour" off one day, this lays every
 * crossing on one continuous timeline (day index × 1440 + minutes) and asks,
 * for any moment, which side of each angle the sun is on. That answers the
 * polar cases with no special code: a golden hour that runs overnight under
 * the midnight sun, or a winter day that is one long golden hour because the
 * sun never climbs past 6°.
 */

import { dayOfYear, MINUTES_PER_DAY, parseClock } from "@/lib/clock";

export type Phase = "night" | "astronomical" | "nautical" | "blue" | "golden" | "day";

/** Lowest sun first. */
export const PHASE_ORDER: Phase[] = ["night", "astronomical", "nautical", "blue", "golden", "day"];

/**
 * The angles that separate the phases, matching the API's definitions
 * (checked against a solar-position calculation): blue hour is the sun
 * between 8° and 4° below the horizon, golden hour between 4° below and 6°
 * above.
 */
export const BOUNDARIES = [-18, -12, -8, -4, 6] as const;

/** Where the sunrise and sunset fields put the sun: refraction and the sun's radius. */
export const HORIZON = -0.833;

export type ApiDay = {
  date: string;
  sunrise: string;
  sunset: string;
  solar_noon: string;
  day_length: string;
  morning: Record<string, string>;
  evening: Record<string, string>;
  /** The end of full night, when the sun climbs past 18° below the horizon. */
  night_end?: string;
  /** The start of full night. */
  night_begin?: string;
  moon_phase?: string;
  moonrise?: string;
  moonset?: string;
};

type Crossing = { t: number; up: boolean };

const RISING_FIELD: Record<number, string> = {
  [-18]: "astronomical_twilight_begin",
  [-12]: "nautical_twilight_begin",
  [-8]: "blue_hour_begin",
  [-4]: "golden_hour_begin",
  6: "golden_hour_end",
};

const SETTING_FIELD: Record<number, string> = {
  6: "golden_hour_begin",
  [-4]: "golden_hour_end",
  [-8]: "blue_hour_end",
  [-12]: "nautical_twilight_end",
  [-18]: "astronomical_twilight_end",
};

export type Run = { phase: Phase; start: number; end: number };

/** How a window began and ended, which says what the sun was doing. */
export type Shape =
  /** Entered from below, left upwards: a morning window. */
  | "rising"
  /** Entered from above, left downwards: an evening window. */
  | "setting"
  /** Entered from below and left downwards: the sun peaked inside the band. */
  | "peak"
  /** Entered from above and left upwards: the sun dipped into the band and rose again. */
  | "dip"
  /** It started before, or ends after, the days that were fetched. */
  | "open";

export type Window = {
  phase: Phase;
  start: number;
  end: number;
  startOpen: boolean;
  endOpen: boolean;
  shape: Shape;
};

export class Sky {
  readonly days: ApiDay[];
  readonly latitude: number;
  private readonly crossings = new Map<number, Crossing[]>();

  constructor(days: ApiDay[], latitude: number) {
    this.days = days;
    this.latitude = latitude;

    for (const angle of [...BOUNDARIES, HORIZON]) {
      const list: Crossing[] = [];

      days.forEach((day, index) => {
        const offset = index * MINUTES_PER_DAY;
        const rising = angle === HORIZON ? day.sunrise : day.morning?.[RISING_FIELD[angle]];
        const setting = angle === HORIZON ? day.sunset : day.evening?.[SETTING_FIELD[angle]];
        const up = parseClock(rising);
        const down = parseClock(setting);

        if (up !== null) {
          list.push({ t: offset + up, up: true });
        }

        if (down !== null) {
          list.push({ t: offset + down, up: false });
        }
      });

      list.sort((a, b) => a.t - b.t);
      this.crossings.set(angle, list);
    }
  }

  get length(): number {
    return this.days.length * MINUTES_PER_DAY;
  }

  /** Whether the sun is above an angle at moment t. */
  above(angle: number, t: number): boolean {
    const list = this.crossings.get(angle) ?? [];
    let last: Crossing | null = null;

    for (const crossing of list) {
      if (crossing.t > t) {
        // Nothing earlier: the first crossing says which side it came from.
        return last ? last.up : !crossing.up;
      }

      last = crossing;
    }

    if (last) {
      return last.up;
    }

    // The sun never crosses this angle in any fetched day, so it stays on one
    // side throughout. Which side is decided by the noon elevation.
    const index = Math.min(this.days.length - 1, Math.max(0, Math.floor(t / MINUTES_PER_DAY)));

    return noonElevation(this.latitude, dayOfYear(this.days[index].date)) > angle;
  }

  phaseAt(t: number): Phase {
    if (this.above(6, t)) {
      return "day";
    }

    if (this.above(-4, t)) {
      return "golden";
    }

    if (this.above(-8, t)) {
      return "blue";
    }

    if (this.above(-12, t)) {
      return "nautical";
    }

    return this.above(-18, t) ? "astronomical" : "night";
  }

  /** Stretches of one phase between from and to, merged. */
  runs(from: number, to: number): Run[] {
    const cuts = new Set<number>([from, to]);

    for (const angle of BOUNDARIES) {
      for (const crossing of this.crossings.get(angle) ?? []) {
        if (crossing.t > from && crossing.t < to) {
          cuts.add(crossing.t);
        }
      }
    }

    const edges = [...cuts].sort((a, b) => a - b);
    const runs: Run[] = [];

    for (let index = 0; index < edges.length - 1; index += 1) {
      const start = edges[index];
      const end = edges[index + 1];
      const phase = this.phaseAt((start + end) / 2);
      const previous = runs[runs.length - 1];

      if (previous && previous.phase === phase) {
        previous.end = end;
      } else {
        runs.push({ phase, start, end });
      }
    }

    return runs;
  }

  /** Every golden (or blue) window across all the fetched days. */
  windows(phase: "golden" | "blue"): Window[] {
    const runs = this.runs(0, this.length);
    const rank = (value: Phase) => PHASE_ORDER.indexOf(value);
    const windows: Window[] = [];

    runs.forEach((run, index) => {
      if (run.phase !== phase) {
        return;
      }

      const before = runs[index - 1];
      const after = runs[index + 1];
      const startOpen = !before;
      const endOpen = !after;
      let shape: Shape = "open";

      if (before && after) {
        const fromBelow = rank(before.phase) < rank(phase);
        const toAbove = rank(after.phase) > rank(phase);

        shape = fromBelow ? (toAbove ? "rising" : "peak") : toAbove ? "dip" : "setting";
      }

      windows.push({ phase, start: run.start, end: run.end, startOpen, endOpen, shape });
    });

    return windows;
  }

  /** Sunrise and sunset moments on one day, relative to its midnight. */
  horizonEvents(dayIndex: number): { sunrise: number | null; sunset: number | null } {
    const day = this.days[dayIndex];

    return { sunrise: parseClock(day?.sunrise), sunset: parseClock(day?.sunset) };
  }
}

/**
 * The sun's height at local noon, in degrees, from the solar declination
 * (Cooper's approximation, good to about half a degree). Only used to say
 * which side of an angle the sun stays on when it never crosses it.
 */
export function noonElevation(latitude: number, day: number): number {
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));

  return 90 - Math.abs(latitude - declination);
}

/** The phase for a sun height in degrees, using the same boundaries as the timeline. */
export function phaseForAltitude(altitude: number): Phase {
  if (altitude > 6) {
    return "day";
  }

  if (altitude > -4) {
    return "golden";
  }

  if (altitude > -8) {
    return "blue";
  }

  if (altitude > -12) {
    return "nautical";
  }

  return altitude > -18 ? "astronomical" : "night";
}
