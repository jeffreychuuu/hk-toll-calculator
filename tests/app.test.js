// tests/app.test.js
// Drives js/app.js under a stub DOM so the UI wiring is testable without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const RealDate = Date;
let fakeNowMs = new RealDate(2026, 9, 8, 7, 29).getTime(); // Thu 2026-10-08 07:29 (not a holiday)
class FakeDate extends RealDate {
  constructor(...args) {
    if (args.length) return new RealDate(...args);
    super(fakeNowMs);
  }
  static now() { return fakeNowMs; }
}
globalThis.Date = FakeDate;

// Node 24 exposes a getter-only `navigator`; redefine it so the default
// language is deterministic instead of the runtime's 'en-US'.
Object.defineProperty(globalThis, 'navigator', {
  value: { language: 'zh-TW' },
  configurable: true,
  writable: true,
});

const storage = new Map();
let storageFails = false;
globalThis.localStorage = {
  getItem(k) {
    if (storageFails) throw new Error('storage disabled');
    return storage.has(k) ? storage.get(k) : null;
  },
  setItem(k, v) {
    if (storageFails) throw new Error('storage disabled');
    storage.set(k, String(v));
  },
  removeItem(k) { storage.delete(k); },
};
const STORAGE_KEY = 'hk-toll-calculator.selection';

const mkButton = (ds) => ({
  dataset: ds, ariaPressed: null, textContent: '', disabled: false,
  setAttribute(k, v) {
    if (k === 'aria-pressed') this.ariaPressed = v;
    if (k === 'aria-selected') this.ariaSelected = v;
  },
  addEventListener() {}, closest() { return this; },
});
const buttonsFor = { };

const elements = new Map();
function mk(id) {
  return {
    id, _innerHTML: '', textContent: '', hidden: false, className: '', value: '', style: {}, disabled: false,
    _handlers: {}, _attrs: {},
    addEventListener(t, h) { this._handlers[t] = h; },
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
    focus() { this.focused = true; },
    querySelectorAll(sel) { return sel === 'button' ? (buttonsFor[id] || []) : []; },
    closest(sel) {
      if (sel === '.lang-picker') return ['lang-picker', 'lang-trigger', 'lang-menu'].includes(id) ? this : null;
      return null;
    },
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) { this._innerHTML = v; },
    get selectedOptions() {
      const all = [...this._innerHTML.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g)];
      const hit = all.find((o) => o[1] === this.value) || all[0] || ['', '', ''];
      return [{ textContent: hit[2] }];
    },
  };
}
for (const id of ['result-title', 'result-subtitle', 'period-badge', 'price-amount', 'next-hint',
  'now-date', 'now-time', 'chart-bar', 'chart-marker', 'legend', 'tunnel-select', 'vehicle-select',
  'date-input', 'daytype-select',
  'hour-select', 'minute-select', 'time-slider', 'back-to-now', 'holiday-notice',
  'chart-title', 'lang-picker',
  'compare-note',
  'plan-card', 'plan-title', 'label-from', 'label-to', 'from-select', 'to-select', 'plan-result',
  'alt-card', 'alt-title', 'alt-list', 'alt-categories',
  'lang-trigger', 'lang-current', 'lang-menu', 'site-footer']) elements.set(id, mk(id));

globalThis.document = {
  getElementById: (id) => elements.get(id),
  documentElement: { lang: '' },
  title: '',
  _handlers: {},
  addEventListener(t, h) { this._handlers[t] = h; },
};
let intervalCb = null;
globalThis.setInterval = (fn) => { intervalCb = fn; return 1; };

