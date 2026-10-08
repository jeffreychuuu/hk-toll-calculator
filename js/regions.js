// js/regions.js
// A macro map of Hong Kong for journey suggestions. Nine areas (New
// Territories / Kowloon / Island, each west / central / east) are joined by
// the tolled tunnels as edges and by free roads as unlabelled edges. A trip is
// a short path through that graph, so tunnels that merely lie *between* two
// districts (Shing Mun, Tai Lam) show up on their own, and a route that uses
// no tunnel at all is just a path made of free edges.
//
// This is "which tunnels does this trip pass through", never a claim about
// speed: the data to answer that does not live in this project.

export const NODES = ['ntw', 'nte', 'klw', 'klc', 'kle', 'isw', 'isc', 'ise', 'iss'];

// The tunnels, each joining two areas.
export const TUNNEL_EDGES = [
  { a: 'nte', b: 'ntw', tunnel: 'smt' }, // Shing Mun
  { a: 'ntw', b: 'klw', tunnel: 'tlt' }, // Tai Lam
  { a: 'nte', b: 'klc', tunnel: 'lrt' }, // Lion Rock
  { a: 'nte', b: 'kle', tunnel: 'tct' }, // Tate's Cairn
  { a: 'klc', b: 'isc', tunnel: 'cht' }, // Cross-Harbour
  { a: 'kle', b: 'ise', tunnel: 'ehc' }, // Eastern Harbour Crossing
  { a: 'klw', b: 'isw', tunnel: 'whc' }, // Western Harbour Crossing
  { a: 'isc', b: 'iss', tunnel: 'abt' }, // Aberdeen
];

// Free roads. Note what is absent: nothing crosses the harbour for free, so
// every harbour trip in the graph must pay for a crossing.
const FREE_EDGES = [
  ['ntw', 'nte'],
  ['ntw', 'klw'],
  ['nte', 'klw'],
  ['nte', 'klc'],
  ['nte', 'kle'],
  ['klw', 'klc'],
  ['klc', 'kle'],
  ['isw', 'isc'],
  ['isc', 'ise'],
];

export const REGIONS = [
  // Hong Kong Island
  { id: 'hki-cw', area: 'island', nodes: ['isw', 'isc'], name: { tc: '中西區', sc: '中西区', en: 'Central and Western' } },
  { id: 'hki-wc', area: 'island', nodes: ['isc'], name: { tc: '灣仔區', sc: '湾仔区', en: 'Wan Chai' } },
  { id: 'hki-east', area: 'island', nodes: ['ise'], name: { tc: '東區', sc: '东区', en: 'Eastern' } },
  { id: 'hki-south', area: 'island', nodes: ['iss'], name: { tc: '南區', sc: '南区', en: 'Southern' } },

  // Kowloon
  { id: 'kln-ytm', area: 'kowloon', nodes: ['klc'], name: { tc: '油尖旺區', sc: '油尖旺区', en: 'Yau Tsim Mong' } },
  { id: 'kln-ssp', area: 'kowloon', nodes: ['klw'], name: { tc: '深水埗區', sc: '深水埗区', en: 'Sham Shui Po' } },
  { id: 'kln-kc', area: 'kowloon', nodes: ['klc', 'kle'], name: { tc: '九龍城區', sc: '九龙城区', en: 'Kowloon City' } },
  { id: 'kln-wts', area: 'kowloon', nodes: ['klc', 'kle'], name: { tc: '黃大仙區', sc: '黄大仙区', en: 'Wong Tai Sin' } },
  { id: 'kln-kt', area: 'kowloon', nodes: ['kle'], name: { tc: '觀塘區', sc: '观塘区', en: 'Kwun Tong' } },

  // New Territories
  { id: 'nt-kts', area: 'nt', nodes: ['ntw'], name: { tc: '葵青區', sc: '葵青区', en: 'Kwai Tsing' } },
  { id: 'nt-tw', area: 'nt', nodes: ['ntw'], name: { tc: '荃灣區', sc: '荃湾区', en: 'Tsuen Wan' } },
  { id: 'nt-tm', area: 'nt', nodes: ['ntw'], name: { tc: '屯門區', sc: '屯门区', en: 'Tuen Mun' } },
  { id: 'nt-yl', area: 'nt', nodes: ['ntw'], name: { tc: '元朗區', sc: '元朗区', en: 'Yuen Long' } },
  { id: 'nt-north', area: 'nt', nodes: ['nte'], name: { tc: '北區', sc: '北区', en: 'North' } },
  { id: 'nt-tp', area: 'nt', nodes: ['nte'], name: { tc: '大埔區', sc: '大埔区', en: 'Tai Po' } },
  { id: 'nt-st', area: 'nt', nodes: ['nte'], name: { tc: '沙田區', sc: '沙田区', en: 'Sha Tin' } },
  { id: 'nt-sk', area: 'nt', nodes: ['kle', 'nte'], name: { tc: '西貢區', sc: '西贡区', en: 'Sai Kung' } },
  { id: 'nt-islands', area: 'nt', nodes: ['ntw'], name: { tc: '離島區', sc: '离岛区', en: 'Islands' } },
];

