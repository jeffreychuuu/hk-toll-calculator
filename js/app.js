// js/app.js
import { TUNNELS, TVT_VEHICLES, vehiclesFor, CROSS_HARBOUR_IDS, canonicalFor, classIdFor } from './data.js';
import { getToll, getDaySegments, getNextTransition, getCrossHarbourComparison } from './engine.js';
import { defaultDayType, isPublicHoliday, toDateKey, inHolidayRange } from './holidays.js';
import { LANGS, UI, TD_PATHS, detectLang } from './i18n.js';
import { compareGroups, categoryForTunnel } from './regions.js';
import { incidentsForCorridor, GANTRIES } from './traffic.js';

const LEGEND_ORDER = ['non-peak', 'normal', 'peak', 'transition', 'flat'];
// The gantry we name for a route: the one on its own approach, so the reading
// reads naturally ("由沙田馬場起"). A route timed from many points — the
// harbour crossings — names none of them.
const ORIGIN_GANTRY = {
  'lrt:kowloon-c': 'SJ1', // Sha Tin Racecourse
  'tct:kowloon-e': 'SJ2', // Shek Mun
  'stg:kowloon-w': 'SJ1',
  'smt:tsuenwan': 'SJ1',
  'tlt:tingkau': 'SJ4', // Mai Po
  'abt:wanchai': 'H7', // Wong Chuk Hang Road
  'tmr:tsuenwan': 'SJ5', // Tseng Choi Street
  'lamkam:tsuenwan': 'SJ5',
  'tpr:kowloon': 'N06', // Tsing Sha Highway
  'tpr:shatin': 'N05', // Kwong Fuk Estate
};
const FOOTER_LINKS = ['tvt', 'flat', 'taiLam'];

