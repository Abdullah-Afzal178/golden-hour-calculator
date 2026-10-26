import { ImageResponse } from "next/og";

import { PAGE_TITLE, SITE_NAME } from "@/lib/constants";

export const alt = PAGE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The sky column, turned on its side: night, twilight, blue, golden, day and back. */
const BANDS = [
  ["#17152f", 9],
  ["#262b5c", 4],
  ["#36458c", 4],
  ["#4f63d2", 3],
  ["#f2a33a", 6],
  ["#a9d4ff", 34],
  ["#f2a33a", 6],
  ["#4f63d2", 3],
  ["#36458c", 4],
  ["#262b5c", 4],
  ["#17152f", 23],
] as const;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(160deg, #fff6ec 0%, #ffe3c2 60%, #f9c6b5 100%)",
          padding: "64px 72px",
          fontFamily: "sans-serif",
          color: "#2b1a33",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "26px", fontWeight: 600, color: "#a14a08" }}>{SITE_NAME}</div>
          <div style={{ display: "flex", marginTop: "18px", fontSize: "84px", fontWeight: 700, lineHeight: 1.02 }}>
            When is golden hour?
          </div>
          <div style={{ display: "flex", marginTop: "18px", fontSize: "32px", color: "#2b1a33", opacity: 0.75 }}>
            Golden and blue hour for any place and date
          </div>
        </div>

        <div style={{ display: "flex", height: "64px", borderRadius: "32px", overflow: "hidden" }}>
          {BANDS.map(([color, weight], index) => (
            <div key={index} style={{ display: "flex", flexGrow: weight, background: color }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
