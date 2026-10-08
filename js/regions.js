// js/regions.js
// A compact district list for the journey suggestion. Each district carries
// which side of the harbour it is on and a west / central / east zone, which
// is all the ranking needs — the crossings are then ordered by how well they
// line up with the two zones. This is a heuristic for "which crossing is less
// of a detour", never a claim about the route a driver must take.

export const REGIONS = [
  // Hong Kong Island
  { id: 'hki-west', side: 'island', zone: 'west', name: { tc: '堅尼地城／西環', sc: '坚尼地城／西环', en: 'Kennedy Town / Sai Wan' } },
  { id: 'hki-central', side: 'island', zone: 'central', name: { tc: '中環／金鐘', sc: '中环／金钟', en: 'Central / Admiralty' } },
  { id: 'hki-wanchai', side: 'island', zone: 'central', name: { tc: '灣仔／銅鑼灣', sc: '湾仔／铜锣湾', en: 'Wan Chai / Causeway Bay' } },
  { id: 'hki-north', side: 'island', zone: 'east', name: { tc: '北角／鰂魚涌', sc: '北角／鲗鱼涌', en: 'North Point / Quarry Bay' } },
  { id: 'hki-taikoo', side: 'island', zone: 'east', name: { tc: '太古／西灣河', sc: '太古／西湾河', en: 'Tai Koo / Sai Wan Ho' } },
  { id: 'hki-chaiwan', side: 'island', zone: 'east', name: { tc: '柴灣／小西灣', sc: '柴湾／小西湾', en: 'Chai Wan / Siu Sai Wan' } },
  { id: 'hki-south', side: 'island', zone: 'central', name: { tc: '香港仔／鴨脷洲', sc: '香港仔／鸭脷洲', en: 'Aberdeen / Ap Lei Chau' } },

  // Kowloon
  { id: 'kln-meifoo', side: 'kowloon', zone: 'west', name: { tc: '美孚／荔枝角', sc: '美孚／荔枝角', en: 'Mei Foo / Lai Chi Kok' } },
  { id: 'kln-west', side: 'kowloon', zone: 'west', name: { tc: '深水埗／長沙灣', sc: '深水埗／长沙湾', en: 'Sham Shui Po / Cheung Sha Wan' } },
  { id: 'kln-tst', side: 'kowloon', zone: 'central', name: { tc: '尖沙咀／佐敦', sc: '尖沙咀／佐敦', en: 'Tsim Sha Tsui / Jordan' } },
  { id: 'kln-mk', side: 'kowloon', zone: 'central', name: { tc: '油麻地／旺角', sc: '油麻地／旺角', en: 'Yau Ma Tei / Mong Kok' } },
  { id: 'kln-hunghom', side: 'kowloon', zone: 'central', name: { tc: '紅磡／土瓜灣', sc: '红磡／土瓜湾', en: 'Hung Hom / To Kwa Wan' } },
  { id: 'kln-kowloontong', side: 'kowloon', zone: 'central', name: { tc: '九龍塘／黃大仙', sc: '九龙塘／黄大仙', en: 'Kowloon Tong / Wong Tai Sin' } },
  { id: 'kln-kaitak', side: 'kowloon', zone: 'east', name: { tc: '啟德／新蒲崗', sc: '启德／新蒲岗', en: 'Kai Tak / San Po Kong' } },
  { id: 'kln-kwuntong', side: 'kowloon', zone: 'east', name: { tc: '九龍灣／觀塘', sc: '九龙湾／观塘', en: 'Kowloon Bay / Kwun Tong' } },
  { id: 'kln-tko', side: 'kowloon', zone: 'east', name: { tc: '將軍澳', sc: '将军澳', en: 'Tseung Kwan O' } },

  // New Territories (everything north of the harbour that is not Kowloon)
  { id: 'nt-tsuenwan', side: 'nt', zone: 'west', name: { tc: '荃灣／葵涌', sc: '荃湾／葵涌', en: 'Tsuen Wan / Kwai Chung' } },
  { id: 'nt-tuenmun', side: 'nt', zone: 'west', name: { tc: '屯門／元朗', sc: '屯门／元朗', en: 'Tuen Mun / Yuen Long' } },
  { id: 'nt-tungchung', side: 'nt', zone: 'west', name: { tc: '東涌／機場', sc: '东涌／机场', en: 'Tung Chung / Airport' } },
  { id: 'nt-shatin', side: 'nt', zone: 'east', name: { tc: '沙田／大圍', sc: '沙田／大围', en: 'Sha Tin / Tai Wai' } },
  { id: 'nt-taipo', side: 'nt', zone: 'east', name: { tc: '大埔／北區', sc: '大埔／北区', en: 'Tai Po / North District' } },
];

export const regionById = (id) => REGIONS.find((region) => region.id === id);

const ZONE_VALUE = { west: -1, central: 0, east: 1 };
const TUNNEL_ZONE = { whc: -1, cht: 0, ehc: 1 };
// Stable tie order, so equal scores always come out the same way.
const TUNNEL_ORDER = ['whc', 'cht', 'ehc'];

// Which crossings suit this trip, best first. Crossings that line up equally
// well share a tier — the ranking never invents a preference it cannot justify.
export function planCrossing({ fromId, toId } = {}) {
  const from = regionById(fromId);
  const to = regionById(toId);
  if (!from || !to) return { crossesHarbour: false, reason: null, tiers: [] };

  const onIsland = (region) => region.side === 'island';
  if (onIsland(from) === onIsland(to)) return { crossesHarbour: false, reason: null, tiers: [] };

  const zones = [from.zone, to.zone];
  const score = (tunnelId) =>
    zones.reduce((total, zone) => total + Math.abs(ZONE_VALUE[zone] - TUNNEL_ZONE[tunnelId]), 0);

  const ranked = TUNNEL_ORDER.map((id) => ({ id, score: score(id) })).sort((a, b) => a.score - b.score);
  const tiers = [];
  for (const entry of ranked) {
    const last = tiers[tiers.length - 1];
    if (last && last.score === entry.score) last.ids.push(entry.id);
    else tiers.push({ score: entry.score, ids: [entry.id] });
  }

  const reason = zones.includes('west') ? 'west' : zones.includes('east') ? 'east' : 'central';
  return { crossesHarbour: true, reason, tiers: tiers.map((tier) => tier.ids) };
}