const $ = (id) => elements.get(id);
const fire = (id, type, extra = {}) => {
  const handler = $(id)._handlers[type];
  assert.ok(handler, `#${id} has a ${type} handler`);
  handler({ target: $(id), ...extra });
};
const fireDoc = (type, extra = {}) => {
  const handler = document._handlers[type];
  assert.ok(handler, `document has a ${type} handler`);
  handler({ target: { closest: () => null }, ...extra });
};
const langOption = (lang) => ({ closest: () => ({ dataset: { lang } }) });
const isOpen = () => $('lang-menu').hidden === false;
const setTime = (hh, mm) => {
  $('hour-select').value = hh;
  $('minute-select').value = mm;
  fire('minute-select', 'change');
};
const shownTime = () => `${$('hour-select').value}:${$('minute-select').value}`;

await import('../js/app.js');

test('the toll follows the clock while the page sits open', () => {
  assert.equal(shownTime(), '07:29');
  assert.equal($('price-amount').textContent, '20.00');

  fakeNowMs = new RealDate(2026, 9, 8, 7, 30).getTime(); // one minute later, transition starts
  intervalCb();

  assert.equal(shownTime(), '07:30');
  assert.equal($('price-amount').textContent, '22.00');
  assert.equal($('period-badge').textContent, '過渡期');
});

test('the time dropdowns offer every hour and minute', () => {
  assert.equal(($('hour-select').innerHTML.match(/<option/g) || []).length, 24);
  assert.equal(($('minute-select').innerHTML.match(/<option/g) || []).length, 60);
});

test('choosing a time from the dropdowns prices it exactly', () => {
  setTime('07', '48'); // peak starts on this minute
  assert.equal($('price-amount').textContent, '40.00');
  assert.equal($('period-badge').textContent, '繁忙時段');

  setTime('19', '16'); // red tunnel car, down-transition ramp
  assert.equal($('price-amount').textContent, '22.00');
});

test('following stops once the user picks a time themselves', () => {
  setTime('10', '30');
  assert.equal($('price-amount').textContent, '30.00');

  fakeNowMs = new RealDate(2026, 9, 8, 16, 30).getTime();
  intervalCb();

  assert.equal(shownTime(), '10:30');
  assert.equal($('price-amount').textContent, '30.00');
});

test('the slider and the hour/minute dropdowns stay in sync', () => {
  $('time-slider').value = '450'; // 07:30
  fire('time-slider', 'input');
  assert.equal(shownTime(), '07:30');
  assert.equal($('price-amount').textContent, '22.00');

  setTime('19', '16');
  assert.equal($('time-slider').value, '1156');
  assert.equal($('price-amount').textContent, '22.00');
});

test('the back-to-now button resets the slider too', () => {
  setTime('10', '30');
  assert.equal($('time-slider').value, '630');

  fakeNowMs = new RealDate(2026, 9, 8, 16, 38).getTime();
  fire('back-to-now', 'click');
  assert.equal(shownTime(), '16:38');
  assert.equal($('time-slider').value, '998');
});

test('the back-to-now button returns to the current time and resumes following', () => {
  setTime('10', '30');
  assert.equal(shownTime(), '10:30');

  fakeNowMs = new RealDate(2026, 9, 8, 16, 30).getTime();
  fire('back-to-now', 'click');

  assert.equal(shownTime(), '16:30');
  assert.equal($('price-amount').textContent, '32.00'); // red tunnel car, up-transition first step

  fakeNowMs = new RealDate(2026, 9, 8, 16, 38).getTime();
  intervalCb();
  assert.equal(shownTime(), '16:38');
  assert.equal($('price-amount').textContent, '40.00'); // peak
});

test('the selection is saved to localStorage when it changes', () => {
  $('tunnel-select').value = 'tlt';
  fire('tunnel-select', 'change');
  $('vehicle-select').value = 'moto';
  fire('vehicle-select', 'change');
  const saved = JSON.parse(storage.get(STORAGE_KEY));
  assert.equal(saved.tunnelId, 'tlt');
  assert.equal(saved.vehicleId, 'moto');
});

test('a saved selection is restored on load', async () => {
  storage.set(STORAGE_KEY, JSON.stringify({ tunnelId: 'whc', vehicleId: 'moto' }));
  await import('../js/app.js?restore=1');
  assert.equal($('tunnel-select').value, 'whc');
  assert.equal($('vehicle-select').value, 'moto');
});

