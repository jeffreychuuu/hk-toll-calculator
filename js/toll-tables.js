// js/toll-tables.js
// The reference tables in the folded footer block. They are rendered into
// index.html as static text (so search engines read them without running any
// script) and this same function is what a test uses to keep that copy honest —
// change the rates and the test fails until the page is regenerated:
//
//   node scripts/print-toll-tables.mjs
//
// Each tunnel gets a section of its own, anchored as #toll-<id>, with a line of
// prose above its tables: the corridor, the weekday range and the holiday rate.
// The app also calls it at run time with the chosen language's labels.
import { TUNNELS, classIdFor } from './data.js';
import { getDaySegments } from './engine.js';
import { UI } from './i18n.js';
import { pagePath } from './paths.js';

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
  dayWeekday: '平日（星期一至六，非公眾假期）',
  dayWeekend: '星期日及公眾假期',
  tollWeekday: '平日私家車 {range}',
  tollWeekend: '假日 {range}',
  tollAllDay: '全日劃一 {amount}',
  // The four timed tunnels are headed with the short name people use.
  titles: {
    cht: '紅隧（海底隧道）',
    ehc: '東隧（東區海底隧道）',
    whc: '西隧（西區海底隧道）',
    tlt: '大欖隧道',
  },
  names: Object.fromEntries(TUNNELS.map((tunnel) => [tunnel.id, tunnel.name.tc])),
  // Each heading links to the tunnel's own page, which is how a crawler finds
  // them without the sitemap.
  hrefs: Object.fromEntries(TUNNELS.map((tunnel) => [tunnel.id, pagePath('tc', tunnel.id)])),
};

const pad = (n) => String(n).padStart(2, '0');
const clock = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
export const money = (amount) => `$${Number.isInteger(amount) ? amount : amount.toFixed(1)}`;
const range = (segment) => (segment.firstAmount === segment.lastAmount
  ? money(segment.firstAmount)
  : `${money(segment.firstAmount)} – ${money(segment.lastAmount)}`);

const rows = (segments, labels) => segments
  .map((seg) => `        <tr><td>${labels.period[seg.periodType]}</td>`
    + `<td>${clock(seg.startMin)} – ${clock(seg.endMin)}</td>`
    + `<td>${range(seg)}</td></tr>`)
  .join('\n');

const table = (segments, labels) => `      <table>\n        <thead><tr><th>${labels.colPeriod}</th><th>${labels.colTime}</th>`
  + `<th>${labels.colCar}</th></tr></thead>\n        <tbody>\n${rows(segments, labels)}\n        </tbody>\n      </table>`;

// The whole day's car fares as one figure or a span, which is the shape a
// search result wants: "$8" or "$20 – $40".
export const spread = (segments) => {
  const amounts = segments.flatMap((seg) => [seg.firstAmount, seg.lastAmount]);
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  return low === high ? money(low) : `${money(low)} – ${money(high)}`;
};

const tunnelBlock = (tunnel, labels) => {
  const id = tunnel.id;
  const carId = classIdFor(id, 'car');
  const weekday = getDaySegments({ tunnelId: id, vehicleId: carId, dayType: 'weekday' });
  const weekend = getDaySegments({ tunnelId: id, vehicleId: carId, dayType: 'weekend' });
  // A tunnel that charges one rate whenever you drive needs no clock picked out.
  const flat = [...weekday, ...weekend].every((seg) => seg.periodType === 'flat');
  const line = flat
    ? labels.tollAllDay.replace('{amount}', money(weekday[0].firstAmount))
    : `${labels.tollWeekday.replace('{range}', spread(weekday))}`
      + ` · ${labels.tollWeekend.replace('{range}', spread(weekend))}`;
  const days = flat
    ? table(weekday, labels)
    : `      <p class="tbl-day">${labels.dayWeekday}</p>\n${table(weekday, labels)}\n`
      + `      <p class="tbl-day">${labels.dayWeekend}</p>\n${table(weekend, labels)}`;
  // The heading tag and whether it links out are a caller's choice: the footer
  // block links to the tunnel's page, the page itself is plain.
  const heading = labels.heading ?? 'h4';
  const title = labels.titles[id] ?? labels.names[id];
  const url = labels.hrefs?.[id];
  const headingHtml = url
    ? `<${heading}><a href="${url}">${title}</a></${heading}>`
    : `<${heading}>${title}</${heading}>`;
  return `    <section class="toll-block" id="toll-${id}">\n`
    + `      ${headingHtml}\n`
    + `      <p class="toll-line">${line}</p>\n`
    + `${days}\n    </section>`;
};

// The whole set, in the order index.html lists the tunnels.
export const tollTableBlocks = (labels = TC_LABELS) =>
  TUNNELS.map((tunnel) => tunnelBlock(tunnel, labels)).join('\n');

// One tunnel's block — the landing pages show a single corridor, not all nine.
export const tollTableBlock = (tunnelId, labels = TC_LABELS) => {
  const tunnel = TUNNELS.find((t) => t.id === tunnelId);
  if (!tunnel) throw new Error(`unknown tunnel: ${tunnelId}`);
  return tunnelBlock(tunnel, labels);
};

// The labels for one language, shared by the app's runtime render and the
// landing-page generator so the two can never drift. Names resolve defensively
// for the stale-cache case (a cached pre-i18n data.js).
export function labelsFor(lang) {
  const ref = UI[lang].reference;
  const nameOf = (tunnel) => {
    const name = tunnel.name;
    if (typeof name === 'string') return name;
    return name?.[lang] ?? name?.tc ?? tunnel.id;
  };
  return {
    period: UI[lang].period,
    colPeriod: ref.colPeriod,
    colTime: ref.colTime,
    colCar: ref.colCar,
    dayWeekday: ref.dayWeekday,
    dayWeekend: ref.dayWeekend,
    tollWeekday: ref.tollWeekday,
    tollWeekend: ref.tollWeekend,
    tollAllDay: ref.tollAllDay,
    titles: ref.titles,
    names: Object.fromEntries(TUNNELS.map((tunnel) => [tunnel.id, nameOf(tunnel)])),
    hrefs: Object.fromEntries(TUNNELS.map((tunnel) => [tunnel.id, pagePath(lang, tunnel.id)])),
  };
}
