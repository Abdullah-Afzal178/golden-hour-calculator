import assert from "node:assert/strict";

import { MINUTES_PER_DAY, parseClock } from "@/lib/clock";
import { compactSpan, dayMarkers, placeWindows, spreadLabels, statusAt, sunsetNote } from "@/lib/plan";
import { Sky } from "@/lib/sky";
import { LATITUDE, longyearbyenJune, newYork, reykjavikJune, tromsoDecember } from "@/lib/test-fixtures";

let checks = 0;
function check(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}

const t = (day: number, clock: string) => day * MINUTES_PER_DAY + (parseClock(clock) ?? 0);

// --- status relative to now -------------------------------------------------------
const ny = new Sky(newYork, LATITUDE.newYork);
const nyGolden = ny.windows("golden");

const morningNow = statusAt(nyGolden, t(1, "07:00"));
check(morningNow.kind, "now", "07:00 on Oct 13 is inside the morning golden hour");
check(morningNow.kind === "now" ? morningNow.left : null, 42, "with 42 minutes left");

const afternoon = statusAt(nyGolden, t(1, "15:00"));
check(afternoon.kind, "next", "mid-afternoon waits for the evening");
check(afternoon.kind === "next" ? afternoon.until : null, 161, "2 h 41 min to go");

const lateNight = statusAt(nyGolden, t(1, "21:00"));
check(lateNight.kind === "next" ? lateNight.window.start : null, t(2, "06:49"), "after dark, the next one is tomorrow morning");
check(statusAt(nyGolden, t(3, "20:00")).kind, "none", "nothing left in the fetched days");
check(statusAt(nyGolden, t(1, "07:42")).kind, "next", "the end minute itself is outside the window");

// --- placing windows in a day ------------------------------------------------------
check(
  placeWindows(ny, nyGolden, 1).map((placed) => placed.slot),
  ["morning", "evening"],
  "an ordinary day has a morning and an evening window",
);

const rey = new Sky(reykjavikJune, LATITUDE.reykjavikJune);
const reyPlaced = placeWindows(rey, rey.windows("golden"), 1);
check(reyPlaced.map((placed) => placed.slot), ["morning", "evening"], "Reykjavik: last night's window, then tonight's");
check(compactSpan(reyPlaced[1].window, 1, "24"), "22:06 to 04:52 next day", "24-hour clock, past midnight");

const tromso = new Sky(tromsoDecember, LATITUDE.tromsoDecember);
const tromsoPlaced = placeWindows(tromso, tromso.windows("golden"), 1);
check(tromsoPlaced.map((placed) => placed.slot), ["allday"], "Tromsø in December: one window that spans noon");
check(compactSpan(tromsoPlaced[0].window, 1, "12"), "10:29 AM to 12:55 PM", "and it reads as one span");

const svalbard = new Sky(longyearbyenJune, LATITUDE.longyearbyenJune);
check(placeWindows(svalbard, svalbard.windows("golden"), 1), [], "Svalbard in June: nothing to place");

const openStart = rey.windows("golden")[0];
const openEnd = rey.windows("golden").at(-1)!;

// --- compact spans for the planner ---------------------------------------------------
check(compactSpan(nyGolden[2], 1, "12"), "6:48 to 7:42 AM", "same half of the day");
check(compactSpan(nyGolden[3], 1, "24"), "17:41 to 18:35", "24-hour clock");
check(compactSpan({ ...nyGolden[3], start: t(1, "11:30") }, 1, "12"), "11:30 AM to 6:35 PM", "across noon keeps both suffixes");
check(compactSpan(reyPlaced[1].window, 1, "12"), "10:06 PM to 4:52 AM next day", "overnight");
check(compactSpan(reyPlaced[0].window, 1, "12"), "Until 4:52 AM", "carried over from the night before");
check(compactSpan(openStart, 0, "12"), "Until 4:52 AM", "started before the fetched days");
check(compactSpan(openEnd, 2, "12"), "From 10:07 PM", "ends after them");
check(
  compactSpan({ ...nyGolden[2], end: nyGolden[2].end + 2 * MINUTES_PER_DAY }, 1, "12"),
  "6:48 AM to 7:42 AM (+2 days)",
  "further than a day away, the offset is spelled out",
);

// --- markers for the sky column ----------------------------------------------------
check(
  dayMarkers(ny, 1).map((marker) => `${marker.t} ${marker.label}`),
  [
    `${parseClock("06:27")} Blue hour begins`,
    `${parseClock("06:48")} Golden hour begins`,
    `${parseClock("07:04")} Sunrise`,
    `${parseClock("07:42")} Golden hour ends`,
    `${parseClock("12:42")} Solar noon`,
    `${parseClock("17:41")} Golden hour begins`,
    `${parseClock("18:19")} Sunset`,
    `${parseClock("18:35")} Golden hour ends`,
    `${parseClock("18:56")} Blue hour ends`,
  ],
  "New York: nine markers in time order",
);
check(
  dayMarkers(tromso, 1).map((marker) => marker.label),
  ["Blue hour begins", "Golden hour begins", "Golden hour ends", "Blue hour ends"],
  "Tromsø in December: no sunrise, sunset or noon marker",
);
check(dayMarkers(svalbard, 1).map((marker) => marker.label), ["Solar noon"], "Svalbard in June: only noon");

// --- a sunset just after midnight ----------------------------------------------------
check(sunsetNote(parseClock("00:03"), parseClock("13:29")), ", after midnight", "Reykjavik in June");
check(sunsetNote(parseClock("18:19"), parseClock("12:42")), "", "an ordinary evening");
check(sunsetNote(null, parseClock("12:00")), "", "no sunset at all");

// --- label spreading -------------------------------------------------------------------
check(spreadLabels([10, 50, 90], 20, 0, 200), [10, 50, 90], "labels far apart stay put");
check(spreadLabels([10, 15, 18], 20, 0, 200), [10, 30, 50], "crowded labels are pushed down");
check(spreadLabels([180, 190, 195], 20, 0, 200), [160, 180, 200], "and pulled back up at the bottom edge");
check(spreadLabels([], 20, 0, 200), [], "no labels");

console.log(`plan: ${checks} assertions passed`);