const $ = (id) => document.getElementById(id);
const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const fmtTime = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
// "427 min" reads badly, so past an hour say "7 小時 7 分鐘".
const fmtDuration = (minutes) => {
  const copy = t();
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const parts = [];
  if (hours) parts.push(`${hours}${copy.hourUnit}`);
  if (mins || !hours) parts.push(`${mins}${copy.minuteUnit}`);
  return parts.join('').trim();
};
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];
const fmtDate = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY[d.getDay()]}）`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STORAGE_KEY = 'hk-toll-calculator.selection';
const LANG_KEY = 'hk-toll-calculator.lang';

const t = () => UI[state.lang];

// Browsers cache each module file separately, and these filenames are not
// content-hashed, so a visitor can end up running a fresh app.js against a
// cached pre-i18n data.js whose names are plain strings. Showing "undefined"
// would be worse than falling back, so resolve names defensively.
const nameOf = (entity) => {
  const name = entity.name;
  if (typeof name === 'string') return name;
  return name?.[state.lang] ?? name?.tc ?? entity.id;
};

const groupOf = (group) => (typeof group === 'string' ? group : group?.[state.lang] ?? group?.tc ?? '');

// Restore the last tunnel/vehicle pair, validated against the current data so a
// stale or renamed id can never break the page. Day type is deliberately not
// stored: it is derived from today's date.
function loadSelection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const tunnel = TUNNELS.find((x) => x.id === parsed?.tunnelId);
    if (!tunnel) return null;
    const options = vehiclesFor(tunnel.id);
    const vehicleId = options.some((v) => v.id === parsed.vehicleId) ? parsed.vehicleId : options[0].id;
    return { tunnelId: tunnel.id, vehicleId };
  } catch {
    return null;
  }
}

function saveSelection() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tunnelId: state.tunnelId,
      vehicleId: state.vehicleId,
      category: state.category,
    }));
  } catch {
    // storage disabled or full — persistence is a convenience, never a failure
  }
}

// The toll comparison is anchored to the tunnel the visitor picked: a tunnel
// belongs to exactly one kind of trip, so its alternatives are simply the
// other ways to make that trip. Nothing to choose.
const CATEGORY_LABEL = {
  harbour: 'cmpCatHarbour',
  'kln-nte': 'cmpCatKlnNte',
  'kln-ntw': 'cmpCatKlnNtw',
  'nte-ntw': 'cmpCatNteNtw',
  island: 'cmpCatIsland',
  other: 'cmpCatOther',
};


function loadLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (LANGS.some((l) => l.id === saved)) return saved;
  } catch {
    // ignore and fall through to detection
  }
  const nav = typeof navigator === 'undefined' ? undefined : navigator.language;
  return detectLang(nav);
}

function saveLang() {
  try {
    localStorage.setItem(LANG_KEY, state.lang);
  } catch {
    // ignore
  }
}

const initialDayType = defaultDayType();
const state = {
  lang: 'tc',
  date: toDateKey(new Date()),
  category: 'weekday',
  tunnelId: 'cht',
  vehicleId: 'car',
  dayType: initialDayType.dayType,
  minutes: nowMinutes(),
  dataCurrent: initialDayType.dataCurrent,
};

// The weekday/weekend schedule follows the picked date, not a manual toggle:
// Sundays and gazetted public holidays use the weekend schedule.
function deriveDayType(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekend = date.getDay() === 0 || isPublicHoliday(date);
  return { dayType: weekend ? 'weekend' : 'weekday', dataCurrent: inHolidayRange(date) };
}

// The next date on or after `fromKey` whose schedule is `dayType`. Picking a
// schedule jumps the date here, so the date always explains the schedule.
function nextDateOfType(dayType, fromKey) {
  const [y, m, d] = fromKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  for (let i = 0; i < 8; i += 1) {
    const key = toDateKey(date);
    if (deriveDayType(key).dayType === dayType) return key;
    date.setDate(date.getDate() + 1);
  }
  return fromKey;
}

// While true, the toll card follows the real clock. Any manual time selection
// (slider or dropdowns) pins it; the back-to-now button releases it.
let following = true;
// Set when the user picks their own date. Kept separate from `following` so a
// pinned date is neither reported as "showing now" nor rolled over by the clock.
let datePinned = false;

// Live road conditions from the Transpart Department, by way of our own
// serverless proxy. Absent until it loads, and silently absent if it cannot:
// the prices must never depend on it.
const TRAFFIC_ENDPOINT = '/api/traffic';
let traffic = null;

async function loadTraffic() {
  try {
    const response = await fetch(TRAFFIC_ENDPOINT);
    if (!response.ok) return;
    traffic = await response.json();
    renderToll(); // the readings show on the headline card and in the rows
  } catch {
    // no live data is a normal state, not an error worth showing
  }
}

function fillDayTypeSelect() {
  const copy = t();
  $('daytype-select').innerHTML = `<option value="weekday">${esc(copy.dayWeekday)}</option>`
    + `<option value="weekend">${esc(copy.dayWeekend)}</option>`;
  $('daytype-select').value = state.dayType;
}

function fillVehicleSelect() {
  const options = vehiclesFor(state.tunnelId);
  if (!options.some((v) => v.id === state.vehicleId)) state.vehicleId = options[0].id;
  $('vehicle-select').innerHTML = options
    .map((v) => `<option value="${v.id}">${esc(nameOf(v))}</option>`)
    .join('');
  $('vehicle-select').value = state.vehicleId;
}

function renderDateType() {
  const derived = deriveDayType(state.date);
  state.dayType = derived.dayType;
  state.dataCurrent = derived.dataCurrent;

  $('date-input').value = state.date;
  $('daytype-select').value = state.dayType;
  $('holiday-notice').hidden = state.dataCurrent;
}

function fillLangMenu() {
  const current = LANGS.find((l) => l.id === state.lang);
  $('lang-current').textContent = current.label;
  $('lang-trigger').setAttribute('aria-label', t().langLabel);
  $('lang-menu').innerHTML = LANGS.map((l) => `
    <li role="option" aria-selected="${l.id === state.lang}">
      <button type="button" data-lang="${l.id}">
        <span class="lang-check" aria-hidden="true">${l.id === state.lang ? '✓' : ''}</span>
        <span>${esc(l.label)}</span>
      </button>
    </li>`).join('');
}

function setLangMenuOpen(open) {
  $('lang-menu').hidden = !open;
  $('lang-trigger').setAttribute('aria-expanded', String(open));
}

function renderFooter() {
  const copy = t().footer;
  const links = FOOTER_LINKS.map((key, i) =>
    `<a href="https://www.td.gov.hk/${state.lang}${TD_PATHS[key]}" target="_blank" rel="noopener">${esc(copy.links[i])}</a>`).join('、');
  $('site-footer').innerHTML = `${esc(copy.source)} ${links}。${esc(copy.disclaimer)}`;
}

function applyLanguage() {
  const copy = t();
  const lang = LANGS.find((l) => l.id === state.lang);
  document.documentElement.lang = lang.htmlLang;
  document.title = copy.pageTitle;
  $('chart-title').textContent = copy.chartTitle;
  $('label-vehicle-class').textContent = copy.compareVehicle;
  $('vehicle-select').setAttribute('aria-label', copy.labelVehicle);
  $('chart-tunnel').setAttribute('aria-label', copy.labelTunnel);
  $('date-input').setAttribute('aria-label', copy.labelDate);
  $('daytype-select').setAttribute('aria-label', copy.labelCategory);
  $('holiday-notice').textContent = copy.notice;
  $('hour-select').setAttribute('aria-label', copy.timeHour);
  $('minute-select').setAttribute('aria-label', copy.timeMinute);
  $('time-slider').setAttribute('aria-label', copy.timeSlider);
  fillLangMenu();
  renderFooter();
}

function renderResult() {
  const copy = t();
  const { amount, periodType } = getToll(state);
  // The chart's own picker: the tunnels of the corridor it is drawing.
  const group = compareGroups().find((entry) => entry.id === categoryForTunnel(state.tunnelId));
  const picker = $('chart-tunnel');
  picker.innerHTML = (group ? group.tunnels : [])
    .map((id) => `<option value="${id}">${esc(nameOf(tunnelById(id)))}</option>`)
    .join('');
  picker.value = state.tunnelId;
  const badge = $('period-badge');
  badge.textContent = copy.period[periodType];
  badge.className = `badge ${periodType}`;

  const hint = $('next-hint');
  const next = getNextTransition(state);
  if (!next) {
    hint.hidden = true;
    return;
  }
  const diff = next.atMin - state.minutes;
  const change = next.amount > amount ? copy.changeUp : next.amount < amount ? copy.changeDown : copy.changeKeep;
  hint.hidden = false;
  hint.textContent = copy.hint
    .replace('{duration}', fmtDuration(diff))
    .replace('{time}', fmtTime(next.atMin))
    .replace('{period}', copy.period[next.periodType])
    .replace('{change}', change)
    .replace('{amount}', next.amount.toFixed(2));
}

const tunnelById = (id) => TUNNELS.find((x) => x.id === id);

function alternativeRows(group, canonical) {
  const copy = t();
  const options = [
    ...group.tunnels.map((id) => ({ kind: 'tunnel', id, name: nameOf(tunnelById(id)) })),
    ...group.roads.map((road) => ({ kind: 'road', id: road.id, name: road.name[state.lang] })),
  ]
    .map((option) => ({
      ...option,
      // A free corridor has no toll to quote, so it carries no amount at all.
      amount: option.kind === 'tunnel' ? priceTunnelFor(option.id, canonical) : null,
    }))
    .sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0));

  // 最平 is a claim about tolls, so it belongs to the cheapest tunnel — never to
  // a free corridor, which simply reads 免費 and wears a colour of its own.
  const tunnelAmounts = options.filter((option) => option.kind === 'tunnel')
    .map((option) => option.amount);
  const cheapest = tunnelAmounts.length ? Math.min(...tunnelAmounts) : null;

  const rows = options.map((option) => {
    const free = option.kind === 'road';
    const cheapestHere = !free && option.amount === cheapest;
    const current = option.kind === 'tunnel' && option.id === state.tunnelId;
    const tags = cheapestHere ? [copy.planCheapest] : [];
    const price = free ? esc(copy.compareFree) : `HK$ ${option.amount.toFixed(2)}`;
    const content = `<span class="compare-name">${esc(option.name)}</span>`
      + trafficChip(option.kind, option.id)
      + `<span class="compare-price">${price}</span>`
      + (tags.length ? `<span class="compare-tag">${esc(tags.join(' · '))}</span>` : '');
    const cls = `compare-row${free ? ' free' : ''}${cheapestHere ? ' cheapest' : ''}`;
    // Roads are places, not choices: only tunnels switch the selector.
    return option.kind === 'tunnel'
      ? `<li><button type="button" class="${cls}"`
        + ` data-tunnel-id="${option.id}"${current ? ' aria-current="true"' : ''}>${content}</button></li>`
      : `<li><div class="${cls}">${content}</div></li>`;
  }).join('');

  const paid = options.filter((option) => option.kind === 'tunnel');
  const tied = paid.length > 1 && paid.every((option) => option.amount === cheapest);
  return { rows, tied, cheapest };
}

// Live condition for one tunnel, per side of the harbour, when the feed has a
// reading for it. The worst reading sets the colour; the sides are spelled out
// because a journey time only means something for the direction you drive.
// Live readings describe this moment, so they only belong on screen when the
// view really is this moment: the clock is still following and the date is today.
const isShowingNow = () => following && state.date === toDateKey(new Date());

const DIRECTION_LABEL = {
  island: 'dirIsland',
  kowloon: 'dirKowloon',
  'kowloon-c': 'dirKowloonC',
  'kowloon-e': 'dirKowloonE',
  'kowloon-w': 'dirKowloonW',
  tsuenwan: 'dirTsuenWan',
  shatin: 'dirShatin',
  wanchai: 'dirWanChai',
  tingkau: 'dirTingKau',
};

function trafficChip(kind, id) {
  if (!isShowingNow()) return '';
  const source = traffic ? traffic[kind === 'road' ? 'roads' : 'tunnels'] : null;
  const report = source ? source[id] : null;
  if (!report) return '';
  const copy = t();
  const condition = (state) => copy[`traffic${state[0].toUpperCase()}${state.slice(1)}`];
  const chip = (state, inner) => `<span class="traffic traffic-${state}">${inner}</span>`;

  const sides = Object.entries(report.byDirection || {})
    .sort(([a], [b]) => a.localeCompare(b));

  // Closed, or nothing directional to say: one chip for the tunnel as a whole.
  if (report.state === 'closed' || !sides.length) {
    return chip(report.state, esc(condition(report.state)));
  }

  // Each direction stands on its own — one way can be jammed while the other
  // runs free, and a single colour for both would hide exactly that. They are
  // stacked, one per line, so neither reads as the other. The reading also says
  // where it is measured from: the department times a route from a gantry, not
  // from the tunnel mouth.
  const readings = sides.map(([direction, side]) => {
    const place = copy[DIRECTION_LABEL[direction]] || direction;
    // Name the gantry we chose for this route, when the feed measured from it.
    const origin = ORIGIN_GANTRY[`${id}:${direction}`];
    const from = origin && GANTRIES[origin] && (side.origins || []).includes(origin)
      ? copy.trafficFrom.replace('{places}', GANTRIES[origin][state.lang])
      : '';
    const minutes = side.minutes > 0
      ? ` ${esc(copy.trafficMinutes.replace('{minutes}', String(side.minutes)))}`
      : '';
    return chip(side.state, `${esc(copy.trafficTowards.replace('{place}', place))} `
      + `${esc(condition(side.state))}${minutes}`
      + (from ? ` · ${esc(from)}` : ''));
  });
  return readings.length === 1
    ? readings[0]
    : `<span class="traffic-sides">${readings.join('')}</span>`;
}

const corridorIncidents = (group) =>
  (isShowingNow() && traffic && traffic.incidents
    ? incidentsForCorridor(traffic.incidents, {
      tunnels: group.tunnels,
      roads: (group.roads || []).map((road) => road.id),
    })
    : []);

function incidentBlock(group) {
  const copy = t();
  const relevant = corridorIncidents(group);
  if (!relevant.length) return '';
  const lines = relevant.map((item) => {
    const text = state.lang === 'en'
      ? item.textEn
      : (state.lang === 'sc' ? (item.textSc || item.textCn) : item.textCn);
    const at = (item.at || '').slice(11, 16);
    return `<p class="incident">${esc(text)}${at ? ` <span class="incident-time">${esc(at)}</span>` : ''}</p>`;
  }).join('');
  return `<div class="incidents"><p class="incidents-title">⚠️ ${esc(copy.trafficIncidents)}</p>${lines}</div>`;
}

// The live readings only mean something at the present moment, so when the view
// has moved on the footnote says why instead of dating the feed.
function trafficFootnote() {
  if (!traffic || !traffic.updatedAt) return '';
  if (!isShowingNow()) return `<p class="traffic-hint">${esc(t().trafficOnlyNow)}</p>`;
  const at = traffic.updatedAt.slice(11, 16);
  return `<p class="traffic-source">${esc(t().trafficSource.replace('{time}', at))}</p>`;
}

function renderAlternatives() {
  const copy = t();
  const section = $('alt-card');
  const tunnelCategory = categoryForTunnel(state.tunnelId);

  if (!tunnelCategory) {
    section.hidden = true;
    return;
  }
  section.hidden = false;

  const groups = compareGroups();
  // The list shows the chosen tunnel's own corridor, so a chip that switches
  // corridor also picks that corridor's first tunnel (see the click handler).
  const activeId = tunnelCategory;
  const active = groups.find((group) => group.id === activeId);
  const vehicle = canonicalFor(state.tunnelId, state.vehicleId);

  $('alt-categories').innerHTML = groups.map((group) => {
    const on = group.id === activeId;
    const warn = corridorIncidents(group).length ? ' ⚠️' : '';
    return `<button type="button" class="chip${on ? ' on' : ''}" data-group="${group.id}"`
      + ` aria-pressed="${on}">${esc(copy[CATEGORY_LABEL[group.id]] ?? group.id)}${warn}</button>`;
  }).join('');

  const rows = alternativeRows(active, vehicle);
  $('alt-list').innerHTML = rows.rows + incidentBlock(active);
  $('traffic-footnote').innerHTML = trafficFootnote();
  $('compare-note').hidden = !rows.tied;
  $('compare-note').textContent = rows.tied
    ? copy.compareTie.replace('{amount}', rows.cheapest.toFixed(2))
    : '';
}



// Other tunnels are priced through the canonical class, but the tunnel the
// visitor actually picked keeps their exact class, so the comparison can never
// disagree with the result card (a minibus on Tate's Cairn is $23, not $24).
const classForTunnel = (tunnelId, canonical) =>
  (tunnelId === state.tunnelId ? state.vehicleId : classIdFor(tunnelId, canonical));

const priceTunnelFor = (tunnelId, canonical) => getToll({
  tunnelId,
  vehicleId: classForTunnel(tunnelId, canonical),
  dayType: state.dayType,
  minutes: state.minutes,
}).amount;

// The moment the page is describing: a live chip only while it is the present,
// and a label on the chart marker that names it — or the chosen time when not.
function renderMoment() {
  const copy = t();
  const now = isShowingNow();

  // One pill, two states: the status while the view is the present, and the
  // way back once it is not. Same box either way, so the row never jumps.
  const pill = $('back-to-now');
  pill.className = `now-pill${now ? ' is-now' : ''}`;
  pill.disabled = now;
  pill.innerHTML = now
    ? `<span class="now-dot" aria-hidden="true"></span>${esc(copy.nowLabel)}`
    : '<svg class="now-arrow" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">'
      + '<path d="M11 5l-7 7 7 7M4 12h16" fill="none" stroke="currentColor" stroke-width="2.2" '
      + 'stroke-linecap="round" stroke-linejoin="round"/></svg>'
      + esc(copy.backToNow);

  const position = (state.minutes / 1440) * 100;
  $('chart-marker').style.left = `${position}%`;

  const label = $('marker-label');
  const hh = String(Math.floor(state.minutes / 60)).padStart(2, '0');
  const mm = String(state.minutes % 60).padStart(2, '0');
  label.textContent = now ? copy.nowLabel : `${hh}:${mm}`;
  label.className = `marker-label${now ? ' now' : ''}`;
  label.style.left = `${position}%`;
  // keep the label inside the card at the ends of the day
  label.style.transform = position < 8 ? 'translateX(0)'
    : (position > 92 ? 'translateX(-100%)' : 'translateX(-50%)');
}

// A tunnel that charges one rate, whatever the clock says — so the schedule
// controls would have nothing to do.
const isFlatDay = () => getDaySegments(state).every((seg) => seg.periodType === 'flat');

function renderChart() {
  const copy = t();
  const segs = getDaySegments(state);
  // A tunnel with one flat rate all day has no schedule to pick through, so the
  // clock and date controls step aside; the badge and the flat band remain.
  const flat = segs.every((seg) => seg.periodType === 'flat');
  $('chart-controls').hidden = flat;
  $('time-slider').hidden = flat;
  $('chart-bar').innerHTML = segs.map((seg) => {
    const width = ((seg.endMin - seg.startMin + 1) / 1440) * 100;
    return `<span class="seg ${seg.periodType}" style="width:${width.toFixed(4)}%"></span>`;
  }).join('');

  const present = LEGEND_ORDER.filter((p) => segs.some((s) => s.periodType === p));
  $('legend').innerHTML = present
    .map((p) => `<li><span class="dot ${p}"></span>${esc(copy.periodShort[p])}</li>`)
    .join('');
}

function renderTime() {
  $('hour-select').value = String(Math.floor(state.minutes / 60)).padStart(2, '0');
  $('minute-select').value = String(state.minutes % 60).padStart(2, '0');
  $('time-slider').value = String(state.minutes);
}

function fillTimeSelects() {
  const two = (n) => String(n).padStart(2, '0');
  $('hour-select').innerHTML = Array.from({ length: 24 }, (_, h) => `<option value="${two(h)}">${two(h)}</option>`).join('');
  $('minute-select').innerHTML = Array.from({ length: 60 }, (_, m) => `<option value="${two(m)}">${two(m)}</option>`).join('');
}

function renderToll() {
  renderResult();
  renderAlternatives();
  renderChart();
  renderMoment();
}

function render() {
  fillVehicleSelect();
  fillDayTypeSelect();
  renderDateType();
  renderTime();
  renderToll();
}

// Return to the present moment: follow the clock again, on today's date.
function goNow() {
  following = true;
  datePinned = false;
  state.minutes = nowMinutes();
  state.date = toDateKey(new Date());
}

// The id a class has in a tunnel's own picker. Not the same as the pricing id:
// a flat-rate tunnel prices every class the same, but its picker still names
// them separately.
const vehicleIdFor = (tunnelId, canonical) => {
  const options = vehiclesFor(tunnelId);
  const hit = options.find((vehicle) => canonicalFor(tunnelId, vehicle.id) === canonical);
  return (hit || options[0]).id;
};

// Every tunnel names its vehicle classes, but some name them in a way of their
// own (Discovery Bay has government / private car / ... instead of car / moto /
// taxi / other). Those cannot hold the class you had, so it is remembered.
const COMMON_VEHICLE_IDS = new Set(TVT_VEHICLES.map((vehicle) => vehicle.id));
const ownVehicleClasses = (tunnelId) =>
  !vehiclesFor(tunnelId).some((vehicle) => COMMON_VEHICLE_IDS.has(vehicle.id));
let commonVehicle = 'car'; // the ordinary class the visitor is using

// Switching tunnel keeps the kind of vehicle you picked, translating through the
// canonical class rather than letting the picker fall back to the first option.
function setTunnel(tunnelId) {
  if (tunnelId === state.tunnelId) return;
  const canonical = canonicalFor(state.tunnelId, state.vehicleId);
  if (!ownVehicleClasses(state.tunnelId)) commonVehicle = canonical;
  state.tunnelId = tunnelId;
  state.vehicleId = ownVehicleClasses(tunnelId)
    ? vehicleIdFor(tunnelId, canonical)
    : vehicleIdFor(tunnelId, commonVehicle);
  // A flat-rate tunnel has no schedule, so there is no other time to be at.
  if (isFlatDay()) goNow();
  saveSelection();
  render();
}

function selectTime(minutes) {
  following = false;
  state.minutes = minutes;
  renderTime();
  renderToll();
}

function chooseLang(lang) {
  setLangMenuOpen(false);
  if (lang === state.lang) return;
  state.lang = lang;
  saveLang();
  applyLanguage();
  render();
}

function init() {
  state.lang = loadLang();


  const saved = loadSelection();
  if (saved) {
    state.tunnelId = saved.tunnelId;
    state.vehicleId = saved.vehicleId;
    if (saved.category) state.category = saved.category;
  }
  commonVehicle = canonicalFor(state.tunnelId, state.vehicleId) || 'car';

  fillTimeSelects();
  applyLanguage();
  setLangMenuOpen(false);

  $('lang-trigger').addEventListener('click', () => setLangMenuOpen($('lang-menu').hidden));
  $('lang-menu').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (btn) chooseLang(btn.dataset.lang);
  });
  document.addEventListener('click', (e) => {
    if ($('lang-menu').hidden) return;
    if (e.target.closest('.lang-picker')) return;
    setLangMenuOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || $('lang-menu').hidden) return;
    setLangMenuOpen(false);
    $('lang-trigger').focus();
  });

  $('chart-tunnel').addEventListener('change', (e) => {
    setTunnel(e.target.value);
  });
  $('alt-categories').addEventListener('click', (e) => {
    const chip = e.target.closest('button[data-group]');
    if (!chip || chip.dataset.group === categoryForTunnel(state.tunnelId)) return;
    const group = compareGroups().find((entry) => entry.id === chip.dataset.group);
    // Switching corridor picks that corridor's first tunnel, and the chart
    // follows the choice.
    if (!group || !group.tunnels.length) return;
    setTunnel(group.tunnels[0]);
  });
  $('alt-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tunnel-id]');
    if (!btn) return;
    setTunnel(btn.dataset.tunnelId);
  });
  $('vehicle-select').addEventListener('change', (e) => {
    state.vehicleId = e.target.value;
    saveSelection();
    render();
  });
  $('daytype-select').addEventListener('change', (e) => {
    // A schedule means the next day from today that has it — and today itself
    // means the present, so choosing today's schedule is going back to now.
    const today = toDateKey(new Date());
    const target = nextDateOfType(e.target.value, today);
    if (target === today) {
      goNow();
    } else {
      state.date = target;
      datePinned = true;
    }
    render();
  });
  $('date-input').addEventListener('change', (e) => {
    const value = e.target.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      renderDateType();
      return;
    }
    state.date = value;
    datePinned = true;
    render();
  });
  $('hour-select').addEventListener('change', () => {
    selectTime(Number($('hour-select').value) * 60 + Number($('minute-select').value));
  });
  $('minute-select').addEventListener('change', () => {
    selectTime(Number($('hour-select').value) * 60 + Number($('minute-select').value));
  });
  $('time-slider').addEventListener('input', (e) => selectTime(Number(e.target.value)));
  $('back-to-now').addEventListener('click', () => {
    goNow();
    render();
  });

  render();
  // Live conditions only make sense on a real page (the proxy is same-origin).
  if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) loadTraffic();
  setInterval(() => {
    if (!following) return;
    const now = new Date();
    state.minutes = now.getHours() * 60 + now.getMinutes();
    const today = toDateKey(now);
    if (!datePinned && today !== state.date) state.date = today;
    renderDateType();
    renderTime();
    renderToll();
  }, 30000);
}

init();
