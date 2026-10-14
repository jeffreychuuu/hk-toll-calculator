// tests/tunnel-pages.test.js
// The 27 per-tunnel landing pages are generated files; these tests keep the
// committed copies honest against the generator, and the generator honest
// about everything a search engine reads (canonical, hreflang, JSON-LD).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUNNELS } from '../js/data.js';
import { LANGS } from '../js/i18n.js';
import { allTunnelPages, buildSitemap, COPY } from '../js/tunnel-pages.js';
import { pageUrl, pagePath } from '../js/paths.js';
import { tollTableBlocks, labelsFor, TC_LABELS } from '../js/toll-tables.js';

const pages = allTunnelPages();
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const ldJson = (html) => [...html.matchAll(/<script type="application\/ld\+json">\n([\s\S]*?)\n  <\/script>/g)]
  .map((match) => JSON.parse(match[1]));

test('every tunnel page is fresh — run: npm run build:pages', () => {
  assert.equal(pages.length, LANGS.length * TUNNELS.length);
  for (const { file, html } of pages) {
    assert.equal(read(file), html, `${file} is stale — run: npm run build:pages`);
  }
});

test('every page is self-canonical and reciprocally linked with hreflang', () => {
  for (const lang of LANGS) {
    for (const tunnel of TUNNELS) {
      const html = read(`toll/${tunnel.id}/${lang.id === 'tc' ? '' : `${lang.id}/`}index.html`);
      assert.ok(html.includes(`<link rel="canonical" href="${pageUrl(lang.id, tunnel.id)}">`),
        `${lang.id}/${tunnel.id}: self-canonical`);
      for (const [code, target] of [['zh-Hant', 'tc'], ['zh-Hans', 'sc'], ['en', 'en'], ['x-default', 'tc']]) {
        assert.ok(html.includes(`<link rel="alternate" hreflang="${code}" href="${pageUrl(target, tunnel.id)}">`),
          `${lang.id}/${tunnel.id}: hreflang ${code}`);
      }
      assert.ok(html.includes(`<html lang="${lang.htmlLang}">`), `${lang.id}/${tunnel.id}: html lang`);
    }
  }
});

test('the language switcher links the three alternates, current one marked', () => {
  for (const lang of LANGS) {
    for (const tunnel of TUNNELS) {
      const html = read(`toll/${tunnel.id}/${lang.id === 'tc' ? '' : `${lang.id}/`}index.html`);
      for (const other of LANGS) {
        assert.ok(html.includes(`href="${pagePath(other.id, tunnel.id)}"`), `${lang.id}/${tunnel.id}: links ${other.id}`);
      }
      assert.ok(html.includes(`href="${pagePath(lang.id, tunnel.id)}" hreflang="${lang.htmlLang}" aria-current="page"`),
        `${lang.id}/${tunnel.id}: current language marked`);
    }
  }
});

test('the FAQ structured data matches the visible questions, breadcrumb the canonical', () => {
  for (const lang of LANGS) {
    for (const tunnel of TUNNELS) {
      const html = read(`toll/${tunnel.id}/${lang.id === 'tc' ? '' : `${lang.id}/`}index.html`);
      const [breadcrumb, faq] = ldJson(html);
      assert.equal(breadcrumb['@type'], 'BreadcrumbList');
      assert.equal(breadcrumb.itemListElement[1].item, pageUrl(lang.id, tunnel.id));
      assert.equal(faq['@type'], 'FAQPage');
      const expected = COPY[lang.id].tunnels[tunnel.id].faq.length;
      assert.equal(faq.mainEntity.length, expected, `${lang.id}/${tunnel.id}: FAQ JSON-LD count`);
      assert.equal((html.match(/<dt>/g) || []).length, expected, `${lang.id}/${tunnel.id}: visible questions`);
      assert.ok(faq.mainEntity.every((q) => q.name.trim() && q.acceptedAnswer.text.trim()));
    }
  }
});

test('no placeholder token survives into a page', () => {
  for (const { file, html } of pages) {
    assert.ok(!/\{[a-zA-Z][a-zA-Z]*\}/.test(html), `${file}: an unfilled token`);
  }
});

test('every page beacons its view to the counter', () => {
  for (const { file, html } of pages) {
    assert.ok(html.includes("fetch('/api/hit'"), `${file}: counts its own view`);
    assert.ok(html.includes('id="views-pill"'), `${file}: has somewhere to show it`);
  }
});

test('every page has a unique, non-empty title and description', () => {
  const titles = new Set();
  for (const { file, html } of pages) {
    const title = (html.match(/<title>([^<]*)<\/title>/) || ['', ''])[1];
    const description = (html.match(/<meta name="description" content="([^"]*)">/) || ['', ''])[1];
    assert.ok(title.trim(), `${file}: title`);
    assert.ok(description.trim(), `${file}: description`);
    assert.ok(!titles.has(title), `${file}: duplicate title ${title}`);
    titles.add(title);
  }
});

test('the sitemap is fresh and lists every page — run: npm run build:pages', () => {
  const sitemap = read('sitemap.xml');
  assert.equal(sitemap, buildSitemap(), 'sitemap.xml is stale — run: npm run build:pages');
  assert.equal((sitemap.match(/<loc>/g) || []).length, 1 + pages.length);
  for (const lang of LANGS) {
    for (const tunnel of TUNNELS) {
      assert.ok(sitemap.includes(`<loc>${pageUrl(lang.id, tunnel.id)}</loc>`), `${lang.id}/${tunnel.id} in sitemap`);
    }
  }
});

test('the copy defines the same keys in every language', () => {
  for (const lang of LANGS) {
    const copy = COPY[lang.id];
    assert.deepEqual(Object.keys(copy.tunnels).sort(), TUNNELS.map((t) => t.id).sort());
    assert.deepEqual(Object.keys(copy.ui).sort(), Object.keys(COPY.tc.ui).sort());
    for (const tunnel of TUNNELS) {
      const entry = copy.tunnels[tunnel.id];
      assert.ok(entry.title.includes('{year}'), `${lang.id}/${tunnel.id}: dated title`);
      assert.equal(entry.faq.length, COPY.tc.tunnels[tunnel.id].faq.length, `${lang.id}/${tunnel.id}: FAQ count parity`);
    }
  }
});

test("TC_LABELS and labelsFor('tc') generate identical tables", () => {
  assert.equal(tollTableBlocks(labelsFor('tc')), tollTableBlocks(TC_LABELS));
});
