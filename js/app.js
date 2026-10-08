// js/app.js
import { TUNNELS, vehiclesFor, CROSS_HARBOUR_IDS, canonicalFor, classIdFor } from './data.js';
import { getToll, getDaySegments, getNextTransition, getCrossHarbourComparison } from './engine.js';
import { defaultDayType, isPublicHoliday, toDateKey, inHolidayRange } from './holidays.js';
import { LANGS, UI, TD_PATHS, detectLang } from './i18n.js';
import { REGIONS, regionById, planRoutes, compareGroups, categoryForTunnel } from './regions.js';

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
    const mode = ['date', 'category'].includes(parsed.mode) ? parsed.mode : undefined;
    const category = ['weekday', 'weekend'].includes(parsed.category) ? parsed.category : undefined;
    return { tunnelId: tunnel.id, vehicleId, mode, category };
  } catch {
    return null;
  }
}

function saveSelection() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tunnelId: state.tunnelId,
      vehicleId: state.vehicleId,
      mode: state.mode,
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
  fromId: '',              // journey suggestion — deliberately not persisted
  toId: '',
  mode: 'date',            // 'date' picks a calendar day; 'category' picks a schedule
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

// While true, the toll card follows the real clock. Any manual time selection
// (slider or dropdowns) pins it; the back-to-now button releases it.
let following = true;
// Set when the user picks their own date. Kept separate from `following` so a
// pinned date is neither reported as "showing now" nor rolled over by the clock.
let datePinned = false;
const currentTunnel = () => TUNNELS.find((x) => x.id === state.tunnelId);

