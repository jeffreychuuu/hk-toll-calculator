// js/app.js
import { TUNNELS, vehiclesFor } from './data.js';
import { getToll, getDaySegments, getNextTransition } from './engine.js';
import { defaultDayType } from './holidays.js';
import { LANGS, UI, TD_PATHS, detectLang } from './i18n.js';

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tunnelId: state.tunnelId, vehicleId: state.vehicleId }));
  } catch {
    // storage disabled or full — persistence is a convenience, never a failure
  }
}

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
  tunnelId: 'cht',
  vehicleId: 'car',
  dayType: initialDayType.dayType,
  minutes: nowMinutes(),
  dataCurrent: initialDayType.dataCurrent,
};

// While true, the toll card follows the real clock. Any manual time selection
// (slider or dropdowns) pins it; the back-to-now button releases it.
let following = true;
const currentTunnel = () => TUNNELS.find((x) => x.id === state.tunnelId);

function fillTunnelSelect() {
  const groups = [...new Set(TUNNELS.map((x) => x.group))];
  $('tunnel-select').innerHTML = groups.map((group) => {
    const opts = TUNNELS.filter((x) => x.group === group)
      .map((x) => `<option value="${x.id}">${esc(x.name[state.lang])}</option>`)
      .join('');
    return `<optgroup label="${esc(group[state.lang])}">${opts}</optgroup>`;
  }).join('');
  $('tunnel-select').value = state.tunnelId;
}

function fillVehicleSelect() {
  const options = vehiclesFor(state.tunnelId);
  if (!options.some((v) => v.id === state.vehicleId)) state.vehicleId = options[0].id;
  $('vehicle-select').innerHTML = options
    .map((v) => `<option value="${v.id}">${esc(v.name[state.lang])}</option>`)
    .join('');
  $('vehicle-select').value = state.vehicleId;
}

function fillDayTypeToggle() {
  const labels = { weekday: t().dayWeekday, weekend: t().dayWeekend };
  for (const btn of $('daytype-toggle').querySelectorAll('button')) {
    btn.textContent = labels[btn.dataset.daytype];
    btn.setAttribute('aria-pressed', String(btn.dataset.daytype === state.dayType));
  }
}

function fillLangSwitch() {
  for (const btn of $('lang-switch').querySelectorAll('button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === state.lang));
  }
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
  $('label-tunnel').textContent = copy.labelTunnel;
  $('label-vehicle').textContent = copy.labelVehicle;
  $('label-daytype').textContent = copy.labelDayType;
  $('label-time').textContent = copy.labelTime;
  $('back-to-now').textContent = copy.backToNow;
  $('holiday-notice').textContent = copy.notice;
  $('hour-select').setAttribute('aria-label', copy.timeHour);
  $('minute-select').setAttribute('aria-label', copy.timeMinute);
  $('time-slider').setAttribute('aria-label', copy.timeSlider);
  fillLangSwitch();
  renderFooter();
}

function renderResult(tunnel) {
  const copy = t();
  const { amount, periodType } = getToll(state);
  $('result-title').textContent = tunnel.name[state.lang];
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
  $('back-to-now').disabled = following;
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
  fillDayTypeToggle();
  renderTime();
  renderToll();
  $('holiday-notice').hidden = state.dataCurrent;
}

function selectTime(minutes) {
  following = false;
  state.minutes = minutes;
  renderTime();
  renderToll();
}

function init() {
  state.lang = loadLang();

  const saved = loadSelection();
  if (saved) {
    state.tunnelId = saved.tunnelId;
    state.vehicleId = saved.vehicleId;
  }

  fillTimeSelects();
  applyLanguage();
  fillTunnelSelect();
  fillVehicleSelect();

  $('lang-switch').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (!btn || btn.dataset.lang === state.lang) return;
    state.lang = btn.dataset.lang;
    saveLang();
    applyLanguage();
    fillTunnelSelect();
    fillVehicleSelect();
    render();
  });

  $('tunnel-select').addEventListener('change', (e) => {
    state.tunnelId = e.target.value;
    fillVehicleSelect();
    saveSelection();
    render();
  });
  $('vehicle-select').addEventListener('change', (e) => {
    state.vehicleId = e.target.value;
    saveSelection();
    render();
  });
  $('daytype-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-daytype]');
    if (!btn) return;
    state.dayType = btn.dataset.daytype;
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
    state.minutes = nowMinutes();
    renderTime();
    renderToll();
  });

  render();
  renderClock();
  setInterval(() => {
    renderClock();
    if (!following) return;
    state.minutes = nowMinutes();
    renderTime();
    renderToll();
  }, 30000);
}

init();
