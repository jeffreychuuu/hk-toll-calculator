// scripts/build-tunnel-pages.mjs — writes the 27 per-tunnel pages and
// sitemap.xml. Run after any toll-data change (and each new year, for the
// titles):
//
//   npm run build:pages
//
// tests/tunnel-pages.test.js fails until this has run.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allTunnelPages, buildSitemap } from '../js/tunnel-pages.js';

const root = new URL('..', import.meta.url);
const pages = allTunnelPages();
for (const { file, html } of pages) {
  const url = new URL(file, root);
  mkdirSync(dirname(fileURLToPath(url)), { recursive: true });
  writeFileSync(url, html);
}
writeFileSync(new URL('sitemap.xml', root), buildSitemap());
console.log(`wrote ${pages.length} tunnel pages and sitemap.xml`);
