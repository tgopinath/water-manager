// Rainwater: what the coming rain can give you, and every practical way to catch, store and use it.
import { expectedRain } from "./weather.js";

export const SURFACES = {
  concrete: { name: "Concrete roof / terrace", c: 0.85 },
  sheet:    { name: "Metal or asbestos sheet roof", c: 0.8 },
  tile:     { name: "Tiled roof", c: 0.75 },
  paved:    { name: "Paved yard / threshing floor", c: 0.7 },
  bare:     { name: "Bare or compacted land", c: 0.3 },
  field:    { name: "Cropped field / grass", c: 0.15 },
};

export const SQFT_PER_M2 = 10.7639;

// litres = area (m²) × rain (mm) × runoff share
export const catchLitres = (catchments, mm) =>
  catchments.reduce((s, c) => s + c.m2 * mm * (SURFACES[c.surface]?.c ?? 0.5), 0);

export function rainOutlook(weatherDays) {
  const ahead = weatherDays.filter((d) => !d.past).slice(0, 14);
  const past = weatherDays.filter((d) => d.past);
  return {
    next7: ahead.slice(0, 7).reduce((s, d) => s + expectedRain(d), 0),
    next14: ahead.reduce((s, d) => s + expectedRain(d), 0),
    last30: past.reduce((s, d) => s + d.rain, 0),
    big: ahead.filter((d) => d.rain >= 10 && (d.prob ?? 100) >= 40),
    ahead,
  };
}

// Before-rain checklist for a borewell with a recharge pit.
export const BEFORE_RAIN = [
  "Clear leaves and silt from the roof, gutters and the silt trap so the first water runs clean.",
  "Keep the first-flush valve open (or the diverter empty) — let the first 10–15 minutes of rain run to waste. It carries dust, bird droppings and roof dirt.",
  "Then open the inlet to the recharge pit. Water must pass through the filter layers before it reaches the borewell casing.",
  "Close any drain that brings water from the cattle shed, toilets, septic tank, compost pit or recently sprayed fields. That water must never reach a borewell.",
  "Fill storage first (sump, tanks, farm pond); send the overflow to the recharge pit.",
  "After the rain, check the pit drains within a day. If water stands for long, the top sand layer is choked — scrape and replace it.",
];

