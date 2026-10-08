// js/engine.js
// Pure toll calculation. No DOM access, no side effects — importable by Node.
import { TUNNELS, FLAT_TOLLS, TVT_FIXED, TVT_SCHEDULES } from './data.js';

export const PERIOD_LABEL = {
  'non-peak': '非繁忙時段',
  normal: '一般時段',
  peak: '繁忙時段',
  transition: '過渡期',
  flat: '全日劃一',
};

const findSegment = (schedule, minutes) =>
  schedule.find((seg) => minutes >= seg.s && minutes <= seg.e);

// Transition price: from + dir * (offset + step * floor((minutes - s) / 2)).
// Rounded to one decimal so 0.8-step motorcycle rates compare cleanly.
const transitionAmount = (seg, rate, minutes) => {
  const k = Math.floor((minutes - seg.s) / 2);
  const raw = rate.from + rate.dir * (rate.offset + rate.step * k);
  return Math.round(raw * 10) / 10;
};

export function getToll({ tunnelId, vehicleId, dayType, minutes }) {
  const tunnel = TUNNELS.find((t) => t.id === tunnelId);
  if (!tunnel) throw new Error(`unknown tunnel: ${tunnelId}`);

  if (tunnel.pricing === 'flat') {
    const table = FLAT_TOLLS[tunnelId];
    const amount = table[vehicleId] ?? table.all;
    if (amount == null) throw new Error(`unknown vehicle ${vehicleId} for ${tunnelId}`);
    return { amount, periodType: 'flat' };
  }

  if (vehicleId === 'taxi' || vehicleId === 'other') {
    return { amount: TVT_FIXED[tunnelId][vehicleId], periodType: 'flat' };
  }

  const schedule = TVT_SCHEDULES[tunnelId][dayType];
  if (!schedule) throw new Error(`unknown day type: ${dayType}`);
  const seg = findSegment(schedule, minutes);
  if (!seg) throw new Error(`no segment at minute ${minutes}`);

  if (seg.type === 'fixed') {
    const amount = seg[vehicleId];
    if (amount == null) throw new Error(`unknown vehicle ${vehicleId} for ${tunnelId}`);
    return { amount, periodType: seg.period };
  }
  return { amount: transitionAmount(seg, seg[vehicleId], minutes), periodType: 'transition' };
}
