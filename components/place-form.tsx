import { Search } from "lucide-react";

import { MAX_YEAR, MIN_YEAR } from "@/lib/clock";
import { DAY_OPTIONS, MAX_PLACE, type Query } from "@/lib/query";

import { LocateButton } from "@/components/locate-button";

/**
 * A plain GET form, so every view is a shareable URL and works without
 * JavaScript. Only the optional "use my exact location" button needs it.
 */
export function PlaceForm({ query, placeholder }: { query: Query; placeholder: string }) {
  const placeValue =
    query.source.kind === "place"
      ? query.source.text
      : query.source.kind === "coords"
        ? `${query.source.lat}, ${query.source.lon}`
        : "";

  return (
    <div className="rounded-[28px] bg-white/80 p-5 shadow-glow ring-1 ring-ink/5 backdrop-blur sm:p-6">
      <form action="/" method="get" role="search" aria-label="Find golden hour for a place and date" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem_8.5rem_auto] sm:items-end">
        <div>
          <label htmlFor="place" className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
            Place
          </label>
          <input
            id="place"
            name="place"
            type="text"
            defaultValue={placeValue}
            placeholder={placeholder}
            maxLength={MAX_PLACE}
            autoComplete="off"
            className="mt-1.5 block w-full rounded-2xl border border-ink/15 bg-paper/60 px-4 py-3 text-base outline-hidden transition placeholder:text-ink/40 focus-visible:border-gold-deep focus-visible:ring-4 focus-visible:ring-gold-soft"
          />
        </div>
        <div>
          <label htmlFor="date" className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
            Date <span className="font-normal normal-case tracking-normal">(empty for today)</span>
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={query.date ?? ""}
            min={`${MIN_YEAR}-01-01`}
            max={`${MAX_YEAR}-12-31`}
            className="mt-1.5 block w-full rounded-2xl border border-ink/15 bg-paper/60 px-4 py-3 text-base outline-hidden transition focus-visible:border-gold-deep focus-visible:ring-4 focus-visible:ring-gold-soft"
          />
        </div>
        <div>
          <label htmlFor="days" className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
            Plan ahead
          </label>
          <select
            id="days"
            name="days"
            defaultValue={String(query.days)}
            className="mt-1.5 block w-full rounded-2xl border border-ink/15 bg-paper/60 px-4 py-3 text-base outline-hidden transition focus-visible:border-gold-deep focus-visible:ring-4 focus-visible:ring-gold-soft"
          >
            {DAY_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days} days
              </option>
            ))}
          </select>
        </div>
        {query.clock === "24" ? <input type="hidden" name="clock" value="24" /> : null}
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-base font-semibold text-paper transition hover:bg-gold-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-soft"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Show times
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink/60">
        <span>A city, a landmark, or latitude and longitude.</span>
        <LocateButton />
      </div>
    </div>
  );
}
