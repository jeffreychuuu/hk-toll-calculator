// api/traffic.js
// A Vercel serverless function: the browser cannot read the Transport
// Department feeds directly (they carry no CORS headers), so this thin proxy
// fetches them server-side, normalises them and caches the result at the edge.
// It never invents a reading — if a source is unavailable its section is
// simply empty, and the page shows nothing rather than something wrong.

import {
  normaliseJourneyTimes, normaliseIncidents, mergeIncidentLanguages,
} from '../js/traffic.js';

const JOURNEY_TIMES = 'https://resource.data.one.gov.hk/td/jss/Journeytimev2.xml';
const TRAFFIC_NEWS = 'https://www.td.gov.hk/tc/special_news/trafficnews.xml';
const TRAFFIC_NEWS_SC = 'https://www.td.gov.hk/sc/special_news/trafficnews.xml';

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'hk-toll-calculator' } });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.text();
}

export default async function handler(_request, response) {
  const [journey, news, newsSc] = await Promise.allSettled([
    fetchText(JOURNEY_TIMES),
    fetchText(TRAFFIC_NEWS),
    fetchText(TRAFFIC_NEWS_SC),
  ]);

  if (journey.status === 'rejected' && news.status === 'rejected' && newsSc.status === 'rejected') {
    response.status(502).json({ error: 'traffic sources unavailable' });
    return;
  }

  const payload = { updatedAt: null, tunnels: {}, incidents: [] };
  if (journey.status === 'fulfilled') {
    const parsed = normaliseJourneyTimes(journey.value);
    payload.updatedAt = parsed.updatedAt;
    payload.tunnels = parsed.tunnels;
  }
  if (news.status === 'fulfilled') {
    const items = normaliseIncidents(news.value).items;
    payload.incidents = newsSc.status === 'fulfilled'
      ? mergeIncidentLanguages(items, normaliseIncidents(newsSc.value).items)
      : items.map((item) => ({ ...item, textSc: item.textCn, locationSc: item.locationCn }));
  }

  response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  response.status(200).json(payload);
}
