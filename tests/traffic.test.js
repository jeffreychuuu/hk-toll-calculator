// tests/traffic.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normaliseJourneyTimes, normaliseIncidents, tunnelsMentioned, CONDITION_ORDER,
  mergeIncidentLanguages, incidentsForCorridor, roadsMentioned,
} from '../js/traffic.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('the live journey-time feed maps onto our tunnels', () => {
  const { updatedAt, tunnels } = normaliseJourneyTimes(fixture('journey-times.xml'));

  assert.match(updatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, 'the capture time comes through');
  assert.ok(Object.keys(tunnels).length >= 3, `expected several tunnels, got ${Object.keys(tunnels)}`);
  for (const [tunnelId, report] of Object.entries(tunnels)) {
    assert.ok(['free', 'slow', 'jam', 'closed'].includes(report.state), `${tunnelId} state`);
    assert.ok(Number.isFinite(report.minutes) && report.minutes >= 0, `${tunnelId} minutes`);
  }
  assert.ok(['cht', 'ehc', 'whc'].some((id) => tunnels[id]), 'the harbour crossings are covered');
});

const journeyXml = (rows) => `<jtis_journey_list>${rows.map((row) => `<jtis_journey_time>
  <LOCATION_ID>${row.location}</LOCATION_ID>
  <DESTINATION_ID>${row.dest}</DESTINATION_ID>
  <CAPTURE_DATE>2026-10-08T22:57:00</CAPTURE_DATE>
  <JOURNEY_TYPE>${row.type}</JOURNEY_TYPE>
  <JOURNEY_DATA>${row.data}</JOURNEY_DATA>
  <COLOUR_ID>${row.colour}</COLOUR_ID>
</jtis_journey_time>`).join('')}</jtis_journey_list>`;

test('the worst reading wins per tunnel', () => {
  const result = normaliseJourneyTimes(journeyXml([
    { location: 'H1', dest: 'CH', type: 1, data: 4, colour: 3 },  // green, 4 min
    { location: 'K01', dest: 'CH', type: 1, data: 18, colour: 2 }, // amber, 18 min
    { location: 'H6', dest: 'ABT', type: 1, data: 3, colour: 3 },
    { location: 'SJ1', dest: 'TSCA', type: 1, data: 12, colour: 3 }, // Route 8: Sharp Island corridor
    { location: 'SJ5', dest: 'TWTM', type: 1, data: 22, colour: 2 }, // Tuen Mun Road
    { location: 'N05', dest: 'TPR', type: 1, data: 9, colour: 3 },   // Tai Po Road
    { location: 'SJ4', dest: 'TWCP', type: 1, data: 25, colour: 2 }, // Castle Peak Road
  ]));
  const { tunnels } = result;

  assert.equal(tunnels.cht.state, 'slow', 'amber beats green overall');
  assert.equal(tunnels.cht.minutes, 18, 'and the longest journey time is kept');
  assert.equal(tunnels.cht.reports, 2);
  // A gantry on the island feeds the crossing towards Kowloon, and vice versa.
  assert.deepEqual(tunnels.cht.byDirection.kowloon, { state: 'free', minutes: 4, origins: ['H1'] }, 'towards Kowloon');
  assert.deepEqual(tunnels.cht.byDirection.island, { state: 'slow', minutes: 18, origins: ['K01'] }, 'towards the island');
  assert.equal(tunnels.abt.state, 'free');
  assert.equal(tunnels.stg.minutes, 12, 'Route 8 is the Sharp Island / Sha Tin Heights corridor');
  assert.equal(result.roads.tmr.minutes, 22, 'Tuen Mun Road is measured too');
  assert.equal(result.roads.tmr.state, 'slow');
  assert.equal(result.roads.tpr.minutes, 9, 'and Tai Po Road');
  assert.equal(result.roads.lamkam.minutes, 25, 'and the Castle Peak Road corridor');
  assert.deepEqual(result.roads.tmr.byDirection.tsuenwan, { state: 'slow', minutes: 22, origins: ['SJ5'] },
    'a free road keeps its direction too');
  assert.equal(tunnels.ehc, undefined, 'destinations we do not list are ignored');
});

