// Live weather from Open-Meteo (free, no key): 30 days back for the soil water balance, 14 ahead for planning.
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";
const CACHE_KEY = "wm-weather";

export async function fetchWeather(loc) {
  const q = new URLSearchParams({
    latitude: loc.lat, longitude: loc.lon, timezone: "auto", past_days: 30, forecast_days: 14,
    current: "temperature_2m,relative_humidity_2m,precipitation,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration",
  });
  try {
    const r = await fetch(`${FORECAST}?${q}`);
    if (!r.ok) throw new Error(`Weather service answered ${r.status}`);
    const data = await r.json();
    const out = { loc, at: Date.now(), data };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(out)); } catch {}
    return { ...out, live: true };
  } catch (err) {
    const cached = cachedWeather(loc);
    if (cached) return { ...cached, live: false, error: err.message };
    throw err;
  }
}

export function cachedWeather(loc) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (c && Math.abs(c.loc.lat - loc.lat) < 0.01 && Math.abs(c.loc.lon - loc.lon) < 0.01) return c;
  } catch {}
  return null;
}

export async function searchPlaces(name) {
  const r = await fetch(`${GEOCODE}?${new URLSearchParams({ name, count: 6, language: "en" })}`);
  if (!r.ok) throw new Error("Place search failed");
  const j = await r.json();
  return (j.results || []).map((p) => ({
    name: p.name, region: [p.admin1, p.country].filter(Boolean).join(", "), lat: p.latitude, lon: p.longitude,
  }));
}

// One row per day. `past` days are what happened; the rest are forecast.
export function days(w) {
  const d = w.data.daily;
  const today = w.data.current?.time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  return d.time.map((t, i) => ({
    date: t, code: d.weather_code[i], tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i],
    rain: d.precipitation_sum[i] ?? 0, prob: d.precipitation_probability_max[i] ?? null,
    et0: d.et0_fao_evapotranspiration[i] ?? 0, past: t < today, today: t === today,
  })).filter((x) => x.tmax != null);
}

// Forecast rain is weighted by its chance; past rain counts in full.
export const expectedRain = (day) => (day.past || day.prob == null ? day.rain : day.rain * Math.min(1, day.prob / 100 + 0.15));

const WMO = {
  0: ["Clear", "sun"], 1: ["Mostly clear", "sun"], 2: ["Partly cloudy", "part"], 3: ["Overcast", "cloud"],
  45: ["Fog", "cloud"], 48: ["Fog", "cloud"], 51: ["Light drizzle", "rain"], 53: ["Drizzle", "rain"], 55: ["Heavy drizzle", "rain"],
  56: ["Freezing drizzle", "rain"], 57: ["Freezing drizzle", "rain"], 61: ["Light rain", "rain"], 63: ["Rain", "rain"], 65: ["Heavy rain", "rain"],
  66: ["Freezing rain", "rain"], 67: ["Freezing rain", "rain"], 71: ["Light snow", "cloud"], 73: ["Snow", "cloud"], 75: ["Heavy snow", "cloud"],
  77: ["Snow grains", "cloud"], 80: ["Showers", "rain"], 81: ["Showers", "rain"], 82: ["Heavy showers", "rain"],
  85: ["Snow showers", "cloud"], 86: ["Snow showers", "cloud"], 95: ["Thunderstorm", "storm"], 96: ["Thunderstorm, hail", "storm"], 99: ["Thunderstorm, hail", "storm"],
};
export const describe = (code) => WMO[code] || ["—", "cloud"];

export function icon(kind, size = 26) {
  const s = `width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true"`;
  const sun = `<circle cx="16" cy="16" r="6" fill="var(--sun)"/><g stroke="var(--sun)" stroke-width="2" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></g>`;
  const cloud = (x = 0, y = 0) => `<path transform="translate(${x} ${y})" d="M9 25h14a5 5 0 0 0 0-10 7 7 0 0 0-13.4 1.6A4.2 4.2 0 0 0 9 25z" fill="var(--cloud)" stroke="var(--muted)" stroke-width="1.2"/>`;
  if (kind === "sun") return `<svg ${s}>${sun}</svg>`;
  if (kind === "part") return `<svg ${s}><g transform="translate(-4 -5) scale(.8)">${sun}</g>${cloud(2, 1)}</svg>`;
  if (kind === "rain") return `<svg ${s}>${cloud(0, -3)}<g stroke="var(--water)" stroke-width="2" stroke-linecap="round"><path d="M12 26l-1 3M17 26l-1 3M22 26l-1 3"/></g></svg>`;
  if (kind === "storm") return `<svg ${s}>${cloud(0, -3)}<path d="M17 23l-3 5h3l-2 4" fill="none" stroke="var(--sun)" stroke-width="2" stroke-linejoin="round"/></svg>`;
  return `<svg ${s}>${cloud()}</svg>`;
}
