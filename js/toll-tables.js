// js/toll-tables.js
// The toll tables shown in the folded footer block. They are rendered into
// index.html as static text (so search engines read them without running any
// script) and this same function is what a test uses to keep that copy honest —
// change the rates and the test fails until the page is regenerated:
//
//   node scripts/print-toll-tables.mjs
//
// The app also calls it at run time with the chosen language's labels.
import { TUNNELS, classIdFor } from './data.js';
import { getDaySegments, getToll } from './engine.js';

// Only these four vary with the clock; the rest charge one rate all day.
const TVT = ['cht', 'ehc', 'whc', 'tlt'];

// The Traditional Chinese labels: what gets generated into index.html, and the
// default for a caller that passes nothing.
export const TC_LABELS = {
  period: {
    'non-peak': '非繁忙時段',
    normal: '一般時段',
    peak: '繁忙時段',
    transition: '過渡期',
    flat: '全日劃一',
  },
  colPeriod: '時段',
  colTime: '時間',
  colCar: '私家車',
  colTunnel: '隧道',
  dayWeekday: '平日（星期一至六，非公眾假期）',
  dayWeekend: '星期日及公眾假期',
  flatTitle: '劃一收費隧道（全日同價）',
  // The four timed tunnels are headed with the short name people use.
  titles: {
    cht: '紅隧（海底隧道）',
    ehc: '東隧（東區海底隧道）',
    whc: '西隧（西區海底隧道）',
    tlt: '大欖隧道',
  },
  names: Object.fromEntries(TUNNELS.map((tunnel) => [tunnel.id, tunnel.name.tc])),
};

const pad = (n) => String(n).padStart(2, '0');
const clock = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const money = (amount) => `$${Number.isInteger(amount) ? amount : amount.toFixed(1)}`;
const range = (segment) => (segment.firstAmount === segment.lastAmount
  ? money(segment.firstAmount)
  : `${money(segment.firstAmount)} – ${money(segment.lastAmount)}`);

const rows = (segments, labels) => segments
  .map((seg) => `        <tr><td>${labels.period[seg.periodType]}</td>`
    + `<td>${clock(seg.startMin)} – ${clock(seg.endMin)}</td>`
    + `<td>${range(seg)}</td></tr>`)
  .join('\n');

const table = (segments, labels) => `      <table>
        <thead><tr><th>${labels.colPeriod}</th><th>${labels.colTime}</th>`
  + `<th>${labels.colCar}</th></tr></thead>
        <tbody>
${rows(segments, labels)}
        </tbody>
      </table>`;

const tvtBlock = (id, labels) => {
  const days = ['weekday', 'weekend']
    .map((day) => `      <p class="tbl-day">${labels[day === 'weekday' ? 'dayWeekday' : 'dayWeekend']}</p>\n`
      + table(getDaySegments({ tunnelId: id, vehicleId: 'car', dayType: day }), labels))
    .join('\n');
  return `      <h4>${labels.titles[id]}</h4>\n${days}`;
};

const flatBlock = (labels) => {
  const lines = TUNNELS
    .filter((tunnel) => tunnel.pricing === 'flat')
    .map((tunnel) => {
      const amount = getToll({
        tunnelId: tunnel.id,
        vehicleId: classIdFor(tunnel.id, 'car'),
        dayType: 'weekday',
        minutes: 0,
      }).amount;
      return `        <tr><td>${labels.names[tunnel.id]}</td><td>${money(amount)}</td></tr>`;
    })
    .join('\n');
  return `      <h4>${labels.flatTitle}</h4>
      <table>
        <thead><tr><th>${labels.colTunnel}</th><th>${labels.colCar}</th></tr></thead>
        <tbody>
${lines}
        </tbody>
      </table>`;
};

// The whole set, in the order it appears in index.html.
export const tollTableBlocks = (labels = TC_LABELS) =>
  [...TVT.map((id) => tvtBlock(id, labels)), flatBlock(labels)].join('\n');