test('a bitmap row can say the tunnel is closed', () => {
  const { tunnels } = normaliseJourneyTimes(journeyXml([
    { location: 'K01', dest: 'WH', type: 2, data: 3, colour: -1 }, // closed bitmap
    { location: 'K02', dest: 'WH', type: 2, data: 1, colour: -1 }, // congestion bitmap
  ]));

  assert.equal(tunnels.whc.state, 'closed', 'closed outranks congestion');
});

test('nonsense rows never invent a reading', () => {
  const { tunnels } = normaliseJourneyTimes(journeyXml([
    { location: 'H1', dest: 'CH', type: 1, data: -1, colour: -1 },
  ]));
  assert.equal(tunnels.cht, undefined);
});

test('special traffic news keeps both languages and the time', () => {
  const { items } = normaliseIncidents(fixture('traffic-news.xml'));
  assert.ok(items.length >= 1);
  const [first] = items;
  assert.ok(first.id, 'an id to key on');
  assert.match(first.at, /^2026-/);
  assert.ok(first.locationCn.length > 0);
  assert.ok(first.textCn.length > 0);
  assert.ok(first.textEn.length > 0, 'the English text rides along in the same file');
  assert.deepEqual(first.roads, [], 'the sample names the Island Eastern Corridor, which we do not list');
});

test('an incident is tied to the tunnels it names', () => {
  assert.deepEqual(tunnelsMentioned('東區海底隧道(往柴灣方向)部分行車線封閉'), ['ehc']);
  assert.deepEqual(tunnelsMentioned('紅磡海底隧道(往港島方向)交通繁忙'), ['cht']);
  assert.deepEqual(tunnelsMentioned('西區海底隧道往港島方向部分行車線封閉'), ['whc']);
  assert.deepEqual(tunnelsMentioned('大老山公路(往大埔方向)近碩門邨的部分行車線封閉'), ['tct']);
  assert.deepEqual(tunnelsMentioned('獅子山隧道管道內有交通意外'), ['lrt']);
  assert.deepEqual(tunnelsMentioned('尖山隧道往九龍方向部分行車線封閉'), ['stg']);
  assert.deepEqual(tunnelsMentioned('青沙公路往沙田方向交通意外'), ['stg']);
  assert.deepEqual(tunnelsMentioned('屯門公路往九龍方向交通繁忙'), []);
});

test('a road incident is tied to the road it names', () => {
  assert.deepEqual(roadsMentioned('屯門公路往九龍方向交通繁忙'), ['tmr']);
  assert.deepEqual(roadsMentioned('大埔公路往九龍方向交通意外'), ['tpr']);
  assert.deepEqual(roadsMentioned('青山公路往荃灣方向交通繁忙'), ['lamkam']);
  // a tunnel name is not a road
  assert.deepEqual(roadsMentioned('獅子山隧道管道內有交通意外'), []);
});

test('each reading keeps the direction it travels', () => {
  const result = normaliseJourneyTimes(journeyXml([
    { location: 'H3', dest: 'EH', type: 1, data: 7, colour: 3 },   // Island side
    { location: 'K08', dest: 'EH', type: 1, data: 9, colour: 3 },  // Kowloon side
    { location: 'SJ2', dest: 'TCT', type: 1, data: 6, colour: 3 }, // Sha Tin side
  ]));
  const { tunnels } = result;
  assert.deepEqual(Object.keys(tunnels.ehc.byDirection).sort(), ['island', 'kowloon']);
  // Tate's Cairn only points one way: towards east Kowloon.
  assert.deepEqual(tunnels.tct.byDirection['kowloon-e'], { state: 'free', minutes: 6, origins: ['SJ2'] });
});

