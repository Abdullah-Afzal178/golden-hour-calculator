import assert from "node:assert/strict";

import {
  addDays,
  dayOfYear,
  daysBetween,
  formatClock,
  formatDayLength,
  formatDuration,
  formatLongDate,
  formatShortDate,
  isIsoDate,
  isWeekend,
  parseClock,
} from "@/lib/clock";

let checks = 0;
function check(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}

check(parseClock("06:48"), 408, "HH:MM");
check(parseClock("6:48"), 408, "a single-digit hour");
check(parseClock("06:29:01.020"), 389 + 1 / 60, "current_time with seconds");
check(parseClock("-:-"), null, "never happens");
check(parseClock("24:00"), null, "out of range");
check(parseClock(undefined), null, "missing");
check(parseClock("2026-06-21 00:03"), null, "a full timestamp is not a clock time");

check(formatClock(408, "12"), "6:48 AM", "morning, 12-hour");
check(formatClock(408, "24"), "06:48", "morning, 24-hour");
check(formatClock(0, "12"), "12:00 AM", "midnight");
check(formatClock(720, "12"), "12:00 PM", "noon");
check(formatClock(1110, "12"), "6:30 PM", "evening");
check(formatClock(1440 + 292, "12"), "4:52 AM", "wraps past midnight");
check(formatClock(-60, "24"), "23:00", "wraps before midnight");
check(formatClock(408.9, "24"), "06:48", "seconds are dropped, not rounded up");

check(formatDuration(54), "54 min", "minutes");
check(formatDuration(60), "1 h", "an hour");
check(formatDuration(163), "2 h 43 min", "hours and minutes");
check(formatDuration(-5), "0 min", "never negative");
check(formatDayLength("11:14"), "11 h 14 min", "day length");
check(formatDayLength("-:-"), null, "no day length in polar night or day");

check(isIsoDate("2026-10-13"), true, "a date");
check(isIsoDate("2024-02-29"), true, "a leap day");
check(isIsoDate("2026-02-29"), false, "not a leap year");
check(isIsoDate("2026-13-01"), false, "month 13");
check(isIsoDate("1899-12-31"), false, "before the supported range");
check(isIsoDate("2101-01-01"), false, "after it");
check(isIsoDate("2026-1-1"), false, "unpadded");

check(addDays("2026-12-31", 1), "2027-01-01", "across a year");
check(addDays("2026-03-01", -1), "2026-02-28", "back across February");
check(daysBetween("2026-10-12", "2026-10-15"), 3, "days between");
check(daysBetween("2026-03-07", "2026-03-09"), 2, "a DST weekend is still two days");
check(dayOfYear("2026-01-01"), 1, "January 1st");
check(dayOfYear("2026-12-31"), 365, "December 31st");
check(formatLongDate("2026-10-13"), "Tuesday, October 13", "long date");
check(formatLongDate("2027-01-02", "2026-12-30"), "Saturday, January 2, 2027", "the year appears when it differs");
check(formatShortDate("2026-10-13"), "Tue, Oct 13", "short date");
check(isWeekend("2026-10-17"), true, "Saturday");
check(isWeekend("2026-10-13"), false, "Tuesday");

console.log(`clock: ${checks} assertions passed`);
