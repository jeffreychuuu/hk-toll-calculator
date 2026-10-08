// js/traffic.js
// The Transport Department publishes two feeds that matter here, both as XML:
//
//   journey times  https://resource.data.one.gov.hk/td/jss/Journeytimev2.xml   (every 2 minutes)
//   special news   https://www.td.gov.hk/tc/special_news/trafficnews.xml       (as incidents happen)
//
// This module turns them into plain objects. It has no DOM and no dependencies
// so it can be parsed and tested in Node as well as in a serverless function.
// Nothing here claims how fast a road is: it reports what TD reports.

// DESTINATION_ID → the tunnel it leads through (see the TD data specification).
export const DESTINATION_TUNNELS = {
  CH: 'cht', // Cross Harbour Tunnel
  EH: 'ehc', // Eastern Harbour Crossing
  WH: 'whc', // Western Harbour Crossing
  ABT: 'abt', // Aberdeen Tunnel
  LRT: 'lrt', // Lion Rock Tunnel
  SMT: 'smt', // Shing Mun Tunnel
  TCT: 'tct', // Tate's Cairn Tunnel
  TKTL: 'tlt', // Tai Lam Tunnel
};

export const CONDITION_ORDER = ['closed', 'jam', 'slow', 'free'];
const COLOUR_CONDITION = { 1: 'jam', 2: 'slow', 3: 'free' };
// JOURNEY_TYPE 2 rows are bitmaps: 1 congestion, 3 tunnel closed, 4 blank.
const BITMAP_CONDITION = { 1: 'jam', 3: 'closed' };

const worse = (a, b) => (CONDITION_ORDER.indexOf(b) < CONDITION_ORDER.indexOf(a) ? b : a);

const elements = (xml, tag) =>
  [...String(xml).matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))]
    .map((match) => match[1]);

const tagValue = (xml, tag) => {
  const match = String(xml).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : '';
};

// Which of our tunnels an incident mentions. The harbour crossings appear
// inside one another by name, so those match on their full names only.
const TUNNEL_PATTERNS = [
  [/東區海底隧道|東隧/u, 'ehc'],
  [/西區海底隧道|西隧/u, 'whc'],
  [/(?<![東西]區)海底隧道|紅隧/u, 'cht'],
  [/獅子山隧道/u, 'lrt'],
  [/大老山隧道|大老山公路/u, 'tct'],
  [/城門隧道/u, 'smt'],
  [/大欖隧道/u, 'tlt'],
  [/香港仔隧道/u, 'abt'],
];

export function tunnelsMentioned(text) {
  const source = String(text || '');
  const hits = new Set();
  for (const [pattern, tunnelId] of TUNNEL_PATTERNS) {
    if (pattern.test(source)) hits.add(tunnelId);
  }
  return [...hits];
}

export function normaliseJourneyTimes(xml) {
  const tunnels = {};
  let updatedAt = '';

  for (const row of elements(xml, 'jtis_journey_time')) {
    const captured = tagValue(row, 'CAPTURE_DATE');
    if (captured) updatedAt = captured;

    const tunnelId = DESTINATION_TUNNELS[tagValue(row, 'DESTINATION_ID')];
    if (!tunnelId) continue;

    const type = Number(tagValue(row, 'JOURNEY_TYPE'));
    const data = Number(tagValue(row, 'JOURNEY_DATA'));
    const colour = Number(tagValue(row, 'COLOUR_ID'));

    let state;
    let minutes = null;
    if (type === 1) {
      if (!Number.isFinite(data) || data < 0) continue;
      state = COLOUR_CONDITION[colour];
      minutes = data;
    } else if (type === 2) {
      state = BITMAP_CONDITION[data];
    }
    if (!state) continue;

    const entry = tunnels[tunnelId] || { state: 'free', minutes: 0, reports: 0 };
    entry.state = worse(entry.state, state);
    if (minutes !== null) entry.minutes = Math.max(entry.minutes, minutes);
    entry.reports += 1;
    tunnels[tunnelId] = entry;
  }

  return { updatedAt, tunnels };
}

export function normaliseIncidents(xml) {
  const items = elements(xml, 'message').map((row) => {
    const locationCn = tagValue(row, 'LOCATION_CN');
    const locationEn = tagValue(row, 'LOCATION_EN');
    const textCn = tagValue(row, 'CONTENT_CN');
    const textEn = tagValue(row, 'CONTENT_EN');
    return {
      id: tagValue(row, 'ID'),
      at: tagValue(row, 'ANNOUNCEMENT_DATE'),
      locationCn,
      locationEn,
      textCn,
      textEn,
      tunnels: tunnelsMentioned(`${locationCn} ${locationEn} ${textCn} ${textEn}`),
    };
  }).filter((item) => item.id || item.textCn || item.textEn);

  return { items };
}

// The department publishes the news in three files with the same field names,
// so a simplified-Chinese item is read from the simplified file and merged by
// announcement id.
export function mergeIncidentLanguages(primary, secondary) {
  const byId = new Map(primary.map((item) => [item.id, { ...item }]));
  for (const item of secondary) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, { ...item, textSc: item.textCn, locationSc: item.locationCn });
      continue;
    }
    existing.textSc = item.textCn;
    existing.locationSc = item.locationCn;
  }
  return [...byId.values()].map((item) => ({
    ...item,
    textSc: item.textSc || item.textCn,
    locationSc: item.locationSc || item.locationCn,
  }));
}

// Does an incident touch this corridor? (The corridors come from the graph.)
export function incidentsForTunnels(incidents, tunnelIds) {
  const wanted = new Set(tunnelIds);
  return incidents.filter((incident) => incident.tunnels.some((id) => wanted.has(id)));
}
