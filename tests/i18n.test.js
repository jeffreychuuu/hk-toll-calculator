// tests/i18n.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGS, UI, TD_PATHS, detectLang } from '../js/i18n.js';

const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
  (v && typeof v === 'object' && !Array.isArray(v)) ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]);

test('the language list offers exactly the three choices', () => {
  assert.deepEqual(LANGS.map((l) => l.id), ['tc', 'sc', 'en']);
  assert.deepEqual(LANGS.map((l) => l.label), ['繁體中文', '简体中文', 'English']);
  assert.deepEqual(LANGS.map((l) => l.htmlLang), ['zh-Hant', 'zh-Hans', 'en']);
});

test('every language defines exactly the same keys', () => {
  const expected = flatten(UI.tc).sort();
  assert.deepEqual(flatten(UI.sc).sort(), expected);
  assert.deepEqual(flatten(UI.en).sort(), expected);
});

test('every string is non-empty and not just whitespace in every language', () => {
  const check = (value, path) => {
    if (Array.isArray(value)) {
      assert.ok(value.length > 0, `${path} should not be empty`);
      value.forEach((item, i) => check(item, `${path}[${i}]`));
      return;
    }
    assert.equal(typeof value, 'string', `${path} should be a string`);
    assert.ok(value.trim().length > 0, `${path} should not be empty`);
  };
  for (const lang of ['tc', 'sc', 'en']) {
    for (const key of flatten(UI[lang])) {
      check(key.split('.').reduce((o, k) => o[k], UI[lang]), `${lang}.${key}`);
    }
  }
});

test('the hint template keeps all five placeholders in every language', () => {
  for (const lang of ['tc', 'sc', 'en']) {
    for (const token of ['{min}', '{time}', '{period}', '{change}', '{amount}']) {
      assert.ok(UI[lang].hint.includes(token), `${lang}.hint missing ${token}`);
    }
  }
});

test('period labels cover every period type', () => {
  const periods = ['non-peak', 'normal', 'peak', 'transition', 'flat'];
  for (const lang of ['tc', 'sc', 'en']) {
    assert.deepEqual(Object.keys(UI[lang].period).sort(), [...periods].sort());
    assert.deepEqual(Object.keys(UI[lang].periodShort).sort(), [...periods].sort());
  }
});

test('detectLang maps browser locales to a supported language', () => {
  assert.equal(detectLang('zh-TW'), 'tc');
  assert.equal(detectLang('zh-HK'), 'tc');
  assert.equal(detectLang('zh-MO'), 'tc');
  assert.equal(detectLang('zh-Hant'), 'tc');
  assert.equal(detectLang('zh-Hant-TW'), 'tc');
  assert.equal(detectLang('zh-CN'), 'sc');
  assert.equal(detectLang('zh-SG'), 'sc');
  assert.equal(detectLang('zh-Hans'), 'sc');
  assert.equal(detectLang('zh-Hans-CN'), 'sc');
  assert.equal(detectLang('zh'), 'tc');
  assert.equal(detectLang('en-US'), 'en');
  assert.equal(detectLang('en-GB'), 'en');
  assert.equal(detectLang('fr-FR'), 'en');
  assert.equal(detectLang('ja'), 'en');
  assert.equal(detectLang(''), 'tc');
  assert.equal(detectLang(undefined), 'tc');
});

test('the Transport Department links carry every language prefix', () => {
  assert.deepEqual(Object.keys(TD_PATHS).sort(), ['flat', 'taiLam', 'tvt']);
  for (const path of Object.values(TD_PATHS)) {
    assert.ok(path.startsWith('/transport_in_hong_kong/'));
  }
});

test('footer link labels line up with the paths', () => {
  for (const lang of ['tc', 'sc', 'en']) {
    assert.equal(UI[lang].footer.links.length, Object.keys(TD_PATHS).length);
  }
});

test('the language picker has an accessible label in every language', () => {
  assert.ok(UI.tc.langLabel.trim().length > 0);
  assert.ok(UI.sc.langLabel.trim().length > 0);
  assert.equal(UI.en.langLabel, 'Language');
});
