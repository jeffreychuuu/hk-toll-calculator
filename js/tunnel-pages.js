// js/tunnel-pages.js
// The per-tunnel landing pages: content and template in one place. Rendered
// statically by scripts/build-tunnel-pages.mjs and checked byte-for-byte by
// tests/tunnel-pages.test.js — so change a rate and the test fails until the
// pages are regenerated:
//
//   npm run build:pages
//
// Prices never appear as literals in the copy: tokens like {carWeekday} are
// filled from the engine, so a stale number is impossible. The {year} token is
// the one moving part — it makes the freshness test fail each new year until
// the pages are regenerated, the same convention as the holiday data.
import { TUNNELS, vehiclesFor, classIdFor } from './data.js';
import { getDaySegments } from './engine.js';
import { LANGS, UI, TD_PATHS } from './i18n.js';
import { compareGroups } from './regions.js';
import { tollTableBlock, labelsFor, money, spread } from './toll-tables.js';
import { ORIGIN, pagePath, pageUrl, pageFile } from './paths.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const pad = (n) => String(n).padStart(2, '0');
const clock = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

// The TD link a tunnel belongs to, mirroring FOOTER_LINKS in app.js.
const TD_KEY = { tlt: 'taiLam' };
const tdPathFor = (tunnel) => TD_KEY[tunnel.id] ?? (tunnel.pricing === 'tvt' ? 'tvt' : 'flat');

