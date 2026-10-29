import { fetchWeather, cachedWeather, searchPlaces, days, describe, icon, expectedRain } from "./weather.js";
import { CROPS, SOILS, METHODS, SOURCE_KINDS, M2_PER_ACRE, advise, balance, stage, seasonLength, daysBetween, pumpKwh, addDays } from "./model.js";
import { SURFACES, SQFT_PER_M2, catchLitres, rainOutlook, BEFORE_RAIN, METHODS as RAIN_METHODS, USES } from "./rain.js";
import { state, save, replace, uid, todayISO, sampleFarm } from "./store.js";

const view = document.getElementById("view");
const dlg = document.getElementById("dlg");
let weather = cachedWeather(state.loc);
let weatherErr = null;
let tick = null;

// ---------- formatting ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = (n, d = 0) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
const litres = (l) => (l >= 100000 ? `${nf(l / 100000, 1)} lakh L` : `${nf(Math.round(l / 10) * 10)} L`);
const dur = (m) => {
  if (m == null) return "—";
  const h = Math.floor(m / 60), mm = Math.round(m % 60);
  return h ? `${h} h ${mm} m` : `${mm} min`;
};
const dayName = (s, long) => new Date(s + "T00:00").toLocaleDateString(undefined, long ? { weekday: "long", day: "numeric", month: "short" } : { weekday: "short" });
const shortDate = (s) => new Date(s + "T00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
const source = (id) => state.sources.find((s) => s.id === id);
const field = (id) => state.fields.find((f) => f.id === id);
const wdays = () => (weather ? days(weather) : []);

const STATUS = {
  urgent: { tone: "crit", glyph: "!" },
  water: { tone: "warn", glyph: "↓" },
  hold: { tone: "info", glyph: "☂" },
  ok: { tone: "good", glyph: "✓" },
  done: { tone: "muted", glyph: "■" },
  wait: { tone: "muted", glyph: "…" },
};
const pill = (a) => `<span class="pill ${STATUS[a.key].tone}"><b aria-hidden="true">${STATUS[a.key].glyph}</b>${esc(a.label)}</span>`;

// ---------- routing ----------
function route() {
  const [tab, id] = (location.hash.slice(1) || "today").split("/");
  document.querySelectorAll(".tabs a").forEach((a) => a.toggleAttribute("aria-current", a.dataset.tab === (tab === "field" ? "fields" : tab)));
  clearInterval(tick);
  if (!state.seen && tab === "today") return welcome();
  ({ today, fields: fieldsView, field: fieldView, rain: rainView, water: waterView }[tab] || today)(id);
  if (state.running) tick = setInterval(updateRunning, 1000);
  view.focus({ preventScroll: true });
}
addEventListener("hashchange", () => { route(); scrollTo(0, 0); });

async function loadWeather() {
  try { weather = await fetchWeather(state.loc); weatherErr = weather.live ? null : weather.error; }
  catch (e) { weatherErr = e.message; }
  route();
}

// ---------- shared bits ----------
function placeChip() {
  const live = weather && weather.live !== false && !weatherErr;
  return `<button class="place" data-act="place" aria-label="Change location: ${esc(state.loc.name)}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>
    <span>${esc(state.loc.name)}</span><small>${weather ? (live ? "live" : "saved copy") : "loading…"}</small></button>`;
}

function runningBanner() {
  const r = state.running;
  if (!r) return "";
  const f = field(r.fieldId), s = source(r.sourceId);
  return `<section class="running" aria-live="polite">
    <div class="ripple" aria-hidden="true"></div>
    <div><p class="eyebrow">Pump running · ${esc(s?.name || "")}</p><h2>${esc(f?.name || "Field")}</h2>
    <p class="mono" id="run-stats"></p><div class="bar"><span id="run-bar"></span></div></div>
    <button class="btn stop" data-act="stop">Stop &amp; log</button></section>`;
}

function updateRunning() {
  const r = state.running;
  const el = document.getElementById("run-stats");
  if (!r || !el) return;
  const s = source(r.sourceId);
  const min = (Date.now() - r.start) / 60000;
  const l = min * (s?.flowLpm || 0);
  const secs = Math.floor((Date.now() - r.start) / 1000);
  const clock = `${Math.floor(secs / 3600)}:${String(Math.floor(secs / 60) % 60).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  el.textContent = `${clock} · ${litres(l)}${r.target ? ` of ${litres(r.target)}` : ""}`;
  const bar = document.getElementById("run-bar");
  if (bar) bar.style.width = r.target ? `${Math.min(100, (l / r.target) * 100)}%` : "100%";
}

function gauge(left, rawLeft) {
  const pct = Math.round(Math.max(0, Math.min(1, left)) * 100);
  const line = Math.round(rawLeft * 100);
  return `<div class="gauge" role="img" aria-label="Soil water ${pct}% of what the roots can use">
    <div class="fill" style="height:${pct}%"></div><div class="line" style="bottom:${line}%"></div>
    <span>${pct}%</span></div>`;
}

function strip(list) {
  return `<ol class="strip">${list.map((d) => {
    const [txt, kind] = describe(d.code);
    return `<li class="${d.today ? "is-today" : ""}" title="${esc(txt)}"><span class="d">${d.today ? "Today" : dayName(d.date)}</span>
      ${icon(kind)}<span class="t">${Math.round(d.tmax)}°</span>
      <span class="r ${d.rain >= 10 ? "big" : ""}">${d.rain >= 0.5 ? `${nf(d.rain, d.rain < 10 ? 1 : 0)} mm` : "dry"}</span>
      <span class="e">ET ${nf(d.et0, 1)}</span></li>`;
  }).join("")}</ol>`;
}

// ---------- welcome ----------
function welcome() {
  view.innerHTML = `<section class="page welcome">
    <div class="hero-drop" aria-hidden="true"><svg viewBox="0 0 120 150"><path d="M60 6C60 6 14 64 14 96a46 46 0 0 0 92 0C106 64 60 6 60 6z"/><path class="wave" d="M14 100c15-8 31 8 46 0s31 8 46 0v40H14z"/></svg></div>
    <h1>Water each field only when it needs it.</h1>
    <p class="lede">Tell the app your fields, crops and borewell. It reads live weather for your farm — how hot and dry it is, how much rain fell and how much is coming — and says each morning which field to water, how many litres, and how long to run the pump. Rain on the way? It tells you to hold, and to get your borewell recharge pit ready.</p>
    <div class="row">
      <button class="btn primary" data-act="sample">Try it with a sample farm</button>
      <button class="btn" data-act="start">Start with my own farm</button>
    </div>
    <p class="fine">Your data stays on this phone or computer. Weather comes from Open-Meteo.</p>
  </section>`;
}

// ---------- today ----------
function today() {
  const wd = wdays();
  const ahead = wd.filter((d) => !d.past).slice(0, 7);
  const out = rainOutlook(wd);
  const advice = state.fields.map((f) => ({ f, a: wd.length ? advise(f, wd, state.logs, source(f.sourceId)) : null }));
  const order = { urgent: 0, water: 1, hold: 2, ok: 3, wait: 4, done: 5 };
  advice.sort((x, y) => (order[x.a?.key] ?? 9) - (order[y.a?.key] ?? 9));
  const due = advice.filter((x) => x.a && (x.a.key === "water" || x.a.key === "urgent"));
  const dueL = due.reduce((s, x) => s + x.a.amount.litres, 0);
  const now = weather?.data?.current;

  view.innerHTML = `<section class="page">
    <div class="page-head split">
      <div><p class="eyebrow">${dayName(todayISO(), true)}</p>
      <h1>${!wd.length ? "Fetching weather…" : due.length ? `${due.length} field${due.length > 1 ? "s" : ""} to water today` : "No watering needed today"}</h1>
      <p class="lede">${due.length ? `About <b>${litres(dueL)}</b> in all.` : wd.length ? "Every field has enough water in the soil." : ""}
      ${now ? ` Now ${Math.round(now.temperature_2m)}°, humidity ${now.relative_humidity_2m}%.` : ""}</p></div>
      ${placeChip()}
    </div>
    ${weatherErr && !weather ? `<p class="notice">Couldn't reach the weather service (${esc(weatherErr)}). <button class="link" data-act="retry">Try again</button></p>` : ""}
    ${runningBanner()}
    ${out.big.length ? `<a class="rain-alert" href="#rain">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 15a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.4 1.5A3.5 3.5 0 0 1 17.5 15z"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/></svg>
      <div><b>Heavy rain ${out.big[0].date === todayISO() ? "today" : `on ${dayName(out.big[0].date, true)}`} — about ${Math.round(out.big[0].rain)} mm.</b>
      <span>Get the borewell recharge pit ready${state.catchments.length ? ` · your roofs and land could send ${litres(catchLitres(state.catchments.filter((c) => c.to === "recharge"), out.big[0].rain))} into the ground` : ""}. See what to do →</span></div></a>` : ""}
    ${ahead.length ? `<h2 class="sec">Next 7 days <small>rain and evaporation (mm)</small></h2>${strip(ahead)}` : ""}
    <h2 class="sec">Fields</h2>
    ${state.fields.length ? `<div class="cards">${advice.map(({ f, a }) => fieldCard(f, a)).join("")}</div>`
      : `<div class="empty"><p>No fields yet.</p><button class="btn primary" data-act="add-field">Add a field</button></div>`}
  </section>`;
  updateRunning();
}

function fieldCard(f, a) {
  const crop = CROPS[f.crop], s = source(f.sourceId);
  const t = a?.t;
  const busy = state.running?.fieldId === f.id;
  const needs = a && (a.key === "water" || a.key === "urgent" || a.key === "hold");
  return `<article class="card ${a ? STATUS[a.key].tone : ""}">
    <a class="card-link" href="#field/${f.id}" aria-label="Open ${esc(f.name)}"></a>
    ${t ? gauge(t.left, t.rawLeft) : `<div class="gauge empty"></div>`}
    <div class="card-body">
      <p class="eyebrow">${esc(crop.name)} · ${nf(f.acres, 2)} ac · ${esc(METHODS[f.method].name)}</p>
      <h3>${esc(f.name)}</h3>
      ${a ? pill(a) : ""}
      ${needs && a.amount ? `<p class="amount"><b>${litres(a.amount.litres)}</b> · ${nf(a.amount.mm, 1)} mm${a.amount.minutes ? ` · <b>${dur(a.amount.minutes)}</b> on ${esc(s.name)}` : ""}</p>` : ""}
      ${a?.detail ? `<p class="detail">${esc(a.detail)}</p>` : ""}
      <div class="row">
        ${busy ? `<button class="btn stop sm" data-act="stop">Stop pump</button>`
          : s && a?.key !== "done" ? `<button class="btn ${a?.key === "water" || a?.key === "urgent" ? "primary" : ""} sm" data-act="pump" data-id="${f.id}" ${state.running ? "disabled" : ""}>▶ Start pump</button>` : ""}
        <button class="btn sm" data-act="log" data-id="${f.id}">Log watering</button>
        <button class="btn sm ghost" data-act="check" data-id="${f.id}">Soil check</button>
      </div>
    </div></article>`;
}

// ---------- fields ----------
function fieldsView() {
  view.innerHTML = `<section class="page">
    <div class="page-head split"><div><h1>Fields</h1><p class="lede">Each field's crop, soil and watering method decide how fast it dries out.</p></div>
    <button class="btn primary" data-act="add-field">+ Add field</button></div>
    ${state.fields.length ? `<ul class="list">${state.fields.map((f) => {
      const crop = CROPS[f.crop];
      const dap = f.sown ? daysBetween(f.sown, todayISO()) : null;
      const st = stage(crop, dap ?? 999);
      return `<li><a href="#field/${f.id}"><div><h3>${esc(f.name)}</h3>
        <p>${esc(crop.name)} · ${nf(f.acres, 2)} acres · ${esc(SOILS[f.soil].name)} · ${esc(METHODS[f.method].name)}</p></div>
        <span class="meta">${dap != null ? (dap < 0 ? `sowing in ${-dap} d` : `day ${dap} · ${st.name}`) : st.name}</span></a></li>`;
    }).join("")}</ul>` : `<div class="empty"><p>Add your first field to get watering advice.</p></div>`}
    <h2 class="sec">Water sources</h2>
    <ul class="list">${state.sources.map((s) => `<li><button class="rowbtn" data-act="edit-source" data-id="${s.id}"><div><h3>${esc(s.name)}</h3>
      <p>${esc(SOURCE_KINDS[s.kind])} · ${nf(s.flowLpm)} L/min${s.hp ? ` · ${s.hp} HP` : ""}${s.capacityL ? ` · holds ${litres(s.capacityL)}` : ""}</p></div><span class="meta">Edit</span></button></li>`).join("")}</ul>
    <button class="btn" data-act="add-source">+ Add water source</button>
    <h2 class="sec">Backup</h2>
    <div class="row"><button class="btn sm" data-act="export">Export data</button><label class="btn sm">Import<input type="file" accept="application/json" data-act="import" hidden></label>
    <button class="btn sm ghost danger" data-act="reset">Clear everything</button></div>
  </section>`;
}

function fieldView(id) {
  const f = field(id);
  if (!f) { location.hash = "#fields"; return; }
  const wd = wdays();
  const crop = CROPS[f.crop], s = source(f.sourceId);
  const a = wd.length ? advise(f, wd, state.logs, s) : null;
  const logs = state.logs.filter((l) => l.fieldId === f.id).sort((x, y) => y.date.localeCompare(x.date));
  const dap = f.sown ? daysBetween(f.sown, todayISO()) : null;
  const st = stage(crop, dap ?? 999);
  const len = seasonLength(crop);
  view.innerHTML = `<section class="page">
    <a class="back" href="#today">← Today</a>
    <div class="page-head split"><div><p class="eyebrow">${esc(crop.name)} · ${nf(f.acres, 2)} acres · ${esc(SOILS[f.soil].name)} soil</p>
    <h1>${esc(f.name)}</h1>${a ? pill(a) : ""}</div>
    <div class="row"><button class="btn sm" data-act="edit-field" data-id="${f.id}">Edit</button></div></div>
    ${runningBanner()}
    <div class="facts">
      <div><span>Crop stage</span><b class="word">${esc(st.name)}</b><small>${dap != null && len ? `day ${Math.max(0, dap)} of ~${len}` : "perennial"}</small></div>
      <div><span>Crop factor</span><b>${nf(st.kc, 2)}</b><small>× evaporation</small></div>
      <div><span>Soil water now</span><b>${a?.t ? `${Math.round(a.t.left * 100)}%` : "—"}</b><small>${a?.t ? `${nf(a.t.taw - a.t.dr, 0)} of ${nf(a.t.taw, 0)} mm` : ""}</small></div>
      <div><span>To fill it up</span><b>${a?.amount ? litres(a.amount.litres) : "—"}</b><small>${a?.amount?.minutes ? `${dur(a.amount.minutes)} on ${esc(s.name)}` : ""}</small></div>
    </div>
    ${a?.detail ? `<p class="detail">${esc(a.detail)}</p>` : ""}
    ${crop.note ? `<p class="fine">${esc(crop.note)}</p>` : ""}
    <div class="row">
      ${state.running?.fieldId === f.id ? `<button class="btn stop" data-act="stop">Stop pump</button>` : s ? `<button class="btn primary" data-act="pump" data-id="${f.id}" ${state.running ? "disabled" : ""}>▶ Start pump</button>` : ""}
      <button class="btn" data-act="log" data-id="${f.id}">Log watering</button>
      <button class="btn ghost" data-act="check" data-id="${f.id}">Soil check</button>
    </div>
    ${a?.rows?.length ? `<h2 class="sec">Soil water <small>last 30 days and the forecast</small></h2>${chart(a.rows)}` : ""}
    <h2 class="sec">History</h2>
    ${logs.length ? `<ul class="list compact">${logs.slice(0, 40).map(logRow).join("")}</ul>` : `<p class="fine">Nothing logged yet.</p>`}
  </section>`;
  bindChart();
}

function logRow(l) {
  const f = field(l.fieldId), s = source(l.sourceId);
  const what = l.type === "check" ? `Soil check: ${["wet", "", "moist", "", "dry"][Math.round(l.level * 5)] || `${Math.round((1 - l.level) * 100)}% water`}`
    : `${litres(l.litres)}${l.minutes ? ` · ${dur(l.minutes)}` : ""}${s ? ` · ${esc(s.name)}` : ""}`;
  return `<li><div><h3>${shortDate(l.date)} · ${esc(f?.name || "")}</h3><p>${what}${l.note ? ` — ${esc(l.note)}` : ""}</p></div>
    <button class="icon-btn" data-act="del-log" data-id="${l.id}" aria-label="Delete this entry">✕</button></li>`;
}

// Soil water as a share of what roots can use; a dashed line marks where to water.
function chart(rows) {
  const W = 760, H = 220, P = { l: 40, r: 12, t: 12, b: 24 }, RH = 60;
  const x = (i) => P.l + (i / Math.max(1, rows.length - 1)) * (W - P.l - P.r);
  // Zoom in on the band the line actually uses so small dips stay visible.
  const lo = Math.max(0, Math.floor((Math.min(...rows.map((r) => Math.min(r.left, r.rawLeft))) - 0.1) * 10) / 10);
  const y = (v) => P.t + ((1 - v) / (1 - lo)) * (H - P.t - P.b);
  const ti = rows.findIndex((r) => r.today);
  const path = (rs, off) => rs.map((r, i) => `${i ? "L" : "M"}${x(i + off).toFixed(1)},${y(Math.max(lo, r.left)).toFixed(1)}`).join("");
  const past = rows.slice(0, ti + 1), fut = rows.slice(Math.max(0, ti));
  const thr = rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r.rawLeft).toFixed(1)}`).join("");
  const maxIn = Math.max(10, ...rows.map((r) => r.rain + r.applied));
  const bw = Math.max(3, (W - P.l - P.r) / rows.length - 3);
  const ry = (v) => (v / maxIn) * (RH - 16);
  const ticks = rows.map((r, i) => ({ r, i })).filter(({ i }) => i % 7 === (ti % 7));
  return `<figure class="chart" data-lo="${lo}" data-rows='${esc(JSON.stringify(rows.map((r) => ({ d: r.date, l: r.left, rain: r.rain, w: r.applied, raw: r.rawLeft }))))}'>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Soil water over time. Watering is due when the line drops below the dashed line.">
      ${[lo, (lo + 1) / 2, 1].map((v) => `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v * 100)}%</text>`).join("")}
      <path class="zone" d="${thr}L${x(rows.length - 1)},${y(lo)}L${x(0)},${y(lo)}Z"/>
      <path class="thr" d="${thr}"/>
      ${ti >= 0 ? `<line class="now" x1="${x(ti)}" x2="${x(ti)}" y1="${P.t}" y2="${H - P.b}"/><text class="ax" x="${x(ti) + 4}" y="${P.t + 10}">today</text>` : ""}
      <path class="ln" d="${path(past, 0)}"/>
      <path class="ln fut" d="${path(fut, Math.max(0, ti))}"/>
      ${ticks.map(({ r, i }) => `<text class="ax" x="${x(i)}" y="${H - 6}" text-anchor="middle">${shortDate(r.date)}</text>`).join("")}
      <text class="ax zone-label" x="${W - P.r - 4}" y="${y(lo) - 6}" text-anchor="end">water when the line drops in here</text>
      <g class="hover" hidden><circle class="dot" r="5"/><line class="cross" y1="${P.t}" y2="${H - P.b}"/></g>
    </svg>
    <svg viewBox="0 0 ${W} ${RH}" class="bars" role="img" aria-label="Rain and watering per day, in mm">
      ${rows.map((r, i) => {
        const hr = ry(r.rain), hw = ry(r.applied), cx = x(i) - bw / 2, base = RH - 4;
        return `${hr ? `<rect class="b-rain" x="${cx}" y="${base - hr}" width="${bw}" height="${hr}" rx="2"/>` : ""}
          ${hw ? `<rect class="b-water" x="${cx}" y="${base - hr - hw - (hr ? 2 : 0)}" width="${bw}" height="${hw}" rx="2"/>` : ""}`;
      }).join("")}
      <line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${RH - 4}" y2="${RH - 4}"/>
    </svg>
    <figcaption class="legend"><span><i class="k-ln"></i>Soil water</span><span><i class="k-thr"></i>Water below this</span><span><i class="k-rain"></i>Rain</span><span><i class="k-water"></i>Your watering</span></figcaption>
    <div class="tip" hidden></div>
  </figure>`;
}