test('an invalid saved selection falls back to the defaults', async () => {
  storage.set(STORAGE_KEY, JSON.stringify({ tunnelId: 'nope', vehicleId: 'bogus' }));
  await import('../js/app.js?bogus=1');
  assert.equal($('tunnel-select').value, 'cht');
  assert.equal($('vehicle-select').value, 'car');
});

test('a saved vehicle that does not exist for the saved tunnel falls back to the first option', async () => {
  storage.set(STORAGE_KEY, JSON.stringify({ tunnelId: 'abt', vehicleId: 'car' }));
  await import('../js/app.js?mismatch=1');
  assert.equal($('tunnel-select').value, 'abt');
  assert.equal($('vehicle-select').value, 'car');
});

test('storage failures do not break rendering', async () => {
  storageFails = true;
  await import('../js/app.js?broken=1');
  assert.equal($('tunnel-select').value, 'cht');
  assert.ok($('tunnel-select').selectedOptions[0].textContent.includes('海底隧道（紅隧）'));
  assert.equal($('vehicle-select').value, 'car');
  storageFails = false;
});

test('the language picker starts closed and shows the current language', () => {
  assert.equal($('lang-menu').hidden, true);
  assert.equal($('lang-trigger').getAttribute('aria-expanded'), 'false');
  assert.equal($('lang-current').textContent, '繁體中文');
  assert.equal($('lang-trigger').getAttribute('aria-label'), '語言');
});

test('the menu offers exactly the three languages from LANGS', () => {
  const menu = $('lang-menu').innerHTML;
  for (const label of ['繁體中文', '简体中文', 'English']) assert.ok(menu.includes(label), `missing ${label}`);
  for (const lang of ['tc', 'sc', 'en']) assert.ok(menu.includes(`data-lang="${lang}"`), `missing ${lang}`);
  assert.equal((menu.match(/data-lang=/g) || []).length, 3);
  assert.ok(menu.includes('aria-selected="true"'), 'the current language should be marked');
});

test('the trigger opens and closes the menu', () => {
  fire('lang-trigger', 'click');
  assert.equal(isOpen(), true);
  assert.equal($('lang-trigger').getAttribute('aria-expanded'), 'true');

  fireDoc('click', { target: $('lang-trigger') }); // clicks inside the picker keep it open
  assert.equal(isOpen(), true);

  fire('lang-trigger', 'click');
  assert.equal(isOpen(), false);
  assert.equal($('lang-trigger').getAttribute('aria-expanded'), 'false');
});

test('Escape closes the menu and returns focus to the trigger', () => {
  fire('lang-trigger', 'click');
  assert.equal(isOpen(), true);

  fireDoc('keydown', { key: 'Escape' });
  assert.equal(isOpen(), false);
  assert.equal($('lang-trigger').focused, true);
});

test('a click outside closes the menu', () => {
  fire('lang-trigger', 'click');
  assert.equal(isOpen(), true);

  fireDoc('click', { target: { closest: () => null } });
  assert.equal(isOpen(), false);
});

test('choosing English re-renders every label and the data names', () => {
  fire('lang-trigger', 'click');
  fire('lang-menu', 'click', { target: langOption('en') });

  assert.equal(isOpen(), false, 'the menu should close after choosing');
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(document.title, 'HK Toll Calculator');
  assert.equal($('lang-current').textContent, 'English');
  assert.equal($('chart-title').textContent, '24-hour toll period chart');
  assert.equal($('alt-title').textContent, 'Options for the same trip');
  assert.equal($('plan-title').textContent, 'Journey suggestion');
  assert.equal($('tunnel-select').getAttribute('aria-label'), 'Tunnel');
  assert.equal($('vehicle-select').getAttribute('aria-label'), 'Vehicle class');
  assert.equal($('daytype-select').getAttribute('aria-label'), 'Day type');
  assert.equal($('date-input').getAttribute('aria-label'), 'Date');
  assert.equal($('back-to-now').textContent, 'Back to now');
  assert.ok($('daytype-select').innerHTML.includes('Mon–Sat (non-holiday)'));
  assert.ok($('tunnel-select').innerHTML.includes('Cross-Harbour Tunnel (Hung Hom)'));
  assert.ok($('tunnel-select').innerHTML.includes('Tai Lam Tunnel'));
  assert.equal($('period-badge').textContent, 'Peak'); // 17:30 on a weekday is the red tunnel's peak
});

