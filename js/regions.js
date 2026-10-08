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
  { a: 'nte', b: 'klw', tunnel: 'stg' }, // Sha Tin Heights / Eagle's Nest / Tai Wai
  { a: 'klc', b: 'isc', tunnel: 'cht' }, // Cross-Harbour
  { a: 'kle', b: 'ise', tunnel: 'ehc' }, // Eastern Harbour Crossing
  { a: 'klw', b: 'isw', tunnel: 'whc' }, // Western Harbour Crossing
  { a: 'isc', b: 'iss', tunnel: 'abt' }, // Aberdeen
];

// Free roads, named so a route reads naturally ("Tai Po Road then the red
// tunnel"). `compare` marks the corridors that are worth offering as
// alternatives to a tolled tunnel in the comparison list; the note about what
// is absent matters most: nothing crosses the harbour for free.
export const FREE_EDGES = [
  {
    a: 'ntw', b: 'nte', id: 'lamkam', compare: false,    name: { tc: '林錦公路／青山公路', sc: '林锦公路／青山公路', en: 'Lam Kam Road / Castle Peak Road' },
  },
  {
    a: 'ntw', b: 'klw', id: 'tmr', compare: true,    name: { tc: '屯門公路', sc: '屯门公路', en: 'Tuen Mun Road' },
  },
  {
    a: 'nte', b: 'klw', id: 'tpr', compare: true,    name: { tc: '大埔道', sc: '大埔道', en: 'Tai Po Road' },
  },
  {
    a: 'nte', b: 'klc', id: 'tpr', compare: true,    name: { tc: '大埔道', sc: '大埔道', en: 'Tai Po Road' },
  },
  {
    a: 'nte', b: 'kle', id: 'lungcheung', compare: true,    name: { tc: '龍翔道', sc: '龙翔道', en: 'Lung Cheung Road' },
  },
  {
    a: 'klw', b: 'klc', id: 'wkc', compare: true,    name: { tc: '西九龍走廊', sc: '西九龙走廊', en: 'West Kowloon Corridor' },
  },
  {
    a: 'klc', b: 'kle', id: 'ped', compare: false,    name: { tc: '太子道東', sc: '太子道东', en: 'Prince Edward Road East' },
  },
  {
    a: 'isw', b: 'isc', id: 'connaught', compare: false,    name: { tc: '干諾道', sc: '干诺道', en: 'Connaught Road' },
  },
  {
    a: 'isc', b: 'ise', id: 'iec', compare: false,    name: { tc: '東區走廊', sc: '东区走廊', en: 'Island Eastern Corridor' },
  },
];

// The named free corridors offered side by side with the tunnels.
export const COMPARE_ROADS = FREE_EDGES
  .filter((edge) => edge.compare)
  .filter((edge, index, all) => all.findIndex((x) => x.name.en === edge.name.en) === index)
  .map((edge) => ({ id: edge.id, name: edge.name }));

// The comparison is organised by the kind of trip, because only options that
// serve the same trip are alternatives: a Tuen Mun driver compares Tai Lam
// with Tuen Mun Road, never with the Lion Rock Tunnel.
const CORRIDOR_CATEGORIES = [
  { id: 'harbour', pairs: [['klc', 'isc'], ['kle', 'ise'], ['klw', 'isw']] },
  { id: 'kln-nte', pairs: [['nte', 'klc'], ['nte', 'kle'], ['nte', 'klw']] },
  { id: 'kln-ntw', pairs: [['ntw', 'klw']] },
  { id: 'nte-ntw', pairs: [['ntw', 'nte']] },
  { id: 'island', pairs: [['isw', 'isc'], ['isc', 'ise'], ['isc', 'iss']] },
  { id: 'kowloon', pairs: [['klw', 'klc'], ['klc', 'kle']] },
];

const pairKey = (a, b) => [a, b].sort().join('-');

// Which kind of trip a tunnel serves. Each tunnel sits on exactly one edge,
// so a tunnel's category is well defined and never has to be chosen.
export function categoryForTunnel(tunnelId) {
  const group = compareGroups().find((entry) => entry.tunnels.includes(tunnelId));
  return group ? group.id : undefined;
}

export function compareGroups() {
  return CORRIDOR_CATEGORIES.map((category) => {
    const pairs = new Set(category.pairs.map(([a, b]) => pairKey(a, b)));
    const tunnels = TUNNEL_EDGES
      .filter((edge) => pairs.has(pairKey(edge.a, edge.b)))
      .map((edge) => edge.tunnel);
    const roads = [];
    for (const edge of FREE_EDGES) {
      if (!pairs.has(pairKey(edge.a, edge.b))) continue;
      if (roads.some((road) => road.name.en === edge.name.en)) continue;
      roads.push({ id: edge.id, name: edge.name });
    }
    return { id: category.id, tunnels, roads };
  });
}

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
  ...FREE_EDGES.map((edge) => ({ a: edge.a, b: edge.b, tunnel: null, road: edge.name, roadId: edge.id })),
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
  const addRoute = (legs) => {
    const tunnels = legs.filter((leg) => leg.tunnel).map((leg) => leg.tunnel);
    const roads = legs.filter((leg) => leg.road).map((leg) => leg.road);
    // A route that crosses the harbour more than once is not a route anyone drives.
    if (tunnels.filter((id) => HARBOUR_TUNNELS.includes(id)).length > 1) return;
    if (tunnels.length > 2) return;
    // Off the harbour there is never a reason to use two tolled tunnels.
    if (!crossesHarbour && tunnels.length > 1) return;
    const key = legs.map((leg) => leg.tunnel || `road:${leg.road.tc}`).sort().join('>');
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({ tunnels, roads, legs });
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
        const walked = [fromNode, ...nodesOn(path, fromNode)];
        addRoute(path.map((edge, index) => (edge.tunnel
          ? { tunnel: edge.tunnel, from: walked[index], to: walked[index + 1] }
          : { road: edge.road, roadId: edge.roadId, from: walked[index], to: walked[index + 1] })));
      }
    }
  }
  return { crossesHarbour, routes };
}
