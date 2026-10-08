// js/engine.js
// Pure toll calculation. No DOM access, no side effects — importable by Node.
// User-facing copy lives in js/i18n.js; this module returns period types only.
import { TUNNELS, FLAT_TOLLS, TVT_FIXED, TVT_SCHEDULES } from './data.js';

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

const isFlatCombo = (tunnel, vehicleId, dayType) => {
  if (tunnel.pricing === 'flat') return true;
  if (vehicleId === 'taxi' || vehicleId === 'other') return true;
  return TVT_SCHEDULES[tunnel.id][dayType].length === 1;
};

export function getDaySegments({ tunnelId, vehicleId, dayType }) {
  const tunnel = TUNNELS.find((t) => t.id === tunnelId);
  if (!tunnel) throw new Error(`unknown tunnel: ${tunnelId}`);

  if (isFlatCombo(tunnel, vehicleId, dayType)) {
    const { amount } = getToll({ tunnelId, vehicleId, dayType, minutes: 0 });
    return [{ startMin: 0, endMin: 1439, periodType: 'flat', firstAmount: amount, lastAmount: amount }];
  }

  const schedule = TVT_SCHEDULES[tunnelId][dayType];
  return schedule.map((seg) => {
    if (seg.type === 'fixed') {
      const amount = seg[vehicleId];
      return { startMin: seg.s, endMin: seg.e, periodType: seg.period, firstAmount: amount, lastAmount: amount };
    }
    return {
      startMin: seg.s,
      endMin: seg.e,
      periodType: 'transition',
      firstAmount: transitionAmount(seg, seg[vehicleId], seg.s),
      lastAmount: transitionAmount(seg, seg[vehicleId], seg.e),
    };
  });
}

export function getNextTransition({ tunnelId, vehicleId, dayType, minutes }) {
  const segs = getDaySegments({ tunnelId, vehicleId, dayType });
  const idx = segs.findIndex((seg) => minutes >= seg.startMin && minutes <= seg.endMin);
  if (idx < 0 || idx === segs.length - 1) return null;
  const next = segs[idx + 1];
  return { atMin: next.startMin, periodType: next.periodType, amount: next.firstAmount };
}