function bindChart() {
  const fig = view.querySelector(".chart");
  if (!fig) return;
  const rows = JSON.parse(fig.dataset.rows);
  const svg = fig.querySelector("svg"), tip = fig.querySelector(".tip");
  const dot = svg.querySelector(".dot"), cross = svg.querySelector(".cross"), hov = svg.querySelector(".hover");
  const W = 760, l = 40, r = 12, H = 220;
  const move = (ev) => {
    const b = svg.getBoundingClientRect();
    const px = ((ev.clientX - b.left) / b.width) * W;
    const i = Math.max(0, Math.min(rows.length - 1, Math.round(((px - l) / (W - l - r)) * (rows.length - 1))));
    const d = rows[i];
    const cx = l + (i / Math.max(1, rows.length - 1)) * (W - l - r);
    const lo = Number(fig.dataset.lo);
    const cy = 12 + ((1 - Math.max(lo, d.l)) / (1 - lo)) * (H - 36);
    dot.setAttribute("cx", cx); dot.setAttribute("cy", cy);
    cross.setAttribute("x1", cx); cross.setAttribute("x2", cx);
    tip.hidden = false; hov.removeAttribute("hidden");
    tip.innerHTML = `<b>${shortDate(d.d)}${d.d > todayISO() ? " (forecast)" : ""}</b><span>Soil water ${Math.round(d.l * 100)}%</span>${d.rain ? `<span>Rain ${nf(d.rain, 1)} mm</span>` : ""}${d.w ? `<span>Watered ${nf(d.w, 1)} mm</span>` : ""}`;
    const fx = (cx / W) * b.width;
    tip.style.left = `${Math.min(b.width - 150, Math.max(0, fx + 12))}px`;
    tip.style.top = `${(cy / H) * b.height}px`;
  };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerleave", () => { tip.hidden = true; hov.setAttribute("hidden", ""); });
}

