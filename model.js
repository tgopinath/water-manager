// Crops, soils and the daily soil water balance (FAO-56, single crop coefficient).
// Values are typical guide figures; a soil check or a logged watering re-anchors the estimate.
import { expectedRain } from "./weather.js";

// kc: [initial, mid, end]; len: days of [initial, development, mid, late]; zr: max root depth (m);
// p: share of available water the crop can use before it stresses; drip: canopy share wetted under drip.
export const CROPS = {
  paddy:     { name: "Paddy (rice)",   kc: [1.05, 1.2, 0.9],  len: [30, 30, 60, 30],    zr: 0.3, p: 0.2, perc: 3, note: "Paddy also loses about 3 mm a day to seepage, so it is watered little and often." },
  wheat:     { name: "Wheat",          kc: [0.4, 1.15, 0.4],  len: [30, 40, 40, 30],    zr: 1.2, p: 0.55 },
  maize:     { name: "Maize",          kc: [0.3, 1.2, 0.6],   len: [25, 40, 45, 30],    zr: 1.0, p: 0.55 },
  sorghum:   { name: "Sorghum (cholam)", kc: [0.3, 1.0, 0.55], len: [20, 35, 40, 30],   zr: 1.0, p: 0.55 },
  ragi:      { name: "Ragi / millets", kc: [0.3, 1.0, 0.3],   len: [15, 25, 40, 25],    zr: 1.0, p: 0.55 },
  pulses:    { name: "Pulses (green / black gram)", kc: [0.4, 1.05, 0.35], len: [15, 25, 25, 10], zr: 0.7, p: 0.45 },
  groundnut: { name: "Groundnut",      kc: [0.4, 1.15, 0.6],  len: [25, 35, 45, 25],    zr: 0.6, p: 0.5 },
  cotton:    { name: "Cotton",         kc: [0.35, 1.15, 0.6], len: [30, 50, 55, 45],    zr: 1.2, p: 0.65 },
  sugarcane: { name: "Sugarcane",      kc: [0.4, 1.25, 0.75], len: [35, 60, 190, 120],  zr: 1.5, p: 0.65, drip: 1 },
  banana:    { name: "Banana",         kc: [0.5, 1.1, 1.0],   len: [120, 90, 120, 60],  zr: 0.8, p: 0.35, drip: 0.75 },
  tomato:    { name: "Tomato",         kc: [0.6, 1.15, 0.8],  len: [30, 40, 45, 30],    zr: 1.0, p: 0.4 },
  onion:     { name: "Onion",          kc: [0.7, 1.05, 0.75], len: [15, 25, 70, 40],    zr: 0.4, p: 0.3 },
  chilli:    { name: "Chilli",         kc: [0.6, 1.05, 0.9],  len: [30, 35, 40, 20],    zr: 0.7, p: 0.3 },
  brinjal:   { name: "Brinjal",        kc: [0.6, 1.05, 0.9],  len: [30, 40, 40, 20],    zr: 0.9, p: 0.45 },
  greens:    { name: "Leafy greens",   kc: [0.7, 1.0, 0.9],   len: [20, 30, 30, 15],    zr: 0.4, p: 0.4 },
  turmeric:  { name: "Turmeric",       kc: [0.5, 1.05, 0.75], len: [30, 60, 120, 60],   zr: 0.5, p: 0.5 },
  coconut:   { name: "Coconut",        kc: 1.0, zr: 1.0, p: 0.65, drip: 0.3, note: "Under drip, only the root zone around each palm is watered, so the need is a share of the whole field." },
  mango:     { name: "Mango / orchard", kc: 0.85, zr: 1.5, p: 0.6, drip: 0.35 },
  fodder:    { name: "Fodder grass (napier)", kc: 0.95, zr: 1.0, p: 0.55 },
};

// Available water held per metre of root depth (mm/m).
export const SOILS = {
  sandy: { name: "Sandy", taw: 70 },
  red:   { name: "Red loam", taw: 120 },
  loam:  { name: "Loam", taw: 150 },
  black: { name: "Black cotton (clay)", taw: 190 },
};

export const METHODS = {
  drip:      { name: "Drip", eff: 0.9 },
  sprinkler: { name: "Sprinkler", eff: 0.75 },
  furrow:    { name: "Furrow", eff: 0.6 },
  flood:     { name: "Flood / basin", eff: 0.55 },
};

export const SOURCE_KINDS = {
  borewell: "Borewell",
  openwell: "Open well",
  tank: "Storage tank / sump",
  pond: "Farm pond",
  canal: "Canal",
};

export const M2_PER_ACRE = 4046.86;
const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (s, n) => iso(new Date(new Date(s + "T00:00Z").getTime() + n * DAY));
export const daysBetween = (a, b) => Math.round((new Date(b + "T00:00Z") - new Date(a + "T00:00Z")) / DAY);

