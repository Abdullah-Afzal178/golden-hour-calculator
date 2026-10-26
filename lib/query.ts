/**
 * Reads the page's URL parameters. Everything the page shows is driven by
 * the URL, so any view can be shared or bookmarked. Pure.
 */

import { isIsoDate, MAX_YEAR, MIN_YEAR, type ClockStyle } from "@/lib/clock";

export type Source =
  | { kind: "place"; text: string }
  | { kind: "coords"; lat: number; lon: number }
  | { kind: "visitor" };

export const DAY_OPTIONS = [7, 14, 30] as const;
export type DayCount = (typeof DAY_OPTIONS)[number];

export type Query = {
  source: Source;
  /** Null means today, wherever the place is. */
  date: string | null;
  days: DayCount;
  clock: ClockStyle;
  /** Parameters that were ignored, explained. */
  problems: string[];
};

export const MAX_PLACE = 100;

type Params = Record<string, string | string[] | undefined>;

function single(params: Params, key: string): string {
  const value = params[key];

  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseQuery(params: Params): Query {
  const problems: string[] = [];
  const place = single(params, "place").replace(/\s+/g, " ");
  const lat = single(params, "lat");
  const lon = single(params, "lon");
  let source: Source = { kind: "visitor" };

  if (lat !== "" || lon !== "") {
    const coords = parseCoordinates(`${lat}, ${lon}`);

    if (coords) {
      source = { kind: "coords", ...coords };
    } else {
      problems.push("Those coordinates are out of range, so this shows your approximate location instead.");
    }
  } else if (place !== "") {
    const coords = parseCoordinates(place);

    if (coords) {
      source = { kind: "coords", ...coords };
    } else if (place.length > MAX_PLACE) {
      problems.push("That place name is too long to look up.");
    } else {
      source = { kind: "place", text: place };
    }
  }

  const rawDate = single(params, "date");
  let date: string | null = null;

  if (rawDate !== "") {
    if (isIsoDate(rawDate)) {
      date = rawDate;
    } else {
      problems.push(`That date isn't one this calculator can use (it covers ${MIN_YEAR} to ${MAX_YEAR}), so this shows today.`);
    }
  }

  const rawDays = Number(single(params, "days"));
  const days = (DAY_OPTIONS as readonly number[]).includes(rawDays) ? (rawDays as DayCount) : 14;
  const clock: ClockStyle = single(params, "clock") === "24" ? "24" : "12";

  return { source, date, days, clock, problems };
}

const COORDINATES =
  /^\s*([+-]?\d{1,3}(?:\.\d+)?)\s*°?\s*([NS])?\s*(?:,\s*|\s+)([+-]?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?\s*$/i;

/** "48.8566, 2.3522", "48.8566 2.3522" or "40.7128° N, 74.0060° W". */
export function parseCoordinates(text: string): { lat: number; lon: number } | null {
  const match = COORDINATES.exec(text);

  if (!match) {
    return null;
  }

  let lat = Number(match[1]);
  let lon = Number(match[3]);
  const latHemisphere = match[2]?.toUpperCase();
  const lonHemisphere = match[4]?.toUpperCase();

  // A hemisphere letter and a minus sign together are ambiguous.
  if ((latHemisphere && match[1].startsWith("-")) || (lonHemisphere && match[3].startsWith("-"))) {
    return null;
  }

  if (latHemisphere === "S") {
    lat = -lat;
  }

  if (lonHemisphere === "W") {
    lon = -lon;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }

  return { lat, lon };
}

/** A link to this page with some parameters changed. Empty values are dropped. */
export function pageHref(query: Query, changes: Partial<Record<"place" | "lat" | "lon" | "date" | "days" | "clock", string | null>>): string {
  const params = new URLSearchParams();

  if (query.source.kind === "place") {
    params.set("place", query.source.text);
  } else if (query.source.kind === "coords") {
    params.set("lat", String(query.source.lat));
    params.set("lon", String(query.source.lon));
  }

  if (query.date) {
    params.set("date", query.date);
  }

  if (query.days !== 14) {
    params.set("days", String(query.days));
  }

  if (query.clock === "24") {
    params.set("clock", "24");
  }

  // A new place replaces coordinates, and the other way round.
  if ("place" in changes) {
    params.delete("lat");
    params.delete("lon");
  }

  if ("lat" in changes || "lon" in changes) {
    params.delete("place");
  }

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "" || value === undefined) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  // The defaults never need to be spelled out.
  if (params.get("days") === "14") {
    params.delete("days");
  }

  if (params.get("clock") === "12") {
    params.delete("clock");
  }

  const text = params.toString();

  return text ? `/?${text}` : "/";
}
