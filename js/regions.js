// js/regions.js
// A macro map of Hong Kong for the trip comparison. Nine areas (New
// Territories / Kowloon / Island, each west / central / east) are joined by the
// tolled tunnels as edges and by the free corridors as edges too, so every
// option that serves the same trip can be listed side by side: a Tuen Mun
// driver compares Tai Lam with Tuen Mun Road, never with the Lion Rock Tunnel.
//
// This is "which tunnels serve this trip", never a claim about speed: the data
// to answer that does not live in this project.

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
    a: 'ntw', b: 'nte', id: 'lamkam', compare: true,    name: { tc: '林錦公路／青山公路', sc: '林锦公路／青山公路', en: 'Lam Kam Road / Castle Peak Road' },
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
  // Discovery Bay stands alone: off the macro map, so it names itself.
  { id: 'other', tunnels: ['dbt'] },
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
    const pairs = new Set((category.pairs || []).map(([a, b]) => pairKey(a, b)));
    // Most corridors are a pair of areas; a standalone tunnel names itself.
    const tunnels = category.tunnels
      ? [...category.tunnels]
      : TUNNEL_EDGES.filter((edge) => pairs.has(pairKey(edge.a, edge.b))).map((edge) => edge.tunnel);
    const roads = [];
    for (const edge of FREE_EDGES) {
      if (!pairs.has(pairKey(edge.a, edge.b))) continue;
      if (roads.some((road) => road.name.en === edge.name.en)) continue;
      roads.push({ id: edge.id, name: edge.name });
    }
    return { id: category.id, tunnels, roads };
  });
}
