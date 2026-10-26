import { formatClock, MINUTES_PER_DAY, type ClockStyle } from "@/lib/clock";
import { dayMarkers, spreadLabels } from "@/lib/plan";
import type { Phase, Sky } from "@/lib/sky";

export const PHASE_COLOR: Record<Phase, string> = {
  night: "#17152f",
  astronomical: "#262b5c",
  nautical: "#36458c",
  blue: "#4f63d2",
  golden: "#f2a33a",
  day: "#a9d4ff",
};

export const PHASE_NAME: Record<Phase, string> = {
  night: "Night",
  astronomical: "Astronomical twilight",
  nautical: "Nautical twilight",
  blue: "Blue hour",
  golden: "Golden hour",
  day: "Daylight",
};

const HEIGHT = 720;
const BAR_X = 58;
const BAR_WIDTH = 40;
const LABEL_X = 124;
const LABEL_GAP = 30;

const y = (minutes: number) => (minutes / MINUTES_PER_DAY) * HEIGHT;

/**
 * The selected day as one vertical strip, midnight at the top and bottom,
 * coloured by where the sun is. Labels are spread so they never collide,
 * with a leader line back to the true moment.
 */
export function SkyColumn({
  sky,
  dayIndex,
  clock,
  now,
}: {
  sky: Sky;
  dayIndex: number;
  clock: ClockStyle;
  /** Minutes after midnight when the selected day is today. */
  now: number | null;
}) {
  const dayStart = dayIndex * MINUTES_PER_DAY;
  const runs = sky.runs(dayStart, dayStart + MINUTES_PER_DAY).map((run) => ({
    ...run,
    start: run.start - dayStart,
    end: run.end - dayStart,
  }));
  const markers = dayMarkers(sky, dayIndex);
  const labelY = spreadLabels(
    markers.map((marker) => y(marker.t)),
    LABEL_GAP,
    10,
    HEIGHT - 22,
  );
  const gradientId = `sky-${dayIndex}`;
  const present = [...new Set(runs.map((run) => run.phase))];
  const order: Phase[] = ["day", "golden", "blue", "nautical", "astronomical", "night"];

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 300 ${HEIGHT + 12}`}
        className="h-auto w-full"
        role="img"
        aria-label={describe(markers, clock)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2={HEIGHT} gradientUnits="userSpaceOnUse">
            {runs.flatMap((run, index) => {
              const blend = Math.min(5, (y(run.end) - y(run.start)) / 4);
              const top = index === 0 ? y(run.start) : y(run.start) + blend;
              const bottom = index === runs.length - 1 ? y(run.end) : y(run.end) - blend;

              return [
                <stop key={`${index}a`} offset={top / HEIGHT} stopColor={PHASE_COLOR[run.phase]} />,
                <stop key={`${index}b`} offset={bottom / HEIGHT} stopColor={PHASE_COLOR[run.phase]} />,
              ];
            })}
          </linearGradient>
        </defs>

        {/* Hour ticks */}
        {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hour) => {
          const tickY = y(hour * 60);
          const hidden = now !== null && Math.abs(y(now) - tickY) < 14;

          return (
            <g key={hour} opacity={hidden ? 0 : 1}>
              <line x1={BAR_X - 8} x2={BAR_X - 2} y1={tickY + 6} y2={tickY + 6} stroke="#2b1a33" strokeOpacity="0.3" />
              <text
                x={BAR_X - 12}
                y={tickY + 10}
                textAnchor="end"
                fontSize="11"
                fill="#2b1a33"
                fillOpacity="0.55"
              >
                {formatClock((hour % 24) * 60, clock).replace(":00", "")}
              </text>
            </g>
          );
        })}

        <rect x={BAR_X} y={6} width={BAR_WIDTH} height={HEIGHT} rx={BAR_WIDTH / 2} fill={`url(#${gradientId})`} />

        {/* Markers, with leader lines from the true moment to the spread label */}
        {markers.map((marker, index) => {
          const trueY = y(marker.t) + 6;
          const shownY = labelY[index] + 6;
          const color = marker.kind === "blue" ? "#2f3b94" : marker.kind === "golden" ? "#a14a08" : "#2b1a33";

          return (
            <g key={`${marker.t}-${marker.label}`}>
              <line x1={BAR_X + 6} x2={BAR_X + BAR_WIDTH - 6} y1={trueY} y2={trueY} stroke="#fff" strokeOpacity="0.85" strokeWidth="1.5" />
              <polyline
                points={`${BAR_X + BAR_WIDTH + 2},${trueY} ${LABEL_X - 14},${trueY} ${LABEL_X - 6},${shownY}`}
                fill="none"
                stroke={color}
                strokeOpacity="0.45"
              />
              <text x={LABEL_X} y={shownY + 4} fontSize="13" fill={color}>
                <tspan fontWeight="700">{formatClock(marker.t, clock)}</tspan>
                <tspan dx="6" fill="#2b1a33" fillOpacity="0.8">
                  {marker.label}
                </tspan>
              </text>
            </g>
          );
        })}

        {now !== null ? (
          <g>
            <line x1={BAR_X - 4} x2={BAR_X + BAR_WIDTH + 4} y1={y(now) + 6} y2={y(now) + 6} stroke="#e11d48" strokeWidth="2.5" />
            <circle cx={BAR_X + BAR_WIDTH / 2} cy={y(now) + 6} r="5" fill="#e11d48" stroke="#fff" strokeWidth="2" />
            <text x={BAR_X - 10} y={y(now) + 10} textAnchor="end" fontSize="11" fontWeight="700" fill="#e11d48">
              Now
            </text>
          </g>
        ) : null}
      </svg>

      <figcaption>
        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          {order
            .filter((phase) => present.includes(phase))
            .map((phase) => (
              <li key={phase} className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: PHASE_COLOR[phase] }} aria-hidden="true" />
                {PHASE_NAME[phase]}
              </li>
            ))}
        </ul>
      </figcaption>
    </figure>
  );
}

function describe(markers: ReturnType<typeof dayMarkers>, clock: ClockStyle): string {
  if (markers.length === 0) {
    return "The sun stays in one phase all day.";
  }

  return `The day from midnight to midnight: ${markers.map((marker) => `${marker.label} at ${formatClock(marker.t, clock)}`).join(", ")}.`;
}
