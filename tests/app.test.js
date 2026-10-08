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
  setAttribute(k, v) { if (k === 'aria-pressed') this.ariaPressed = v; },
  addEventListener() {}, closest() { return this; },
});
const buttonsFor = {};

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
  'date-input', 'daytype-label', 'hour-select', 'minute-select', 'time-slider', 'back-to-now',
  'holiday-notice', 'chart-title', 'label-tunnel', 'label-vehicle', 'label-date', 'label-time', 'lang-picker',
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

test('the clock label always tracks real time, even when following is off', () => {
  fakeNowMs = new RealDate(2026, 9, 8, 18, 5).getTime();
  intervalCb();
  assert.equal($('now-time').textContent, '18:05');
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

test("the header shows today's date alongside the clock", () => {
  fakeNowMs = new RealDate(2026, 9, 8, 17, 30).getTime();
  intervalCb();
  assert.equal($('now-date').textContent, '2026年10月8日（四）');
  assert.equal($('now-time').textContent, '17:30');
});

test('the selection is saved to localStorage when it changes', () => {
  $('tunnel-select').value = 'tlt';
  fire('tunnel-select', 'change');
  $('vehicle-select').value = 'moto';
  fire('vehicle-select', 'change');
  assert.deepEqual(JSON.parse(storage.get(STORAGE_KEY)), { tunnelId: 'tlt', vehicleId: 'moto' });
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
  assert.equal($('vehicle-select').value, 'all');
});

test('storage failures do not break rendering', async () => {
  storageFails = true;
  await import('../js/app.js?broken=1');
  assert.equal($('result-title').textContent, '海底隧道（紅隧）');
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
  assert.equal($('label-tunnel').textContent, 'Tunnel');
  assert.equal($('label-vehicle').textContent, 'Vehicle class');
  assert.equal($('label-time').textContent, 'Crossing time');
  assert.equal($('label-date').textContent, 'Date');
  assert.equal($('back-to-now').textContent, 'Back to now');
  assert.equal($('daytype-label').textContent, 'Mon–Sat (non-holiday)');
  assert.equal($('result-title').textContent, 'Cross-Harbour Tunnel (Hung Hom)');
  assert.ok($('tunnel-select').innerHTML.includes('Tai Lam Tunnel'));
  assert.equal($('period-badge').textContent, 'Peak'); // 17:30 on a weekday is the red tunnel's peak
});

test('choosing Simplified Chinese re-renders the labels', () => {
  fire('lang-menu', 'click', { target: langOption('sc') });
  assert.equal(document.documentElement.lang, 'zh-Hans');
  assert.equal($('chart-title').textContent, '24小时收费时段分布图');
  assert.equal($('label-tunnel').textContent, '选择隧道');
  assert.equal($('result-title').textContent, '海底隧道（红隧）');
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

test('the date picker defaults to today and shows the derived day type', async () => {
  storage.delete('hk-toll-calculator.selection');
  fakeNowMs = new RealDate(2026, 9, 8, 17, 30).getTime(); // Thursday
  await import('../js/app.js?date-default=1');

  assert.equal($('date-input').value, '2026-10-08');
  assert.equal($('daytype-label').textContent, '星期一至六（非假期）');
  assert.equal($('holiday-notice').hidden, true);
});

test('picking a Sunday switches to the weekend schedule', () => {
  $('date-input').value = '2026-10-11'; // Sunday
  fire('date-input', 'change');

  assert.equal($('daytype-label').textContent, '星期日及公眾假期');
  assert.equal($('price-amount').textContent, '25.00'); // 17:30 weekend normal window
});

test('picking a public holiday on a weekday switches to the weekend schedule', () => {
  $('date-input').value = '2026-10-19'; // the day following Chung Yeung, a Monday
  fire('date-input', 'change');

  assert.equal($('daytype-label').textContent, '星期日及公眾假期');
  assert.equal($('price-amount').textContent, '25.00');
});

test('an ordinary weekday keeps the weekday schedule', () => {
  $('date-input').value = '2026-10-09'; // Friday
  fire('date-input', 'change');

  assert.equal($('daytype-label').textContent, '星期一至六（非假期）');
  assert.equal($('price-amount').textContent, '40.00'); // 17:30 weekday peak
});

test('the notice appears only for dates outside the holiday data', () => {
  $('date-input').value = '2028-01-01';
  fire('date-input', 'change');
  assert.equal($('holiday-notice').hidden, false);

  $('date-input').value = '2026-10-09';
  fire('date-input', 'change');
  assert.equal($('holiday-notice').hidden, true);
});

test('back-to-now resets the date to today as well as the time', () => {
  $('date-input').value = '2026-10-19';
  fire('date-input', 'change');
  assert.equal($('daytype-label').textContent, '星期日及公眾假期');

  fakeNowMs = new RealDate(2026, 9, 8, 16, 38).getTime();
  fire('back-to-now', 'click');

  assert.equal($('date-input').value, '2026-10-08');
  assert.equal($('daytype-label').textContent, '星期一至六（非假期）');
  assert.equal(shownTime(), '16:38');
  assert.equal($('price-amount').textContent, '40.00'); // 16:38 weekday peak
});

test('picking a date enables back-to-now', () => {
  $('date-input').value = '2026-10-19';
  fire('date-input', 'change');
  assert.equal($('back-to-now').disabled, false, 'back-to-now must be clickable after a date is picked');
});

test('a picked date survives the clock tick', () => {
  $('date-input').value = '2026-10-19';
  fire('date-input', 'change');
  assert.equal($('date-input').value, '2026-10-19');

  fakeNowMs = new RealDate(2026, 9, 20, 0, 5).getTime(); // past midnight, next day
  intervalCb();

  assert.equal($('date-input').value, '2026-10-19', 'the tick must not overwrite a picked date');
  assert.equal($('daytype-label').textContent, '星期日及公眾假期');
});

test('the clock tick still rolls the date over when no date was picked', () => {
  fire('back-to-now', 'click'); // clear both pins
  fakeNowMs = new RealDate(2026, 9, 8, 23, 59).getTime();
  intervalCb();
  assert.equal($('date-input').value, '2026-10-08');

  fakeNowMs = new RealDate(2026, 9, 9, 0, 1).getTime();
  intervalCb();
  assert.equal($('date-input').value, '2026-10-09');
  assert.equal($('daytype-label').textContent, '星期一至六（非假期）');
});

test('back-to-now clears a manually picked date', () => {
  $('date-input').value = '2027-01-01'; // a public holiday
  fire('date-input', 'change');
  assert.equal($('back-to-now').disabled, false);

  fakeNowMs = new RealDate(2026, 9, 8, 16, 38).getTime();
  fire('back-to-now', 'click');

  assert.equal($('date-input').value, '2026-10-08');
  assert.equal($('daytype-label').textContent, '星期一至六（非假期）');
  assert.equal($('back-to-now').disabled, true);
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
  assert.equal($('result-title').textContent, '海底隧道（紅隧）');

  data.TUNNELS[0].name = tunnelName;
  data.TVT_VEHICLES[0].name = vehicleName;
});
