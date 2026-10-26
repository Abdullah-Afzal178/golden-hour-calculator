import { MapPin, TriangleAlert } from "lucide-react";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { AnswerHero } from "@/components/answer-hero";
import { DayCards } from "@/components/day-cards";
import { PlaceForm } from "@/components/place-form";
import { Planner } from "@/components/planner";
import { PoweredByBadge } from "@/components/powered-by-badge";
import { SkyColumn } from "@/components/sky-column";
import { SunNow } from "@/components/sun-now";
import { formatCoordinates, load, visitorIp } from "@/lib/astronomy";
import { daysBetween, formatLongDate } from "@/lib/clock";
import { ASTRONOMY_API_URL, EXAMPLES, SITE_NAME } from "@/lib/constants";
import { pageHref, parseQuery, type Query } from "@/lib/query";
import { phaseForAltitude, Sky } from "@/lib/sky";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const query = parseQuery(await searchParams);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pt-6 sm:px-6">
        <a href="/" className="flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-soft">
          <span className="relative block h-8 w-8 overflow-hidden rounded-[10px] bg-ink" aria-hidden="true">
            <span className="absolute bottom-[7px] left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-gradient-to-b from-gold-soft to-[#e9837f]" />
            <span className="absolute bottom-[5px] left-1 right-1 h-[2px] rounded-full bg-dusk" />
          </span>
          <span className="text-base font-semibold tracking-tight">{SITE_NAME}</span>
        </a>
        <div className="flex items-center gap-3">
          <nav aria-label="Clock format" className="flex gap-1 rounded-full bg-white/70 p-1 text-xs font-semibold ring-1 ring-ink/10">
            {(["12", "24"] as const).map((style) => (
              <a
                key={style}
                href={pageHref(query, { clock: style })}
                aria-current={query.clock === style ? "true" : undefined}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-soft ${
                  query.clock === style ? "bg-ink text-paper" : "text-ink/65 hover:bg-gold-soft/60"
                }`}
              >
                {style}-hour
              </a>
            ))}
          </nav>
          <PoweredByBadge />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">When is golden hour?</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink/75">
            Golden hour and blue hour for any place and date, worked out from where the sun actually is. Plan a shoot
            weeks ahead, or see how long the light lasts right now.
          </p>
        </div>

        <Body query={query} />

        <Notes />
      </main>

      <footer className="border-t border-ink/10 bg-white/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink/70 sm:px-6">
          <p>
            Sun and moon times from the{" "}
            <a href={ASTRONOMY_API_URL} target="_blank" rel="noreferrer" className="font-semibold text-gold-deep underline decoration-gold/50 decoration-2 underline-offset-4 hover:text-ink">
              ipgeolocation.io Astronomy API
            </a>
            . Open source under the MIT licence.
          </p>
          <PoweredByBadge />
        </div>
      </footer>
    </div>
  );
}

async function Body({ query }: { query: Query }) {
  const loaded = await load(query, visitorIp(await headers()));
  const placeholder = loaded.ok && query.source.kind === "visitor" ? loaded.place.name : "Paris, France";

  const form = (
    <div className="mt-8 space-y-3">
      <PlaceForm query={query} placeholder={placeholder} />
      <Examples query={query} />
    </div>
  );

  if (!loaded.ok) {
    return (
      <>
        {form}
        <section aria-labelledby="answer-heading" className="mt-8 rounded-[32px] bg-white/80 p-6 shadow-glow ring-1 ring-ink/5 sm:p-8">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-gold-deep">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            {loaded.title}
          </p>
          <h2 id="answer-heading" className="mt-3 max-w-2xl text-2xl font-semibold leading-snug">
            {loaded.message}
          </h2>
        </section>
      </>
    );
  }

  const sky = new Sky(loaded.days, loaded.place.latitude);
  const golden = sky.windows("golden");
  const blue = sky.windows("blue");
  const dayIndex = daysBetween(loaded.firstDate, loaded.date);
  const todayOffset = daysBetween(loaded.firstDate, loaded.now.date);
  const todayIndex = todayOffset >= 0 && todayOffset < loaded.days.length ? todayOffset : null;
  const isToday = todayIndex === dayIndex;
  const notes = [...query.problems, ...loaded.notes];
  const place = loaded.place;

  return (
    <>
      {form}

      {notes.length > 0 ? (
        <ul className="mt-4 space-y-1 rounded-2xl bg-gold-soft/50 px-4 py-3 text-sm">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-8 lg:col-start-2 lg:row-start-1">
          <div>
            <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/70">
              <MapPin className="h-4 w-4 text-gold-deep" aria-hidden="true" />
              <span className="font-semibold text-ink">{[place.name, place.detail].filter(Boolean).join(", ")}</span>
              <span>
                ({formatCoordinates(place.latitude, place.longitude)}
                {place.basis === "ip" ? ", roughly, from your IP address" : ""})
              </span>
            </p>
            <AnswerHero
              sky={sky}
              golden={golden}
              firstDate={loaded.firstDate}
              dayIndex={dayIndex}
              todayIndex={todayIndex}
              todayDate={loaded.now.date}
              nowMinutes={loaded.now.minutes}
              placeName={place.name}
              clock={query.clock}
              days={query.days}
            />
            <p className="mt-3 text-sm text-ink/65">
              {loaded.timezone
                ? `All times are local to ${place.name}, in the ${loaded.timezone.name} time zone${isToday && loaded.timezone.abbreviation ? ` (${loaded.timezone.abbreviation})` : ""}.`
                : `All times are local to ${place.name}.`}
              {!isToday ? (
                <>
                  {" "}
                  <a href={pageHref(query, { date: null })} className="font-semibold text-gold-deep underline decoration-gold/50 decoration-2 underline-offset-4 hover:text-ink">
                    Back to today
                  </a>
                </>
              ) : null}
            </p>
          </div>

          {isToday && loaded.now.sunAltitude !== null && loaded.now.sunAzimuth !== null ? (
            <SunNow
              altitude={loaded.now.sunAltitude}
              azimuth={loaded.now.sunAzimuth}
              phase={phaseForAltitude(loaded.now.sunAltitude)}
              placeName={place.name}
            />
          ) : null}

          <DayCards
            sky={sky}
            golden={golden}
            blue={blue}
            dayIndex={dayIndex}
            clock={query.clock}
            moonIllumination={isToday ? loaded.now.moonIllumination : null}
          />
        </div>

        <aside
          aria-labelledby="column-heading"
          className="rounded-[32px] bg-white/70 p-5 shadow-glow ring-1 ring-ink/5 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:self-start lg:sticky lg:top-6"
        >
          <h2 id="column-heading" className="text-base font-semibold">
            {isToday ? "Today" : formatLongDate(loaded.date, loaded.now.date)}, hour by hour
          </h2>
          <p className="mt-1 text-xs text-ink/60">Midnight at the top, midnight at the bottom.</p>
          <div className="mt-4">
            <SkyColumn sky={sky} dayIndex={dayIndex} clock={query.clock} now={isToday ? loaded.now.minutes : null} />
          </div>
        </aside>

        <div className="lg:col-start-2">
          <Planner
            sky={sky}
            golden={golden}
            firstDate={loaded.firstDate}
            fromIndex={dayIndex}
            count={query.days}
            todayIndex={todayIndex}
            clock={query.clock}
            query={query}
          />
        </div>
      </div>
    </>
  );
}

function Examples({ query }: { query: Query }) {
  return (
    <nav aria-label="Example places" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-ink/60">Try:</span>
      {EXAMPLES.map((example) => (
        <a
          key={example.label}
          href={pageHref({ ...query, date: null }, { place: example.place, date: example.monthDay ? nextDate(example.monthDay) : null })}
          className="rounded-full bg-white/70 px-3 py-1 font-medium ring-1 ring-ink/10 transition hover:bg-gold-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-soft"
        >
          {example.label}
        </a>
      ))}
    </nav>
  );
}

/** The next time a month and day comes round, so examples never point at the past. */
function nextDate(monthDay: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const thisYear = `${today.slice(0, 4)}-${monthDay}`;

  return thisYear >= today ? thisYear : `${Number(today.slice(0, 4)) + 1}-${monthDay}`;
}

const NOTES: { question: string; answer: ReactNode }[] = [
  {
    question: "What is golden hour?",
    answer:
      "The stretch around sunrise and sunset when the sun is low: from 4° below the horizon to 6° above it, the definition this calculator uses. Low sunlight crosses more of the atmosphere, so it arrives warm, soft and from the side, with long shadows. That is why photographers plan around it.",
  },
  {
    question: "What is blue hour?",
    answer:
      "The twilight on the far side of golden hour, when the sun is between 8° and 4° below the horizon. There is no direct sunlight, and the sky turns a deep, even blue. It comes just before the morning golden hour and just after the evening one.",
  },
  {
    question: "How long does golden hour last?",
    answer:
      "It depends on how steeply the sun crosses the horizon, which depends on latitude and season. Near the equator it lasts about 40 minutes. In New York it is about an hour, in London nearly an hour and a half, and in Oslo in December nearly three hours.",
  },
  {
    question: "Does golden hour start before sunrise?",
    answer:
      "Yes. By this definition it begins while the sun is still 4° below the horizon, so the morning golden hour starts before sunrise and the evening one ends after sunset.",
  },
  {
    question: "Why is golden hour later in the west of a time zone?",
    answer:
      "Because it follows the sun, not the clock. Every degree of longitude shifts sunrise and sunset by about four minutes, so two cities in the same time zone can see golden hour half an hour apart. Always check the exact place, not just the zone.",
  },
  {
    question: "What happens near the poles?",
    answer:
      "In Reykjavik at midsummer the sun never sinks 4° below the horizon, so golden hour runs straight through the night. In Tromsø in December the sun never rises, yet it climbs close enough to give a golden hour around midday. On Svalbard there is none at all in midwinter or midsummer. This calculator handles all of those.",
  },
];

function Notes() {
  return (
    <section aria-labelledby="notes-heading" className="mt-16">
      <h2 id="notes-heading" className="text-2xl font-semibold tracking-tight">
        Golden hour, explained
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NOTES.map((note) => (
          <article key={note.question} className="rounded-[28px] bg-white/70 p-5 ring-1 ring-ink/5">
            <h3 className="text-lg font-semibold leading-snug">{note.question}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">{note.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
