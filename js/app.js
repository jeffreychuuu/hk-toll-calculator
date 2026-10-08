// js/app.js
import { TUNNELS, vehiclesFor } from './data.js';
import { getToll, getDaySegments, getNextTransition, PERIOD_LABEL } from './engine.js';
import { defaultDayType } from './holidays.js';

const PERIOD_SHORT = { 'non-peak': '非繁忙', normal: '一般', peak: '繁忙', transition: '過渡期', flat: '全日劃一' };
const LEGEND_ORDER = ['non-peak', 'normal', 'peak', 'transition', 'flat'];
const DAYTYPE_LABEL = { weekday: '星期一至六（非假期）', weekend: '星期日及公眾假期' };

const $ = (id) => document.getElementById(id);
const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const fmtTime = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];
const fmtDate = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY[d.getDay()]}）`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STORAGE_KEY = 'hk-toll-calculator.selection';

// Restore the last tunnel/vehicle pair, validated against the current data so a
// stale or renamed id can never break the page. Day type is deliberately not
// stored: it is derived from today's date.
function loadSelection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const tunnel = TUNNELS.find((t) => t.id === parsed?.tunnelId);
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

const initialDayType = defaultDayType();
const state = {
  tunnelId: 'cht',
  vehicleId: 'car',
  dayType: initialDayType.dayType,
  minutes: nowMinutes(),
  dataCurrent: initialDayType.dataCurrent,
};

// While true, the toll card follows the real clock. Any manual time selection
// (slider or typed time) pins it.
let following = true;
const currentTunnel = () => TUNNELS.find((t) => t.id === state.tunnelId);

function fillTunnelSelect() {
  const groups = [...new Set(TUNNELS.map((t) => t.group))];
  $('tunnel-select').innerHTML = groups.map((group) => {
    const opts = TUNNELS.filter((t) => t.group === group)
      .map((t) => `<option value="${t.id}">${esc(t.name)}</option>`)
      .join('');
    return `<optgroup label="${esc(group)}">${opts}</optgroup>`;
  }).join('');
  $('tunnel-select').value = state.tunnelId;
}

function fillVehicleSelect() {
  const options = vehiclesFor(state.tunnelId);
  if (!options.some((v) => v.id === state.vehicleId)) state.vehicleId = options[0].id;
  $('vehicle-select').innerHTML = options
    .map((v) => `<option value="${v.id}">${esc(v.name)}</option>`)
    .join('');
  $('vehicle-select').value = state.vehicleId;
}

function fillDayTypeToggle() {
  for (const btn of $('daytype-toggle').querySelectorAll('button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.daytype === state.dayType));
  }
}

function renderResult(tunnel) {
  const { amount, periodType } = getToll(state);
  $('result-title').textContent = tunnel.name;
  $('result-subtitle').textContent =
    `${$('vehicle-select').selectedOptions[0].textContent} • ${DAYTYPE_LABEL[state.dayType]}`;
  const badge = $('period-badge');
  badge.textContent = PERIOD_LABEL[periodType];
  badge.className = `badge ${periodType}`;
  $('price-amount').textContent = amount.toFixed(2);

  const hint = $('next-hint');
  const next = getNextTransition(state);
  if (!next) {
    hint.hidden = true;
    return;
  }
  const diff = next.atMin - state.minutes;
  const word = next.amount > amount ? '升至' : next.amount < amount ? '降至' : '維持';
  hint.hidden = false;
  hint.textContent =
    `下一時段提示：${diff}分鐘後（${fmtTime(next.atMin)}）進入${PERIOD_LABEL[next.periodType]}`
    + `（${word} HK$ ${next.amount.toFixed(2)}）`;
}

function renderChart() {
  const segs = getDaySegments(state);
  $('chart-bar').innerHTML = segs.map((seg) => {
    const width = ((seg.endMin - seg.startMin + 1) / 1440) * 100;
    return `<div class="seg ${seg.periodType}" style="width:${width.toFixed(4)}%"></div>`;
  }).join('');
  $('chart-marker').style.left = `${(state.minutes / 1440) * 100}%`;

  const present = LEGEND_ORDER.filter((p) => segs.some((s) => s.periodType === p));
  $('legend').innerHTML = present
    .map((p) => `<li><span class="dot ${p}"></span>${PERIOD_SHORT[p]}</li>`)
    .join('');
}

function renderTime() {
  const hh = String(Math.floor(state.minutes / 60)).padStart(2, '0');
  const mm = String(state.minutes % 60).padStart(2, '0');
  $('hour-select').value = hh;
  $('minute-select').value = mm;
  $('time-slider').value = String(state.minutes);
  $('back-to-now').disabled = following;
}

function fillTimeSelects() {
  $('hour-select').innerHTML = Array.from({ length: 24 }, (_, h) => `<option value="${String(h).padStart(2, '0')}">${String(h).padStart(2, '0')}</option>`).join('');
  $('minute-select').innerHTML = Array.from({ length: 60 }, (_, m) => `<option value="${String(m).padStart(2, '0')}">${String(m).padStart(2, '0')}</option>`).join('');
}

function renderClock() {
  const now = new Date();
  $('now-date').textContent = fmtDate(now);
  $('now-time').textContent = fmtTime(now.getHours() * 60 + now.getMinutes());
}

function render() {
  const tunnel = TUNNELS.find((t) => t.id === state.tunnelId);
  fillDayTypeToggle();
  renderTime();
  renderResult(tunnel);
  renderChart();
  $('holiday-notice').hidden = state.dataCurrent;
}

function init() {
  const saved = loadSelection();
  if (saved) {
    state.tunnelId = saved.tunnelId;
    state.vehicleId = saved.vehicleId;
  }
  fillTunnelSelect();
  fillVehicleSelect();

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
  const applyTimeSelects = () => {
    following = false;
    state.minutes = Number($('hour-select').value) * 60 + Number($('minute-select').value);
    renderTime();
    renderResult(currentTunnel());
    renderChart();
  };
  $('hour-select').addEventListener('change', applyTimeSelects);
  $('minute-select').addEventListener('change', applyTimeSelects);
  $('time-slider').addEventListener('input', (e) => {
    following = false;
    state.minutes = Number(e.target.value);
    renderTime();
    renderResult(currentTunnel());
    renderChart();
  });
  $('back-to-now').addEventListener('click', () => {
    following = true;
    state.minutes = nowMinutes();
    renderTime();
    renderResult(currentTunnel());
    renderChart();
  });

  fillTimeSelects();
  render();
  renderClock();
  setInterval(() => {
    renderClock();
    if (!following) return;
    state.minutes = nowMinutes();
    renderTime();
    renderResult(currentTunnel());
    renderChart();
  }, 30000);
}

init();
