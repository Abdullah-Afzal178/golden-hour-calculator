import "server-only";

import { addDays, parseClock } from "@/lib/clock";
import type { Query, Source } from "@/lib/query";
import { getSessionCache, setSessionCache } from "@/lib/session-cache";
import type { ApiDay } from "@/lib/sky";

const ASTRONOMY = "https://api.ipgeolocation.io/v3/astronomy";
const TIME_SERIES = "https://api.ipgeolocation.io/v3/astronomy/timeSeries";
const TIMEZONE = "https://api.ipgeolocation.io/v3/timezone";
const TIMEOUT_MS = 10000;
/** Sun times for a place and date never change, so they can be kept a while. */
const RANGE_TTL_MS = 6 * 60 * 60 * 1000;

/** Shown when the visitor's own location can't be worked out (on localhost, say). */
export const FALLBACK_PLACE = "New York, NY";

export type Place = {
  name: string;
  /** Region and country, for telling two Springfields apart. */
  detail: string;
  latitude: number;
  longitude: number;
  /** Where the place came from, which says how exact it is. */
  basis: "search" | "coordinates" | "ip" | "fallback";
};

export type Now = {
  /** The place's local date and time, right now. */
  date: string;
  minutes: number;
  sunAltitude: number | null;
  sunAzimuth: number | null;
  moonIllumination: number | null;
};

export type Loaded =
  | {
      ok: true;
      place: Place;
      now: Now;
      /** The selected date. */
      date: string;
      /** First fetched day: the day before the selected one. */
      firstDate: string;
      days: ApiDay[];
      timezone: { name: string; abbreviation: string } | null;
      notes: string[];
    }
  | { ok: false; title: string; message: string };

export async function load(query: Query, visitorIp: string | null): Promise<Loaded> {
  const apiKey = process.env.IPGEOLOCATION_API_KEY;

  if (!apiKey) {
    return { ok: false, title: "No API key", message: "Set IPGEOLOCATION_API_KEY in your .env file to look up sun times." };
  }

  const notes: string[] = [];
  let source: Source | { kind: "ip"; ip: string } = query.source;

  if (source.kind === "visitor") {
    if (visitorIp) {
      source = { kind: "ip", ip: visitorIp };
    } else {
      source = { kind: "place", text: FALLBACK_PLACE };
      notes.push(`Your location couldn't be worked out from this connection, so this shows ${FALLBACK_PLACE}. Search for your own city above.`);
    }
  }

  let first = await fetchToday(apiKey, source);

  // A visitor address with no location (reserved, or simply unknown): fall back.
  if (!first.ok && source.kind === "ip" && [400, 404, 423].includes(first.status)) {
    source = { kind: "place", text: FALLBACK_PLACE };
    notes.push(`Your location couldn't be worked out from this connection, so this shows ${FALLBACK_PLACE}. Search for your own city above.`);
    first = await fetchToday(apiKey, source);
  }

  if (!first.ok) {
    return { ok: false, ...first.problem };
  }

  const { place, now } = first;
  const date = query.date ?? now.date;
  const firstDate = addDays(date, -1);
  const lastDate = addDays(date, query.days);

  const [range, timezone] = await Promise.all([
    fetchRange(apiKey, place, firstDate, lastDate),
    fetchTimezone(apiKey, place),
  ]);

  if (!range) {
    return {
      ok: false,
      title: "Sun times unavailable",
      message: "ipgeolocation.io didn't send the sun times for these dates. Try again in a moment.",
    };
  }

  return {
    ok: true,
    place: { ...place, basis: source.kind === "ip" ? "ip" : query.source.kind === "visitor" ? "fallback" : place.basis },
    now,
    date,
    firstDate,
    days: range,
    timezone,
    notes,
  };
}

type TodayResult =
  | { ok: true; place: Place; now: Now }
  | { ok: false; status: number; problem: { title: string; message: string } };