export const COPY = {
  tc: {
    ui: {
      colVehicle: '車種',
      colFare: '收費',
      fareTitle: '各車種收費',
      weekdayRange: '平日 {range}',
      holidayRange: '假日 {range}',
      allDay: '全日劃一 {amount}',
      freeTitle: '免費道路替代',
      freeLead: '同一程仲可以揀呢啲免費道路：',
      roadJoin: '、',
      noFree: '呢條走廊冇免費道路替代路線。',
      siblingsTitle: '同一走廊其他隧道',
      linkJoin: ' · ',
      cta: '去主頁睇實時收費同行程比較',
    },
    tunnels: {
      cht: {
        title: '紅隧收費{year}：私家車、的士、貨車收費表（海底隧道）｜香港隧道實時收費',
        description: '海底隧道（紅隧）收費一覽：私家車平日 {carWeekday}、假日 {carWeekend}；的士 {taxi}、貨車等商用車輛 {other} 全日劃一。附分時段時段表、過渡期逐步收費同過海比較。',
        intro: '紅隧（海底隧道）連接九龍（中）同港島，係全港最繁忙嘅過海隧道。呢頁列出紅隧各車種收費、私家車分時段時段表，同過海嘅替代選擇。',
        faq: [
          { q: '紅隧私家車收費幾多？', a: '平日 {carWeekday}，星期日及公眾假期 {carWeekend}；繁忙時段（{peakWindows}）收最貴一級。' },
          { q: '紅隧的士同商用車輛收費幾多？', a: '的士全日劃一 {taxi}，貨車、小巴、巴士等商用車輛 {other}。' },
          { q: '過海有冇免費替代路線？', a: '冇。過海只有三條隧道——紅隧、東隧同西隧，全部收費；可以喺主頁嘅同程比較度睇邊條最平。' },
        ],
        freeNote: '過海冇免費替代——三條過海隧道以外冇其他過海行車道路。',
      },
      ehc: {
        title: '東隧收費{year}：私家車、的士、貨車收費表（東區海底隧道）｜香港隧道實時收費',
        description: '東區海底隧道（東隧）收費一覽：私家車平日 {carWeekday}、假日 {carWeekend}；的士 {taxi}、貨車等商用車輛 {other} 全日劃一。附分時段時段表同過海比較。',
        intro: '東隧（東區海底隧道）連接九龍（東）同港島，係三條過海隧道之一。呢頁列出東隧各車種收費、私家車分時段時段表，同過海嘅替代選擇。',
        faq: [
          { q: '東隧私家車收費幾多？', a: '平日 {carWeekday}，星期日及公眾假期 {carWeekend}；繁忙時段（{peakWindows}）收最貴一級。' },
          { q: '東隧的士同商用車輛收費幾多？', a: '的士全日劃一 {taxi}，貨車、小巴、巴士等商用車輛 {other}。' },
          { q: '過海有冇免費替代路線？', a: '冇。過海只有三條隧道——紅隧、東隧同西隧，全部收費；可以喺主頁嘅同程比較度睇邊條最平。' },
        ],
        freeNote: '過海冇免費替代——三條過海隧道以外冇其他過海行車道路。',
      },
      whc: {
        title: '西隧收費{year}：私家車、的士、貨車收費表（西區海底隧道）｜香港隧道實時收費',
        description: '西區海底隧道（西隧）收費一覽：私家車平日 {carWeekday}、假日 {carWeekend}；的士 {taxi}、貨車等商用車輛 {other} 全日劃一。附分時段時段表同過海比較。',
        intro: '西隧（西區海底隧道）連接九龍（西）同港島，同樣採用分時段收費。呢頁列出西隧各車種收費、私家車分時段時段表，同過海嘅替代選擇。',
        faq: [
          { q: '西隧私家車收費幾多？', a: '平日 {carWeekday}，星期日及公眾假期 {carWeekend}；繁忙時段（{peakWindows}）收最貴一級。' },
          { q: '西隧的士同商用車輛收費幾多？', a: '的士全日劃一 {taxi}，貨車、小巴、巴士等商用車輛 {other}。' },
          { q: '過海有冇免費替代路線？', a: '冇。過海只有三條隧道——紅隧、東隧同西隧，全部收費；可以喺主頁嘅同程比較度睇邊條最平。' },
        ],
        freeNote: '過海冇免費替代——三條過海隧道以外冇其他過海行車道路。',
      },
      tlt: {
        title: '大欖隧道收費{year}：私家車、的士、貨車收費表｜香港隧道實時收費',
        description: '大欖隧道收費一覽：私家車平日 {carWeekday}、假日 {carWeekend}；的士 {taxi}、貨車等商用車輛 {other} 全日劃一。附分時段時段表同屯門公路等免費替代比較。',
        intro: '大欖隧道接駁九龍同新界西，係三號幹線嘅一部分，採用分時段收費。呢頁列出大欖隧道各車種收費、分時段時段表，同免費道路替代。',
        faq: [
          { q: '大欖隧道私家車收費幾多？', a: '平日 {carWeekday}，假日 {carWeekend}，同樣分繁忙、一般同非繁忙時段。' },
          { q: '大欖隧道的士同商用車輛收費幾多？', a: '的士全日劃一 {taxi}，貨車、小巴、巴士等商用車輛 {other}。' },
          { q: '去新界西有咩免費替代？', a: '有：{roads}，全日免費；價錢同實時行車時間可以喺主頁比較。' },
        ],
      },
      abt: {
        title: '香港仔隧道收費{year}：全日劃一收費同車種一覽｜香港隧道實時收費',
        description: '香港仔隧道全日劃一收費：私家車 {carWeekday}、電單車 {motoWeekday}。附全部車種收費表同實時行車時間。',
        intro: '香港仔隧道連接港島南區同灣仔一帶，全日劃一收費——幾點出入都係同一個價。呢頁列出香港仔隧道各車種收費同劃一收費表。',
        faq: [
          { q: '香港仔隧道私家車收費幾多？', a: '全日劃一 {carWeekday}，任何時間出入都係一樣價錢。' },
          { q: '香港仔隧道電單車收費幾多？', a: '電單車全日劃一 {motoWeekday}。' },
          { q: '港島南區有冇免費替代路線？', a: '呢條走廊冇列出免費替代——香港仔隧道係往返港島南區嘅主要行車隧道。' },
        ],
        freeNote: '港島市內呢條走廊冇列出免費替代路線。',
      },
      smt: {
        title: '城門隧道收費{year}：車種收費表同免費替代｜香港隧道實時收費',
        description: '城門隧道全日劃一收費：私家車 {carWeekday}、電單車 {motoWeekday}。附車種收費表，同沙田來往荃灣嘅免費道路比較。',
        intro: '城門隧道連接沙田同荃灣，係新界東來往新界西嘅主要行車隧道，全日劃一收費。呢頁列出城門隧道各車種收費、劃一收費表，同免費道路替代。',
        faq: [
          { q: '城門隧道私家車收費幾多？', a: '全日劃一 {carWeekday}。' },
          { q: '城門隧道貨車同巴士收費幾多？', a: '全部車種都係同一個劃一價 {carWeekday}——貨車、小巴、巴士同私家車一樣。' },
          { q: '沙田來往荃灣有咩免費道路？', a: '有：{roads}，全日免費，可以喺主頁同城門隧道一齊比較。' },
        ],
      },
      lrt: {
        title: '獅子山隧道收費{year}：車種收費表同免費替代（大埔道）｜香港隧道實時收費',
        description: '獅子山隧道全日劃一收費：私家車 {carWeekday}、電單車 {motoWeekday}。附車種收費表，同大埔道等免費道路嘅價錢同時間比較。',
        intro: '獅子山隧道連接九龍同沙田，全日劃一收費，係大埔道以外來往兩地嘅主要選擇。呢頁列出獅子山隧道各車種收費、劃一收費表，同免費道路替代。',
        faq: [
          { q: '獅子山隧道私家車收費幾多？', a: '全日劃一 {carWeekday}。' },
          { q: '獅子山隧道電單車收費幾多？', a: '電單車全日劃一 {motoWeekday}。' },
          { q: '九龍往沙田有咩免費替代？', a: '有：{roads}，全日免費，可以喺主頁同獅子山隧道一齊比較。' },
        ],
      },
      stg: {
        title: '沙田嶺、尖山、大圍隧道收費{year}：車種收費表｜香港隧道實時收費',
        description: '沙田嶺、尖山、大圍隧道同一組收費：私家車全日劃一 {carWeekday}、電單車 {motoWeekday}。附車種收費表同免費道路比較。',
        intro: '沙田嶺、尖山同大圍隧道屬於同一組收費，連接九龍同沙田，全日劃一。呢頁列出三條隧道嘅各車種收費同劃一收費表。',
        faq: [
          { q: '沙田嶺、尖山、大圍隧道收費幾多？', a: '三條隧道同一組收費：私家車全日劃一 {carWeekday}。' },
          { q: '電單車收費幾多？', a: '電單車全日劃一 {motoWeekday}。' },
          { q: '有冇免費替代？', a: '有：{roads}，全日免費。' },
        ],
      },
      tct: {
        title: '大老山隧道收費{year}：十個車種收費表｜香港隧道實時收費',
        description: '大老山隧道按車種分十類收費，私家車全日劃一 {carWeekday}、電單車 {motoWeekday}。附十個車種完整收費表同免費替代。',
        intro: '大老山隧道連接九龍（東）同沙田，按車種分十類收費，全日劃一。呢頁列出大老山隧道全部十個車種嘅收費表，同免費道路替代。',
        faq: [
          { q: '大老山隧道私家車收費幾多？', a: '全日劃一 {carWeekday}，按車種分十類。' },
          { q: '大老山隧道貨車、巴士收費幾多？', a: '一共有十個車種，貨車、小巴、巴士各有收費——下面嘅收費表列晒。' },
          { q: '有冇免費替代？', a: '有：{roads}，全日免費。' },
        ],
      },
    },
  },

  sc: {
    ui: {
      colVehicle: '车种',
      colFare: '收费',
      fareTitle: '各车种收费',
      weekdayRange: '平日 {range}',
      holidayRange: '假日 {range}',
      allDay: '全日划一 {amount}',
      freeTitle: '免费道路替代',
      freeLead: '同一程还可以选这些免费道路：',
      roadJoin: '、',
      noFree: '这条走廊没有免费道路替代路线。',
      siblingsTitle: '同一走廊其他隧道',
      linkJoin: ' · ',
      cta: '去主页看实时收费和行程比较',
    },
    tunnels: {
      cht: {
        title: '红隧收费{year}：私家车、的士、货车收费表（海底隧道）｜香港隧道实时收费',
        description: '海底隧道（红隧）收费一览：私家车平日 {carWeekday}、假日 {carWeekend}；的士 {taxi}、货车等商用车辆 {other} 全日划一。附分时段时段表、过渡期逐步收费和过海比较。',
        intro: '红隧（海底隧道）连接九龙（中）和港岛，是全港最繁忙的过海隧道。这一页列出红隧各车种收费、私家车分时段时段表，和过海的替代选择。',
        faq: [
          { q: '红隧私家车收费多少？', a: '平日 {carWeekday}，星期日及公众假期 {carWeekend}；繁忙时段（{peakWindows}）收最贵一级。' },
          { q: '红隧的士和商用车辆收费多少？', a: '的士全日划一 {taxi}，货车、小巴、巴士等商用车辆 {other}。' },
          { q: '过海有没有免费替代路线？', a: '没有。过海只有三条隧道——红隧、东隧和西隧，全部收费；可以在主页的同程比较里看哪条最平。' },
        ],
        freeNote: '过海没有免费替代——三条过海隧道以外没有其他过海行车道。',
      },
      ehc: {
        title: '东隧收费{year}：私家车、的士、货车收费表（东区海底隧道）｜香港隧道实时收费',
        description: '东区海底隧道（东隧）收费一览：私家车平日 {carWeekday}、假日 {carWeekend}；的士 {taxi}、货车等商用车辆 {other} 全日划一。附分时段时段表和过海比较。',
        intro: '东隧（东区海底隧道）连接九龙（东）和港岛，是三条过海隧道之一。这一页列出东隧各车种收费、私家车分时段时段表，和过海的替代选择。',
        faq: [
          { q: '东隧私家车收费多少？', a: '平日 {carWeekday}，星期日及公众假期 {carWeekend}；繁忙时段（{peakWindows}）收最贵一级。' },
          { q: '东隧的士和商用车辆收费多少？', a: '的士全日划一 {taxi}，货车、小巴、巴士等商用车辆 {other}。' },
          { q: '过海有没有免费替代路线？', a: '没有。过海只有三条隧道——红隧、东隧和西隧，全部收费；可以在主页的同程比较里看哪条最平。' },
        ],
        freeNote: '过海没有免费替代——三条过海隧道以外没有其他过海行车道。',
      },
      whc: {
        title: '西隧收费{year}：私家车、的士、货车收费表（西区海底隧道）｜香港隧道实时收费',
        description: '西区海底隧道（西隧）收费一览：私家车平日 {carWeekday}、假日 {carWeekend}；的士 {taxi}、货车等商用车辆 {other} 全日划一。附分时段时段表和过海比较。',
        intro: '西隧（西区海底隧道）连接九龙（西）和港岛，同样采用分时段收费。这一页列出西隧各车种收费、私家车分时段时段表，和过海的替代选择。',
        faq: [
          { q: '西隧私家车收费多少？', a: '平日 {carWeekday}，星期日及公众假期 {carWeekend}；繁忙时段（{peakWindows}）收最贵一级。' },
          { q: '西隧的士和商用车辆收费多少？', a: '的士全日划一 {taxi}，货车、小巴、巴士等商用车辆 {other}。' },
          { q: '过海有没有免费替代路线？', a: '没有。过海只有三条隧道——红隧、东隧和西隧，全部收费；可以在主页的同程比较里看哪条最平。' },
        ],
        freeNote: '过海没有免费替代——三条过海隧道以外没有其他过海行车道。',
      },
      tlt: {
        title: '大榄隧道收费{year}：私家车、的士、货车收费表｜香港隧道实时收费',
        description: '大榄隧道收费一览：私家车平日 {carWeekday}、假日 {carWeekend}；的士 {taxi}、货车等商用车辆 {other} 全日划一。附分时段时段表和屯门公路等免费替代比较。',
        intro: '大榄隧道接驳九龙和新界西，是三号干线的一部分，采用分时段收费。这一页列出大榄隧道各车种收费、分时段时段表，和免费道路替代。',
        faq: [
          { q: '大榄隧道私家车收费多少？', a: '平日 {carWeekday}，假日 {carWeekend}，同样分繁忙、一般和非繁忙时段。' },
          { q: '大榄隧道的士和商用车辆收费多少？', a: '的士全日划一 {taxi}，货车、小巴、巴士等商用车辆 {other}。' },
          { q: '去新界西有什么免费替代？', a: '有：{roads}，全日免费；价钱和实时行车时间可以在主页比较。' },
        ],
      },
      abt: {
        title: '香港仔隧道收费{year}：全日划一收费和车种一览｜香港隧道实时收费',
        description: '香港仔隧道全日划一收费：私家车 {carWeekday}、电单车 {motoWeekday}。附全部车种收费表和实时行车时间。',
        intro: '香港仔隧道连接港岛南区和湾仔一带，全日划一收费——几点进出都是同一个价钱。这一页列出香港仔隧道各车种收费和划一收费表。',
        faq: [
          { q: '香港仔隧道私家车收费多少？', a: '全日划一 {carWeekday}，任何时间进出都是一样价钱。' },
          { q: '香港仔隧道电单车收费多少？', a: '电单车全日划一 {motoWeekday}。' },
          { q: '港岛南区有没有免费替代路线？', a: '这条走廊没有列出免费替代——香港仔隧道是往返港岛南区的主要行车隧道。' },
        ],
        freeNote: '港岛市内这条走廊没有列出免费替代路线。',
      },
      smt: {
        title: '城门隧道收费{year}：车种收费表和免费替代｜香港隧道实时收费',
        description: '城门隧道全日划一收费：私家车 {carWeekday}、电单车 {motoWeekday}。附车种收费表，和沙田来往荃湾的免费道路比较。',
        intro: '城门隧道连接沙田和荃湾，是新界东来往新界西的主要行车隧道，全日划一收费。这一页列出城门隧道各车种收费、划一收费表，和免费道路替代。',
        faq: [
          { q: '城门隧道私家车收费多少？', a: '全日划一 {carWeekday}。' },
          { q: '城门隧道货车和巴士收费多少？', a: '全部车种都是同一个划一价 {carWeekday}——货车、小巴、巴士和私家车一样。' },
          { q: '沙田来往荃湾有什么免费道路？', a: '有：{roads}，全日免费，可以在主页和城门隧道一起比较。' },
        ],
      },
      lrt: {
        title: '狮子山隧道收费{year}：车种收费表和免费替代（大埔道）｜香港隧道实时收费',
        description: '狮子山隧道全日划一收费：私家车 {carWeekday}、电单车 {motoWeekday}。附车种收费表，和大埔道等免费道路的价钱和时间比较。',
        intro: '狮子山隧道连接九龙和沙田，全日划一收费，是大埔道以外来往两地的主要选择。这一页列出狮子山隧道各车种收费、划一收费表，和免费道路替代。',
        faq: [
          { q: '狮子山隧道私家车收费多少？', a: '全日划一 {carWeekday}。' },
          { q: '狮子山隧道电单车收费多少？', a: '电单车全日划一 {motoWeekday}。' },
          { q: '九龙往沙田有什么免费替代？', a: '有：{roads}，全日免费，可以在主页和狮子山隧道一起比较。' },
        ],
      },
      stg: {
        title: '沙田岭、尖山、大围隧道收费{year}：车种收费表｜香港隧道实时收费',
        description: '沙田岭、尖山、大围隧道同一组收费：私家车全日划一 {carWeekday}、电单车 {motoWeekday}。附车种收费表和免费道路比较。',
        intro: '沙田岭、尖山和大围隧道属于同一组收费，连接九龙和沙田，全日划一。这一页列出三条隧道的各车种收费和划一收费表。',
        faq: [
          { q: '沙田岭、尖山、大围隧道收费多少？', a: '三条隧道同一组收费：私家车全日划一 {carWeekday}。' },
          { q: '电单车收费多少？', a: '电单车全日划一 {motoWeekday}。' },
          { q: '有没有免费替代？', a: '有：{roads}，全日免费。' },
        ],
      },
      tct: {
        title: '大老山隧道收费{year}：十个车种收费表｜香港隧道实时收费',
        description: '大老山隧道按车种分十类收费，私家车全日划一 {carWeekday}、电单车 {motoWeekday}。附十个车种完整收费表和免费替代。',
        intro: '大老山隧道连接九龙（东）和沙田，按车种分十类收费，全日划一。这一页列出大老山隧道全部十个车种的收费表，和免费道路替代。',
        faq: [
          { q: '大老山隧道私家车收费多少？', a: '全日划一 {carWeekday}，按车种分十类。' },
          { q: '大老山隧道货车、巴士收费多少？', a: '一共有十个车种，货车、小巴、巴士各有收费——下面的收费表列全。' },
          { q: '有没有免费替代？', a: '有：{roads}，全日免费。' },
        ],
      },
    },
  },

  en: {
    ui: {
      colVehicle: 'Vehicle class',
      colFare: 'Fare',
      fareTitle: 'Fares by vehicle class',
      weekdayRange: 'Weekday {range}',
      holidayRange: 'Sundays and public holidays {range}',
      allDay: 'One rate all day, {amount}',
      freeTitle: 'Free road alternatives',
      freeLead: 'The same trip can also take these free roads:',
      roadJoin: ', ',
      noFree: 'This corridor has no free road alternative.',
      siblingsTitle: 'Other tunnels on this corridor',
      linkJoin: ' · ',
      cta: 'See live tolls and the trip comparison on the main page',
    },
    tunnels: {
      cht: {
        title: 'Cross-Harbour Tunnel (Hung Hom) toll {year} — fares by vehicle class | HK Tunnel Tolls (Live)',
        description: 'Cross-Harbour Tunnel (Hung Hom) tolls: private car {carWeekday} on weekdays, {carWeekend} on Sundays and public holidays; taxi {taxi}, commercial vehicles {other}, flat all day. With the time-of-day table and harbour-crossing comparison.',
        intro: 'The Cross-Harbour Tunnel (Hung Hom) links central Kowloon to Hong Kong Island and is the busiest harbour crossing. This page lists the toll for every vehicle class, the private car’s time-of-day table, and the alternatives across the harbour.',
        faq: [
          { q: 'How much is the Cross-Harbour Tunnel for a private car?', a: '{carWeekday} on weekdays and {carWeekend} on Sundays and public holidays; the peak windows ({peakWindows}) cost the most.' },
          { q: 'What do taxis and commercial vehicles pay at the Cross-Harbour Tunnel?', a: 'A taxi pays a flat {taxi}; goods vehicles, minibuses and buses pay {other}, all day.' },
          { q: 'Is there a free way across the harbour?', a: 'No. The three harbour crossings — Cross-Harbour, Eastern and Western — are all tolled; the main page’s comparison shows which is cheapest right now.' },
        ],
        freeNote: 'No free alternative crosses the harbour — the three harbour tunnels are the only road crossings.',
      },
      ehc: {
        title: 'Eastern Harbour Crossing toll {year} — fares by vehicle class | HK Tunnel Tolls (Live)',
        description: 'Eastern Harbour Crossing tolls: private car {carWeekday} on weekdays, {carWeekend} on Sundays and public holidays; taxi {taxi}, commercial vehicles {other}, flat all day. With the time-of-day table and harbour-crossing comparison.',
        intro: 'The Eastern Harbour Crossing links east Kowloon to Hong Kong Island and is one of the three harbour crossings. This page lists the toll for every vehicle class, the private car’s time-of-day table, and the alternatives across the harbour.',
        faq: [
          { q: 'How much is the Eastern Harbour Crossing for a private car?', a: '{carWeekday} on weekdays and {carWeekend} on Sundays and public holidays; the peak windows ({peakWindows}) cost the most.' },
          { q: 'What do taxis and commercial vehicles pay at the Eastern Harbour Crossing?', a: 'A taxi pays a flat {taxi}; goods vehicles, minibuses and buses pay {other}, all day.' },
          { q: 'Is there a free way across the harbour?', a: 'No. The three harbour crossings — Cross-Harbour, Eastern and Western — are all tolled; the main page’s comparison shows which is cheapest right now.' },
        ],
        freeNote: 'No free alternative crosses the harbour — the three harbour tunnels are the only road crossings.',
      },
      whc: {
        title: 'Western Harbour Crossing toll {year} — fares by vehicle class | HK Tunnel Tolls (Live)',
        description: 'Western Harbour Crossing tolls: private car {carWeekday} on weekdays, {carWeekend} on Sundays and public holidays; taxi {taxi}, commercial vehicles {other}, flat all day. With the time-of-day table and harbour-crossing comparison.',
        intro: 'The Western Harbour Crossing links west Kowloon to Hong Kong Island and charges by time of day. This page lists the toll for every vehicle class, the private car’s time-of-day table, and the alternatives across the harbour.',
        faq: [
          { q: 'How much is the Western Harbour Crossing for a private car?', a: '{carWeekday} on weekdays and {carWeekend} on Sundays and public holidays; the peak windows ({peakWindows}) cost the most.' },
          { q: 'What do taxis and commercial vehicles pay at the Western Harbour Crossing?', a: 'A taxi pays a flat {taxi}; goods vehicles, minibuses and buses pay {other}, all day.' },
          { q: 'Is there a free way across the harbour?', a: 'No. The three harbour crossings — Cross-Harbour, Eastern and Western — are all tolled; the main page’s comparison shows which is cheapest right now.' },
        ],
        freeNote: 'No free alternative crosses the harbour — the three harbour tunnels are the only road crossings.',
      },
      tlt: {
        title: 'Tai Lam Tunnel toll {year} — fares by vehicle class | HK Tunnel Tolls (Live)',
        description: 'Tai Lam Tunnel tolls: private car {carWeekday} on weekdays, {carWeekend} on Sundays and public holidays; taxi {taxi}, commercial vehicles {other}, flat all day. With the time-of-day table and free-road comparison.',
        intro: 'The Tai Lam Tunnel carries Route 3 between Kowloon and west New Territories and charges by time of day. This page lists the toll for every vehicle class, the time-of-day table, and the free road alternatives.',
        faq: [
          { q: 'How much is the Tai Lam Tunnel for a private car?', a: '{carWeekday} on weekdays and {carWeekend} on Sundays and public holidays, split into peak, normal and non-peak periods.' },
          { q: 'What do taxis and commercial vehicles pay at the Tai Lam Tunnel?', a: 'A taxi pays a flat {taxi}; goods vehicles, minibuses and buses pay {other}, all day.' },
          { q: 'Are there free alternatives towards the west New Territories?', a: 'Yes: {roads}, free all day; the main page compares the fares and live journey times.' },
        ],
      },
      abt: {
        title: 'Aberdeen Tunnel toll {year} — one flat fare all day | HK Tunnel Tolls (Live)',
        description: 'Aberdeen Tunnel charges one flat fare all day: private car {carWeekday}, motorcycle {motoWeekday}. With the full table of vehicle classes and live journey times.',
        intro: 'The Aberdeen Tunnel links Hong Kong Island’s Southern District with the Wan Chai area and charges one flat fare all day — the same price whenever you drive. This page lists the toll for every vehicle class.',
        faq: [
          { q: 'How much is the Aberdeen Tunnel for a private car?', a: 'A flat {carWeekday} all day, whatever time you drive.' },
          { q: 'How much is the Aberdeen Tunnel for a motorcycle?', a: 'A flat {motoWeekday} all day.' },
          { q: 'Is there a free alternative to the Aberdeen Tunnel?', a: 'No free alternative is listed for this corridor — the Aberdeen Tunnel is the main road tunnel into the Southern District.' },
        ],
        freeNote: 'No free alternative is listed within Hong Kong Island for this corridor.',
      },
      smt: {
        title: 'Shing Mun Tunnel toll {year} — flat fare and the free alternative | HK Tunnel Tolls (Live)',
        description: 'Shing Mun Tunnel charges one flat fare all day: private car {carWeekday}, motorcycle {motoWeekday}. With the table of vehicle classes and the free-road comparison between Sha Tin and Tsuen Wan.',
        intro: 'The Shing Mun Tunnel links Sha Tin to Tsuen Wan, the main road tunnel between the east and west New Territories, charging one flat fare all day. This page lists the toll for every vehicle class and the free road alternatives.',
        faq: [
          { q: 'How much is the Shing Mun Tunnel for a private car?', a: 'A flat {carWeekday} all day.' },
          { q: 'How much do goods vehicles and buses pay at the Shing Mun Tunnel?', a: 'Every class pays the same flat {carWeekday} — goods vehicles, minibuses and buses alike.' },
          { q: 'Are there free roads between Sha Tin and Tsuen Wan?', a: 'Yes: {roads}, free all day; the main page compares them with the tunnel.' },
        ],
      },
      lrt: {
        title: 'Lion Rock Tunnel toll {year} — flat fare and the Tai Po Road alternative | HK Tunnel Tolls (Live)',
        description: 'Lion Rock Tunnel charges one flat fare all day: private car {carWeekday}, motorcycle {motoWeekday}. With the table of vehicle classes and the free-road comparison into Sha Tin.',
        intro: 'The Lion Rock Tunnel links Kowloon to Sha Tin, charging one flat fare all day, as the main alternative to Tai Po Road. This page lists the toll for every vehicle class and the free road alternatives.',
        faq: [
          { q: 'How much is the Lion Rock Tunnel for a private car?', a: 'A flat {carWeekday} all day.' },
          { q: 'How much is the Lion Rock Tunnel for a motorcycle?', a: 'A flat {motoWeekday} all day.' },
          { q: 'Are there free alternatives from Kowloon to Sha Tin?', a: 'Yes: {roads}, free all day; the main page compares them with the tunnel.' },
        ],
      },
      stg: {
        title: 'Sha Tin Heights, Eagle’s Nest and Tai Wai tunnel toll {year} | HK Tunnel Tolls (Live)',
        description: 'Sha Tin Heights, Eagle’s Nest and Tai Wai charge as one group: private car {carWeekday}, motorcycle {motoWeekday}, flat all day. With the table of vehicle classes and free-road comparison.',
        intro: 'Sha Tin Heights, Eagle’s Nest and Tai Wai form one toll group linking Kowloon to Sha Tin, charging a flat fare all day. This page lists the toll for every vehicle class.',
        faq: [
          { q: 'How much do the Sha Tin Heights, Eagle’s Nest and Tai Wai tunnels cost?', a: 'They charge as one group: a flat {carWeekday} for a private car, all day.' },
          { q: 'How much is the motorcycle toll?', a: 'A flat {motoWeekday} all day.' },
          { q: 'Are there free alternatives?', a: 'Yes: {roads}, free all day.' },
        ],
      },
      tct: {
        title: 'Tate’s Cairn Tunnel toll {year} — all ten vehicle classes | HK Tunnel Tolls (Live)',
        description: 'Tate’s Cairn Tunnel charges one flat fare per vehicle class — ten classes in all: private car {carWeekday}, motorcycle {motoWeekday}. With the complete table and free alternatives.',
        intro: 'The Tate’s Cairn Tunnel links east Kowloon to Sha Tin with ten priced vehicle classes, flat all day. This page lists the toll for all ten classes and the free road alternatives.',
        faq: [
          { q: 'How much is the Tate’s Cairn Tunnel for a private car?', a: 'A flat {carWeekday} all day, one of ten priced classes.' },
          { q: 'What do goods vehicles and buses pay at the Tate’s Cairn Tunnel?', a: 'Ten classes are priced, from light goods vehicles up to double-deckers — the table below lists them all.' },
          { q: 'Are there free alternatives?', a: 'Yes: {roads}, free all day.' },
        ],
      },
    },
  },
};

