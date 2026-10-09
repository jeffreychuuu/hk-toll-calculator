// tests/app.test.js
// Drives js/app.js under a stub DOM so the UI wiring is testable without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNNELS } from '../js/data.js';

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
for (const id of ['period-badge', 'next-hint',
  'chart-bar', 'chart-marker', 'legend', 'chart', 'vehicle-select', 'chart-tunnel',
  'wrap', 'chart-card',
  'date-input', 'daytype-select', 'traffic-footnote',
  'hour-select', 'minute-select', 'time-slider', 'back-to-now', 'holiday-notice', 'chart-controls',
  'chart-axis', 'holiday-name', 'time-selects',
  'chart-title', 'marker-label', 'site-name', 'github-link', 'lang-picker',
  'compare-note',
  'alt-card', 'alt-list', 'label-vehicle-class',
  'tab-all', 'tab-compare', 'all-panel', 'all-list', 'compare-panel',
  'all-moment', 'compare-who',
  'lang-trigger', 'lang-current', 'lang-menu', 'footer-source', 'site-footer', 'reference']) elements.set(id, mk(id));

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

// The tunnel is chosen from the comparison list now, the same way a visitor does.
const selectTunnel = (id) =>
  fire('alt-list', 'click', { target: { closest: () => ({ dataset: { tunnelId: id } }) } });
const tunnelName = (id) => TUNNELS.find((t) => t.id === id).name;
const showsTunnel = (id, text) => {
  const name = tunnelName(id);
  return [name.tc, name.sc, name.en].some((value) => text.includes(value));
};

// The chosen tunnel is the row flagged aria-current in the comparison list, and
// it is named on the chart card.
const selectedRow = () => {
  const rows = $('alt-list').innerHTML.split('<li>');
  return rows.find((row) => row.includes('aria-current="true"')) || '';
};
const selectedName = () => ($('chart-tunnel').selectedOptions[0] || { textContent: '' }).textContent;
const selectedPrice = () => (selectedRow().match(/HK\$ ([\d.]+)/) || ['', ''])[1];
const setTime = (hh, mm) => {
  $('hour-select').value = hh;
  $('minute-select').value = mm;
  fire('minute-select', 'change');
};
const shownTime = () => `${$('hour-select').value}:${$('minute-select').value}`;

await import('../js/app.js');

test('the lists open on the all-tunnels tab', () => {
  assert.equal($('all-panel').hidden, false, 'the all-tunnels list is the one on screen');
  assert.equal($('compare-panel').hidden, true, 'the comparison waits behind its tab');
  assert.equal($('tab-all').getAttribute('aria-selected'), 'true');
  assert.equal($('tab-compare').getAttribute('aria-selected'), 'false');
});

test('the tabs switch which list is on screen', () => {
  fire('tab-compare', 'click');
  assert.equal($('all-panel').hidden, true);
  assert.equal($('compare-panel').hidden, false);
  assert.equal($('tab-compare').getAttribute('aria-selected'), 'true');
  assert.equal($('tab-all').getAttribute('aria-selected'), 'false');

  fire('tab-all', 'click');
  assert.equal($('all-panel').hidden, false, 'and back again');
  assert.equal($('compare-panel').hidden, true);
});

test('the all-tunnels list gathers every tunnel under its corridor', () => {
  const list = $('all-list').innerHTML;
  for (const label of ['過海（九龍 ↔ 港島）', '九龍 ↔ 新界東', '九龍 ↔ 新界西',
    '新界東 ↔ 新界西', '港島市內']) {
    assert.ok(list.includes(label), `missing the ${label} group`);
  }
  assert.equal((list.match(/compare-row/g) || []).length, 9, 'all nine tunnels are listed');
});

test('the corridors with a free road say so once, on the heading', () => {
  const list = $('all-list').innerHTML;
  // Tuen Mun Road, Tai Po Road and Lam Kam Road serve three corridors between them.
  assert.equal((list.match(/有免費道路可選/g) || []).length, 3,
    'one note per corridor, never one per tunnel');
});

