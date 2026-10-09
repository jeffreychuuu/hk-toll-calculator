// js/data.js
// Toll data transcribed from Transport Department publications:
// - https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tvt/index.html
// - https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/toll_matters/toll_rates_of_road_tunnels_and_lantau_link/index.html
// - https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tlt/index.html
// Rates as of October 2026.

// The three harbour crossings share the time-varying scheme, so they are the
// set a "cheapest crossing" comparison looks at.
export const CROSS_HARBOUR_IDS = ['cht', 'ehc', 'whc'];

const GROUP_TVT = { tc: '分時段收費', sc: '分时段收费', en: 'Time-varying toll' };
const GROUP_FLAT = { tc: '劃一收費', sc: '划一收费', en: 'Flat rate' };

export const TUNNELS = [
  {
    id: 'cht',
    name: { tc: '海底隧道（紅隧）', sc: '海底隧道（红隧）', en: 'Cross-Harbour Tunnel (Hung Hom)' },
    pricing: 'tvt',
    group: GROUP_TVT,
  },
  {
    id: 'ehc',
    name: { tc: '東區海底隧道（東隧）', sc: '东区海底隧道（东隧）', en: 'Eastern Harbour Crossing' },
    pricing: 'tvt',
    group: GROUP_TVT,
  },
  {
    id: 'whc',
    name: { tc: '西區海底隧道（西隧）', sc: '西区海底隧道（西隧）', en: 'Western Harbour Crossing' },
    pricing: 'tvt',
    group: GROUP_TVT,
  },
  {
    id: 'tlt',
    name: { tc: '大欖隧道', sc: '大榄隧道', en: 'Tai Lam Tunnel' },
    pricing: 'tvt',
    group: GROUP_TVT,
  },
  {
    id: 'abt',
    name: { tc: '香港仔隧道', sc: '香港仔隧道', en: 'Aberdeen Tunnel' },
    pricing: 'flat',
    group: GROUP_FLAT,
  },
  {
    id: 'smt',
    name: { tc: '城門隧道', sc: '城门隧道', en: 'Shing Mun Tunnels' },
    pricing: 'flat',
    group: GROUP_FLAT,
  },
  {
    id: 'lrt',
    name: { tc: '獅子山隧道', sc: '狮子山隧道', en: 'Lion Rock Tunnel' },
    pricing: 'flat',
    group: GROUP_FLAT,
  },
  {
    id: 'stg',
    name: {
      tc: '沙田嶺／尖山／大圍隧道',
      sc: '沙田岭／尖山／大围隧道',
      en: "Sha Tin Heights / Eagle's Nest / Tai Wai Tunnels",
    },
    pricing: 'flat',
    group: GROUP_FLAT,
  },
  {
    id: 'tct',
    name: { tc: '大老山隧道', sc: '大老山隧道', en: "Tate's Cairn Tunnel" },
    pricing: 'flat',
    group: GROUP_FLAT,
  },
];

export const TVT_VEHICLES = [
  { id: 'car', name: { tc: '私家車', sc: '私家车', en: 'Private car' } },
  { id: 'moto', name: { tc: '電單車／機動三輪車', sc: '电单车／机动三轮车', en: 'Motorcycle / motor tricycle' } },
  { id: 'taxi', name: { tc: '的士', sc: '的士', en: 'Taxi' } },
  {
    id: 'other',
    name: {
      tc: '其他商用車輛（貨車／小巴／巴士）',
      sc: '其他商用车辆（货车／小巴／巴士）',
      en: 'Other commercial vehicles (goods vehicles, minibuses, buses)',
    },
  },
];

// The flat-rate tunnels charge every class the same, but the class still
// matters: it decides what the other tunnels in a comparison cost for this
// trip, so the four classes are named rather than hidden behind "all vehicles".
export const FLAT8_VEHICLES = TVT_VEHICLES;

