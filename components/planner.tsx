import { addDays, formatClock, formatDayLength, formatDuration, formatShortDate, isWeekend, MINUTES_PER_DAY, parseClock, type ClockStyle } from "@/lib/clock";
import { compactSpan, placeWindows, sunsetNote, type Placed } from "@/lib/plan";
import { pageHref, type Query } from "@/lib/query";
import { HORIZON, type Sky, type Window } from "@/lib/sky";

import { MoonGlyph, moonName } from "@/components/moon-glyph";

/** One row per day from the selected date on: an almanac to plan shoots with. */
export function Planner({
  sky,
  golden,
  firstDate,
  fromIndex,
  count,
  todayIndex,
  clock,
  query,
}: {
  sky: Sky;
  golden: Window[];
  firstDate: string;
  fromIndex: number;
  count: number;
  todayIndex: number | null;
  clock: ClockStyle;
  query: Query;
}) {
  const indexes = Array.from({ length: count }, (_, offset) => fromIndex + offset);

  return (
    <section aria-labelledby="planner-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="planner-heading" className="text-xl font-semibold tracking-tight">
            Plan ahead: the next {count} days
          </h2>
          <p className="mt-1 text-sm text-ink/65">Pick a date to see its full day above.</p>
        </div>
        <nav aria-label="How many days to plan" className="flex gap-1 rounded-full bg-white/70 p-1 text-sm ring-1 ring-ink/10">
          {[7, 14, 30].map((days) => (
            <a
              key={days}
              href={pageHref(query, { days: String(days) })}
              aria-current={query.days === days ? "page" : undefined}
              className={`rounded-full px-3 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-soft ${
                query.days === days ? "bg-ink text-paper" : "text-ink/70 hover:bg-gold-soft/60"
              }`}
            >
              {days} days
            </a>
          ))}
        </nav>
      </div>

      <div className="overflow-x-auto rounded-[28px] bg-white/80 shadow-glow ring-1 ring-ink/5">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.12em] text-ink/55">
              <th scope="col" className="px-5 pb-3 pt-5 font-semibold">Date</th>
              <th scope="col" className="px-3 pb-3 pt-5 font-semibold">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
                Morning golden hour
              </th>
              <th scope="col" className="px-3 pb-3 pt-5 font-semibold">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
                Evening golden hour
              </th>
              <th scope="col" className="px-3 pb-3 pt-5 font-semibold">Sunrise</th>
              <th scope="col" className="px-3 pb-3 pt-5 font-semibold">Sunset</th>
              <th scope="col" className="px-3 pb-3 pt-5 font-semibold">Daylight</th>
              <th scope="col" className="px-5 pb-3 pt-5 font-semibold">Moon</th>
            </tr>
          </thead>
          <tbody>
            {indexes.map((index) => {
              const date = addDays(firstDate, index);
              const day = sky.days[index];
              const placed = placeWindows(sky, golden, index);
              const allday = placed.find((entry) => entry.slot === "allday");
              const selected = index === fromIndex;
              const noon = index * MINUTES_PER_DAY + (parseClock(day?.solar_noon) ?? 720);

              return (
                <tr
                  key={date}
                  className={`border-t border-ink/8 align-top ${selected ? "bg-gold-soft/45" : "hover:bg-paper"}`}
                  aria-current={selected ? "date" : undefined}
                >
                  <th scope="row" className="px-5 py-3 font-medium">
                    <a
                      href={pageHref(query, { date })}
                      className={`underline decoration-ink/20 decoration-2 underline-offset-4 hover:decoration-gold-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-soft ${isWeekend(date) ? "text-gold-deep" : ""}`}
                    >
                      {formatShortDate(date)}
                    </a>
                    {index === todayIndex ? (
                      <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-paper">
                        Today
                      </span>
                    ) : null}
                  </th>
                  {allday ? (
                    <td colSpan={2} className="px-3 py-3">
                      <SpanCell entry={allday} index={index} clock={clock} />
                      <span className="block text-xs text-ink/55">The sun stays low around midday</span>
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-3">
                        <SlotCell placed={placed} slot="morning" index={index} clock={clock} />
                      </td>
                      <td className="px-3 py-3">
                        <SlotCell placed={placed} slot="evening" index={index} clock={clock} />
                      </td>
                    </>
                  )}
                  <td className="px-3 py-3 tabular-nums">{clockOr(day?.sunrise, clock)}</td>
                  <td className="px-3 py-3 tabular-nums">
                    {clockOr(day?.sunset, clock)}
                    {sunsetNote(parseClock(day?.sunset), parseClock(day?.solar_noon)) ? (
                      <span className="block text-xs text-ink/55">after midnight</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {formatDayLength(day?.day_length ?? "") ?? (sky.above(HORIZON, noon) ? "24 h" : "None")}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-ink/75">
                      <MoonGlyph phase={day?.moon_phase} />
                      {moonName(day?.moon_phase) ?? ""}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SlotCell({
  placed,
  slot,
  index,
  clock,
}: {
  placed: Placed[];
  slot: "morning" | "evening";
  index: number;
  clock: ClockStyle;
}) {
  const entry = placed.find((item) => item.slot === slot);

  return entry ? <SpanCell entry={entry} index={index} clock={clock} /> : <span className="text-ink/40">None</span>;
}

function SpanCell({ entry, index, clock }: { entry: Placed; index: number; clock: ClockStyle }) {
  const { window } = entry;
  const closed = !window.startOpen && !window.endOpen;

  return (
    <>
      <span className="block font-semibold tabular-nums">{compactSpan(window, index, clock)}</span>
      {closed ? <span className="block text-xs text-ink/55">{formatDuration(window.end - window.start)}</span> : null}
    </>
  );
}

function clockOr(value: string | undefined, clock: ClockStyle) {
  const minutes = parseClock(value);

  return minutes === null ? <span className="text-ink/40">None</span> : formatClock(minutes, clock);
}