test('picking a tunnel in the all list opens its comparison', () => {
  fire('all-list', 'click', { target: { closest: () => ({ dataset: { tunnelId: 'tct' } }) } });
  assert.ok(showsTunnel('tct', selectedName()), 'the tunnel is chosen');
  assert.equal($('compare-panel').hidden, false, 'and its comparison tab opens');
  assert.equal($('tab-compare').getAttribute('aria-selected'), 'true');
  assert.ok($('alt-list').innerHTML.includes('大老山隧道'), 'showing the same-trip alternatives');
  // Leave the page as we found it for the tests that follow.
  fire('tab-all', 'click');
  selectTunnel('cht');
});

test('the directory keeps only the clock, the comparison brings the chart back', () => {
  assert.equal($('chart-card').hidden, false, 'the card stays: it holds the date and time');
  assert.equal($('chart-controls').hidden, false, 'which are there to set');
  assert.equal($('chart').hidden, true, 'the chart itself is not drawn');
  assert.equal($('chart-axis').hidden, true, 'nor its axis');
  assert.equal($('legend').hidden, true, 'nor its legend');
  assert.equal($('chart-title').hidden, true, 'nor its title');
  assert.equal($('chart-tunnel').hidden, true, 'nor the tunnel it would have drawn');
  assert.equal($('time-slider').hidden, true, 'nor the slider to scrub with');
  assert.equal($('next-hint').hidden, true, 'nor the next change to act on');

  fire('tab-compare', 'click');
  assert.equal($('chart').hidden, false, 'the comparison gets its chart back');
  assert.equal($('chart-title').hidden, false);
  assert.equal($('chart-tunnel').hidden, false);
  assert.equal($('time-slider').hidden, false);
  fire('tab-all', 'click');
  assert.equal($('chart-bar').hidden, false, 'the bar element is still there, just not shown');
});

test('the all-tunnels view says which moment the fares are for', () => {
  assert.ok($('all-moment').className.includes('is-now'), 'it says now while it is now');
  assert.ok($('all-moment').innerHTML.includes('2026年10月8日'), 'naming the day it belongs to');
  assert.ok($('all-moment').innerHTML.includes('07:29'), 'naming the time');
  assert.ok($('all-moment').innerHTML.includes('class="all-time"'),
    'the clock is set apart, so it can be read at a glance');

  setTime('12', '00'); // a time you picked is not the present
  assert.ok(!$('all-moment').className.includes('is-now'), 'a chosen time is never called now');
  assert.ok($('all-moment').innerHTML.includes('12:00'), 'but the time is named');
  assert.ok($('all-moment').innerHTML.includes('回到現在'), 'with a way back to the present');

  fire('all-moment', 'click', { target: { closest: () => ({ dataset: {} }) } });
  assert.ok($('all-moment').className.includes('is-now'), 'and the way back works');
});

test('the comparison names the tunnel whose trip it is', () => {
  selectTunnel('tct');
  assert.ok(showsTunnel('tct', $('compare-who').innerHTML), 'the heading names the tunnel');
  assert.ok($('compare-who').innerHTML.includes('同程比較'), 'and says what it is');
  selectTunnel('cht');
});

test('the toll follows the clock while the page sits open', () => {
  assert.equal(shownTime(), '07:29');
  assert.equal(selectedPrice(), '20.00');

  fakeNowMs = new RealDate(2026, 9, 8, 7, 30).getTime(); // one minute later, transition starts
  intervalCb();

  assert.equal(shownTime(), '07:30');
  assert.equal(selectedPrice(), '22.00');
  assert.equal($('period-badge').textContent, '過渡期');
});

test('the time dropdowns offer every hour and minute', () => {
  assert.equal(($('hour-select').innerHTML.match(/<option/g) || []).length, 24);
  assert.equal(($('minute-select').innerHTML.match(/<option/g) || []).length, 60);
});

test('choosing a time from the dropdowns prices it exactly', () => {
  setTime('07', '48'); // peak starts on this minute
  assert.equal(selectedPrice(), '40.00');
  assert.equal($('period-badge').textContent, '繁忙時段');

  setTime('19', '16'); // red tunnel car, down-transition ramp
  assert.equal(selectedPrice(), '22.00');
});