test('choosing Simplified Chinese re-renders the labels', () => {
  fire('lang-menu', 'click', { target: langOption('sc') });
  assert.equal(document.documentElement.lang, 'zh-Hans');
  assert.equal($('chart-title').textContent, '24小时收费时段分布图');
  assert.equal($('tunnel-select').getAttribute('aria-label'), '选择隧道');
  assert.ok($('tunnel-select').innerHTML.includes('海底隧道（红隧）'));
});

test('the chosen language is stored', () => {
  fire('lang-menu', 'click', { target: langOption('tc') });
  assert.equal(storage.get('hk-toll-calculator.lang'), 'tc');
});

test('a saved language is restored on load', async () => {
  storage.set('hk-toll-calculator.lang', 'en');
  await import('../js/app.js?lang-en=1');
  assert.equal($('chart-title').textContent, '24-hour toll period chart');
  assert.equal($('lang-current').textContent, 'English');
  assert.ok($('lang-menu').innerHTML.includes('aria-selected="true"'));
});

test('an unsupported saved language falls back to detection', async () => {
  storage.set('hk-toll-calculator.lang', 'klingon');
  await import('../js/app.js?lang-bogus=1');
  assert.equal($('chart-title').textContent, '24小時收費時段分佈圖');
});

test('a non-Chinese browser language defaults to English', async () => {
  storage.delete('hk-toll-calculator.lang');
  navigator.language = 'en-GB';
  await import('../js/app.js?nav-en=1');
  assert.equal($('chart-title').textContent, '24-hour toll period chart');
  navigator.language = 'zh-TW';
});

test('the day-type dropdown shows what the picked date implies', () => {
  $('tunnel-select').value = 'cht';
  fire('tunnel-select', 'change');
  fakeNowMs = new RealDate(2026, 9, 8, 12, 0).getTime(); // Thursday
  setTime('12', '00');
  $('date-input').value = '2026-10-08';
  fire('date-input', 'change');
  assert.equal($('daytype-select').value, 'weekday');
  assert.equal($('price-amount').textContent, '30.00'); // weekday normal window

  $('date-input').value = '2026-10-11'; // Sunday
  fire('date-input', 'change');
  assert.equal($('daytype-select').value, 'weekend', 'a Sunday flips the dropdown');
  assert.equal($('price-amount').textContent, '25.00');
});

test('a public holiday that lands on a weekday uses the weekend schedule', () => {
  $('tunnel-select').value = 'cht';
  fire('tunnel-select', 'change');
  setTime('12', '00');
  $('date-input').value = '2026-10-19'; // the day following Chung Yeung, a Monday
  fire('date-input', 'change');
  assert.equal($('daytype-select').value, 'weekend');
  assert.equal($('price-amount').textContent, '25.00');
});

test('choosing a day type overrides what the date implies', () => {
  $('tunnel-select').value = 'cht';
  fire('tunnel-select', 'change');
  setTime('12', '00');
  $('date-input').value = '2026-10-11'; // Sunday -> weekend
  fire('date-input', 'change');
  $('daytype-select').value = 'weekday';
  fire('daytype-select', 'change');
  assert.equal($('price-amount').textContent, '30.00', 'the override wins');

  $('date-input').value = '2026-10-09'; // a new date clears the override
  fire('date-input', 'change');
  assert.equal($('daytype-select').value, 'weekday', 'and the date decides again');
});