// ---------- rain ----------
function rainView() {
  const wd = wdays();
  const out = rainOutlook(wd);
  const rech = state.catchments.filter((c) => c.to === "recharge");
  const store = state.catchments.filter((c) => c.to !== "recharge");
  const yearL = catchLitres(state.catchments, state.annualRain);
  const groups = [...new Set(RAIN_METHODS.map((m) => m.group))];
  view.innerHTML = `<section class="page">
    <div class="page-head split"><div><h1>Rain &amp; borewell recharge</h1>
    <p class="lede">Every litre that soaks back into the ground near your borewell is a litre it can pump next summer. Catch what you can store, and send the rest down.</p></div>${placeChip()}</div>

    <div class="facts">
      <div><span>Rain in the last 30 days</span><b>${nf(out.last30, 0)} mm</b></div>
      <div><span>Likely in the next 7 days</span><b>${nf(out.next7, 0)} mm</b></div>
      <div><span>Into your recharge pit, next 7 days</span><b>${litres(catchLitres(rech, out.next7))}</b></div>
      <div><span>Into storage, next 7 days</span><b>${litres(catchLitres(store, out.next7))}</b></div>
    </div>

    ${out.big.length ? `<div class="callout rain">
      <h2>Heavy rain coming</h2>
      <ul class="rain-days">${out.big.map((d) => `<li><b>${dayName(d.date, true)}</b> ${nf(d.rain, 0)} mm${d.prob != null ? ` · ${d.prob}% chance` : ""}
        ${state.catchments.length ? `<span>→ ${litres(catchLitres(rech, d.rain))} to recharge · ${litres(catchLitres(store, d.rain))} to storage</span>` : ""}</li>`).join("")}</ul>
      <h3>Before it rains</h3><ol class="steps">${BEFORE_RAIN.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    </div>` : `<div class="callout"><h2>No heavy rain in the next two weeks</h2><p>A good time to desilt the recharge pit, replace its top sand layer, clean gutters and check the first-flush diverter — so you are ready when it comes.</p>
      <details><summary>Checklist for rain days</summary><ol class="steps">${BEFORE_RAIN.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></details></div>`}

    <h2 class="sec">Where your rain lands <small>roofs and land that drain to a tank or a recharge pit</small></h2>
    ${state.catchments.length ? `<ul class="list compact">${state.catchments.map((c) => `<li><div><h3>${esc(c.name)}</h3>
      <p>${nf(c.m2)} m² (${nf(c.m2 * SQFT_PER_M2)} sq ft) · ${esc(SURFACES[c.surface].name)} · goes to ${c.to === "recharge" ? "recharge pit" : "storage"}</p></div>
      <span class="meta">${litres(catchLitres([c], 10))} per 10 mm</span>
      <button class="icon-btn" data-act="del-catch" data-id="${c.id}" aria-label="Remove ${esc(c.name)}">✕</button></li>`).join("")}</ul>` : `<p class="fine">Add your roofs and the land that drains toward your pit to see how many litres each rain gives.</p>`}
    <div class="row"><button class="btn" data-act="add-catch">+ Add roof or land</button>
    <label class="inline">Yearly rainfall <input type="number" min="100" max="5000" step="10" value="${state.annualRain}" data-act="annual"> mm</label></div>
    ${state.catchments.length ? `<p class="big-number"><b>${litres(yearL)}</b> a year from these surfaces in a ${nf(state.annualRain)} mm year — ${litres(catchLitres(rech, state.annualRain))} to recharge, ${litres(catchLitres(store, state.annualRain))} to storage.</p>` : ""}

    <h2 class="sec">Ways to catch, store and recharge</h2>
    ${groups.map((g) => `<h3 class="group">${esc(g)}</h3><div class="methods">${RAIN_METHODS.filter((m) => m.group === g).map((m) => `
      <details class="method"><summary><span>${esc(m.title)}</span><small>${esc(m.best)}</small></summary>
        <p class="fine">Typical cost: ${esc(m.cost)}</p>
        <ol class="steps">${m.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        <p class="care"><b>Upkeep:</b> ${esc(m.care)}</p>
        ${m.id === "borepit" ? pitDiagram() : ""}
      </details>`).join("")}</div>`).join("")}

    <h2 class="sec">Ways to use rainwater</h2>
    <div class="uses">${USES.map((u) => `<div><h3>${esc(u.title)}</h3><p>${esc(u.text)}</p></div>`).join("")}</div>
    <p class="fine">Costs are rough 2026 figures for South India and vary by depth, soil and labour. For a deep borewell recharge, ask your local groundwater or agriculture office — many districts give subsidy and technical help.</p>
  </section>`;
}

function pitDiagram() {
  return `<figure class="pit" role="img" aria-label="Cross-section of a borewell recharge pit: water enters through a silt trap, passes down through sand, gravel and boulders, and enters the borewell casing through slotted holes wrapped in mesh.">
  <svg viewBox="0 0 420 240">
    <rect x="0" y="40" width="420" height="200" fill="var(--soil)"/>
    <rect x="120" y="40" width="180" height="150" fill="var(--soil-dark)"/>
    <rect x="120" y="40" width="180" height="40" fill="var(--sand)"/><text x="132" y="65" class="svg-label">coarse sand</text>
    <rect x="120" y="80" width="180" height="50" fill="var(--gravel)"/><text x="132" y="110" class="svg-label">gravel 20–40 mm</text>
    <rect x="120" y="130" width="180" height="60" fill="var(--boulder)"/><text x="132" y="165" class="svg-label on-dark">boulders</text>
    <rect x="252" y="14" width="16" height="226" fill="var(--casing)"/>
    <g fill="var(--water)">${[96, 116, 136, 156, 176].map((yy) => `<circle cx="260" cy="${yy}" r="3"/>`).join("")}</g>
    <rect x="248" y="88" width="24" height="100" fill="none" stroke="var(--ink)" stroke-dasharray="3 3"/>
    <text x="282" y="138" class="svg-label">holes + mesh</text>
    <rect x="20" y="22" width="60" height="30" fill="var(--soil-dark)" stroke="var(--ink)"/><text x="50" y="16" text-anchor="middle" class="svg-label">silt trap</text>
    <path d="M80 36 H140" stroke="var(--water)" stroke-width="3" marker-end="url(#pa)"/>
    <path d="M190 50 V180" stroke="var(--water)" stroke-width="2" stroke-dasharray="5 5" marker-end="url(#pa)"/>
    <text x="276" y="26" class="svg-label">borewell (capped)</text>
    <defs><marker id="pa" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--water)"/></marker></defs>
  </svg></figure>`;
}

// ---------- water use ----------
function waterView() {
  const t = todayISO();
  const from = addDays(t, -29);
  const logs = state.logs.filter((l) => l.type === "water" && l.date >= from);
  const total = logs.reduce((s, l) => s + l.litres, 0);
  const mins = logs.reduce((s, l) => s + (l.minutes || 0), 0);
  const kwh = logs.reduce((s, l) => s + pumpKwh(source(l.sourceId), l.minutes || 0), 0);
  const perDay = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(from, i);
    return { d, l: logs.filter((x) => x.date === d).reduce((s, x) => s + x.litres, 0) };
  });
  const max = Math.max(1, ...perDay.map((p) => p.l));
  const byField = state.fields.map((f) => ({ f, l: logs.filter((x) => x.fieldId === f.id).reduce((s, x) => s + x.litres, 0) })).sort((a, b) => b.l - a.l);
  const all = state.logs.slice().sort((a, b) => b.date.localeCompare(a.date));
  view.innerHTML = `<section class="page">
    <div class="page-head"><h1>Water use</h1><p class="lede">What you pumped in the last 30 days.</p></div>
    <div class="facts">
      <div><span>Water pumped</span><b>${litres(total)}</b></div>
      <div><span>Pump time</span><b>${dur(mins)}</b></div>
      <div><span>Electricity (est.)</span><b>${nf(kwh, 0)} units</b><small>from motor HP</small></div>
    </div>
    <h2 class="sec">Litres per day</h2>
    <figure class="daybars" role="img" aria-label="Litres pumped each day over the last 30 days">
      ${perDay.map((p) => `<div class="db" title="${shortDate(p.d)}: ${litres(p.l)}"><span style="height:${(p.l / max) * 100}%"></span></div>`).join("")}
      <figcaption><span>${shortDate(from)}</span><span>max ${litres(max)}</span><span>today</span></figcaption>
    </figure>
    <h2 class="sec">By field</h2>
    <ul class="list compact">${byField.map(({ f, l }) => `<li><div><h3>${esc(f.name)}</h3><p>${esc(CROPS[f.crop].name)} · ${nf(l / (f.acres * M2_PER_ACRE), 0)} mm over the field</p></div><span class="meta">${litres(l)}</span></li>`).join("")}</ul>
    <h2 class="sec">Tanks and ponds</h2>
    ${state.sources.filter((s) => s.capacityL).map((s) => `<div class="tank"><div class="tank-bar"><span style="width:${Math.min(100, (s.levelL / s.capacityL) * 100)}%"></span></div>
      <p><b>${esc(s.name)}</b> ${litres(s.levelL)} of ${litres(s.capacityL)} <button class="link" data-act="set-level" data-id="${s.id}">Set level</button></p></div>`).join("") || `<p class="fine">Add a tank or farm pond with its size under Fields → Water sources to track its level.</p>`}
    <h2 class="sec">All entries</h2>
    ${all.length ? `<ul class="list compact">${all.slice(0, 60).map(logRow).join("")}</ul>` : `<p class="fine">Nothing logged yet.</p>`}
  </section>`;
}