test('following stops once the user picks a time themselves', () => {
  setTime('10', '30');
  assert.equal(selectedPrice(), '30.00');

  fakeNowMs = new RealDate(2026, 9, 8, 16, 30).getTime();
  intervalCb();

  assert.equal(shownTime(), '10:30');
  assert.equal(selectedPrice(), '30.00');
});

test('the slider and the hour/minute dropdowns stay in sync', () => {
  $('time-slider').value = '450'; // 07:30
  fire('time-slider', 'input');
  assert.equal(shownTime(), '07:30');
  assert.equal(selectedPrice(), '22.00');

  setTime('19', '16');
  assert.equal($('time-slider').value, '1156');
  assert.equal(selectedPrice(), '22.00');
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
  assert.equal(selectedPrice(), '32.00'); // red tunnel car, up-transition first step

  fakeNowMs = new RealDate(2026, 9, 8, 16, 38).getTime();
  intervalCb();
  assert.equal(shownTime(), '16:38');
  assert.equal(selectedPrice(), '40.00'); // peak
});

test('the selection is saved to localStorage when it changes', () => {
  selectTunnel('tlt');
  $('vehicle-select').value = 'moto';
  fire('vehicle-select', 'change');
  const saved = JSON.parse(storage.get(STORAGE_KEY));
  assert.equal(saved.tunnelId, 'tlt');
  assert.equal(saved.vehicleId, 'moto');
});

test('a saved selection is restored on load', async () => {
  storage.set(STORAGE_KEY, JSON.stringify({ tunnelId: 'whc', vehicleId: 'moto' }));
  await import('../js/app.js?restore=1');
  assert.ok(showsTunnel('whc', selectedName()), 'the saved tunnel is the one shown');
  assert.equal($('vehicle-select').value, 'moto');
});

test('an invalid saved selection falls back to the defaults', async () => {
  storage.set(STORAGE_KEY, JSON.stringify({ tunnelId: 'nope', vehicleId: 'bogus' }));
  await import('../js/app.js?bogus=1');
  assert.ok(showsTunnel('cht', selectedName()), 'falls back to the default tunnel');
  assert.equal($('vehicle-select').value, 'car');
});

test('a saved vehicle that does not exist for the saved tunnel falls back to the first option', async () => {
  storage.set(STORAGE_KEY, JSON.stringify({ tunnelId: 'abt', vehicleId: 'car' }));
  await import('../js/app.js?mismatch=1');
  assert.ok(showsTunnel('abt', selectedName()));
  assert.equal($('vehicle-select').value, 'car');
});

test('storage failures do not break rendering', async () => {
  storageFails = true;
  await import('../js/app.js?broken=1');
  assert.ok(showsTunnel('cht', selectedName()));
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
  assert.equal(document.title, 'HK Tunnel Tolls (Live) — Hong Kong tolls by time of day');
  assert.equal($('site-name').textContent, 'HK Tunnel Tolls (Live)');
  assert.equal($('github-link').getAttribute('aria-label'), 'Source on GitHub');
  assert.equal($('lang-current').textContent, 'English');
  assert.equal($('chart-title').textContent, '24-hour toll period chart');
  assert.equal($('label-vehicle-class').textContent, 'Vehicle class');
  assert.equal($('vehicle-select').getAttribute('aria-label'), 'Vehicle class');
  assert.equal($('daytype-select').getAttribute('aria-label'), 'Day type');
  assert.equal($('date-input').getAttribute('aria-label'), 'Date');
  assert.ok(/Now|Back to now/.test($('back-to-now').innerHTML), 'the way back speaks English');
  assert.ok($('daytype-select').innerHTML.includes('Mon–Sat (non-holiday)'));
  assert.equal(selectedName(), 'Cross-Harbour Tunnel (Hung Hom)');
  assert.ok($('alt-list').innerHTML.includes('Eastern Harbour Crossing'), 'the comparison is in English too');
  assert.equal($('period-badge').textContent, 'Peak'); // 17:30 on a weekday is the red tunnel's peak
  assert.ok($('reference').innerHTML.includes('Toll periods (private car)'), 'the footer reference is in English');
  assert.ok($('reference').innerHTML.includes('Common questions'));
  assert.ok($('reference').innerHTML.includes('Cross-Harbour Tunnel'), 'the tables name the tunnels in English');
});

