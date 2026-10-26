import type { ReactNode } from "react";

import { formatClock, formatDayLength, formatDuration, MINUTES_PER_DAY, parseClock, type ClockStyle } from "@/lib/clock";
import { compactSpan, placeWindows, sunsetNote, type Placed } from "@/lib/plan";
import { HORIZON, PHASE_ORDER, type Sky, type Window } from "@/lib/sky";

import { noGoldenReason } from "@/components/answer-hero";
import { MoonGlyph, moonName } from "@/components/moon-glyph";

/** Golden hour, blue hour, and the sun and moon facts for one day. */
export function DayCards({
  sky,
  golden,
  blue,
  dayIndex,
  clock,
  moonIllumination,
}: {
  sky: Sky;
  golden: Window[];
  blue: Window[];
  dayIndex: number;
  clock: ClockStyle;
  /** Only known for today. */
  moonIllumination: number | null;
}) {
  const day = sky.days[dayIndex];
  const goldenPlaced = placeWindows(sky, golden, dayIndex);
  const bluePlaced = placeWindows(sky, blue, dayIndex);
  const time = (value: string | undefined, none: string) => {
    const minutes = parseClock(value);

    return minutes === null ? <span className="text-ink/45">{none}</span> : formatClock(minutes, clock);
  };
  const moon = moonName(day?.moon_phase);
  const noon = dayIndex * MINUTES_PER_DAY + (parseClock(day?.solar_noon) ?? 720);
  // No crossing of 18° below: either it never gets fully dark, or never gets light.
  const noNight = sky.above(-18, noon) ? "No full night" : "Night all day";

  return (
    <section aria-labelledby="day-heading" className="space-y-4">
      <h2 id="day-heading" className="text-xl font-semibold tracking-tight">
        The day in detail
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Golden hour" accent="bg-gold" note="Sun between 4° below and 6° above the horizon.">
          <WindowList placed={goldenPlaced} dayIndex={dayIndex} clock={clock} empty={noGoldenReason(sky, dayIndex)} />
        </Card>

        <Card title="Blue hour" accent="bg-dusk" note="Sun between 8° and 4° below the horizon.">
          <WindowList placed={bluePlaced} dayIndex={dayIndex} clock={clock} empty={noBlueReason(sky, dayIndex)} />
        </Card>

        <Card title="Sun and moon" accent="bg-ink">
          <dl className="divide-y divide-ink/10 text-sm">
            <Row term="Sunrise">{time(day?.sunrise, "None")}</Row>
            <Row term="Solar noon">{time(day?.solar_noon, "None")}</Row>
            <Row term="Sunset">
              {time(day?.sunset, "None")}
              {sunsetNote(parseClock(day?.sunset), parseClock(day?.solar_noon))}
            </Row>
            <Row term="Daylight">
              {formatDayLength(day?.day_length ?? "") ??
                (sky.above(HORIZON, noon) ? "24 h" : "None")}
            </Row>
            <Row term="Night ends">{time(day?.night_end, noNight)}</Row>
            <Row term="Night begins">{time(day?.night_begin, noNight)}</Row>
            {moon ? (
              <Row term="Moon">
                <span className="inline-flex items-center gap-1.5">
                  <MoonGlyph phase={day?.moon_phase} />
                  {moon}
                  {moonIllumination !== null ? `, ${Math.round(moonIllumination)}% lit` : ""}
                </span>
              </Row>
            ) : null}
            <Row term="Moonrise">{time(day?.moonrise, "None")}</Row>
            <Row term="Moonset">{time(day?.moonset, "None")}</Row>
          </dl>
        </Card>
      </div>
    </section>
  );
}

function Card({
  title,
  accent,
  note,
  children,
}: {
  title: string;
  accent: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-[28px] bg-white/80 p-5 shadow-glow ring-1 ring-ink/5">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${accent}`} aria-hidden="true" />
        {title}
      </h3>
      <div className="mt-3 flex-1">{children}</div>
      {note ? <p className="mt-4 text-xs text-ink/55">{note}</p> : null}
    </article>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-ink/65">{term}</dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  );
}

const SLOT_LABEL = { morning: "Morning", evening: "Evening", allday: "Around midday" } as const;

function WindowList({
  placed,
  dayIndex,
  clock,
  empty,
}: {
  placed: Placed[];
  dayIndex: number;
  clock: ClockStyle;
  empty: string;
}) {
  if (placed.length === 0) {
    return <p className="text-sm leading-relaxed text-ink/70">{empty}</p>;
  }

  return (
    <ul className="space-y-3">
      {placed.map(({ window, slot }) => (
        <li key={window.start}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">
            {window.shape === "dip" ? "Overnight" : SLOT_LABEL[slot]}
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{compactSpan(window, dayIndex, clock)}</p>
          {!window.startOpen && !window.endOpen ? (
            <p className="text-sm text-ink/60">{formatDuration(window.end - window.start)}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Why a day has no blue hour: the sun stays too high, or too low. */
function noBlueReason(sky: Sky, dayIndex: number): string {
  const runs = sky.runs(dayIndex * MINUTES_PER_DAY, (dayIndex + 1) * MINUTES_PER_DAY);
  const lowest = Math.min(...runs.map((run) => PHASE_ORDER.indexOf(run.phase)));

  return lowest >= PHASE_ORDER.indexOf("golden")
    ? "The sun never sinks 4° below the horizon, so the sky never darkens to blue hour."
    : "The sun stays more than 8° below the horizon all day, so it never gets light enough for blue hour.";
}