// ---------- dialogs ----------
function openDialog(html, onSubmit) {
  dlg.innerHTML = `<form method="dialog" class="dlg-form">${html}
    <div class="row end"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn primary" value="ok">Save</button></div></form>`;
  const form = dlg.querySelector("form");
  form.addEventListener("submit", (e) => {
    if (e.submitter?.value !== "ok") return;
    const data = Object.fromEntries(new FormData(form));
    if (onSubmit(data, form) === false) e.preventDefault();
  });
  dlg.showModal();
  form.querySelector("input,select")?.focus();
  return form;
}

const opts = (obj, sel, label = (v) => v.name ?? v) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${esc(label(v))}</option>`).join("");

function editField(f = null) {
  const isNew = !f;
  f = f || { name: "", crop: "tomato", acres: 1, soil: "red", method: "drip", sown: todayISO(), sourceId: state.sources[0]?.id };
  if (!state.sources.length) return editSource(null, () => editField());
  openDialog(`<h2>${isNew ? "Add a field" : "Edit field"}</h2>
    <label>Name<input name="name" required value="${esc(f.name)}" placeholder="e.g. East plot"></label>
    <div class="two"><label>Crop<select name="crop">${opts(CROPS, f.crop)}</select></label>
    <label>Area (acres)<input name="acres" type="number" step="0.05" min="0.01" required value="${f.acres}"></label></div>
    <div class="two"><label>Soil<select name="soil">${opts(SOILS, f.soil)}</select></label>
    <label>Watering method<select name="method">${opts(METHODS, f.method)}</select></label></div>
    <div class="two"><label>Sown or planted on<input name="sown" type="date" value="${f.sown || ""}"><small>Leave empty for coconut, mango and other established trees.</small></label>
    <label>Water from<select name="sourceId">${state.sources.map((s) => `<option value="${s.id}" ${s.id === f.sourceId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label></div>
    ${isNew ? "" : `<button type="button" class="link danger" data-act="del-field" data-id="${f.id}">Delete this field</button>`}`,
  (d) => {
    const rec = { ...f, ...d, acres: Number(d.acres) };
    if (isNew) { rec.id = uid(); state.fields.push(rec); } else Object.assign(field(f.id), rec);
    save(); route();
  });
}