test('choosing Simplified Chinese re-renders the labels', () => {
  fire('lang-menu', 'click', { target: langOption('sc') });
  assert.equal(document.documentElement.lang, 'zh-Hans');
  assert.equal($('chart-title').textContent, '24小时收费时段分布图');
  assert.equal(selectedName(), '海底隧道（红隧）');
  assert.ok($('reference').innerHTML.includes('收费时段表（私家车）'), 'the footer reference is in Simplified Chinese');
  assert.ok($('reference').innerHTML.includes('常见问题'));
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
  selectTunnel('cht');
  fakeNowMs = new RealDate(2026, 9, 8, 12, 0).getTime(); // Thursday
  setTime('12', '00');
  $('date-input').value = '2026-10-08';
  fire('date-input', 'change');
  assert.equal($('daytype-select').value, 'weekday');
  assert.equal(selectedPrice(), '30.00'); // weekday normal window

  $('date-input').value = '2026-10-11'; // Sunday
  fire('date-input', 'change');
  assert.equal($('daytype-select').value, 'weekend', 'a Sunday flips the dropdown');
  assert.equal(selectedPrice(), '25.00');
});

test('a public holiday that lands on a weekday uses the weekend schedule', () => {
  selectTunnel('cht');
  setTime('12', '00');
  $('date-input').value = '2026-10-19'; // the day following Chung Yeung, a Monday
  fire('date-input', 'change');
  assert.equal($('daytype-select').value, 'weekend');
  assert.equal(selectedPrice(), '25.00');
});

test('a day type jumps to the next date with that schedule, counted from today', () => {
  selectTunnel('cht');
  setTime('09', '30'); // a manual time, so the return to now is visible
  // fakeNow is Thursday 2026-10-08 12:00, a weekday

  $('daytype-select').value = 'weekend';
  fire('daytype-select', 'change');
  assert.equal($('date-input').value, '2026-10-11', 'the coming Sunday');
  assert.equal($('daytype-select').value, 'weekend');

  $('daytype-select').value = 'weekday';
  fire('daytype-select', 'change');
  assert.equal($('date-input').value, '2026-10-08', 'today, not the Monday after the Sunday');
  assert.equal(shownTime(), '12:00', 'and the clock is following the present again');

  // the jump counts from today, whatever date is on screen
  $('date-input').value = '2026-12-25'; // Christmas, a holiday
  fire('date-input', 'change');
  $('daytype-select').value = 'weekend';
  fire('daytype-select', 'change');
  assert.equal($('date-input').value, '2026-10-11', 'still the coming Sunday from today');
});

test('a run of public holidays is skipped whole', () => {
  fakeNowMs = new RealDate(2026, 1, 17, 10, 0).getTime(); // Lunar New Year day 1, a Tuesday
  $('daytype-select').value = 'weekday';
  fire('daytype-select', 'change');
  assert.equal($('date-input').value, '2026-02-20', 'past the three New Year days');
});

test('the present moment and the way back share one pill', () => {
  fakeNowMs = new RealDate(2026, 9, 8, 12, 0).getTime(); // Thursday noon
  fire('back-to-now', 'click');

  const words = ['現在', '现在', 'Now'];
  assert.equal($('back-to-now').disabled, true, 'at now the pill is the status');
  assert.ok($('back-to-now').className.includes('is-now'), 'dressed as the status');
  assert.ok($('back-to-now').innerHTML.includes('now-dot'), 'with a live dot');
  assert.ok(words.some((word) => $('back-to-now').innerHTML.includes(word)), 'and a word for it');
  assert.equal($('marker-label').className, 'marker-label now', 'the marker reads as now too');
  assert.ok(words.some((word) => $('marker-label').textContent === word));

  setTime('09', '30');
  assert.equal($('back-to-now').disabled, false, 'a chosen time turns it into the button');
  assert.ok(!$('back-to-now').className.includes('is-now'), 'no longer dressed as the status');
  assert.ok($('back-to-now').innerHTML.includes('now-arrow'), 'with a way back rather than a dot');
  assert.equal($('marker-label').textContent, '09:30', 'and the marker names that time');
  assert.equal($('marker-label').className, 'marker-label');

  fire('back-to-now', 'click');
  assert.equal($('back-to-now').disabled, true, 'catching up to now restores the status');
  assert.equal($('marker-label').className, 'marker-label now');
});