export const TCT_VEHICLES = [
  { id: 'pc', name: { tc: '私家車', sc: '私家车', en: 'Private car' } },
  { id: 'mc', name: { tc: '電單車、機動三輪車', sc: '电单车、机动三轮车', en: 'Motorcycle, motor tricycle' } },
  { id: 'taxi', name: { tc: '的士', sc: '的士', en: 'Taxi' } },
  { id: 'pmb', name: { tc: '公共小型巴士', sc: '公共小型巴士', en: 'Public minibus' } },
  { id: 'pvmb', name: { tc: '私家小型巴士', sc: '私家小型巴士', en: 'Private minibus' } },
  { id: 'lgv', name: { tc: '輕型貨車（≤5.5 公噸）', sc: '轻型货车（≤5.5 公吨）', en: 'Light goods vehicle (≤5.5 t)' } },
  { id: 'mgv', name: { tc: '中型貨車（5.5–24 公噸）', sc: '中型货车（5.5–24 公吨）', en: 'Medium goods vehicle (5.5–24 t)' } },
  { id: 'hgv', name: { tc: '重型貨車（>24 公噸）', sc: '重型货车（>24 公吨）', en: 'Heavy goods vehicle (>24 t)' } },
  { id: 'sbus', name: { tc: '公共及私家單層巴士', sc: '公共及私家单层巴士', en: 'Public & private single-deck bus' } },
  { id: 'dbus', name: { tc: '公共及私家雙層巴士', sc: '公共及私家双层巴士', en: 'Public & private double-deck bus' } },
];

const FLAT8 = ['abt', 'smt', 'lrt', 'stg'];

// A journey route mixes tunnels that classify vehicles differently, so routes
// are priced through four canonical classes (car / moto / taxi / other) and
// mapped per tunnel. Tate's Cairn has no "other" class, so goods traffic is
// priced as its light goods vehicle.
const CANONICAL = { car: 'car', moto: 'moto', taxi: 'taxi', other: 'other' };
const ALL_CLASSES = { car: 'all', moto: 'all', taxi: 'all', other: 'all' };

export const CANONICAL_FOR_TUNNEL = {
  cht: CANONICAL, ehc: CANONICAL, whc: CANONICAL, tlt: CANONICAL,
  abt: ALL_CLASSES, smt: ALL_CLASSES, lrt: ALL_CLASSES, stg: ALL_CLASSES,
  tct: { car: 'pc', moto: 'mc', taxi: 'taxi', other: 'lgv' },
};

export const classIdFor = (tunnelId, canonical) => CANONICAL_FOR_TUNNEL[tunnelId]?.[canonical];

export function canonicalFor(tunnelId, classId) {
  // A class that is already canonical is its own answer (a car on a flat-rate
  // tunnel is a car, even though that tunnel calls it "all").
  if (Object.prototype.hasOwnProperty.call(CANONICAL, classId)) return classId;
  const map = CANONICAL_FOR_TUNNEL[tunnelId];
  if (!map) return 'car';
  const hit = Object.entries(map).find(([, id]) => id === classId);
  return hit ? hit[0] : 'other';
}

export const FLAT_TOLLS = {
  abt: { all: 8 },
  smt: { all: 8 },
  lrt: { all: 8 },
  stg: { all: 8 },
  tct: {
    mc: 15, pc: 20, taxi: 20, pmb: 23, pvmb: 23,
    lgv: 24, mgv: 28, hgv: 28, sbus: 32, dbus: 35,
  },
};

export const TVT_FIXED = {
  cht: { taxi: 25, other: 50 },
  ehc: { taxi: 25, other: 50 },
  whc: { taxi: 25, other: 50 },
  tlt: { taxi: 28, other: 43 },
};

// --- Time-varying schedules ---------------------------------------------
// Transition rate: price(min) = from + dir * (offset + step * floor((min - s)/2))
// Values are transcribed from the TD detailed toll-schedule PDFs and are
// authoritative over any formula: irregular steps (e.g. a first step of $1)
// are captured by individual `from`/`offset` values.

