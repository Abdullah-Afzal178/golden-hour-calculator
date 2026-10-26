import { Clock3, Sunrise, Sunset } from "lucide-react";

import { addDays, formatClock, formatDuration, formatLongDate, formatShortDate, MINUTES_PER_DAY, type ClockStyle } from "@/lib/clock";
import { compactSpan, placeWindows, statusAt, type Placed } from "@/lib/plan";
import type { Sky, Window } from "@/lib/sky";

/** Why a day has no golden hour at all. */
export function noGoldenReason(sky: Sky, dayIndex: number): string {
  return sky.phaseAt(dayIndex * MINUTES_PER_DAY + 720) === "day"
    ? "The sun stays more than 6° above the horizon all day, so the light never turns golden."
    : "The sun stays more than 4° below the horizon all day, so there is no golden light.";
}

export function AnswerHero({
  sky,
  golden,
  firstDate,
  dayIndex,
  todayIndex,
  todayDate,
  nowMinutes,
  placeName,
  clock,
  days,
}: {
  sky: Sky;
  golden: Window[];
  firstDate: string;
  dayIndex: number;
  /** The place's today, as a day index, when it is inside the fetched days. */
  todayIndex: number | null;
  /** The place's local date today, wherever the selected date is. */
  todayDate: string;
  nowMinutes: number;
  placeName: string;
  clock: ClockStyle;
  days: number;
}) {
  const date = addDays(firstDate, dayIndex);
  const isToday = todayIndex === dayIndex;
  const placed = placeWindows(sky, golden, dayIndex);
  let heading: string;
  let detail: string | null = null;
  let chip: string | null = null;

  if (isToday) {
    const nowT = dayIndex * MINUTES_PER_DAY + nowMinutes;
    const status = statusAt(golden, nowT);

    if (status.kind === "now") {
      heading = `Golden hour is on now in ${placeName}`;
      detail = status.window.endOpen
        ? "It lasts beyond the dates shown here."
        : `It ends at ${when(status.window.end, dayIndex, firstDate, clock)}.`;
      chip = status.window.endOpen ? "On now" : `${formatDuration(status.left)} left`;
    } else if (status.kind === "next") {
      const startDay = Math.floor(status.window.start / MINUTES_PER_DAY);
      const time = formatClock(status.window.start - startDay * MINUTES_PER_DAY, clock);
      const length = status.window.endOpen ? null : formatDuration(status.window.end - status.window.start);

      heading =
        startDay === dayIndex
          ? `Golden hour in ${placeName} starts at ${time}`
          : startDay === dayIndex + 1
            ? `Next golden hour in ${placeName}: tomorrow at ${time}`
            : `Next golden hour in ${placeName}: ${formatShortDate(addDays(firstDate, startDay))} at ${time}`;
      detail = length ? `It lasts ${length}.` : null;
      chip = `In ${formatDuration(status.until)}`;
    } else {
      heading = `No golden hour in ${placeName} for the next ${days} days`;
      detail = noGoldenReason(sky, dayIndex);
    }
  } else {
    heading = `Golden hour in ${placeName} on ${formatLongDate(date, todayDate)}`;
    detail = placed.length === 0 ? noGoldenReason(sky, dayIndex) : null;
  }

  return (
    <section
      aria-labelledby="answer-heading"
      className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#ffd88a] via-[#f7a65a] to-[#e9837f] p-6 text-ink shadow-glow sm:p-8"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#fff3c4] opacity-70 blur-2xl" aria-hidden="true" />
      <div className="relative">
        {chip ? (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-paper">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {chip}
          </p>
        ) : null}
        <h2 id="answer-heading" className="mt-4 max-w-2xl text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.6rem]">
          {heading}
        </h2>
        {detail ? <p className="mt-3 max-w-xl text-lg text-ink/80">{detail}</p> : null}

        {placed.length > 0 ? (
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {placed.map((entry) => (
              <WindowTile key={entry.window.start} entry={entry} dayIndex={dayIndex} clock={clock} isToday={isToday} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function WindowTile({
  entry,
  dayIndex,
  clock,
  isToday,
}: {
  entry: Placed;
  dayIndex: number;
  clock: ClockStyle;
  isToday: boolean;
}) {
  const { window, slot } = entry;
  const Icon = slot === "evening" ? Sunset : Sunrise;
  const label =
    slot === "allday"
      ? "Around midday"
      : window.shape === "dip"
        ? slot === "morning"
          ? "Through last night"
          : "Through the night"
        : slot === "morning"
          ? isToday
            ? "This morning"
            : "Morning"
          : isToday
            ? "This evening"
            : "Evening";
  const closed = !window.startOpen && !window.endOpen;

  return (
    <div className={`rounded-3xl bg-white/45 p-4 ring-1 ring-white/60 backdrop-blur-sm ${slot === "allday" ? "sm:col-span-2" : ""}`}>
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{compactSpan(window, dayIndex, clock)}</p>
      {closed ? <p className="mt-1 text-sm text-ink/70">{formatDuration(window.end - window.start)} of golden light</p> : null}
      {slot === "allday" ? (
        <p className="mt-1 text-sm text-ink/70">
          The sun never climbs more than 6° above the horizon, so golden light runs right through the middle of the day.
        </p>
      ) : null}
    </div>
  );
}

function when(t: number, dayIndex: number, firstDate: string, clock: ClockStyle): string {
  const day = Math.floor(t / MINUTES_PER_DAY);
  const time = formatClock(t - day * MINUTES_PER_DAY, clock);

  if (day === dayIndex) {
    return time;
  }

  return day === dayIndex + 1 ? `${time} tomorrow` : `${time} on ${formatShortDate(addDays(firstDate, day))}`;
}
