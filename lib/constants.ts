export const SITE_NAME = "Golden Hour Calculator";

export const PAGE_TITLE = "Golden Hour Calculator: When Is Golden Hour Today?";

export const PAGE_DESCRIPTION =
  "Golden hour and blue hour times for any place and date, with a countdown to the next one and a planner for the weeks ahead. Handles the midnight sun and polar winter too.";

export const POWERED_BY_URL = "https://ipgeolocation.io";

export const ASTRONOMY_API_URL = "https://ipgeolocation.io/astronomy-api.html";

/** monthDay picks the next time that date comes round, so an example never points at the past. */
export const EXAMPLES: { place: string; label: string; monthDay?: string }[] = [
  { place: "Santorini, Greece", label: "Santorini" },
  { place: "Grand Canyon, Arizona", label: "Grand Canyon" },
  { place: "Kyoto, Japan", label: "Kyoto" },
  { place: "Cape Town, South Africa", label: "Cape Town" },
  { place: "Reykjavik, Iceland", label: "Reykjavik in June", monthDay: "06-21" },
  { place: "Tromso, Norway", label: "Tromsø in December", monthDay: "12-21" },
];