function editSource(s = null, then) {
  const isNew = !s;
  s = s || { name: "Borewell", kind: "borewell", flowLpm: 200, hp: 5, capacityL: "", levelL: "" };
  const form = openDialog(`<h2>${isNew ? "Add a water source" : "Edit water source"}</h2>
    ${isNew && !state.sources.length ? `<p class="fine">First, where does your water come from?</p>` : ""}
    <div class="two"><label>Name<input name="name" required value="${esc(s.name)}"></label>
    <label>Type<select name="kind">${opts(SOURCE_KINDS, s.kind)}</select></label></div>
    <div class="two"><label>Pump flow (litres per minute)<input name="flowLpm" type="number" min="1" required value="${s.flowLpm}">
      <small>Time how long the pump takes to fill a 20 L bucket: 20 ÷ seconds × 60.</small></label>
    <label>Motor (HP)<input name="hp" type="number" step="0.5" min="0" value="${s.hp ?? ""}"></label></div>
    <div class="two cap"><label>Holds (litres)<input name="capacityL" type="number" min="0" value="${s.capacityL ?? ""}"><small>For tanks and ponds.</small></label>
    <label>Now holds (litres)<input name="levelL" type="number" min="0" value="${s.levelL ?? ""}"></label></div>
    ${isNew ? "" : `<button type="button" class="link danger" data-act="del-source" data-id="${s.id}">Delete this source</button>`}`,
  (d) => {
    const rec = { ...s, ...d, flowLpm: Number(d.flowLpm), hp: Number(d.hp) || 0, capacityL: Number(d.capacityL) || 0, levelL: Number(d.levelL) || 0 };
    if (isNew) { rec.id = uid(); state.sources.push(rec); } else Object.assign(source(s.id), rec);
    save();
    if (then) setTimeout(then, 0); else route();
  });
  form.querySelector("[name=flowLpm]").focus();
}