// Every practical way to catch, store and use rain on a farm with a borewell.
export const METHODS = [
  {
    id: "borepit", group: "Recharge your borewell", title: "Borewell recharge pit (filter around the casing)",
    best: "Working borewell whose yield drops in summer", cost: "₹15,000–40,000",
    steps: [
      "Dig a pit about 2 m × 2 m and 2–3 m deep around the borewell casing.",
      "In the pit, drill small holes (8–12 mm) all round the casing over 1–2 m of its length. Wrap that part tightly in nylon mesh or coir, two layers.",
      "Fill from the bottom: boulders (100–150 mm) for the lower third, then gravel (20–40 mm), then coarse sand on top. Put a nylon net between layers.",
      "Bring water in through a silt trap (a small chamber where mud settles) — never straight from a gutter.",
      "Cap the borewell top so nothing falls in. Keep a cover or mesh over the pit for children and animals.",
    ],
    care: "Scrape and replace the top 10–15 cm of sand every year before the monsoon.",
  },
  {
    id: "drybore", group: "Recharge your borewell", title: "Turn a failed or dry borewell into a recharge well",
    best: "An old borewell that no longer gives water", cost: "₹10,000–25,000",
    steps: [
      "Remove the pump and pipe. Build the same filter pit around it.",
      "Send roof and field runoff into it after a silt trap. Rain goes straight to the aquifer your working borewell draws from.",
      "Keep it at least 15–30 m from the working borewell, uphill of it if you can.",
    ],
    care: "Never leave an open borewell — always cap it. Open borewells are a danger to children.",
  },
  {
    id: "shaft", group: "Recharge your borewell", title: "Recharge shaft or trench",
    best: "Where the top soil is clay and water won't soak in", cost: "₹20,000–60,000",
    steps: [
      "A shaft is a 0.3–1 m wide bore or dug well, 5–15 m deep, that punches through the clay to the sandy or fractured layer below.",
      "Fill it with boulders and gravel with sand on top, the same as a pit. A trench is the long, shallow version for big land runoff.",
    ],
    care: "Desilt the inlet chamber after every heavy storm.",
  },
  {
    id: "openwell", group: "Recharge your borewell", title: "Open-well recharge",
    best: "Farms with an old open well", cost: "₹5,000–15,000",
    steps: [
      "Lead filtered roof or field runoff into the open well through a pipe with a sand and gravel filter box.",
      "The well fills and seeps into the ground water around your borewell.",
    ],
    care: "Keep the well covered and clean out silt every summer.",
  },
  {
    id: "pond", group: "Store it", title: "Farm pond",
    best: "Saving rain for irrigation in dry months", cost: "₹50,000–3,00,000 (subsidy often available)",
    steps: [
      "Dig at the lowest corner of the farm where runoff collects. A common size is 20 m × 20 m × 3 m — about 10 lakh litres.",
      "Line it with a 300–500 micron plastic liner to keep water for months; leave it unlined if you want it to recharge the ground instead.",
      "Put a silt trap at the inlet and a spillway for overflow. Fence it.",
      "Pump from it with a small motor into drip or sprinkler — far less power than lifting from a deep borewell.",
    ],
    care: "Ask your agriculture department about farm pond subsidy schemes (often under PMKSY / MGNREGA).",
  },
  {
    id: "sump", group: "Store it", title: "Rooftop sump or tank",
    best: "House, cattle shed and store roofs", cost: "₹25,000–1,50,000",
    steps: [
      "Gutters on every roof edge lead to one pipe with a first-flush diverter, then a filter (sand, gravel, charcoal or a ready filter).",
      "Store in an underground sump (cool, dark, no algae) or ferrocement / plastic tanks above ground.",
      "1 mm of rain on 100 m² of concrete roof gives about 85 litres. A 1,000 sq ft roof in a 900 mm year gives about 70,000 litres.",
    ],
    care: "Clean tanks once a year; keep lids tight against mosquitoes.",
  },
  {
    id: "check", group: "Slow it down on the land", title: "Check dams, percolation ponds and gully plugs",
    best: "Farms with a stream or gully crossing them", cost: "Varies (often built by the panchayat)",
    steps: [
      "Small walls of stone, earth or concrete across a stream slow the water so it soaks in and raises wells and borewells downstream.",
      "Gully plugs are loose stone heaps in small channels that catch silt and slow runoff.",
    ],
    care: "Desilt after the season — silt left behind stops water soaking in.",
  },
  {
    id: "bunds", group: "Slow it down on the land", title: "Field bunds, contour trenches and ridges",
    best: "Every field, especially on slopes", cost: "Low — mostly labour",
    steps: [
      "Raise bunds around fields so rain stays where it falls instead of running off.",
      "On slopes, dig trenches along the contour (level lines) to catch runoff.",
      "Ridge-and-furrow or broad-bed planting holds rain in the furrows near the roots.",
    ],
    care: "Repair breaches right after heavy rain.",
  },
  {
    id: "mulch", group: "Slow it down on the land", title: "Mulch and organic matter",
    best: "Vegetables, banana, coconut basins", cost: "Low",
    steps: [
      "Cover the soil with crop waste, coconut fronds or coir pith, or use plastic mulch with drip.",
      "Mulch cuts evaporation by a quarter or more and lets rain soak in instead of splashing off.",
      "Compost and green manure help soil hold more water after each rain.",
    ],
    care: "Top up mulch as it breaks down.",
  },
];

export const USES = [
  { title: "Irrigation", text: "Pond and tank water through drip or sprinkler in the dry months — it saves borewell hours and electricity." },
  { title: "Spraying", text: "Rainwater is soft, so pesticides, fungicides and liquid fertilisers mix better than with hard borewell water." },
  { title: "Livestock drinking", text: "Clean stored roof water is good drinking water for cows, goats and poultry. Keep troughs clean." },
  { title: "Shed cleaning and washing", text: "Use stored rain for washing sheds, tools, vehicles and clothes, and save borewell water for crops." },
  { title: "Nursery and seedlings", text: "Soft water suits seedling trays and nursery beds." },
  { title: "Household use", text: "Bathing and washing after simple filtering. For drinking, filter and then boil or chlorinate." },
  { title: "Back into the ground", text: "Whatever you can't store, recharge. It is the water your borewell pumps back next summer." },
];