test('back-to-now returns to today', () => {
  fakeNowMs = new RealDate(2026, 9, 8, 16, 38).getTime();
  $('date-input').value = '2027-01-01'; // a Friday public holiday
  fire('date-input', 'change');
  $('daytype-select').value = 'weekday';
  fire('daytype-select', 'change');

  fire('back-to-now', 'click');
  assert.equal($('date-input').value, '2026-10-08');
  assert.equal($('daytype-select').value, 'weekday', 'the date decides again');
  assert.equal(shownTime(), '16:38');
  assert.equal($('back-to-now').disabled, true, 'and the pill is the status again');
});

test('the notice appears only for dates outside the holiday data', () => {
  $('date-input').value = '2028-01-01';
  fire('date-input', 'change');
  assert.equal($('holiday-notice').hidden, false);

  $('date-input').value = '2026-10-09';
  fire('date-input', 'change');
  assert.equal($('holiday-notice').hidden, true);
});

test('a public holiday says which holiday it is', () => {
  $('date-input').value = '2026-10-01'; // National Day
  fire('date-input', 'change');
  assert.equal($('holiday-name').hidden, false, 'the day is named');
  assert.ok(['國慶日', '国庆日', 'National Day'].includes($('holiday-name').textContent),
    `named as the gazette names it (got ${$('holiday-name').textContent})`);

  $('date-input').value = '2026-10-09'; // an ordinary Friday
  fire('date-input', 'change');
  assert.equal($('holiday-name').hidden, true, 'and an ordinary day is not');
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
  selectTunnel('cht');
    $('date-input').value = '2026-10-19'; // a Monday public holiday
  fire('date-input', 'change');
  setTime('10', '30'); // weekend normal window, so the schedule is visible in the price
  assert.equal($('back-to-now').disabled, false, 'a picked date must be releasable');
  assert.equal(selectedPrice(), '25.00');

  fakeNowMs = new RealDate(2026, 9, 20, 0, 5).getTime();
  intervalCb();

  assert.equal($('date-input').value, '2026-10-19', 'the tick must not overwrite a picked date');
  assert.equal(selectedPrice(), '25.00'); // still the holiday schedule
});

test('the result card lists the ways to make the same trip, current tunnel first', async () => {
  storage.delete('hk-toll-calculator.selection');
  fakeNowMs = new RealDate(2026, 9, 8, 12, 0).getTime(); // midweek noon
  await import('../js/app.js?alt=1');

  assert.equal($('alt-card').hidden, false);
  assert.equal($('label-vehicle-class').textContent, '車種');

  const list = $('alt-list').innerHTML;
  assert.ok(list.includes('東區海底隧道（東隧）'));
  assert.ok(list.includes('西區海底隧道（西隧）'));
  assert.ok(list.includes('海底隧道（紅隧）'), 'the selected tunnel is listed too');
  assert.equal((list.match(/compare-row/g) || []).length, 3);

  // the chosen tunnel is flagged, and 最平 marks the cheapest at noon
  assert.ok(selectedRow().includes('海底隧道（紅隧）'), 'the chosen tunnel is flagged');
  assert.ok(selectedRow().includes('最平'), 'and is marked cheapest, because it is');
  const all = $('all-list').innerHTML;
  assert.ok(all.includes('東區海底隧道（東隧）') && all.includes('西區海底隧道（西隧）'),
    'the all-tunnels list shows the whole corridor too');
});

test('the comparison follows the selected tunnel into its corridor', () => {
  selectTunnel('lrt'); // Lion Rock: the Kowloon to East NT corridor

  const list = $('alt-list').innerHTML;
  assert.ok(list.includes('大老山隧道'));
  assert.ok(list.includes('沙田嶺／尖山／大圍隧道'), 'the Sha Tin Heights corridor belongs here too');
  assert.ok(list.includes('大埔道'));
  // a free corridor reads 免費 and is never the one wearing 最平: that goes to
  // the cheapest tunnel, in a colour of its own
  const freeRow = list.split('<li>').find((row) => row.includes('compare-row free')) || '';
  assert.ok(freeRow.includes('免費'), 'a free corridor has no price');
  assert.ok(!freeRow.includes('HK$'), 'and no dollar figure at all');
  assert.ok(!freeRow.includes('最平'), 'a free corridor is not 最平');
  assert.ok(list.includes('最平'), 'the cheapest tunnel is the one marked');
});