// ---- token fill ----------------------------------------------------------

const CATEGORY_OF_ROADS = () => {
  const byTunnel = new Map();
  for (const group of compareGroups()) {
    for (const id of group.tunnels) byTunnel.set(id, group.roads);
  }
  return byTunnel;
};

const fill = (text, tokens, where) => text.replace(/\{([a-z][a-zA-Z]*)\}/g, (_, key) => {
  if (!(key in tokens)) throw new Error(`unknown token {${key}} in ${where}`);
  return tokens[key];
});

const classIdForVehicle = (tunnelId, vehicle) =>
  // Tate's Cairn names its classes directly (pc, mc, …); every other tunnel's
  // vehicle list is in canonical terms.
  (tunnelId === 'tct' ? vehicle.id : classIdFor(tunnelId, vehicle.id));

const tokensFor = (lang, tunnel) => {
  const id = tunnel.id;
  const copy = COPY[lang];
  const segmentRange = (vehicleId, dayType) =>
    spread(getDaySegments({ tunnelId: id, vehicleId, dayType }));
  const single = (canonical) => {
    const segs = getDaySegments({ tunnelId: id, vehicleId: classIdFor(id, canonical), dayType: 'weekday' });
    return money(segs[0].firstAmount);
  };
  const peaks = getDaySegments({ tunnelId: id, vehicleId: classIdFor(id, 'car'), dayType: 'weekday' })
    .filter((seg) => seg.periodType === 'peak')
    .map((seg) => `${clock(seg.startMin)}–${clock(seg.endMin)}`)
    .join(lang === 'en' ? ', ' : '、');
  const roads = (CATEGORY_OF_ROADS().get(id) ?? []).map((road) => road.name[lang]).join(copy.ui.roadJoin);
  return {
    year: String(new Date().getFullYear()),
    carWeekday: segmentRange(classIdFor(id, 'car'), 'weekday'),
    carWeekend: segmentRange(classIdFor(id, 'car'), 'weekend'),
    motoWeekday: segmentRange(classIdFor(id, 'moto'), 'weekday'),
    motoWeekend: segmentRange(classIdFor(id, 'moto'), 'weekend'),
    taxi: single('taxi'),
    other: single('other'),
    peakWindows: peaks,
    roads,
  };
};

