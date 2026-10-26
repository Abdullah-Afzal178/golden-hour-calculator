# Golden Hour Calculator

When is golden hour? Golden and blue hour times for any place and date, a countdown to the next one, the whole day drawn as a column of sky, and a planner for up to 30 days ahead. It handles the places most calculators get wrong: the midnight sun, polar winter, and sunsets that fall after midnight. Powered by [ipgeolocation.io](https://ipgeolocation.io).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-000?logo=nextdotjs)](https://nextjs.org/)
[![Powered by ipgeolocation.io](https://img.shields.io/badge/Powered%20by-ipgeolocation.io-f2a33a)](https://ipgeolocation.io)

<!-- Add a screenshot of the tool running locally at ./public/tool.png and reference it here -->

---

## What It Does

- **The answer first**: "Golden hour in Kyoto starts at 4:51 PM", with how long until it starts or how long is left.
- **The day as a column of sky**, midnight at the top and bottom, coloured by phase: night, astronomical and nautical twilight, blue hour, golden hour and daylight, with every boundary labelled.
- **The sun right now**: height above the horizon and compass bearing.
- **The day in detail**: golden and blue hour with durations, sunrise, sunset, solar noon, day length, and the moon.
- **A planner** for the next 7, 14 or 30 days: morning and evening golden hour, sunrise, sunset and moon phase for each day.

Search by city, landmark or coordinates, use your browser's location, or let it start from your IP address. Every view is a URL, so a plan can be shared.

### The definitions

| Phase | Sun angle |
|---|---|
| Golden hour | 4° below to 6° above the horizon |
| Blue hour | 8° below to 4° below |

These are the angles the Astronomy API uses; they were checked against an independent solar-position calculation. The column also shows twilight below blue hour: nautical twilight from 12° to 8° below (it officially runs to 6°, where blue hour has already taken over) and astronomical twilight from 18° to 12° below.

---

## Design notes

**Phase boundaries, not "the morning golden hour".** The API reports each boundary as the moment the sun crosses an angle inside one local calendar day, rising (`morning.*`) or sinking (`evening.*`). This tool lays every crossing from every fetched day on one continuous timeline and asks, for any moment, which side of each angle the sun is on. That is what makes the polar cases come out right with no special code:

| Place and date | What happens |
|---|---|
| Reykjavik, 21 June | The sun never sinks 4° below the horizon, so golden hour runs from 10:06 PM straight through to 4:52 AM |
| Tromsø, 21 December | The sun never rises, but climbs to about 3° below the horizon, so there is one golden hour from 10:29 AM to 12:55 PM |
| Longyearbyen, December and June | No golden hour at all: the sun stays too low, then too high |

When the sun never crosses an angle in any fetched day, the noon elevation (from the solar declination) settles which side of it the sun stays on.

**The day before is always fetched.** A window that started yesterday evening and runs past midnight is still shown with its real start, and a planner row's evening window can run into the next day.

**The column never lets labels collide.** Morning events can be minutes apart, so labels are spread to keep their spacing, with a leader line back to the true moment.

---

## Why ipgeolocation.io

- **[Astronomy API](https://ipgeolocation.io/documentation/astronomy-api.html)** gives sunrise, sunset, every twilight boundary, golden and blue hour, and the sun and moon's current position, for coordinates, a place name or an IP address.
- **Astronomy time series** returns up to 90 days in one call, which is what the planner is built on.
- **[Timezone API](https://ipgeolocation.io/documentation/timezone-api.html)** names the time zone the times are in.
- **Free tier**: all of it works on the free plan. A page view costs three calls; the sun times and time zone are cached for six hours.

**[Get your free API key →](https://ipgeolocation.io/signup)**

---

## Features

- **Countdown** to the next golden hour, or the time left in the current one
- **Sky column**: the selected day, phase by phase
- **Planner** for 7, 14 or 30 days, with a click-through to any date
- **12-hour or 24-hour** clock
- **Search by place or coordinates**, or use your location
- **Polar-safe**: midnight sun, polar night, and golden hours that cross midnight
- **Works without JavaScript**: everything is server-rendered; only "use my exact location" needs it
- **SEO-ready**: Open Graph tags, meta description, `robots.txt`, `sitemap.xml` and favicon

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Language | TypeScript |
| Font | Outfit via `next/font` |
| Icons | [lucide-react](https://lucide.dev/) |
| Data | [ipgeolocation.io](https://ipgeolocation.io) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [ipgeolocation.io](https://ipgeolocation.io/signup) API key (the free tier is enough)

### Run It Locally

1. Clone the repo:

```bash
git clone https://github.com/Abdullah-Afzal178/golden-hour-calculator.git
cd golden-hour-calculator
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root:

```env
IPGEOLOCATION_API_KEY=your_api_key_here
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

> On `localhost` there is no public IP to locate you by, so the page starts from New York and says so. Search for your own city, or use your location.

---

## Tests

The sun-phase timeline, planner logic, URL parsing and clock arithmetic are pure functions, tested against real API responses for New York, Reykjavik, Tromsø and Longyearbyen:

```bash
npm test
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `IPGEOLOCATION_API_KEY` | Yes | Your [ipgeolocation.io](https://ipgeolocation.io/signup) API key |
| `NEXT_PUBLIC_SITE_URL` | No | Your production URL if you deploy (used for the sitemap and robots.txt) |

---

## URL Parameters

| Parameter | Example | Meaning |
|---|---|---|
| `place` | `Kyoto, Japan` | A place name, or coordinates such as `48.85, 2.35` |
| `lat`, `lon` | `64.14`, `-21.94` | Coordinates (what "use my exact location" sends) |
| `date` | `2027-06-21` | The day to show; today at the place if left out |
| `days` | `30` | Planner length: 7, 14 (default) or 30 |
| `clock` | `24` | 24-hour clock; 12-hour if left out |

---

## Project Structure

```
golden-hour-calculator/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # Header, form, answer, column, planner, notes
│   ├── opengraph-image.tsx
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── place-form.tsx           # GET form
│   ├── locate-button.tsx        # Browser geolocation (client)
│   ├── answer-hero.tsx          # The next golden hour
│   ├── sky-column.tsx           # The day as an SVG column
│   ├── sun-now.tsx              # Compass and sun height
│   ├── day-cards.tsx            # Golden hour, blue hour, sun and moon
│   ├── planner.tsx              # The days ahead
│   ├── moon-glyph.tsx
│   └── powered-by-badge.tsx
├── lib/
│   ├── sky.ts                   # Phase timeline from API crossings (pure)
│   ├── plan.ts                  # Status, placement, labels (pure)
│   ├── query.ts                 # URL parameters (pure)
│   ├── clock.ts                 # Times and dates, timezone-free (pure)
│   ├── astronomy.ts             # API calls (server only)
│   ├── test-fixtures.ts         # Captured API responses
│   └── session-cache.ts
├── .env                         # API key (not committed)
└── README.md
```

---

## Want to Deploy It?

Works out of the box on any platform that supports Next.js:

- **Vercel**: import the repo, add `IPGEOLOCATION_API_KEY`, deploy.
- **Netlify**, **Cloudflare Pages**, **Railway**: a similar process.
- **Self-hosted**: `npm run build && npm start`.

Behind a proxy or CDN, make sure it forwards the visitor's address (`X-Forwarded-For`, `X-Real-IP` or `CF-Connecting-IP`), or every visitor will be located at the proxy.

---

## License

MIT. See [LICENSE](LICENSE) for details.