test('clicking an alternative switches the tunnel', () => {
  fire('alt-list', 'click', { target: { closest: () => ({ dataset: { tunnelId: 'tct' } }) } });
  assert.ok(showsTunnel('tct', selectedName()), 'the result follows the click');
  const rows = $('alt-list').innerHTML.split('<li>').filter((row) => row.includes('大老山隧道'));
  assert.equal(rows.length, 1, 'the list follows the new selection');
  assert.ok(rows[0].includes('aria-current="true"'), 'and flags it as the chosen one');
});

test('the all list opens the corridor of the tunnel you pick', () => {
  selectTunnel('tct'); // kln-nte to start with
  fire('all-list', 'click', { target: { closest: () => ({ dataset: { tunnelId: 'whc' } }) } });

  const rows = $('alt-list').innerHTML;
  assert.ok(rows.includes('西區海底隧道（西隧）'));
  assert.ok(rows.includes('東區海底隧道（東隧）'));
  assert.ok(!rows.includes('大老山隧道'), 'nothing from other corridors');
  assert.ok(showsTunnel('whc', selectedName()), 'the tunnel you picked is the one chosen');

  fire('all-list', 'click', { target: { closest: () => ({ dataset: { tunnelId: 'smt' } }) } });
  assert.ok($('alt-list').innerHTML.includes('城門隧道'), 'another corridor, one click');
  assert.ok(showsTunnel('smt', selectedName()), 'and the chart follows it');
});

test('every corridor has a heading in the all-tunnels list', () => {
  const list = $('all-list').innerHTML;
  assert.ok(!list.includes('undefined'), 'no corridor label is missing');
  for (const label of ['過海', '港島市內', '九龍 ↔ 新界西']) {
    assert.ok(list.includes(label), `missing ${label}`);
  }
});

test('the result and the schedule sit on the same page', () => {
  assert.equal($('alt-card').hidden, false, 'the alternatives card is shown');
  assert.equal($('chart-marker') !== undefined, true, 'the chart is on screen too');
});

test('the chart names the tunnel it is drawing', () => {
  selectTunnel('cht');
  assert.ok(showsTunnel('cht', selectedName()), 'the chart says which tunnel it belongs to');

  selectTunnel('tlt');
  assert.ok(showsTunnel('tlt', selectedName()), 'and follows the choice');
});

test('the chart carries its own picker, limited to its corridor', () => {
  selectTunnel('tct'); // kln-nte: Lion Rock, Tate's Cairn, Sha Tin Heights
  const options = $('chart-tunnel').innerHTML;
  assert.equal((options.match(/<option/g) || []).length, 3, 'the corridor’s tunnels only');
  assert.equal($('chart-tunnel').value, 'tct', 'on the chosen one');

  $('chart-tunnel').value = 'lrt'; // pick another tunnel of the same corridor
  fire('chart-tunnel', 'change');
  assert.ok(showsTunnel('lrt', selectedName()), 'and the chart switches to it');
  assert.equal($('chart-tunnel').value, 'lrt');
  assert.ok($('alt-list').innerHTML.includes('大老山隧道'), 'the comparison stays on the corridor');
});

test('switching tunnel keeps the class of vehicle you picked', () => {
  selectTunnel('cht');
  $('vehicle-select').value = 'moto';
  fire('vehicle-select', 'change');

  selectTunnel('lrt'); // a flat tunnel names the classes the same way
  assert.equal($('vehicle-select').value, 'moto', 'still the motorcycle');

  selectTunnel('tct'); // Tate's Cairn calls it "mc"
  assert.equal($('vehicle-select').value, 'mc');
  assert.ok($('vehicle-select').selectedOptions[0].textContent.includes('電單車'));

  selectTunnel('cht');
  assert.equal($('vehicle-select').value, 'moto', 'and back again');
});