async function fetchToday(apiKey: string, source: Source | { kind: "ip"; ip: string }): Promise<TodayResult> {
  const params = new URLSearchParams({ apiKey });

  if (source.kind === "place") {
    params.set("location", source.text);
  } else if (source.kind === "coords") {
    params.set("lat", String(source.lat));
    params.set("long", String(source.lon));
  } else if (source.kind === "ip") {
    params.set("ip", source.ip);
  }

  try {
    const response = await fetch(`${ASTRONOMY}?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return { ok: false, status: response.status, problem: await problemFor(response, source) };
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const location = asObject(payload.location);
    const astronomy = asObject(payload.astronomy);
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);
    const date = text(astronomy?.date);
    const minutes = parseClock(astronomy?.current_time);

    if (!location || !astronomy || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !date || minutes === null) {
      return { ok: false, status: 502, problem: unreadable() };
    }

    const name = text(location.city) || text(location.locality) || text(location.state_prov) || text(location.country_name);
    const detail = [text(location.state_prov), text(location.country_name)].filter((part) => part && part !== name).join(", ");

    return {
      ok: true,
      place: {
        name: name || formatCoordinates(latitude, longitude),
        detail,
        latitude,
        longitude,
        basis: source.kind === "coords" ? "coordinates" : "search",
      },
      now: {
        date,
        minutes,
        sunAltitude: finite(astronomy.sun_altitude),
        sunAzimuth: finite(astronomy.sun_azimuth),
        moonIllumination: finite(Number(astronomy.moon_illumination_percentage)),
      },
    };
  } catch {
    return {
      ok: false,
      status: 0,
      problem: { title: "No answer", message: "ipgeolocation.io could not be reached in time. Try again in a moment." },
    };
  }
}

async function problemFor(response: Response, source: Source | { kind: "ip"; ip: string }) {
  if (response.status === 404 && source.kind === "place") {
    return {
      title: "Place not found",
      message: `No place called “${source.text}” turned up. Try a city name, a city and country (Paris, France), or coordinates (48.85, 2.35).`,
    };
  }

  if (response.status === 401 || response.status === 403) {
    return { title: "API key refused", message: "ipgeolocation.io refused the API key. Check IPGEOLOCATION_API_KEY in your .env file." };
  }

  if (response.status === 429) {
    return { title: "Too many requests", message: "The API's request limit was reached. Try again in a minute." };
  }

  let detail = "";

  try {
    const body = (await response.json()) as { message?: unknown };
    detail = typeof body.message === "string" ? ` It said: ${body.message}` : "";
  } catch {
    detail = "";
  }

  return { title: "Lookup failed", message: `The sun-times lookup failed with status ${response.status}.${detail}` };
}

async function fetchRange(apiKey: string, place: Place, start: string, end: string): Promise<ApiDay[] | null> {
  const key = `range:${place.latitude},${place.longitude},${start},${end}`;
  const cached = getSessionCache<ApiDay[]>(key);

  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    apiKey,
    lat: String(place.latitude),
    long: String(place.longitude),
    dateStart: start,
    dateEnd: end,
  });

  try {
    const response = await fetch(`${TIME_SERIES}?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { astronomy?: unknown };

    if (!Array.isArray(payload.astronomy) || payload.astronomy.length === 0) {
      return null;
    }

    const days = payload.astronomy as ApiDay[];

    // The model indexes days by position, so they must be the requested, consecutive dates.
    if (days[0]?.date !== start || days[days.length - 1]?.date !== end) {
      return null;
    }

    setSessionCache(key, days, RANGE_TTL_MS);

    return days;
  } catch {
    return null;
  }
}

async function fetchTimezone(apiKey: string, place: Place): Promise<{ name: string; abbreviation: string } | null> {
  const key = `tz:${place.latitude},${place.longitude}`;
  const cached = getSessionCache<{ name: string; abbreviation: string }>(key);

  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({ apiKey, lat: String(place.latitude), long: String(place.longitude) });

  try {
    const response = await fetch(`${TIMEZONE}?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const zone = asObject(((await response.json()) as Record<string, unknown>).time_zone);
    const name = text(zone?.name);

    if (!name) {
      return null;
    }

    const value = { name, abbreviation: text(zone?.current_tz_abbreviation) };
    setSessionCache(key, value, RANGE_TTL_MS);

    return value;
  } catch {
    return null;
  }
}

export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}° ${latitude < 0 ? "S" : "N"}`;
  const lon = `${Math.abs(longitude).toFixed(2)}° ${longitude < 0 ? "W" : "E"}`;

  return `${lat}, ${lon}`;
}

function unreadable() {
  return { title: "Unexpected answer", message: "ipgeolocation.io sent back something this tool could not read." };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** The visitor's own address, from the proxy headers the host sets. */
export function visitorIp(headerStore: Headers): string | null {
  for (const name of ["cf-connecting-ip", "x-real-ip", "x-vercel-forwarded-for", "x-forwarded-for"]) {
    const ip = headerStore
      .get(name)
      ?.split(",")
      .map((item) => item.trim().replace(/^\[|\]$/g, ""))
      .find((item) => /^[0-9a-f:.]+$/i.test(item) && !isPrivate(item));

    if (ip) {
      return ip;
    }
  }

  return null;
}

/** Loopback and private ranges. Anything else is passed on; the API answers 423 for the rest. */
function isPrivate(ip: string): boolean {
  if (ip.includes(":")) {
    return /^(::1?$|f[cd]|fe[89ab])/i.test(ip);
  }

  const [a, b] = ip.split(".").map(Number);

  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
}