// ---- page sections -------------------------------------------------------

const vehicleTable = (lang, tunnel) => {
  const copy = COPY[lang];
  const ui = copy.ui;
  const rows = vehiclesFor(tunnel.id).map((vehicle) => {
    const vehicleId = classIdForVehicle(tunnel.id, vehicle);
    const weekday = getDaySegments({ tunnelId: tunnel.id, vehicleId, dayType: 'weekday' });
    const weekend = getDaySegments({ tunnelId: tunnel.id, vehicleId, dayType: 'weekend' });
    const flat = [...weekday, ...weekend].every((seg) => seg.periodType === 'flat');
    const fare = flat
      ? ui.allDay.replace('{amount}', money(weekday[0].firstAmount))
      : `${ui.weekdayRange.replace('{range}', spread(weekday))}`
        + ` · ${ui.holidayRange.replace('{range}', spread(weekend))}`;
    return `        <tr><td>${esc(vehicle.name[lang])}</td><td>${esc(fare)}</td></tr>`;
  }).join('\n');
  return `    <h2>${esc(ui.fareTitle)}</h2>\n`
    + `    <table>\n      <thead><tr><th>${esc(ui.colVehicle)}</th><th>${esc(ui.colFare)}</th></tr></thead>\n`
    + `      <tbody>\n${rows}\n      </tbody>\n    </table>`;
};