function logWatering(f) {
  const s = source(f.sourceId);
  openDialog(`<h2>Log watering · ${esc(f.name)}</h2>
    <div class="two"><label>Date<input name="date" type="date" required value="${todayISO()}" max="${todayISO()}"></label>
    <label>Water from<select name="sourceId">${state.sources.map((x) => `<option value="${x.id}" ${x.id === f.sourceId ? "selected" : ""}>${esc(x.name)} (${x.flowLpm} L/min)</option>`).join("")}</select></label></div>
    <div class="two"><label>Pump ran for (minutes)<input name="minutes" type="number" min="0" step="1" placeholder="e.g. 90"></label>
    <label>…or litres<input name="litres" type="number" min="0" step="10" placeholder="if you know it"></label></div>
    <label>Note<input name="note" placeholder="optional"></label>`,
  (d, form) => {
    const src = source(d.sourceId) || s;
    const minutes = Number(d.minutes) || 0;
    const l = Number(d.litres) || minutes * (src?.flowLpm || 0);
    if (!l) { form.querySelector("[name=minutes]").setCustomValidity("Enter minutes or litres"); form.reportValidity(); form.querySelector("[name=minutes]").setCustomValidity(""); return false; }
    addLog({ type: "water", fieldId: f.id, sourceId: src?.id, date: d.date, minutes: minutes || Math.round(l / (src?.flowLpm || 1)), litres: l, note: d.note });
  });
}

