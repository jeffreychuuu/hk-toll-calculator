// js/data.js
// Toll data transcribed from Transport Department publications:
// - https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tvt/index.html
// - https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/toll_matters/toll_rates_of_road_tunnels_and_lantau_link/index.html
// - https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tlt/index.html
// Rates as of October 2026.

export const TUNNELS = [
  { id: 'cht', name: '海底隧道（紅隧）', pricing: 'tvt', group: '分時段收費' },
  { id: 'ehc', name: '東區海底隧道（東隧）', pricing: 'tvt', group: '分時段收費' },
  { id: 'whc', name: '西區海底隧道（西隧）', pricing: 'tvt', group: '分時段收費' },
  { id: 'tlt', name: '大欖隧道', pricing: 'tvt', group: '分時段收費' },
  { id: 'abt', name: '香港仔隧道', pricing: 'flat', group: '劃一收費' },
  { id: 'smt', name: '城門隧道', pricing: 'flat', group: '劃一收費' },
  { id: 'lrt', name: '獅子山隧道', pricing: 'flat', group: '劃一收費' },
  { id: 'stg', name: '沙田嶺／尖山／大圍隧道', pricing: 'flat', group: '劃一收費' },
  { id: 'tct', name: '大老山隧道', pricing: 'flat', group: '劃一收費' },
  {
    id: 'dbt',
    name: '愉景灣隧道',
    pricing: 'flat',
    group: '劃一收費',
    note: '僅向往愉景灣方向嘅車輛收取，的士免費',
  },
];

export const TVT_VEHICLES = [
  { id: 'car', name: '私家車' },
  { id: 'moto', name: '電單車／機動三輪車' },
  { id: 'taxi', name: '的士' },
  { id: 'other', name: '其他商用車輛（貨車／小巴／巴士）' },
];

export const FLAT8_VEHICLES = [{ id: 'all', name: '所有車輛' }];

export const TCT_VEHICLES = [
  { id: 'mc', name: '電單車、機動三輪車' },
  { id: 'pc', name: '私家車' },
  { id: 'taxi', name: '的士' },
  { id: 'pmb', name: '公共小型巴士' },
  { id: 'pvmb', name: '私家小型巴士' },
  { id: 'lgv', name: '輕型貨車（≤5.5 公噸）' },
  { id: 'mgv', name: '中型貨車（5.5–24 公噸）' },
  { id: 'hgv', name: '重型貨車（>24 公噸）' },
  { id: 'sbus', name: '公共及私家單層巴士' },
  { id: 'dbus', name: '公共及私家雙層巴士' },
];

export const DBT_VEHICLES = [
  { id: 'c1', name: '政府／救護／消防／警務／海關／懲教車輛' },
  { id: 'c2', name: '私家小型巴士' },
  { id: 'c3', name: '公共及私家巴士' },
  { id: 'c4', name: '輕型貨車（≤5.5 公噸）' },
  { id: 'c5', name: '中型貨車（5.5–24 公噸）' },
  { id: 'c6', name: '重型貨車（>24 公噸）' },
  { id: 'c7', name: '其他車輛（的士除外）' },
];

const FLAT8 = ['abt', 'smt', 'lrt', 'stg'];

export const FLAT_TOLLS = {
  abt: { all: 8 },
  smt: { all: 8 },
  lrt: { all: 8 },
  stg: { all: 8 },
  tct: {
    mc: 15, pc: 20, taxi: 20, pmb: 23, pvmb: 23,
    lgv: 24, mgv: 28, hgv: 28, sbus: 32, dbus: 35,
  },
  dbt: { c1: 50, c2: 50, c3: 50, c4: 120, c5: 160, c6: 250, c7: 250 },
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
