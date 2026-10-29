// Everything lives in this browser (localStorage). Export/import keeps a backup.
import { addDays } from "./model.js";

const KEY = "wm-state";
const blank = () => ({
  loc: { name: "Coimbatore", region: "Tamil Nadu, India", lat: 11.0168, lon: 76.9558 },
  fields: [], sources: [], logs: [], catchments: [], running: null, annualRain: 900, seen: false,
});

export let state = load();

function load() {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return blank(); }
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
export function replace(next) { state = { ...blank(), ...next }; save(); }
export const uid = () => Math.random().toString(36).slice(2, 9);
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function sampleFarm() {
  const t = todayISO();
  const bore = { id: "s-bore", name: "Borewell", kind: "borewell", flowLpm: 220, hp: 5, depthFt: 650 };
  const pond = { id: "s-pond", name: "Farm pond", kind: "pond", flowLpm: 300, hp: 2, capacityL: 800000, levelL: 520000 };
  const sump = { id: "s-sump", name: "Rooftop sump", kind: "tank", flowLpm: 60, hp: 1, capacityL: 25000, levelL: 18000 };
  const fields = [
    { id: "s-tom", name: "East plot", crop: "tomato", acres: 1, soil: "red", method: "drip", sown: addDays(t, -48), sourceId: "s-bore" },
    { id: "s-coc", name: "Coconut grove", crop: "coconut", acres: 3, soil: "red", method: "drip", sown: "", sourceId: "s-bore" },
    { id: "s-pad", name: "Low field", crop: "paddy", acres: 0.5, soil: "black", method: "flood", sown: addDays(t, -22), sourceId: "s-pond" },
    { id: "s-ban", name: "Banana row", crop: "banana", acres: 0.75, soil: "loam", method: "drip", sown: addDays(t, -150), sourceId: "s-pond" },
  ];
  const logs = [];
  const water = (fieldId, sourceId, ago, minutes, flow) =>
    logs.push({ id: uid(), type: "water", fieldId, sourceId, date: addDays(t, -ago), minutes, litres: minutes * flow });
  [12, 8, 4, 1].forEach((d) => water("s-tom", "s-bore", d, 70, 220));
  [10, 3].forEach((d) => water("s-coc", "s-bore", d, 150, 220));
  [9, 6, 3].forEach((d) => water("s-pad", "s-pond", d, 140, 300));
  [7, 2].forEach((d) => water("s-ban", "s-pond", d, 90, 300));
  logs.push({ id: uid(), type: "check", fieldId: "s-tom", date: addDays(t, -20), level: 0 });
  return {
    ...blank(), seen: true, fields, sources: [bore, pond, sump], logs,
    catchments: [
      { id: uid(), name: "House terrace", surface: "concrete", m2: 120, to: "sump" },
      { id: uid(), name: "Store-room roof", surface: "sheet", m2: 80, to: "recharge" },
      { id: uid(), name: "Land draining to pit", surface: "bare", m2: 600, to: "recharge" },
    ],
  };
}