function addLog(l) {
  state.logs.push({ id: uid(), ...l });
  const s = source(l.sourceId);
  if (s?.capacityL && l.type === "water") s.levelL = Math.max(0, (s.levelL || 0) - l.litres);
  save(); route();
  toast(`Logged ${litres(l.litres)} on ${field(l.fieldId)?.name}`);
}

function soilCheck(f) {
  openDialog(`<h2>Soil check · ${esc(f.name)}</h2>
    <p class="fine">Dig 10–15 cm down near the roots and squeeze a handful of soil. This resets the app's estimate to what you see.</p>
    <fieldset class="choices">
      <label><input type="radio" name="level" value="0" required><b>Wet</b><span>Sticks together, leaves water on your hand</span></label>
      <label><input type="radio" name="level" value="0.4"><b>Moist</b><span>Forms a ball, feels cool, no water on hand</span></label>
      <label><input type="radio" name="level" value="0.8"><b>Dry</b><span>Crumbles, won't hold a shape</span></label>
    </fieldset>`,
  (d) => {
    state.logs.push({ id: uid(), type: "check", fieldId: f.id, date: todayISO(), level: Number(d.level) });
    save(); route(); toast("Soil check saved");
  });
}

function addCatchment() {
  openDialog(`<h2>Add a roof or land</h2>
    <label>Name<input name="name" required placeholder="e.g. House terrace"></label>
    <div class="two"><label>Surface<select name="surface">${opts(SURFACES, "concrete")}</select></label>
    <label>Goes to<select name="to"><option value="sump">Storage (sump, tank, pond)</option><option value="recharge">Borewell recharge pit</option></select></label></div>
    <div class="two"><label>Area<input name="area" type="number" min="1" required placeholder="e.g. 1200"></label>
    <label>Unit<select name="unit"><option value="sqft">sq ft</option><option value="m2">m²</option></select></label></div>
    <p class="fine">For a roof, measure the flat area it covers (length × width), not the slope.</p>`,
  (d) => {
    const m2 = d.unit === "sqft" ? Number(d.area) / SQFT_PER_M2 : Number(d.area);
    state.catchments.push({ id: uid(), name: d.name, surface: d.surface, to: d.to, m2 });
    save(); route();
  });
}

