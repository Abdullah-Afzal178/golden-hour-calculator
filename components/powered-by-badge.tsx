import { POWERED_BY_URL } from "@/lib/constants";

export function PoweredByBadge({ className }: { className?: string }) {
  return (
    <a
      href={POWERED_BY_URL}
      target="_blank"
      rel="noreferrer"
      className={[
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-ink/10 transition hover:bg-gold-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-soft",
        className ?? "",
      ].join(" ")}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-br from-gold to-[#e9837f]" aria-hidden="true" />
      Powered by ipgeolocation.io
    </a>
  );
}
