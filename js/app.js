// js/app.js
import { TUNNELS, vehiclesFor, CROSS_HARBOUR_IDS, canonicalFor, classIdFor } from './data.js';
import { getToll, getDaySegments, getNextTransition, getCrossHarbourComparison } from './engine.js';
import { defaultDayType, isPublicHoliday, toDateKey, inHolidayRange } from './holidays.js';
import { LANGS, UI, TD_PATHS, detectLang } from './i18n.js';
import { compareGroups, categoryForTunnel } from './regions.js';
import { incidentsForCorridor } from './traffic.js';

const LEGEND_ORDER = ['non-peak', 'normal', 'peak', 'transition', 'flat'];
const FOOTER_LINKS = ['tvt', 'flat', 'taiLam'];

const $ = (id) => document.getElementById(id);
const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const fmtTime = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
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
  kowloon: 'cmpCatKowloon',
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
let altCategory = null;   // which corridor the alternatives list is showing

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

function fillTunnelSelect() {
  const copy = t();
  const groups = compareGroups();
  const mapped = new Set(groups.flatMap((group) => group.tunnels));
  const orphans = TUNNELS.filter((tunnel) => !mapped.has(tunnel.id));
  const option = (tunnel) => `<option value="${tunnel.id}">${esc(nameOf(tunnel))}</option>`;

  $('tunnel-select').innerHTML = groups
    .map((group) => `<optgroup label="${esc(copy[CATEGORY_LABEL[group.id]])}">`
      + group.tunnels.map((id) => option(tunnelById(id))).join('') + '</optgroup>')
    .join('')
    + (orphans.length
      ? `<optgroup label="${esc(copy.groupOther)}">${orphans.map(option).join('')}</optgroup>`
      : '');
  $('tunnel-select').value = state.tunnelId;
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
  $('alt-title').textContent = copy.compareTitle;
  $('tunnel-select').setAttribute('aria-label', copy.labelTunnel);
  $('vehicle-select').setAttribute('aria-label', copy.labelVehicle);
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
  $('live-traffic').innerHTML = traffic && !isShowingNow()
    ? `<span class="traffic-hint">${esc(t().trafficOnlyNow)}</span>`
    : trafficChip('tunnel', state.tunnelId);
  const badge = $('period-badge');
  badge.textContent = copy.period[periodType];
  badge.className = `badge ${periodType}`;
  $('price-amount').textContent = amount.toFixed(2);

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
    .replace('{min}', String(diff))
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
      amount: option.kind === 'tunnel' ? priceTunnelFor(option.id, canonical) : 0,
    }))
    .sort((a, b) => a.amount - b.amount);

  const cheapest = options.length ? options[0].amount : 0;
  const rows = options.map((option) => {
    const tags = [];
    if (option.kind === 'tunnel' && option.id === state.tunnelId) tags.push(copy.compareCurrent);
    if (option.amount === cheapest) tags.push(copy.planCheapest);
    const best = tags.includes(copy.planCheapest);
    const content = `<span class="compare-name">${esc(option.name)}</span>`
      + trafficChip(option.kind, option.id)
      + `<span class="compare-price">HK$ ${option.amount.toFixed(2)}</span>`
      + (tags.length ? `<span class="compare-tag">${esc(tags.join(' · '))}</span>` : '');
    // Roads are places, not choices: only tunnels switch the selector.
    return option.kind === 'tunnel'
      ? `<li><button type="button" class="compare-row${best ? ' cheapest' : ''}"`
        + ` data-tunnel-id="${option.id}"${best ? ' aria-current="true"' : ''}>${content}</button></li>`
      : `<li><div class="compare-row${best ? ' cheapest' : ''}">${content}</div></li>`;
  }).join('');

  const tied = options.length > 1 && options.every((option) => option.amount === cheapest);
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
  const label = copy[`traffic${report.state[0].toUpperCase()}${report.state.slice(1)}`];
  const sides = Object.entries(report.byDirection || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([direction, side]) => `${copy.trafficTowards.replace('{place}', copy[DIRECTION_LABEL[direction]] || direction)} `
      + copy.trafficMinutes.replace('{minutes}', String(side.minutes)));
  const detail = report.state === 'closed' || !sides.length
    ? ''
    : ` <span class="traffic-detail">${esc(sides.join(' · '))}</span>`;
  return `<span class="traffic traffic-${report.state}">${esc(label)}</span>${detail}`;
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

function trafficSourceLine() {
  if (!traffic || !traffic.updatedAt || !isShowingNow()) return '';
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
  // The selector opens on the selected tunnel's own corridor; the visitor can
  // switch to another corridor in one click without drilling down.
  const activeId = groups.some((group) => group.id === altCategory) ? altCategory : tunnelCategory;
  const active = groups.find((group) => group.id === activeId);
  const vehicle = canonicalFor(state.tunnelId, state.vehicleId);

  $('alt-categories').innerHTML = groups.map((group) => {
    const on = group.id === activeId;
    const warn = corridorIncidents(group).length ? ' ⚠️' : '';
    return `<button type="button" class="chip${on ? ' on' : ''}" data-group="${group.id}"`
      + ` aria-pressed="${on}">${esc(copy[CATEGORY_LABEL[group.id]])}${warn}</button>`;
  }).join('');

  const rows = alternativeRows(active, vehicle);
  $('alt-list').innerHTML = rows.rows + incidentBlock(active) + trafficSourceLine();
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

  const label = $('marker-label');
  const position = (state.minutes / 1440) * 100;
  const hh = String(Math.floor(state.minutes / 60)).padStart(2, '0');
  const mm = String(state.minutes % 60).padStart(2, '0');
  label.textContent = now ? copy.nowLabel : `${hh}:${mm}`;
  label.className = `marker-label${now ? ' now' : ''}`;
  label.style.left = `${position}%`;
  // keep the label inside the card at the ends of the day
  label.style.transform = position < 8 ? 'translateX(0)'
    : (position > 92 ? 'translateX(-100%)' : 'translateX(-50%)');
}

function renderChart() {
  const copy = t();
  const segs = getDaySegments(state);
  $('chart-bar').innerHTML = segs.map((seg) => {
    const width = ((seg.endMin - seg.startMin + 1) / 1440) * 100;
    return `<div class="seg ${seg.periodType}" style="width:${width.toFixed(4)}%"></div>`;
  }).join('');
  $('chart-marker').style.left = `${(state.minutes / 1440) * 100}%`;

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
  fillTunnelSelect();
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

  $('tunnel-select').addEventListener('change', (e) => {
    state.tunnelId = e.target.value;
    altCategory = null; // re-anchor the alternatives on the new corridor
    saveSelection();
    render();
  });
  $('alt-categories').addEventListener('click', (e) => {
    const chip = e.target.closest('button[data-group]');
    if (!chip || chip.dataset.group === altCategory) return;
    altCategory = chip.dataset.group;
    renderAlternatives();
  });
  $('alt-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tunnel-id]');
    if (!btn) return;
    state.tunnelId = btn.dataset.tunnelId;
    altCategory = null;
    fillTunnelSelect();
    fillVehicleSelect();
    saveSelection();
    render();
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