const freeSection = (lang, tunnel) => {
  const copy = COPY[lang];
  const tunnelCopy = copy.tunnels[tunnel.id];
  const roads = CATEGORY_OF_ROADS().get(tunnel.id) ?? [];
  const body = roads.length
    ? `${esc(copy.ui.freeLead)}${roads.map((road) => esc(road.name[lang])).join(copy.ui.roadJoin)}`
    : esc(tunnelCopy.freeNote ?? copy.ui.noFree);
  return `    <h2>${esc(copy.ui.freeTitle)}</h2>\n    <p>${body}</p>`;
};

const siblingsSection = (lang, tunnel) => {
  const copy = COPY[lang];
  const group = compareGroups().find((g) => g.tunnels.includes(tunnel.id));
  const links = group.tunnels.filter((id) => id !== tunnel.id).map((id) => {
    const sibling = TUNNELS.find((t) => t.id === id);
    const name = UI[lang].reference.titles[id] ?? sibling.name[lang];
    return `<a href="${pagePath(lang, id)}">${esc(name)}</a>`;
  }).join(copy.ui.linkJoin);
  return `    <h2>${esc(copy.ui.siblingsTitle)}</h2>\n    <p class="alt-links">${links}</p>`;
};

const footerBlock = (lang, tunnel) => {
  const copy = UI[lang];
  const key = tdPathFor(tunnel);
  const index = ['tvt', 'flat', 'taiLam'].indexOf(key);
  const url = `https://www.td.gov.hk/${lang}${TD_PATHS[key]}`;
  return `    <footer class="site-footer">\n`
    + `      <p>${esc(copy.footer.source)} <a href="${url}" rel="noopener" target="_blank">${esc(copy.footer.links[index])}</a>。${esc(copy.footer.disclaimer)}</p>\n`
    + `      <p class="credit">Made by Jeffrey Chu (99% Agentic AI, 1% 🐈 Supervision &amp; 🥃)</p>\n`
    + `    </footer>`;
};

