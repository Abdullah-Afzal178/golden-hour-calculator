import type { Phase } from "@/lib/sky";

import { PHASE_COLOR, PHASE_NAME } from "@/components/sky-column";

const DIRECTIONS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];

export function compassWord(azimuth: number): string {
  return DIRECTIONS[Math.round((((azimuth % 360) + 360) % 360) / 45) % 8];
}

/** Where the sun is right now: height above the horizon and compass bearing. */
export function SunNow({ altitude, azimuth, phase, placeName }: { altitude: number; azimuth: number; phase: Phase; placeName: string }) {
  const radians = ((azimuth - 90) * Math.PI) / 180;
  const ring = 44;
  const sunX = 60 + ring * Math.cos(radians);
  const sunY = 60 + ring * Math.sin(radians);
  const up = altitude >= 0;
  const height = `${Math.abs(altitude).toFixed(1)}°`;

  return (
    <section aria-labelledby="sun-now-heading" className="flex items-center gap-5 rounded-[28px] bg-white/80 p-5 shadow-glow ring-1 ring-ink/5">
      <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" aria-hidden="true">
        <circle cx="60" cy="60" r={ring} fill="none" stroke="#2b1a33" strokeOpacity="0.15" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="3" fill="#2b1a33" fillOpacity="0.4" />
        {[
          ["N", 60, 10],
          ["E", 112, 64],
          ["S", 60, 117],
          ["W", 8, 64],
        ].map(([label, x, y]) => (
          <text key={label as string} x={x as number} y={y as number} textAnchor="middle" fontSize="10" fontWeight="600" fill="#2b1a33" fillOpacity="0.5">
            {label}
          </text>
        ))}
        <line x1="60" y1="60" x2={sunX} y2={sunY} stroke={PHASE_COLOR[phase]} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={sunX} cy={sunY} r="8" fill={up ? "#f2a33a" : "#4f63d2"} stroke="#fff" strokeWidth="2" />
      </svg>
      <div>
        <h2 id="sun-now-heading" className="text-base font-semibold">
          The sun in {placeName} right now
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink/75">
          {height} {up ? "above" : "below"} the horizon, toward the {compassWord(azimuth)} ({Math.round(azimuth)}°).
        </p>
        <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: PHASE_COLOR[phase] }} aria-hidden="true" />
          {PHASE_NAME[phase]}
        </p>
      </div>
    </section>
  );
}
