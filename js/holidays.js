// js/holidays.js
// Hong Kong general holidays gazetted by the HKSAR Government (GovHK).
// Every Sunday is also a general holiday; callers handle Sundays separately.
export const HOLIDAYS = new Set([
  // 2025
  '2025-01-01', '2025-01-29', '2025-01-30', '2025-01-31', '2025-04-04',
  '2025-04-18', '2025-04-19', '2025-04-21', '2025-05-01', '2025-05-05',
  '2025-05-31', '2025-07-01', '2025-10-01', '2025-10-07', '2025-10-29',
  '2025-12-25', '2025-12-26',
  // 2026
  '2026-01-01', '2026-02-17', '2026-02-18', '2026-02-19', '2026-04-03',
  '2026-04-04', '2026-04-06', '2026-04-07', '2026-05-01', '2026-05-25',
  '2026-06-19', '2026-07-01', '2026-09-26', '2026-10-01', '2026-10-19',
  '2026-12-25', '2026-12-26',
  // 2027
  '2027-01-01', '2027-02-06', '2027-02-08', '2027-02-09', '2027-03-26',
  '2027-03-27', '2027-03-29', '2027-04-05', '2027-05-01', '2027-05-13',
  '2027-06-09', '2027-07-01', '2027-09-16', '2027-10-01', '2027-10-08',
  '2027-12-25', '2027-12-27',
]);

export const HOLIDAY_YEARS = [2025, 2026, 2027];

const pad = (n) => String(n).padStart(2, '0');

export const toDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const isPublicHoliday = (d) => HOLIDAYS.has(toDateKey(d));

export const inHolidayRange = (d) => HOLIDAY_YEARS.includes(d.getFullYear());

// TD applies the weekend schedule on Sundays and public holidays; the weekday
// schedule applies Monday–Saturday excluding public holidays.
export function defaultDayType(d = new Date()) {
  const weekend = d.getDay() === 0 || isPublicHoliday(d);
  return { dayType: weekend ? 'weekend' : 'weekday', dataCurrent: inHolidayRange(d) };
}