function setLevel(s) {
  openDialog(`<h2>${esc(s.name)} level</h2>
    <label>Now holds (litres)<input name="levelL" type="number" min="0" max="${s.capacityL}" required value="${s.levelL}"></label>
    <p class="fine">Holds up to ${litres(s.capacityL)}.</p>`,
  (d) => { s.levelL = Number(d.levelL); save(); route(); });
}

function pickPlace() {
  const form = openDialog(`<h2>Farm location</h2>
    <button type="button" class="btn sm" data-act="geo">Use my current location</button>
    <label>Or search a town or village<input name="q" autocomplete="off" placeholder="e.g. Tenkasi"></label>
    <ul class="results" role="listbox"></ul>`, () => false);
  form.querySelector("[value=ok]").hidden = true;
  const ul = form.querySelector(".results");
  let timer;
  form.q.addEventListener("input", () => {
    clearTimeout(timer);
    const q = form.q.value.trim();
    if (q.length < 2) { ul.innerHTML = ""; return; }
    timer = setTimeout(async () => {
      try {
        const res = await searchPlaces(q);
        ul.innerHTML = res.map((p, i) => `<li><button type="button" data-i="${i}"><b>${esc(p.name)}</b> <small>${esc(p.region)}</small></button></li>`).join("") || `<li class="fine">No places found.</li>`;
        ul.onclick = (e) => { const b = e.target.closest("button[data-i]"); if (b) setPlace(res[b.dataset.i]); };
      } catch (e) { ul.innerHTML = `<li class="fine">${esc(e.message)}</li>`; }
    }, 300);
  });
}

function setPlace(p) {
  state.loc = p; save(); dlg.close(); weather = cachedWeather(p); route(); loadWeather();
}

// ---------- pump ----------
function startPump(f) {
  const s = source(f.sourceId);
  const a = advise(f, wdays(), state.logs, s);
  state.running = { fieldId: f.id, sourceId: s.id, start: Date.now(), target: a.amount?.litres > 0 ? a.amount.litres : null };
  save(); route();
}
function stopPump() {
  const r = state.running;
  if (!r) return;
  const s = source(r.sourceId);
  const minutes = Math.max(1, Math.round((Date.now() - r.start) / 60000));
  state.running = null;
  addLog({ type: "water", fieldId: r.fieldId, sourceId: r.sourceId, date: todayISO(), minutes, litres: minutes * (s?.flowLpm || 0) });
}

// ---------- toast ----------
let toastTimer;
function toast(msg, undo) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button class="link">Undo</button>` : ""}`;
  if (undo) t.querySelector("button").onclick = () => { undo(); t.classList.remove("show"); };
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 5000);
}

// ---------- events ----------
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || b.tagName === "INPUT") return;
  const id = b.dataset.id;
  const act = b.dataset.act;
  if (act === "sample") { replace(sampleFarm()); route(); loadWeather(); }
  else if (act === "start") { state.seen = true; save(); editSource(null, () => editField()); route(); }
  else if (act === "place") pickPlace();
  else if (act === "retry") loadWeather();
  else if (act === "add-field") editField();
  else if (act === "edit-field") editField(field(id));
  else if (act === "add-source") editSource();
  else if (act === "edit-source") editSource(source(id));
  else if (act === "pump") startPump(field(id));
  else if (act === "stop") stopPump();
  else if (act === "log") logWatering(field(id));
  else if (act === "check") soilCheck(field(id));
  else if (act === "add-catch") addCatchment();
  else if (act === "set-level") setLevel(source(id));
  else if (act === "geo") {
    navigator.geolocation?.getCurrentPosition(
      (p) => setPlace({ name: "My farm", region: `${p.coords.latitude.toFixed(3)}, ${p.coords.longitude.toFixed(3)}`, lat: p.coords.latitude, lon: p.coords.longitude }),
      () => toast("Location permission was not given"));
  }
  else if (act === "del-log") {
    const i = state.logs.findIndex((l) => l.id === id);
    const [gone] = state.logs.splice(i, 1);
    save(); route();
    toast("Entry deleted", () => { state.logs.splice(i, 0, gone); save(); route(); });
  }
  else if (act === "del-catch") {
    const i = state.catchments.findIndex((c) => c.id === id);
    const [gone] = state.catchments.splice(i, 1);
    save(); route();
    toast(`Removed ${gone.name}`, () => { state.catchments.splice(i, 0, gone); save(); route(); });
  }
  else if (act === "del-field") {
    if (!confirm("Delete this field and its history?")) return;
    state.fields = state.fields.filter((f) => f.id !== id);
    state.logs = state.logs.filter((l) => l.fieldId !== id);
    save(); dlg.close(); location.hash = "#fields"; route();
  }
  else if (act === "del-source") {
    if (state.fields.some((f) => f.sourceId === id)) { alert("A field still uses this source. Change that field first."); return; }
    state.sources = state.sources.filter((s) => s.id !== id); save(); dlg.close(); route();
  }
  else if (act === "export") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
    a.download = `water-manager-${todayISO()}.json`; a.click();
  }
  else if (act === "reset") {
    if (!confirm("Clear all fields, sources and history from this device?")) return;
    replace({}); location.hash = "#today"; route();
  }
});

document.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.dataset.act === "annual") { state.annualRain = Math.max(100, Number(el.value) || 900); save(); route(); }
  if (el.dataset.act === "import" && el.files[0]) {
    try { replace(JSON.parse(await el.files[0].text())); route(); loadWeather(); toast("Data imported"); }
    catch { toast("That file isn't a Water Manager backup"); }
  }
});

addEventListener("visibilitychange", () => { if (!document.hidden && weather && Date.now() - weather.at > 3600000) loadWeather(); });

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

route();
loadWeather();
