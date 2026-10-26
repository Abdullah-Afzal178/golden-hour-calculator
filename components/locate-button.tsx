"use client";

import { LocateFixed } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * "Use my exact location": only shown once the browser says it can do
 * geolocation, so nothing appears that can't work. The place search works
 * without it.
 */
export function LocateButton() {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "finding" | "failed">("idle");

  useEffect(() => {
    setSupported("geolocation" in navigator);
  }, []);

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={state === "finding"}
      onClick={() => {
        setState("finding");
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const url = new URL(window.location.href);
            url.searchParams.delete("place");
            url.searchParams.set("lat", position.coords.latitude.toFixed(4));
            url.searchParams.set("lon", position.coords.longitude.toFixed(4));
            window.location.href = `${url.pathname}?${url.searchParams.toString()}`;
          },
          () => setState("failed"),
          { timeout: 10000, maximumAge: 600000 },
        );
      }}
      className="inline-flex items-center gap-1.5 rounded-full font-semibold text-gold-deep underline decoration-gold/60 decoration-2 underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-soft disabled:opacity-60"
    >
      <LocateFixed className="h-4 w-4" aria-hidden="true" />
      <span aria-live="polite">
        {state === "finding" ? "Finding you…" : state === "failed" ? "Location unavailable, search instead" : "Use my exact location"}
      </span>
    </button>
  );
}