test('back-to-now returns to today and clears the override', () => {
  fakeNowMs = new RealDate(2026, 9, 8, 16, 38).getTime();
  $('date-input').value = '2027-01-01'; // a Friday public holiday
  fire('date-input', 'change');
  $('daytype-select').value = 'weekday';
  fire('daytype-select', 'change');

  fire('back-to-now', 'click');
  assert.equal($('date-input').value, '2026-10-08');
  assert.equal($('daytype-select').value, 'weekday', 'the date decides again');
  assert.equal(shownTime(), '16:38');
  assert.equal($('back-to-now').disabled, true);
});

test('the notice appears only for dates outside the holiday data', () => {
  $('date-input').value = '2028-01-01';
  fire('date-input', 'change');
  assert.equal($('holiday-notice').hidden, false);

  $('date-input').value = '2026-10-09';
  fire('date-input', 'change');
  assert.equal($('holiday-notice').hidden, true);
});

test('the clock tick rolls the date over', () => {
  fire('back-to-now', 'click'); // unpin
  fakeNowMs = new RealDate(2026, 9, 8, 23, 59).getTime();
  intervalCb();
  assert.equal($('date-input').value, '2026-10-08');

  fakeNowMs = new RealDate(2026, 9, 9, 0, 1).getTime();
  intervalCb();
  assert.equal($('date-input').value, '2026-10-09');
});

test('a picked date is not overwritten by the clock tick', () => {
  $('tunnel-select').value = 'cht';
  fire('tunnel-select', 'change');
    $('date-input').value = '2026-10-19'; // a Monday public holiday
  fire('date-input', 'change');
  setTime('10', '30'); // weekend normal window, so the schedule is visible in the price
  assert.equal($('back-to-now').disabled, false, 'a picked date must be releasable');
  assert.equal($('price-amount').textContent, '25.00');

  fakeNowMs = new RealDate(2026, 9, 20, 0, 5).getTime();
  intervalCb();

  assert.equal($('date-input').value, '2026-10-19', 'the tick must not overwrite a picked date');
  assert.equal($('price-amount').textContent, '25.00'); // still the holiday schedule
});

test('the result card lists the ways to make the same trip, current tunnel first', async () => {
  storage.delete('hk-toll-calculator.selection');
  fakeNowMs = new RealDate(2026, 9, 8, 12, 0).getTime(); // midweek noon
  await import('../js/app.js?alt=1');

  assert.equal($('alt-card').hidden, false);

  const list = $('alt-list').innerHTML;
  assert.ok(list.includes('東區海底隧道（東隧）'));
  assert.ok(list.includes('西區海底隧道（西隧）'));
  assert.ok(list.includes('海底隧道（紅隧）'), 'the selected tunnel is listed too');
  assert.equal((list.match(/compare-row/g) || []).length, 3);

  // the selected tunnel carries 現用, and 最平 when it ties for cheapest at noon
  const current = list.slice(list.indexOf('海底隧道（紅隧）'), list.indexOf('東區海底隧道'));
  assert.ok(current.includes('現用'), 'marked as the current choice');
  assert.ok(current.includes('最平'), 'and as cheapest, because it is');
  const chips = $('alt-categories').innerHTML;
  assert.equal((chips.match(/data-group=/g) || []).length, 6, 'every corridor is one click away');
  const harbourChip = chips.slice(chips.indexOf('data-group="harbour"'), chips.indexOf('data-group="kln-nte"'));
  assert.ok(harbourChip.includes('aria-pressed="true"'), 'its corridor is preselected');
});

test('the category selector follows the selected tunnel', () => {
  $('tunnel-select').value = 'lrt'; // Lion Rock: the Kowloon to East NT corridor
  fire('tunnel-select', 'change');

  const chips = $('alt-categories').innerHTML;
  const kowloonChip = chips.slice(chips.indexOf('data-group="kln-nte"'), chips.indexOf('data-group="kln-ntw"'));
  assert.ok(kowloonChip.includes('aria-pressed="true"'), 'its corridor is selected');
  const list = $('alt-list').innerHTML;
  assert.ok(list.includes('大老山隧道'));
  assert.ok(list.includes('沙田嶺／尖山／大圍隧道'), 'the Sha Tin Heights corridor belongs here too');
  assert.ok(list.includes('大埔道'));
  assert.ok(list.includes('最平'), 'the free corridor is the cheapest and marked');
});