const jsonLd = (lang, tunnel, tunnelCopy) => {
  const copy = UI[lang];
  const heading = copy.reference.titles[tunnel.id] ?? tunnel.name[lang];
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: copy.siteName, item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: heading, item: pageUrl(lang, tunnel.id) },
    ],
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: tunnelCopy.faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  return [breadcrumb, faq]
    .map((data) => `  <script type="application/ld+json">\n${JSON.stringify(data, null, 2).replace(/</g, '\\u003c')}\n  </script>`)
    .join('\n');
};

// ---- the page ------------------------------------------------------------

export function tunnelPage(lang, tunnelId) {
  const tunnel = TUNNELS.find((t) => t.id === tunnelId);
  if (!tunnel) throw new Error(`unknown tunnel: ${tunnelId}`);
  const meta = LANGS.find((l) => l.id === lang);
  if (!meta) throw new Error(`unknown language: ${lang}`);
  const copy = COPY[lang];
  const tunnelCopy = copy.tunnels[tunnelId];
  const tokens = tokensFor(lang, tunnel);
  const where = `${lang}/${tunnelId}`;
  const filled = (text) => fill(text, tokens, where);
  const title = filled(tunnelCopy.title);
  const description = filled(tunnelCopy.description);
  const intro = filled(tunnelCopy.intro);
  const faq = tunnelCopy.faq.map(({ q, a }) => ({ q: filled(q), a: filled(a) }));
  const heading = UI[lang].reference.titles[tunnel.id] ?? tunnel.name[lang];
  const ogLocale = { tc: 'zh_HK', sc: 'zh_CN', en: 'en_US' }[lang];
  const langLinks = LANGS.map((l) => {
    const current = l.id === lang ? ' aria-current="page"' : '';
    return `        <a href="${pagePath(l.id, tunnel.id)}" hreflang="${l.htmlLang}"${current}>${l.label}</a>`;
  }).join('\n');
  const faqVisible = faq.map(({ q, a }) => `        <dt>${esc(q)}</dt>\n        <dd>${esc(a)}</dd>`).join('\n');
  const periodTable = tollTableBlock(tunnel.id, { ...labelsFor(lang), heading: 'h3', hrefs: undefined });
  const ld = jsonLd(lang, tunnel, { faq });

  return `<!DOCTYPE html>
<html lang="${meta.htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${pageUrl(lang, tunnel.id)}">
  <link rel="alternate" hreflang="zh-Hant" href="${pageUrl('tc', tunnel.id)}">
  <link rel="alternate" hreflang="zh-Hans" href="${pageUrl('sc', tunnel.id)}">
  <link rel="alternate" hreflang="en" href="${pageUrl('en', tunnel.id)}">
  <link rel="alternate" hreflang="x-default" href="${pageUrl('tc', tunnel.id)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#22a06b">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(UI[lang].siteName)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${pageUrl(lang, tunnel.id)}">
  <meta property="og:image" content="${ORIGIN}/og-image.png">
  <meta property="og:image:alt" content="${esc(title)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="${ogLocale}">
  <meta name="twitter:card" content="summary_large_image">

${ld}

  <script>
    // A stored theme applies before first paint, so a dark-mode visitor never
    // sees a light flash. With no stored choice the attribute stays off and
    // the stylesheet follows the system via prefers-color-scheme.
    try {
      var stored = localStorage.getItem('hk-toll-calculator.theme');
      if (stored === 'dark' || stored === 'light') document.documentElement.dataset.theme = stored;
    } catch (e) { /* storage disabled — follow the system */ }
  </script>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <main class="page-wrap">
    <header class="topbar">
      <p class="site-name"><a href="/">${esc(UI[lang].siteName)}</a></p>
      <nav class="lang-links" aria-label="${esc(UI[lang].langLabel)}">
${langLinks}
      </nav>
    </header>

    <article class="card ref-page">
      <h1>${esc(heading)}</h1>
      <p>${esc(intro)}</p>

${vehicleTable(lang, tunnel)}

      <h2>${esc(UI[lang].reference.tablesTitle)}</h2>
${periodTable}

${freeSection(lang, tunnel)}

      <h2>${esc(UI[lang].reference.faqTitle)}</h2>
      <dl class="faq">
${faqVisible}
      </dl>

${siblingsSection(lang, tunnel)}

      <p class="cta"><a href="/">${esc(copy.ui.cta)}</a></p>
    </article>

${footerBlock(lang, tunnel)}
  </main>
</body>
</html>
`;
}

