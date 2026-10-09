// js/holidays.js
// Hong Kong general holidays gazetted by the HKSAR Government (GovHK), each
// under the name it is gazetted under — the name is what tells a visitor why
// the weekend schedule is in force. Every Sunday is also a general holiday;
// callers handle Sundays separately.
const named = (tc, sc, en) => ({ tc, sc, en });

export const HOLIDAYS = new Map([
  // 2025
  ['2025-01-01', named('一月一日', '一月一日', 'The first day of January')],
  ['2025-01-29', named('農曆年初一', '农历年初一', "Lunar New Year's Day")],
  ['2025-01-30', named('農曆年初二', '农历年初二', 'The second day of Lunar New Year')],
  ['2025-01-31', named('農曆年初三', '农历年初三', 'The third day of Lunar New Year')],
  ['2025-04-04', named('清明節', '清明节', 'Ching Ming Festival')],
  ['2025-04-18', named('耶穌受難節', '耶稣受难节', 'Good Friday')],
  ['2025-04-19', named('耶穌受難節翌日', '耶稣受难节翌日', 'The day following Good Friday')],
  ['2025-04-21', named('復活節星期一', '复活节星期一', 'Easter Monday')],
  ['2025-05-01', named('勞動節', '劳动节', 'Labour Day')],
  ['2025-05-05', named('佛誕', '佛诞', 'The Birthday of the Buddha')],
  ['2025-05-31', named('端午節', '端午节', 'Tuen Ng Festival')],
  ['2025-07-01', named('香港特別行政區成立紀念日', '香港特别行政区成立纪念日', 'Hong Kong Special Administrative Region Establishment Day')],
  ['2025-10-01', named('國慶日', '国庆日', 'National Day')],
  ['2025-10-07', named('中秋節翌日', '中秋节翌日', 'The day following the Chinese Mid-Autumn Festival')],
  ['2025-10-29', named('重陽節', '重阳节', 'Chung Yeung Festival')],
  ['2025-12-25', named('聖誕節', '圣诞节', 'Christmas Day')],
  ['2025-12-26', named('聖誕節後第一個周日', '圣诞节后第一个周日', 'The first weekday after Christmas Day')],
  // 2026
  ['2026-01-01', named('一月一日', '一月一日', 'The first day of January')],
  ['2026-02-17', named('農曆年初一', '农历年初一', "Lunar New Year's Day")],
  ['2026-02-18', named('農曆年初二', '农历年初二', 'The second day of Lunar New Year')],
  ['2026-02-19', named('農曆年初三', '农历年初三', 'The third day of Lunar New Year')],
  ['2026-04-03', named('耶穌受難節', '耶稣受难节', 'Good Friday')],
  ['2026-04-04', named('耶穌受難節翌日', '耶稣受难节翌日', 'The day following Good Friday')],
  ['2026-04-06', named('清明節翌日', '清明节翌日', 'The day following Ching Ming Festival')],
  ['2026-04-07', named('復活節星期一翌日', '复活节星期一翌日', 'The day following Easter Monday')],
  ['2026-05-01', named('勞動節', '劳动节', 'Labour Day')],
  ['2026-05-25', named('佛誕翌日', '佛诞翌日', 'The day following the Birthday of the Buddha')],
  ['2026-06-19', named('端午節', '端午节', 'Tuen Ng Festival')],
  ['2026-07-01', named('香港特別行政區成立紀念日', '香港特别行政区成立纪念日', 'Hong Kong Special Administrative Region Establishment Day')],
  ['2026-09-26', named('中秋節翌日', '中秋节翌日', 'The day following the Chinese Mid-Autumn Festival')],
  ['2026-10-01', named('國慶日', '国庆日', 'National Day')],
  ['2026-10-19', named('重陽節翌日', '重阳节翌日', 'The day following Chung Yeung Festival')],
  ['2026-12-25', named('聖誕節', '圣诞节', 'Christmas Day')],
  ['2026-12-26', named('聖誕節後第一個周日', '圣诞节后第一个周日', 'The first weekday after Christmas Day')],
  // 2027
  ['2027-01-01', named('一月一日', '一月一日', 'The first day of January')],
  ['2027-02-06', named('農曆年初一', '农历年初一', "Lunar New Year's Day")],
  ['2027-02-08', named('農曆年初三', '农历年初三', 'The third day of Lunar New Year')],
  ['2027-02-09', named('農曆年初四', '农历年初四', 'The fourth day of Lunar New Year')],
  ['2027-03-26', named('耶穌受難節', '耶稣受难节', 'Good Friday')],
  ['2027-03-27', named('耶穌受難節翌日', '耶稣受难节翌日', 'The day following Good Friday')],
  ['2027-03-29', named('復活節星期一', '复活节星期一', 'Easter Monday')],
  ['2027-04-05', named('清明節', '清明节', 'Ching Ming Festival')],
  ['2027-05-01', named('勞動節', '劳动节', 'Labour Day')],
  ['2027-05-13', named('佛誕', '佛诞', 'The Birthday of the Buddha')],
  ['2027-06-09', named('端午節', '端午节', 'Tuen Ng Festival')],
  ['2027-07-01', named('香港特別行政區成立紀念日', '香港特别行政区成立纪念日', 'Hong Kong Special Administrative Region Establishment Day')],
  ['2027-09-16', named('中秋節翌日', '中秋节翌日', 'The day following the Chinese Mid-Autumn Festival')],
  ['2027-10-01', named('國慶日', '国庆日', 'National Day')],
  ['2027-10-08', named('重陽節', '重阳节', 'Chung Yeung Festival')],
  ['2027-12-25', named('聖誕節', '圣诞节', 'Christmas Day')],
  ['2027-12-27', named('聖誕節後第一個周日', '圣诞节后第一个周日', 'The first weekday after Christmas Day')],
]);

export const HOLIDAY_YEARS = [2025, 2026, 2027];

const pad = (n) => String(n).padStart(2, '0');

export const toDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const isPublicHoliday = (d) => HOLIDAYS.has(toDateKey(d));

// What the day is called, or nothing at all if it is an ordinary day.
export const holidayName = (key) => HOLIDAYS.get(key);

export const inHolidayRange = (d) => HOLIDAY_YEARS.includes(d.getFullYear());

// TD applies the weekend schedule on Sundays and public holidays; the weekday
// schedule applies Monday–Saturday excluding public holidays.
export function defaultDayType(d = new Date()) {
  const weekend = d.getDay() === 0 || isPublicHoliday(d);
  return { dayType: weekend ? 'weekend' : 'weekday', dataCurrent: inHolidayRange(d) };
}