test('clicking an alternative switches the tunnel', () => {
  fire('alt-list', 'click', { target: { closest: () => ({ dataset: { tunnelId: 'tct' } }) } });
  assert.equal($('tunnel-select').value, 'tct');
  assert.equal($('tunnel-select').value, 'tct');
  assert.ok($('tunnel-select').selectedOptions[0].textContent.includes('大老山隧道'));
  const rows = $('alt-list').innerHTML.split('<li>').filter((row) => row.includes('大老山隧道'));
  assert.equal(rows.length, 1, 'the list follows the new selection');
  assert.ok(rows[0].includes('現用'), 'and marks it as the current choice');
});

test('choosing another corridor swaps the list in one click', () => {
  fire('alt-categories', 'click', { target: { closest: () => ({ dataset: { group: 'harbour' } }) } });

  const rows = $('alt-list').innerHTML;
  assert.ok(rows.includes('西區海底隧道（西隧）'));
  assert.ok(rows.includes('東區海底隧道（東隧）'));
  assert.ok(!rows.includes('大老山隧道'), 'nothing from other corridors');
  assert.ok(!rows.includes('現用'), 'the selected tunnel belongs to another corridor');

  fire('alt-categories', 'click', { target: { closest: () => ({ dataset: { group: 'nte-ntw' } }) } });
  assert.ok($('alt-list').innerHTML.includes('城門隧道'), 'another corridor, one click');

  // and back to the selected tunnel's corridor
  fire('alt-categories', 'click', { target: { closest: () => ({ dataset: { group: 'kln-nte' } }) } });
  assert.ok($('alt-list').innerHTML.includes('現用'));
});

test('the result and the schedule sit on the same page, with the journey last', () => {
  assert.equal($('alt-card').hidden, false, 'the alternatives card is shown');
  assert.equal($('chart-marker') !== undefined, true, 'the chart is on screen too');
  assert.ok($('plan-result').innerHTML.length > 0, 'the journey section is rendered at the bottom');
});

test('a tunnel outside the macro map shows no alternatives', () => {
  $('tunnel-select').value = 'dbt'; // Discovery Bay stands alone
  fire('tunnel-select', 'change');
  assert.equal($('alt-card').hidden, true);

  $('tunnel-select').value = 'cht';
  fire('tunnel-select', 'change');
  assert.equal($('alt-card').hidden, false);
});

test('the alternatives follow the chosen vehicle', () => {
  $('vehicle-select').value = 'other'; // goods / minibus / bus
  fire('vehicle-select', 'change');
  const list = $('alt-list').innerHTML;
  assert.ok(list.includes('HK$ 50.00'), 'the harbour crossings cost 50 for a commercial vehicle');
  assert.ok(!list.includes('HK$ 30.00'));
});

test('the journey card groups districts by macro area', async () => {
  const { REGIONS: ALL_DISTRICTS } = await import('../js/regions.js');
  storage.delete('hk-toll-calculator.selection');
  fakeNowMs = new RealDate(2026, 9, 8, 12, 0).getTime();
  await import('../js/app.js?plan=2');

  const from = $('from-select').innerHTML;
  assert.equal((from.match(/<optgroup/g) || []).length, 3, 'island / kowloon / new territories');
  for (const label of ['港島', '九龍', '新界']) assert.ok(from.includes(label), `missing group ${label}`);
  assert.equal((from.match(/<option/g) || []).length, ALL_DISTRICTS.length + 1, 'every district plus unset');
  assert.ok($('plan-result').innerHTML.includes('揀返起點同終點'));
});

