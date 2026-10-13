// js/paths.js
// Where the generated per-tunnel pages live. One owner for the URL scheme so
// the generator, the footer links and the tests can never disagree.
export const ORIGIN = 'https://hk-toll-calculator.jeffreychuuu.com';

export const pagePath = (lang, tunnelId) =>
  (lang === 'tc' ? `/toll/${tunnelId}/` : `/toll/${tunnelId}/${lang}/`);

export const pageUrl = (lang, tunnelId) => ORIGIN + pagePath(lang, tunnelId);

export const pageFile = (lang, tunnelId) =>
  `toll/${tunnelId}/${lang === 'tc' ? '' : `${lang}/`}index.html`;
