import assert from "node:assert/strict";

import { pageHref, parseCoordinates, parseQuery } from "@/lib/query";

let checks = 0;
function check(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}

// --- coordinates ----------------------------------------------------------------
check(parseCoordinates("48.8566, 2.3522"), { lat: 48.8566, lon: 2.3522 }, "comma separated");
check(parseCoordinates("48.8566 2.3522"), { lat: 48.8566, lon: 2.3522 }, "space separated");
check(parseCoordinates("-33.87,151.21"), { lat: -33.87, lon: 151.21 }, "negative latitude, no space");
check(parseCoordinates("40.7128° N, 74.0060° W"), { lat: 40.7128, lon: -74.006 }, "degrees and hemispheres");
check(parseCoordinates("33.87S 151.21E"), { lat: -33.87, lon: 151.21 }, "compact hemispheres");
check(parseCoordinates("91, 0"), null, "latitude out of range");
check(parseCoordinates("0, 181"), null, "longitude out of range");
check(parseCoordinates("-40 N, 74 W"), null, "a minus sign and a hemisphere together are ambiguous");
check(parseCoordinates("Paris"), null, "a name is not coordinates");
check(parseCoordinates("10 Downing Street"), null, "nor is an address with a number in it");

// --- the whole query ---------------------------------------------------------------
check(parseQuery({}), { source: { kind: "visitor" }, date: null, days: 14, clock: "12", problems: [] }, "defaults");
check(parseQuery({ place: "  Paris,   France " }).source, { kind: "place", text: "Paris, France" }, "place text is tidied");
check(parseQuery({ place: "48.85, 2.35" }).source, { kind: "coords", lat: 48.85, lon: 2.35 }, "coordinates typed as a place");
check(parseQuery({ lat: "64.1", lon: "-21.9" }).source, { kind: "coords", lat: 64.1, lon: -21.9 }, "coordinates from the location button");
check(parseQuery({ lat: "64.1", lon: "-21.9", place: "Paris" }).source.kind, "coords", "coordinates win over a place");
const badCoords = parseQuery({ lat: "100", lon: "0" });
check(badCoords.source, { kind: "visitor" }, "bad coordinates fall back to the visitor");
check(badCoords.problems.length, 1, "and say so");
check(parseQuery({ place: "x".repeat(101) }).problems.length, 1, "an overlong place is refused");
check(parseQuery({ date: "2026-06-21" }).date, "2026-06-21", "a date");
check(parseQuery({ date: "2026-02-30" }).date, null, "an impossible date is ignored");
check(parseQuery({ date: "2026-02-30" }).problems.length, 1, "and explained");
check(parseQuery({ date: "1850-01-01" }).date, null, "a date outside the supported years is ignored");
check(parseQuery({ days: "30" }).days, 30, "30 days");
check(parseQuery({ days: "31" }).days, 14, "an unsupported span falls back to 14");
check(parseQuery({ clock: "24" }).clock, "24", "24-hour clock");
check(parseQuery({ clock: "13" }).clock, "12", "anything else is 12-hour");
check(parseQuery({ place: ["Oslo", "Paris"] }).source, { kind: "place", text: "Oslo" }, "a repeated parameter uses the first");

// --- links ---------------------------------------------------------------------------
const paris = parseQuery({ place: "Paris, France", date: "2026-06-21" });
check(pageHref(paris, { clock: "24" }), "/?place=Paris%2C+France&date=2026-06-21&clock=24", "toggle the clock");
check(pageHref(paris, { date: null }), "/?place=Paris%2C+France", "back to today");
check(pageHref(paris, { lat: "1", lon: "2" }), "/?date=2026-06-21&lat=1&lon=2", "coordinates replace the place");
const coords = parseQuery({ lat: "1", lon: "2", days: "30" });
check(pageHref(coords, { place: "Oslo" }), "/?days=30&place=Oslo", "a place replaces coordinates");
check(pageHref(coords, { days: "14" }), "/?lat=1&lon=2", "the default span is left out");
check(pageHref(parseQuery({}), {}), "/", "nothing to say");

console.log(`query: ${checks} assertions passed`);