function fillTunnelSelect() {
  const copy = t();
  const groups = compareGroups();
  const canonical = canonicalFor(state.tunnelId, state.vehicleId);
  const mapped = new Set(groups.flatMap((group) => group.tunnels));
  const orphans = TUNNELS.filter((tunnel) => !mapped.has(tunnel.id));

  const labelFor = (tunnel, amount, cheapest) => {
    const tags = [];
    if (tunnel.id === state.tunnelId) tags.push(copy.compareCurrent);
    if (cheapest !== undefined && amount === cheapest) tags.push(copy.planCheapest);
    return `${esc(nameOf(tunnel))} — HK$ ${amount.toFixed(2)}${tags.length ? ` · ${tags.join(' · ')}` : ''}`;
  };

  const corridorGroups = groups.map((group) => {
    const tunnels = group.tunnels
      .map((id) => tunnelById(id))
      .map((tunnel) => ({ tunnel, amount: priceTunnelFor(tunnel.id, canonical) }))
      .sort((a, b) => a.amount - b.amount);
    // The free corridors are alternatives you cannot select (there is no
    // schedule to chart), so they ride along as disabled options.
    const roads = group.roads;
    const amounts = [...tunnels.map((entry) => entry.amount), ...roads.map(() => 0)];
    const cheapest = amounts.length > 1 ? Math.min(...amounts) : undefined;

    const options = [
      ...tunnels.map(({ tunnel, amount }) => `<option value="${tunnel.id}">${labelFor(tunnel, amount, cheapest)}</option>`),
      ...roads.map((road) => `<option disabled value="">${esc(road[state.lang])} — HK$ 0.00`
        + `${cheapest === 0 ? ` · ${copy.planCheapest}` : ''}</option>`),
    ].join('');
    return `<optgroup label="${esc(copy[CATEGORY_LABEL[group.id]])}">${options}</optgroup>`;
  }).join('');

  const otherGroup = orphans.length
    ? `<optgroup label="${esc(copy.groupOther)}">`
      + orphans.map((tunnel) => `<option value="${tunnel.id}">`
        + `${labelFor(tunnel, priceTunnelFor(tunnel.id, canonical), undefined)}</option>`).join('')
      + '</optgroup>'
    : '';

  $('tunnel-select').innerHTML = corridorGroups + otherGroup;
  $('tunnel-select').value = state.tunnelId;
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
  state.dayType = state.mode === 'date' ? derived.dayType : state.category;
  state.dataCurrent = derived.dataCurrent;

  $('date-input').value = state.date;
  $('date-field').hidden = state.mode !== 'date';
  $('category-field').hidden = state.mode !== 'category';
  // the holiday-data caveat only matters when a concrete date is in play
  $('holiday-notice').hidden = state.mode !== 'date' || state.dataCurrent;

  for (const btn of $('mode-toggle').querySelectorAll('button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.mode === state.mode));
  }
  for (const btn of $('daytype-toggle').querySelectorAll('button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.daytype === state.category));
  }
}

function labelDayTypeButtons() {
  const labels = { weekday: t().dayWeekday, weekend: t().dayWeekend };
  for (const btn of $('daytype-toggle').querySelectorAll('button')) {
    btn.textContent = labels[btn.dataset.daytype];
  }
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
  $('plan-title').textContent = copy.planTitle;
  $('label-from').textContent = copy.planFrom;
  $('label-to').textContent = copy.planTo;
  fillPlanSelects();
  renderPlan();
  $('label-tunnel').textContent = copy.labelTunnel;
  $('label-vehicle').textContent = copy.labelVehicle;
  $('label-date').textContent = copy.labelDate;
  $('label-category').textContent = copy.labelCategory;
  for (const btn of $('mode-toggle').querySelectorAll('button')) {
    btn.textContent = btn.dataset.mode === 'date' ? copy.modeDate : copy.modeCategory;
  }
  $('label-time').textContent = copy.labelTime;
  $('back-to-now').textContent = copy.backToNow;
  $('holiday-notice').textContent = copy.notice;
  $('hour-select').setAttribute('aria-label', copy.timeHour);
  $('minute-select').setAttribute('aria-label', copy.timeMinute);
  $('time-slider').setAttribute('aria-label', copy.timeSlider);
  labelDayTypeButtons();
  fillLangMenu();
  renderFooter();
}

function renderResult(tunnel) {
  const copy = t();
  const { amount, periodType } = getToll(state);
  $('result-title').textContent = nameOf(tunnel);
  $('result-subtitle').textContent =
    `${$('vehicle-select').selectedOptions[0].textContent} • ${
      state.dayType === 'weekend' ? copy.dayWeekend : copy.dayWeekday}`;
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

function fillPlanSelects() {
  const copy = t();
  const areaLabel = { island: copy.areaIsland, kowloon: copy.areaKowloon, nt: copy.areaNt };
  const groups = ['island', 'kowloon', 'nt']
    .map((area) => {
      const options = REGIONS.filter((region) => region.area === area)
        .map((region) => `<option value="${region.id}">${esc(region.name[state.lang])}</option>`)
        .join('');
      return `<optgroup label="${esc(areaLabel[area])}">${options}</optgroup>`;
    })
    .join('');
  const blank = `<option value="">${esc(copy.planUnset)}</option>`;

  $('from-select').innerHTML = blank + groups;
  $('to-select').innerHTML = blank + groups;
  $('from-select').value = state.fromId;
  $('to-select').value = state.toId;
}

const ROUTES_SHOWN = 6;

function renderPlan() {
  const copy = t();
  const result = $('plan-result');

  if (!regionById(state.fromId) || !regionById(state.toId)) {
    result.innerHTML = `<p class="plan-note">${esc(copy.planPick)}</p>`;
    return;
  }

  const { routes } = planRoutes({ fromId: state.fromId, toId: state.toId });
  const vehicle = canonicalFor(state.tunnelId, state.vehicleId);
  const priced = routes
    .map((route) => ({
      legs: route.legs,
      tunnels: route.tunnels,
      amount: route.tunnels.reduce((sum, id) => sum + priceTunnelFor(id, vehicle), 0),
    }))
    .sort((a, b) => a.amount - b.amount)
    .slice(0, ROUTES_SHOWN);

  const cheapest = priced.length ? priced[0].amount : 0;
  result.innerHTML = priced.map((route) => {
    const name = route.legs
      .map((leg) => esc(leg.tunnel ? nameOf(tunnelById(leg.tunnel)) : leg.road[state.lang]))
      .join('<span class="plan-sep">·</span>');
    const tag = route.amount === cheapest
      ? copy.planCheapest
      : (route.tunnels.length ? copy.planPricier : '');
    return `<div class="plan-route${route.amount === cheapest ? ' cheapest' : ''}">`
      + `<span class="plan-route-name">${name}</span>`
      + `<span class="plan-route-price">HK$ ${route.amount.toFixed(2)}</span>`
      + (tag ? `<span class="plan-route-tag">${esc(tag)}</span>` : '')
      + '</div>';
  }).join('') + `<p class="plan-disclaimer">${esc(copy.planDisclaimer)}</p>`;
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
  $('back-to-now').disabled = following && !(state.mode === 'date' && datePinned);
}

function fillTimeSelects() {
  const two = (n) => String(n).padStart(2, '0');
  $('hour-select').innerHTML = Array.from({ length: 24 }, (_, h) => `<option value="${two(h)}">${two(h)}</option>`).join('');
  $('minute-select').innerHTML = Array.from({ length: 60 }, (_, m) => `<option value="${two(m)}">${two(m)}</option>`).join('');
}

function renderClock() {
  const now = new Date();
  $('now-date').textContent = fmtDate(now);
  $('now-time').textContent = fmtTime(now.getHours() * 60 + now.getMinutes());
}

function renderToll() {
  renderResult(currentTunnel());
  renderChart();
}

function render() {
  fillVehicleSelect();
  fillTunnelSelect();
  renderDateType();
  renderTime();
  renderToll();
  renderPlan();
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
    if (saved.mode) state.mode = saved.mode;
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

  $('from-select').addEventListener('change', (e) => {
    state.fromId = e.target.value;
    renderPlan();
  });
  $('to-select').addEventListener('change', (e) => {
    state.toId = e.target.value;
    renderPlan();
  });
  $('tunnel-select').addEventListener('change', (e) => {
    state.tunnelId = e.target.value;
    saveSelection();
    render();
  });
  $('vehicle-select').addEventListener('change', (e) => {
    state.vehicleId = e.target.value;
    saveSelection();
    render();
  });
  $('mode-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mode]');
    if (!btn || btn.dataset.mode === state.mode) return;
    state.mode = btn.dataset.mode;
    saveSelection();
    render();
  });
  $('daytype-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-daytype]');
    if (!btn) return;
    state.category = btn.dataset.daytype;
    saveSelection();
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
    following = true;
    datePinned = false;
    state.minutes = nowMinutes();
    if (state.mode === 'date') state.date = toDateKey(new Date());
    render();
  });

  render();
  renderClock();
  setInterval(() => {
    renderClock();
    if (!following) return;
    const now = new Date();
    state.minutes = now.getHours() * 60 + now.getMinutes();
    const today = toDateKey(now);
    if (state.mode === 'date' && !datePinned && today !== state.date) state.date = today;
    renderDateType();
    renderTime();
    renderToll();
  }, 30000);
}

init();