export function stage(crop, dap) {
  if (!Array.isArray(crop.kc)) return { name: "Established", kc: crop.kc, frac: 1, done: false };
  const [i, d, m, l] = crop.len;
  const [ki, km, ke] = crop.kc;
  if (dap < 0) return { name: "Not sown", kc: 0, frac: 0, done: false };
  if (dap < i) return { name: "Initial", kc: ki, frac: dap / (i + d), done: false };
  if (dap < i + d) return { name: "Growing", kc: ki + (km - ki) * ((dap - i) / d), frac: dap / (i + d), done: false };
  if (dap < i + d + m) return { name: "Mid-season", kc: km, frac: 1, done: false };
  if (dap < i + d + m + l) return { name: "Late season", kc: km + (ke - km) * ((dap - i - d - m) / l), frac: 1, done: false };
  return { name: "Ready to harvest", kc: ke, frac: 1, done: true };
}

export const seasonLength = (crop) => (Array.isArray(crop.len) ? crop.len.reduce((a, b) => a + b, 0) : null);

// What one field needs on one day, in mm over the whole field.
function dayNeed(field, day) {
  const crop = CROPS[field.crop];
  const dap = field.sown ? daysBetween(field.sown, day.date) : 999;
  const st = stage(crop, dap);
  const cover = field.method === "drip" ? (crop.drip ?? 0.85) : 1;
  const zr = Array.isArray(crop.kc) ? 0.15 + (crop.zr - 0.15) * Math.min(1, st.frac) : crop.zr;
  const taw = Math.max(15, SOILS[field.soil].taw * zr * cover);
  // Drip is meant to top up little and often, so it waits for a much smaller dip than flood or furrow.
  const p = field.method === "drip" ? Math.min(crop.p, 0.15) : crop.p;
  return { st, dap, etc: day.et0 * st.kc * cover + (crop.perc || 0), taw, raw: taw * p };
}

const effRain = (mm) => (mm < 3 ? 0 : mm * 0.8);

/**
 * Walk the days for one field. Depletion (mm below full) starts at 0 on sowing or 30 days ago,
 * then rises with crop use and falls with rain and watering. Soil checks reset it.
 */
export function balance(field, weatherDays, logs) {
  const crop = CROPS[field.crop];
  const area = field.acres * M2_PER_ACRE;
  const eff = METHODS[field.method].eff;
  const mine = logs.filter((l) => l.fieldId === field.id);
  let dr = 0;
  const rows = [];
  for (const day of weatherDays) {
    if (field.sown && day.date < field.sown) continue;
    const n = dayNeed(field, day);
    const rain = effRain(expectedRain(day));
    const applied = mine.filter((l) => l.type === "water" && l.date === day.date)
      .reduce((s, l) => s + (l.litres / area) * eff, 0);
    const check = mine.filter((l) => l.type === "check" && l.date === day.date).pop();
    dr = Math.min(n.taw, Math.max(0, dr + n.etc - rain - applied));
    if (check) dr = n.taw * check.level;
    rows.push({ date: day.date, past: day.past, today: day.today, etc: n.etc, rain, applied, dr, taw: n.taw, raw: n.raw, stage: n.st, dap: n.dap,
      left: 1 - dr / n.taw, rawLeft: 1 - n.raw / n.taw });
  }
  return { rows, crop, area, eff };
}

const fmtDay = (s) => new Date(s + "T00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

// Today's advice for a field, plus how much to give.
export function advise(field, weatherDays, logs, source) {
  const { rows, area, eff } = balance(field, weatherDays, logs);
  const i = rows.findIndex((r) => r.today);
  if (i < 0) return { key: "wait", label: "Not sown yet", rows, detail: field.sown ? `Sowing on ${fmtDay(field.sown)}.` : "" };
  const t = rows[i];
  if (t.stage.done) return { key: "done", label: "Season over", rows, t, detail: "Stop watering a week or two before harvest." };
  const giveMm = t.dr / eff;
  const litres = giveMm * area;
  const flow = source?.flowLpm || 0;
  const minutes = flow ? litres / flow : null;
  const ahead = rows.slice(i + 1, i + 3);
  const rainSoon = ahead.reduce((s, r) => s + r.rain, 0);
  const amount = { mm: giveMm, litres, minutes };
  if (t.dr >= t.raw) {
    if (rainSoon >= t.dr * 0.6) return { key: "hold", label: "Hold — rain coming", rows, t, amount,
      detail: `About ${Math.round(rainSoon)} mm of useful rain is likely in the next two days. Skip watering unless it misses.` };
    const severe = t.dr >= t.taw * 0.85;
    return { key: severe ? "urgent" : "water", label: severe ? "Crop is stressed — water now" : "Water today", rows, t, amount, detail: "" };
  }
  // When will it cross the line?
  let next = null;
  for (const r of rows.slice(i + 1)) if (r.dr >= r.raw) { next = r.date; break; }
  return { key: "ok", label: "Soil has enough water", rows, t, amount, next,
    detail: next ? `Next watering around ${fmtDay(next)}.` : "No watering needed in the next two weeks." };
}

export function pumpKwh(source, minutes) {
  return source?.hp ? source.hp * 0.746 * (minutes / 60) : 0;
}