const F = (s, e, period, car, moto) => ({ s, e, type: 'fixed', period, car, moto });
const T = (s, e, car, moto) => ({ s, e, type: 'transition', car, moto });
const up = (from, offset, step) => ({ from, dir: 1, offset, step });
const down = (from, offset, step) => ({ from, dir: -1, offset, step });

// 海底隧道及東區海底隧道 — Monday to Saturday, excluding public holidays
const CH_WEEKDAY = [
  F(0, 449, 'non-peak', 20, 8),
  T(450, 467, up(20, 2, 2), up(8, 0.8, 0.8)),
  F(468, 614, 'peak', 40, 16),
  T(615, 622, down(40, 2, 2), down(16, 0.8, 0.8)),
  F(623, 989, 'normal', 30, 12),
  T(990, 997, up(30, 2, 2), up(12, 0.8, 0.8)),
  F(998, 1139, 'peak', 40, 16),
  T(1140, 1157, down(40, 2, 2), down(16, 0.8, 0.8)),
  F(1158, 1439, 'non-peak', 20, 8),
];

// 西區海底隧道 — Monday to Saturday, excluding public holidays
const WHC_WEEKDAY = [
  F(0, 449, 'non-peak', 20, 8),
  T(450, 487, up(20, 2, 2), up(8, 0.8, 0.8)),
  F(488, 614, 'peak', 60, 24),
  T(615, 642, down(60, 2, 2), down(24, 0.8, 0.8)),
  F(643, 989, 'normal', 30, 12),
  T(990, 1017, up(30, 2, 2), up(12, 0.8, 0.8)),
  F(1018, 1139, 'peak', 60, 24),
  T(1140, 1177, down(60, 2, 2), down(24, 0.8, 0.8)),
  F(1178, 1439, 'non-peak', 20, 8),
];

// 三條過海隧道 — Sunday and public holidays
const CH_WEEKEND = [
  F(0, 610, 'non-peak', 20, 8),
  T(611, 614, up(20, 1, 2), up(8, 0.4, 0.8)),
  F(615, 1154, 'normal', 25, 10),
  T(1155, 1158, down(25, 2, 2), down(10, 0.8, 0.8)),
  F(1159, 1439, 'non-peak', 20, 8),
];

// 大欖隧道 — Monday to Saturday, excluding public holidays
const TLT_WEEKDAY = [
  F(0, 434, 'non-peak', 18, 7.2),
  T(435, 460, up(18, 1, 2), up(7.2, 0.4, 0.8)),
  F(461, 584, 'peak', 45, 18),
  T(585, 598, down(45, 2, 2), down(18, 0.8, 0.8)),
  F(599, 1034, 'normal', 30, 12),
  T(1035, 1048, up(30, 1, 2), up(12, 0.4, 0.8)),
  F(1049, 1139, 'peak', 45, 18),
  T(1140, 1165, down(45, 2, 2), down(18, 0.8, 0.8)),
  F(1166, 1439, 'non-peak', 18, 7.2),
];

// 大欖隧道 — Sunday and public holidays: flat all day
const TLT_WEEKEND = [F(0, 1439, 'non-peak', 18, 7.2)];

export const TVT_SCHEDULES = {
  cht: { weekday: CH_WEEKDAY, weekend: CH_WEEKEND },
  ehc: { weekday: CH_WEEKDAY, weekend: CH_WEEKEND },
  whc: { weekday: WHC_WEEKDAY, weekend: CH_WEEKEND },
  tlt: { weekday: TLT_WEEKDAY, weekend: TLT_WEEKEND },
};

export function vehiclesFor(tunnelId) {
  const tunnel = TUNNELS.find((t) => t.id === tunnelId);
  if (!tunnel) throw new Error(`unknown tunnel: ${tunnelId}`);
  if (tunnel.pricing === 'tvt') return TVT_VEHICLES;
  if (FLAT8.includes(tunnelId)) return FLAT8_VEHICLES;
  if (tunnelId === 'tct') return TCT_VEHICLES;
  return DBT_VEHICLES;
}