test('a flat-rate tunnel still lets you pick a time', () => {
  fakeNowMs = new RealDate(2026, 9, 8, 16, 38).getTime();
  selectTunnel('cht');
  fire('back-to-now', 'click');
  setTime('09', '00');
  assert.equal(shownTime(), '09:00');

  selectTunnel('lrt'); // flat all day: one band, but the clock is still yours
  assert.equal($('time-selects').hidden, false, 'the hours stay to pick with');
  assert.equal($('chart-controls').hidden, false);
  assert.equal(($('chart-bar').innerHTML.match(/class="seg flat/g) || []).length, 1,
    'the chart shows the one flat band');
});

test('a holiday that flattens a tunnel keeps the hours on screen', () => {
  selectTunnel('tlt');
  $('date-input').value = '2026-10-11'; // the coming Sunday: one rate all day
  fire('date-input', 'change');
  assert.equal($('time-selects').hidden, false, 'the hours are still there to pick');
  assert.equal($('chart-controls').hidden, false);
  assert.equal($('date-input').value, '2026-10-11');

  fire('back-to-now', 'click');
  assert.equal($('date-input').value, '2026-10-08', 'and the way back to today is open');
  selectTunnel('cht');
});

test('a next change more than an hour away is told in hours and minutes', () => {
  fakeNowMs = new RealDate(2026, 9, 8, 1, 0).getTime(); // 01:00
  selectTunnel('cht');
  fire('back-to-now', 'click');

  const hint = $('next-hint');
  assert.equal(hint.hidden, false);
  assert.ok(hint.textContent.includes('6小時30分鐘'), '6 hours 30 minutes, not 390 minutes');
  assert.ok(hint.textContent.includes('07:30'), 'and the clock time as usual');
});

test('the chart always shows the chosen tunnel, flat all day or not', () => {
  selectTunnel('cht');
  assert.equal($('chart-card').hidden, false);
  assert.ok(($('chart-bar').innerHTML.match(/class="seg/g) || []).length > 1,
    'the red tunnel varies through the day');

  selectTunnel('lrt'); // Lion Rock is flat all day: one band covers the whole day
  assert.equal($('chart-card').hidden, false);
  assert.equal(($('chart-bar').innerHTML.match(/class="seg flat/g) || []).length, 1);

  selectTunnel('cht');
});

test('the alternatives follow the chosen vehicle', () => {
  $('vehicle-select').value = 'other'; // goods / minibus / bus
  fire('vehicle-select', 'change');
  const list = $('alt-list').innerHTML;
  assert.ok(list.includes('HK$ 50.00'), 'the harbour crossings cost 50 for a commercial vehicle');
  assert.ok(!list.includes('HK$ 30.00'));
});

test('live conditions from the transport department sit beside the tunnels', async () => {
  storage.set(STORAGE_KEY, JSON.stringify({ tunnelId: 'cht', vehicleId: 'car' }));
  globalThis.location = { protocol: 'https:' };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      updatedAt: '2026-10-08T22:57:00',
      tunnels: {
        cht: {
          state: 'jam',
          minutes: 18,
          reports: 3,
          byDirection: { kowloon: { state: 'free', minutes: 4, origins: ['K01'] }, island: { state: 'jam', minutes: 18, origins: ['H1', 'H2', 'H3', 'H4', 'H5'] } },
        },
        ehc: { state: 'free', minutes: 9, reports: 2, byDirection: { kowloon: { state: 'free', minutes: 9 } } },
        tlt: { state: 'free', minutes: 10, reports: 1, byDirection: { tingkau: { state: 'free', minutes: 10 } } },
        whc: {
          state: 'free',
          minutes: 13,
          reports: 2,
          byDirection: { island: { state: 'free', minutes: 13 }, kowloon: { state: 'free', minutes: 11 } },
        },
      },
      roads: {
        tmr: { state: 'slow', minutes: 22, reports: 2, byDirection: { tsuenwan: { state: 'slow', minutes: 22, origins: ['SJ5'] } } },
        lamkam: { state: 'slow', minutes: 28, reports: 1, byDirection: { tsuenwan: { state: 'slow', minutes: 28 } } },
      },
      incidents: [{
        id: '147614',
        at: '2026-10-08T22:01:00',
        textCn: '東區海底隧道(往柴灣方向)部分行車線封閉',
        textEn: 'Part of the Eastern Harbour Crossing (Chai Wan bound) is closed',
        tunnels: ['ehc'],
        roads: [],
      }, {
        id: '147700',
        at: '2026-10-08T22:10:00',
        textCn: '屯門公路(往九龍方向)近深井的部分行車線封閉',
        textEn: 'Part of Tuen Mun Road (Kowloon bound) near Sham Tseng is closed',
        tunnels: [],
        roads: ['tmr'],
      }],
    }),
  });

  await import('../js/app.js?traffic=1');
  await new Promise((resolve) => setImmediate(resolve));

  const list = $('alt-list').innerHTML;
  assert.ok(list.includes('擠塞'), 'the congested reading shows');
  assert.ok(list.includes('往港島 擠塞 18 分鐘'), 'the congested direction, towards the island');
  assert.ok(list.includes('往九龍 暢通 4 分鐘'), 'and the free one gets its own chip, not the worst shared');
  assert.ok(!list.includes('起'), 'the harbour crossings, timed from many points, name no gantry');
  assert.ok(list.includes('暢通'), 'the free-flowing one');
  assert.ok(list.includes('交通消息'), 'the incident block appears');
  assert.ok(list.includes('東區海底隧道(往柴灣方向)部分行車線封閉'));
  assert.ok($('traffic-footnote').innerHTML.includes('更新於 22:57'), 'and the source is dated');
  assert.ok($('all-list').innerHTML.includes('⚠️'), 'the affected corridor is flagged');
  assert.ok($('alt-list').innerHTML.includes('往港島 擠塞 18 分鐘'),
    'the chosen tunnel\'s directions show in its comparison row');
  assert.ok($('all-list').innerHTML.includes('class="compare-reading"'),
    'the directory keeps the reading on a line of its own');

  // a free corridor is measured too, when its row is on screen
  selectTunnel('tlt'); // the Kowloon to West NT corridor
  assert.ok($('alt-list').innerHTML.includes('往荃灣 慢車 22 分鐘'), 'Tuen Mun Road carries a reading');
  assert.ok($('alt-list').innerHTML.includes('由曾咀街起'), 'and says where it is measured from');
  assert.ok($('alt-list').innerHTML.includes('屯門公路(往九龍方向)'),
    'and its own road incident is shown with it');

  // picking the schedule already on screen keeps us at now
  $('daytype-select').value = 'weekday';
  fire('daytype-select', 'change');
  assert.equal($('date-input').value, '2026-10-08', 'today already has this schedule');
  assert.ok($('alt-list').innerHTML.includes('往荃灣'), 'so the readings stay');

  // the other schedule jumps to the next date that has it, and readings have
  // no business on a hypothetical day
  $('daytype-select').value = 'weekend';
  fire('daytype-select', 'change');
  assert.equal($('date-input').value, '2026-10-11', 'the coming Sunday');
  assert.ok(!$('alt-list').innerHTML.includes('往荃灣'), 'the readings go');
  assert.ok($('traffic-footnote').innerHTML.includes('只喺'), 'and say why');

  // back to now resumes them
  fire('back-to-now', 'click');
  assert.equal($('date-input').value, '2026-10-08');
  assert.ok($('alt-list').innerHTML.includes('往荃灣'), 'and back-to-now brings them back');

  // a hypothetical time is not now, so live readings have no business showing
  setTime('12', '00');
  assert.ok(!$('alt-list').innerHTML.includes('往港島'), 'the reading goes when the hour is not now');
  assert.ok(!$('alt-list').innerHTML.includes('交通消息'), 'and so does the incident news');
  assert.ok($('traffic-footnote').innerHTML.includes('只喺'), 'with a word about why');

  delete globalThis.location;
  delete globalThis.fetch;
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

  assert.ok(!selectedName().includes('undefined'), 'the tunnel name showed undefined');
  assert.ok(!$('alt-list').innerHTML.includes('undefined'), 'no undefined in the comparison');
  assert.ok(!$('vehicle-select').innerHTML.includes('undefined'), 'vehicle list showed undefined');

  data.TUNNELS[0].name = tunnelName;
  data.TVT_VEHICLES[0].name = vehicleName;
});