export const regionById = (id) => REGIONS.find((region) => region.id === id);

const HARBOUR_TUNNELS = ['cht', 'ehc', 'whc'];
const ISLAND_NODES = ['isw', 'isc', 'ise', 'iss'];
const MAX_EDGES = 3; // an approach, the crossing, and a final link

// West / central / east coordinate of each area. A route may not move *away*
// from the destination on this axis, which is what keeps Sha Tin from being
// offered the western crossing and Tuen Mun from being sent via Shing Mun.
const X = { ntw: -1, nte: 1, klw: -1, klc: 0, kle: 1, isw: -1, isc: 0, ise: 1, iss: 0 };
// North (New Territories) / Kowloon / Island / beyond, so a route cannot dive
// into Kowloon and come back north on the way.
const Y = { ntw: 0, nte: 0, klw: 1, klc: 1, kle: 1, isw: 2, isc: 2, ise: 2, iss: 3 };

const insideBox = (node, from, to) => {
  const x = [X[from], X[to]];
  const y = [Y[from], Y[to]];
  return X[node] >= Math.min(...x) && X[node] <= Math.max(...x)
    && Y[node] >= Math.min(...y) && Y[node] <= Math.max(...y);
};
const distanceTo = (node, to) => Math.abs(X[node] - X[to]) + Math.abs(Y[node] - Y[to]);

const EDGES = [
  ...TUNNEL_EDGES.map((edge) => ({ a: edge.a, b: edge.b, tunnel: edge.tunnel })),
  ...FREE_EDGES.map(([a, b]) => ({ a, b, tunnel: null })),
];

const neighbours = (node) => EDGES.filter((edge) => edge.a === node || edge.b === node);

function nodesOn(path, start) {
  let node = start;
  const nodes = [];
  for (const edge of path) {
    node = other(edge, node);
    nodes.push(node);
  }
  return nodes;
}

function toward(nodes, fromNode, toNode) {
  let previous = distanceTo(fromNode, toNode);
  for (const node of nodes) {
    if (!insideBox(node, fromNode, toNode)) return false;
    const step = distanceTo(node, toNode);
    if (step >= previous) return false; // every leg must close the gap
    previous = step;
  }
  return true;
}
const other = (edge, node) => (edge.a === node ? edge.b : edge.a);

function walk(node, to, visited, path, out) {
  if (node === to && path.length > 0) {
    out.push(path.slice());
    return;
  }
  if (path.length === MAX_EDGES) return;

  for (const edge of neighbours(node)) {
    const next = other(edge, node);
    if (visited.has(next)) continue;
    walk(next, to, new Set([...visited, next]), [...path, edge], out);
  }
}

// Every short tunnel combination for a trip. Districts that straddle two
// areas (Central and Western, Wong Tai Sin, Kowloon City, Sai Kung) contribute
// routes from each of their areas, so both crossing directions are offered.
export function planRoutes({ fromId, toId } = {}) {
  const from = regionById(fromId);
  const to = regionById(toId);
  if (!from || !to) return { crossesHarbour: false, routes: [] };

  const onIsland = (node) => ISLAND_NODES.includes(node);
  const crossesHarbour = onIsland(from.nodes[0]) !== onIsland(to.nodes[0]);

  const seen = new Set();
  const routes = [];
  const addRoute = (tunnels) => {
    // A route that crosses the harbour more than once is not a route anyone drives.
    if (tunnels.filter((id) => HARBOUR_TUNNELS.includes(id)).length > 1) return;
    if (tunnels.length > 2) return;
    // Off the harbour there is never a reason to use two tolled tunnels.
    if (!crossesHarbour && tunnels.length > 1) return;
    const key = tunnels.slice().sort().join('+');
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({ tunnels });
  };

  for (const fromNode of from.nodes) {
    for (const toNode of to.nodes) {
      if (fromNode === toNode) {
        addRoute([]);
        continue;
      }
      const paths = [];
      walk(fromNode, toNode, new Set([fromNode]), [], paths);
      for (const path of paths) {
        if (!toward(nodesOn(path, fromNode), fromNode, toNode)) continue;
        addRoute(path.map((edge) => edge.tunnel).filter(Boolean));
      }
    }
  }
  return { crossesHarbour, routes };
}
