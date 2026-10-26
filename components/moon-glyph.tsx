/** The API's phase names, as people say them, and how much of the disc is lit (0 to 1, waxing positive). */
const PHASES: Record<string, { name: string; lit: number }> = {
  NEW_MOON: { name: "New moon", lit: 0 },
  WAXING_CRESCENT: { name: "Waxing crescent", lit: 0.25 },
  FIRST_QUARTER: { name: "First quarter", lit: 0.5 },
  WAXING_GIBBOUS: { name: "Waxing gibbous", lit: 0.75 },
  FULL_MOON: { name: "Full moon", lit: 1 },
  WANING_GIBBOUS: { name: "Waning gibbous", lit: -0.75 },
  LAST_QUARTER: { name: "Last quarter", lit: -0.5 },
  THIRD_QUARTER: { name: "Last quarter", lit: -0.5 },
  WANING_CRESCENT: { name: "Waning crescent", lit: -0.25 },
};

export function moonName(phase: string | undefined): string | null {
  return phase ? (PHASES[phase.toUpperCase()]?.name ?? null) : null;
}

/**
 * A small moon drawn as seen from the northern hemisphere (waxing lit on the
 * right). The terminator is an ellipse whose width follows the lit fraction.
 */
export function MoonGlyph({ phase, size = 16 }: { phase: string | undefined; size?: number }) {
  const entry = phase ? PHASES[phase.toUpperCase()] : undefined;

  if (!entry) {
    return null;
  }

  const r = 7;
  const lit = Math.abs(entry.lit);
  const waxing = entry.lit > 0;
  // Terminator ellipse x-radius: r at new/full, 0 at the quarters.
  const rx = Math.abs(1 - 2 * lit) * r;
  // Lit side: the right half when waxing. The terminator bulges into the dark
  // side when more than half is lit (gibbous) and into the lit side when less.
  const sweepLit = waxing ? 1 : 0;
  const sweepTerminator = lit > 0.5 ? (waxing ? 1 : 0) : waxing ? 0 : 1;
  const path =
    lit === 0
      ? ""
      : lit === 1
        ? `M 8 1 A ${r} ${r} 0 1 1 8 15 A ${r} ${r} 0 1 1 8 1`
        : `M 8 1 A ${r} ${r} 0 0 ${sweepLit} 8 15 A ${rx} ${r} 0 0 ${sweepTerminator} 8 1`;

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="8" r={r} fill="#2b1a33" fillOpacity="0.14" stroke="#2b1a33" strokeOpacity="0.35" />
      {path ? <path d={path} fill="#f5e6c8" stroke="#2b1a33" strokeOpacity="0.35" strokeWidth="0.6" /> : null}
    </svg>
  );
}
