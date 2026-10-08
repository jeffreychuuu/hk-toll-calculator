// js/i18n.js
// All user-facing copy in the three languages the site supports, plus the
// browser-language detection used when the visitor has not chosen yet.

export const LANGS = [
  { id: 'tc', label: '繁體中文', htmlLang: 'zh-Hant' },
  { id: 'sc', label: '简体中文', htmlLang: 'zh-Hans' },
  { id: 'en', label: 'English', htmlLang: 'en' },
];

// Transport Department link paths, prefixed with the language at render time.
export const TD_PATHS = {
  tvt: '/transport_in_hong_kong/tunnels_and_bridges_n/tvt/index.html',
  flat: '/transport_in_hong_kong/tunnels_and_bridges_n/toll_matters/toll_rates_of_road_tunnels_and_lantau_link/index.html',
  taiLam: '/transport_in_hong_kong/tunnels_and_bridges_n/tlt/index.html',
};

export const UI = {
  tc: {
    pageTitle: '香港隧道收費計算器',
    langLabel: '語言',
    chartTitle: '24小時收費時段分佈圖',
    labelTunnel: '選擇隧道',
    labelVehicle: '車輛類別',
    labelDayType: '日期類型',
    labelTime: '過海／通行時間',
    dayWeekday: '星期一至六（非假期）',
    dayWeekend: '星期日及公眾假期',
    timeHour: '小時',
    timeMinute: '分鐘',
    timeSlider: '時間滑桿',
    backToNow: '回到現在時間',
    notice: '公眾假期資料只涵蓋 2025–2027 年，請手動確認日期類型。',
    period: {
      'non-peak': '非繁忙時段',
      normal: '一般時段',
      peak: '繁忙時段',
      transition: '過渡期',
      flat: '全日劃一',
    },
    periodShort: {
      'non-peak': '非繁忙',
      normal: '一般',
      peak: '繁忙',
      transition: '過渡期',
      flat: '全日劃一',
    },
    hint: '下一時段提示：{min}分鐘後（{time}）進入{period}（{change} HK$ {amount}）',
    changeUp: '升至',
    changeDown: '降至',
    changeKeep: '維持',
    footer: {
      source: '資料來源：香港特別行政區政府運輸署 —',
      links: ['分時段收費', '行車隧道嘅收費', '大欖隧道'],
      disclaimer: '資料僅供參考，實際收費以運輸署公布為準。',
    },
  },

  sc: {
    pageTitle: '香港隧道收费计算器',
    langLabel: '语言',
    chartTitle: '24小时收费时段分布图',
    labelTunnel: '选择隧道',
    labelVehicle: '车辆类别',
    labelDayType: '日期类型',
    labelTime: '过海／通行时间',
    dayWeekday: '星期一至六（非假期）',
    dayWeekend: '星期日及公众假期',
    timeHour: '小时',
    timeMinute: '分钟',
    timeSlider: '时间滑块',
    backToNow: '回到现在时间',
    notice: '公众假期资料只涵盖 2025–2027 年，请手动确认日期类型。',
    period: {
      'non-peak': '非繁忙时段',
      normal: '一般时段',
      peak: '繁忙时段',
      transition: '过渡期',
      flat: '全日划一',
    },
    periodShort: {
      'non-peak': '非繁忙',
      normal: '一般',
      peak: '繁忙',
      transition: '过渡期',
      flat: '全日划一',
    },
    hint: '下一时段提示：{min}分钟后（{time}）进入{period}（{change} HK$ {amount}）',
    changeUp: '升至',
    changeDown: '降至',
    changeKeep: '维持',
    footer: {
      source: '资料来源：香港特别行政区政府运输署 —',
      links: ['分时段收费', '行车隧道的收费', '大榄隧道'],
      disclaimer: '资料仅供参考，实际收费以运输署公布为准。',
    },
  },

  en: {
    pageTitle: 'HK Toll Calculator',
    langLabel: 'Language',
    chartTitle: '24-hour toll period chart',
    labelTunnel: 'Tunnel',
    labelVehicle: 'Vehicle class',
    labelDayType: 'Day type',
    labelTime: 'Crossing time',
    dayWeekday: 'Mon–Sat (non-holiday)',
    dayWeekend: 'Sun & public holidays',
    timeHour: 'Hour',
    timeMinute: 'Minute',
    timeSlider: 'Time slider',
    backToNow: 'Back to now',
    notice: 'Public holiday data covers 2025–2027 only — please set the day type manually.',
    period: {
      'non-peak': 'Non-peak',
      normal: 'Normal',
      peak: 'Peak',
      transition: 'Transition',
      flat: 'Flat all day',
    },
    periodShort: {
      'non-peak': 'Non-peak',
      normal: 'Normal',
      peak: 'Peak',
      transition: 'Transition',
      flat: 'Flat',
    },
    hint: 'Next period: {period} in {min} min ({time}) — {change} HK$ {amount}',
    changeUp: 'rises to',
    changeDown: 'drops to',
    changeKeep: 'stays at',
    footer: {
      source: 'Source: Transport Department, HKSAR Government —',
      links: ['Time-varying toll', 'Toll rates of road tunnels', 'Tai Lam Tunnel'],
      disclaimer: 'For reference only; actual tolls follow the Transport Department.',
    },
  },
};

// zh-Hant / zh-HK / zh-TW / zh-MO → traditional; zh-Hans / zh-CN / zh-SG →
// simplified; a bare "zh" defaults to traditional (the home market); anything
// that is not Chinese falls back to English.
export function detectLang(navLang) {
  const raw = String(navLang || '').toLowerCase();
  if (raw.startsWith('zh')) {
    if (raw.includes('hans') || raw.includes('cn') || raw.includes('sg')) return 'sc';
    return 'tc';
  }
  if (raw === '') return 'tc';
  return 'en';
}