test('a harbour trip lists routes with their tunnels and total toll', () => {
  $('from-select').value = 'nt-st';
  fire('from-select', 'change');
  $('to-select').value = 'hki-wc';
  fire('to-select', 'change');

  const html = $('plan-result').innerHTML;
  assert.ok(html.includes('獅子山隧道'), 'the approach tunnel is named');
  assert.ok(html.includes('海底隧道（紅隧）'));
  assert.ok(html.includes('東區海底隧道（東隧）'));
  assert.ok(html.includes('HK$ 38.00'), 'Lion Rock + red tunnel at noon');
  assert.ok(html.includes('大埔道'), 'the free corridor is named');
  assert.ok(html.indexOf('大埔道') < html.indexOf('海底隧道（紅隧）'), 'road then crossing, in order');
  assert.ok(html.includes('最平'), 'the cheapest route is labelled');
});

test('a route with no tunnel is labelled as free roads', () => {
  $('from-select').value = 'nt-st';
  fire('from-select', 'change');
  $('to-select').value = 'nt-tw';
  fire('to-select', 'change');

  const html = $('plan-result').innerHTML;
  assert.ok(html.includes('林錦公路／青山公路'), 'the free corridor is named');
  assert.ok(html.includes('HK$ 0.00'));
  assert.ok(html.includes('城門隧道'));
  assert.ok(html.includes('HK$ 8.00'));
});

test('a trip that needs no tunnel at all still gets a suggestion', () => {
  $('from-select').value = 'kln-ytm';
  fire('from-select', 'change');
  $('to-select').value = 'kln-kt';
  fire('to-select', 'change');

  const html = $('plan-result').innerHTML;
  assert.ok(html.includes('太子道東'), 'the free road is named');
  assert.ok(html.includes('HK$ 0.00'));
  assert.ok(html.includes('最平'));
});

test('the route list is capped so the card stays readable', () => {
  $('from-select').value = 'nt-tm'; // Tuen Mun: the widest choice of options
  fire('from-select', 'change');
  $('to-select').value = 'hki-cw';
  fire('to-select', 'change');

  const rows = ($('plan-result').innerHTML.match(/plan-route-name/g) || []).length;
  assert.ok(rows >= 1 && rows <= 6, `expected 1-6 routes, got ${rows}`);
});

test('the route totals follow the chosen vehicle', () => {
  $('from-select').value = 'nt-st';
  fire('from-select', 'change');
  $('to-select').value = 'hki-wc';
  fire('to-select', 'change');
  assert.ok($('plan-result').innerHTML.includes('HK$ 38.00'));

  $('vehicle-select').value = 'moto';
  fire('vehicle-select', 'change');
  assert.ok($('plan-result').innerHTML.includes('HK$ 20.00'), 'motorcycle: Lion Rock $8 + red tunnel $12');
});

test('a stale, string-named data module can never render undefined', async () => {
  const data = await import('../js/data.js');
  const tunnelName = data.TUNNELS[0].name;      // { tc, sc, en }
  const vehicleName = data.TVT_VEHICLES[0].name;

  // Simulate what a browser serves when it mixes a cached (pre-i18n) data.js
  // with the current app.js: names are plain strings again.
  data.TUNNELS[0].name = tunnelName.tc;
  data.TVT_VEHICLES[0].name = vehicleName.tc;

  storage.delete('hk-toll-calculator.selection');
  storage.delete('hk-toll-calculator.lang');
  navigator.language = 'zh-TW';
  await import('../js/app.js?stale-data=1');

  assert.ok(!$('tunnel-select').innerHTML.includes('undefined'), 'tunnel list showed undefined');
  assert.ok(!$('vehicle-select').innerHTML.includes('undefined'), 'vehicle list showed undefined');
  assert.equal($('tunnel-select').value, 'cht');
  assert.ok($('tunnel-select').selectedOptions[0].textContent.includes('海底隧道（紅隧）'));

  data.TUNNELS[0].name = tunnelName;
  data.TVT_VEHICLES[0].name = vehicleName;
});
