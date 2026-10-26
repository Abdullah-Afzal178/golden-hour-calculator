import assert from "node:assert/strict";

import { formatClock, MINUTES_PER_DAY, parseClock } from "@/lib/clock";
import { noonElevation, Sky, type Window } from "@/lib/sky";
import {
  LATITUDE,
  longyearbyenDecember,
  longyearbyenJune,
  newYork,
  newYorkDstEnd,
  reykjavikJune,
  tromsoDecember,
  tromsoJune,
} from "@/lib/test-fixtures";

let checks = 0;
function check(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}

/** "d1 06:48" for a timeline moment, so expectations read like the API. */
function at(t: number): string {
  const day = Math.floor(t / MINUTES_PER_DAY);

  return `d${day} ${formatClock(t - day * MINUTES_PER_DAY, "24")}`;
}

function describe(windows: Window[]): string[] {
  return windows.map(
    (window) =>
      `${window.startOpen ? "…" : at(window.start)} to ${window.endOpen ? "…" : at(window.end)} ${window.shape}`,
  );
}

const t = (day: number, clock: string) => day * MINUTES_PER_DAY + (parseClock(clock) ?? 0);

// --- New York, an ordinary mid-latitude day ---------------------------------
const ny = new Sky(newYork, LATITUDE.newYork);
check(
  describe(ny.windows("golden")).slice(2, 4),
  ["d1 06:48 to d1 07:42 rising", "d1 17:41 to d1 18:35 setting"],
  "Oct 13: a morning and an evening golden hour, exactly as the API reports them",
);
check(
  describe(ny.windows("blue")).slice(2, 4),
  ["d1 06:27 to d1 06:48 rising", "d1 18:35 to d1 18:56 setting"],
  "Oct 13: blue hour sits on the dark side of each golden hour",
);
check(ny.windows("golden").length, 8, "two golden hours a day for four days");
check(
  ny.runs(t(1, "00:00"), t(2, "00:00")).map((run) => run.phase),
  ["night", "astronomical", "nautical", "blue", "golden", "day", "golden", "blue", "nautical", "astronomical", "night"],
  "a full day climbs through every phase and back",
);
check(
  ny.runs(t(1, "00:00"), t(2, "00:00")).map((run) => at(run.start)),
  ["d1 00:00", "d1 05:34", "d1 06:05", "d1 06:27", "d1 06:48", "d1 07:42", "d1 17:41", "d1 18:35", "d1 18:56", "d1 19:17", "d1 19:49"],
  "and each phase starts at the API's crossing time",
);
check(ny.phaseAt(t(1, "12:00")), "day", "noon is daylight");
check(ny.phaseAt(t(1, "07:00")), "golden", "just before sunrise is already golden");
check(ny.phaseAt(t(1, "18:30")), "golden", "just after sunset is still golden");
check(ny.phaseAt(t(1, "18:40")), "blue", "then blue");
check(ny.phaseAt(t(1, "02:00")), "night", "night");
check(ny.above(-0.833, t(1, "07:03")), false, "before sunrise the sun is below the horizon");
check(ny.above(-0.833, t(1, "07:05")), true, "after sunrise it is above");
check(ny.windows("golden")[0].startOpen, false, "the first window starts inside the fetched days");

// The day the clocks go back is still read in wall-clock time.
const dst = new Sky(newYorkDstEnd, LATITUDE.newYorkDstEnd);
check(
  describe(dst.windows("golden")).slice(2, 4),
  ["d1 06:09 to d1 07:05 rising", "d1 16:13 to d1 17:09 setting"],
  "Nov 1, when DST ends",
);

// --- Reykjavik in June: the sun never drops 4° below the horizon -----------
const rey = new Sky(reykjavikJune, LATITUDE.reykjavikJune);
check(
  describe(rey.windows("golden")),
  ["… to d0 04:52 open", "d0 22:06 to d1 04:52 dip", "d1 22:06 to d2 04:52 dip", "d2 22:07 to … open"],
  "one golden hour a night, from 22:06 to 04:52, straight through midnight",
);
check(rey.windows("blue"), [], "and no blue hour at all");
check(rey.phaseAt(t(1, "01:30")), "golden", "the middle of the night is golden");
check(rey.above(-0.833, t(1, "00:30")), false, "the sun is just below the horizon after its 00:03 sunset");
check(rey.above(-0.833, t(1, "03:00")), true, "and back up after 02:55");

// --- Tromsø in December: the sun never rises, but nearly does ---------------
const tromsoWinter = new Sky(tromsoDecember, LATITUDE.tromsoDecember);
check(
  describe(tromsoWinter.windows("golden")),
  ["d0 10:28 to d0 12:54 peak", "d1 10:29 to d1 12:55 peak", "d2 10:30 to d2 12:55 peak"],
  "one midday golden hour, with no sunrise at all",
);
check(
  describe(tromsoWinter.windows("blue")).slice(2, 4),
  ["d1 08:50 to d1 10:29 rising", "d1 12:55 to d1 14:34 setting"],
  "blue hour either side of it",
);
check(tromsoWinter.above(-0.833, t(1, "11:42")), false, "even at noon the sun is below the horizon");

// --- Tromsø in June: midnight sun, golden hour at midnight ------------------
const tromsoSummer = new Sky(tromsoJune, LATITUDE.tromsoJune);
check(
  describe(tromsoSummer.windows("golden")).slice(1, 3),
  ["d0 22:35 to d1 02:56 dip", "d1 22:35 to d2 02:57 dip"],
  "the sun dips into golden light overnight without setting",
);
check(tromsoSummer.above(-0.833, t(1, "00:45")), true, "the sun is up at midnight");

// --- Longyearbyen: no golden hour in midwinter or midsummer -----------------
const svalbardWinter = new Sky(longyearbyenDecember, LATITUDE.longyearbyenDecember);
check(svalbardWinter.windows("golden"), [], "December: the sun never gets within 4° of the horizon");
check(svalbardWinter.windows("blue"), [], "or within 8°");
check(
  svalbardWinter.runs(t(1, "00:00"), t(2, "00:00")).map((run) => `${run.phase} ${at(run.start)}`),
  ["night d1 00:00", "astronomical d1 07:37", "nautical d1 10:58", "astronomical d1 12:52", "night d1 16:14"],
  "only a glimmer of nautical twilight around noon",
);

const svalbardSummer = new Sky(longyearbyenJune, LATITUDE.longyearbyenJune);
check(svalbardSummer.windows("golden"), [], "June: the sun never gets low enough");
check(
  svalbardSummer.runs(0, svalbardSummer.length).map((run) => run.phase),
  ["day"],
  "with no crossings at all, the noon elevation settles it: daylight around the clock",
);

// --- the noon-elevation fallback -------------------------------------------------
check(Math.abs(noonElevation(0, 80) - 90) < 1, true, "the equator at the March equinox");
check(Math.round(noonElevation(40.71, 172)), 73, "New York at the June solstice");
check(Math.round(noonElevation(78.22, 355)), -12, "Longyearbyen at the December solstice");

console.log(`sky: ${checks} assertions passed`);
