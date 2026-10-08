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

export function vehiclesFor(tunnelId) {
  const tunnel = TUNNELS.find((t) => t.id === tunnelId);
  if (!tunnel) throw new Error(`unknown tunnel: ${tunnelId}`);
  if (tunnel.pricing === 'tvt') return TVT_VEHICLES;
  if (FLAT8.includes(tunnelId)) return FLAT8_VEHICLES;
  if (tunnelId === 'tct') return TCT_VEHICLES;
  return DBT_VEHICLES;
}