test('a reading remembers the gantry it starts from', () => {
  const { tunnels } = normaliseJourneyTimes(journeyXml([
    { location: 'SJ1', dest: 'LRT', type: 1, data: 8, colour: 3 },
    { location: 'SJ2', dest: 'LRT', type: 1, data: 7, colour: 3 },
    { location: 'SJ3', dest: 'LRT', type: 1, data: 11, colour: 3 },
  ]));
  const towards = tunnels.lrt.byDirection['kowloon-c'];
  assert.deepEqual(towards.origins, ['SJ1', 'SJ2', 'SJ3'], 'all three gantries are kept');
  assert.equal(towards.minutes, 11, 'and the worst of them is the reading');
});

test('the condition order runs from worst to best', () => {
  assert.deepEqual(CONDITION_ORDER, ['closed', 'jam', 'slow', 'free']);
});

test('the simplified feed merges into the traditional one by id', () => {
  const primary = [{ id: '1', textCn: '東區海底隧道(往柴灣方向)快線封閉', textEn: 'closed', tunnels: ['ehc'] }];
  const secondary = [{ id: '1', textCn: '东区海底隧道(往柴湾方向)快线封闭', textEn: 'closed', tunnels: ['ehc'] }];

  const [merged] = mergeIncidentLanguages(primary, secondary);
  assert.equal(merged.textCn, '東區海底隧道(往柴灣方向)快線封閉');
  assert.equal(merged.textSc, '东区海底隧道(往柴湾方向)快线封闭');
  assert.equal(merged.textEn, 'closed');
  assert.equal(merged.tunnels[0], 'ehc');
});

test('an incident reaches the corridor it affects, tunnel or road', () => {
  const incidents = [
    { id: 'a', tunnels: ['tct'], roads: [] },
    { id: 'b', tunnels: ['lrt', 'tct'], roads: [] },
    { id: 'c', tunnels: [], roads: [] },
    { id: 'd', tunnels: [], roads: ['tmr'] },
  ];
  const klnNte = { tunnels: ['lrt', 'tct', 'stg'], roads: ['tpr'] };
  assert.deepEqual(incidentsForCorridor(incidents, klnNte).map((i) => i.id), ['a', 'b']);

  // a road incident reaches the corridor that lists that road
  const klnNtw = { tunnels: ['tlt'], roads: ['tmr'] };
  assert.deepEqual(incidentsForCorridor(incidents, klnNtw).map((i) => i.id), ['d']);

  assert.deepEqual(incidentsForCorridor(incidents, { tunnels: ['cht', 'ehc', 'whc'], roads: [] }), []);
  assert.deepEqual(incidentsForCorridor(incidents, {}), []);
});

test('the proxy hands on the roads as well as the tunnels', async () => {
  const journey = `<jtis_journey_list>
    <jtis_journey_time><LOCATION_ID>K01</LOCATION_ID><DESTINATION_ID>CH</DESTINATION_ID>
      <CAPTURE_DATE>2026-10-08T22:57:00</CAPTURE_DATE><JOURNEY_TYPE>1</JOURNEY_TYPE>
      <JOURNEY_DATA>8</JOURNEY_DATA><COLOUR_ID>3</COLOUR_ID></jtis_journey_time>
    <jtis_journey_time><LOCATION_ID>SJ5</LOCATION_ID><DESTINATION_ID>TWTM</DESTINATION_ID>
      <CAPTURE_DATE>2026-10-08T22:57:00</CAPTURE_DATE><JOURNEY_TYPE>1</JOURNEY_TYPE>
      <JOURNEY_DATA>22</JOURNEY_DATA><COLOUR_ID>2</COLOUR_ID></jtis_journey_time>
  </jtis_journey_list>`;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => journey });

  const { default: handler } = await import('../api/traffic.js');
  const response = {
    statusCode: 0,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(key, value) { this.headers[key] = value; },
    json(payload) { this.body = payload; return this; },
  };
  await handler({}, response);
  globalThis.fetch = realFetch;

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['Cache-Control'], 's-maxage=60, stale-while-revalidate=300');
  assert.ok(response.body.tunnels.cht, 'the tunnel reading travels');
  assert.ok(response.body.roads.tmr, 'and so does the road reading');
  assert.equal(response.body.roads.tmr.minutes, 22);
});