export const allTunnelPages = () => LANGS.flatMap((lang) => TUNNELS.map((tunnel) => ({
  file: pageFile(lang.id, tunnel.id),
  html: tunnelPage(lang.id, tunnel.id),
})));

export const buildSitemap = () => {
  const alternates = (tunnelId) => [
    `<xhtml:link rel="alternate" hreflang="zh-Hant" href="${pageUrl('tc', tunnelId)}"/>`,
    `<xhtml:link rel="alternate" hreflang="zh-Hans" href="${pageUrl('sc', tunnelId)}"/>`,
    `<xhtml:link rel="alternate" hreflang="en" href="${pageUrl('en', tunnelId)}"/>`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl('tc', tunnelId)}"/>`,
  ];
  const urls = [];
  urls.push(`  <url>\n    <loc>${ORIGIN}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`);
  for (const { id } of LANGS) {
    for (const tunnel of TUNNELS) {
      urls.push(`  <url>\n    <loc>${pageUrl(id, tunnel.id)}</loc>\n`
        + alternates(tunnel.id).map((line) => `    ${line}`).join('\n') + '\n'
        + `    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<!-- generated by scripts/build-tunnel-pages.mjs — do not edit by hand -->\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`
    + `${urls.join('\n')}\n</urlset>\n`;
};
