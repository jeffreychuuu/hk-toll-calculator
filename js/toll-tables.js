// js/toll-tables.js
// The toll tables shown in the collapsed "收費時段表" blocks at the foot of the
// page. They are rendered into index.html as static text (so search engines read
// them without running any script) and this same function is what a test uses to
// keep that copy honest — change the rates and the test fails until the page is
// regenerated:
//
//   node scripts/print-toll-tables.mjs
//
import { TUNNELS } from './data.js';
import { getDaySegments, getToll } from './engine.js';
import { classIdFor } from './data.js';

const PERIOD = {
  'non-peak': '非繁忙時段',
  normal: '一般時段',
  peak: '繁忙時段',
  transition: '過渡期',
  flat: '全日劃一',
};
const DAY = {
  weekday: '平日（星期一至六，非公眾假期）',
  weekend: '星期日及公眾假期',
};
// Only these four vary with the clock; the rest charge one rate all day.
const TVT = ['cht', 'ehc', 'whc', 'tlt'];
const TITLE = {
  cht: '紅隧（海底隧道）',
  ehc: '東隧（東區海底隧道）',
  whc: '西隧（西區海底隧道）',
  tlt: '大欖隧道',
};

const pad = (n) => String(n).padStart(2, '0');
const clock = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const money = (amount) => `$${Number.isInteger(amount) ? amount : amount.toFixed(1)}`;
const range = (segment) => (segment.firstAmount === segment.lastAmount
  ? money(segment.firstAmount)
  : `${money(segment.firstAmount)} – ${money(segment.lastAmount)}`);

const rows = (segments) => segments
  .map((seg) => `        <tr><td>${PERIOD[seg.periodType]}</td>`
    + `<td>${clock(seg.startMin)} – ${clock(seg.endMin)}</td>`
    + `<td>${range(seg)}</td></tr>`)
  .join('\n');

const table = (segments, day) => `      <h4>${DAY[day]}</h4>
      <table>
        <thead><tr><th>時段</th><th>時間</th><th>私家車</th></tr></thead>
        <tbody>
${rows(segments)}
        </tbody>
      </table>`;

const tvtBlock = (id) => {
  const tables = ['weekday', 'weekend']
    .map((day) => table(getDaySegments({ tunnelId: id, vehicleId: 'car', dayType: day }), day))
    .join('\n');
  return `    <details class="tolls">
      <summary>${TITLE[id]}收費時段表</summary>
${tables}
    </details>`;
};

const flatBlock = () => {
  const lines = TUNNELS
    .filter((tunnel) => tunnel.pricing === 'flat')
    .map((tunnel) => {
      const amount = getToll({
        tunnelId: tunnel.id,
        vehicleId: classIdFor(tunnel.id, 'car'),
        dayType: 'weekday',
        minutes: 0,
      }).amount;
      return `        <tr><td>${tunnel.name.tc}</td><td>${money(amount)}</td></tr>`;
    })
    .join('\n');
  return `    <details class="tolls">
      <summary>劃一收費隧道（全日同價）</summary>
      <table>
        <thead><tr><th>隧道</th><th>私家車</th></tr></thead>
        <tbody>
${lines}
        </tbody>
      </table>
    </details>`;
};

// The whole set, in the order it appears in index.html.
export const tollTableBlocks = () =>
  [...TVT.map(tvtBlock), flatBlock()].join('\n');
