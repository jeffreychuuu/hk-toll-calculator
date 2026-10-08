# HK Toll Calculator — Design Spec

**Date:** 2026-10-08
**Status:** Approved design (in-chat), pending spec review
**Repo:** https://github.com/jeffreychuuu/hk-toll-calculator

## 1. Goal

A pure static, single-page website that lets a user check Hong Kong road tunnel tolls by time of day. Given (tunnel, vehicle class, day type, time), show the effective toll, a 24-hour colour-coded period chart, and a hint for the next rate transition. Deployable to Vercel with zero build configuration.

Success: every displayed figure matches the Transport Department (TD) published schedules to the minute, including transition-period step rates.

## 2. Scope (confirmed with user)

- **All paid tunnels in Hong Kong** (not just cross-harbour).
- **Single query page** replicating the reference screenshot design. No comparison/list page.
- **Pure HTML/CSS/JS**, no framework, no build step.
- **Public holidays**: auto-detect from embedded data + manual override.
- UI language: Traditional Chinese (README bilingual: `README.md` English, `README.zh-Hant.md` Chinese).

Out of scope: backend, real-time TD API, per-date date-picker (day type is a two-state toggle), iOS/Android apps.

## 3. Architecture

```
hk-toll-calculator/
├── index.html          # single-page UI
├── css/
│   └── styles.css      # layout & components
├── js/
│   ├── data.js         # toll schedules, tunnel list, vehicle classes
│   ├── holidays.js     # HK general holidays 2025–2027
│   ├── engine.js       # pure calculation functions (no DOM)
│   └── app.js          # UI wiring & rendering
├── README.md           # English
└── README.zh-Hant.md   # Traditional Chinese
```

- ES modules loaded with `<script type="module">`; data lives in JS modules (not fetched JSON) so the page also works from `file://`.
- `engine.js` is DOM-free and side-effect-free so it can be tested under Node (`node --test`) without a browser.
- Deployment: Vercel static, no build command, output = repo root.

## 4. Data model

### 4.1 Period types

`non-peak` (非繁忙, green), `normal` (一般, blue), `peak` (繁忙, red), `transition` (過渡期, orange), `flat` (全日劃一, neutral grey — used when a tunnel/class combination has no time variation).

### 4.2 Tunnel groups

**(A) Time-varying tunnels** — cross-harbour (紅隧 CHT, 東隧 EHC, 西隧 WHC) and 大欖 TLT.

Schedule is encoded as an explicit ordered list of minute-level segments — NOT a computed formula — because official step patterns are irregular (e.g. weekend cross-harbour up-transition is 10:11→$21, 10:13→$23; Tai Lam's first up-step is +$1 not +$2). Source: TD detailed toll-schedule PDFs.

Segment shape:

```js
{ start: "07:30", end: "08:07", type: "transition",
  rates: { car: [22, 58], moto: [8.8, 23.2] } }   // range = first/last 2-min step
```

During a transition segment, price steps every 2 minutes from `start` to `end` inclusive; each transition segment carries its explicit step list (array of 2-minute step values) generated once when `data.js` loads from `{startPrice, endPrice, firstStepOffset}` or stored literally. Rule: **the PDF is authoritative**; steps must reproduce PDF values exactly.

**Cross-harbour weekday (Mon–Sat, non-holiday):**

| Tunnel | Segment | Time | Car | Moto |
|---|---|---|---|---|
| WHC | non-peak | 00:00–07:29 | $20 | $8 |
| WHC | ↑ transition | 07:30–08:07 | 22→58 | 8.8→23.2 |
| WHC | peak | 08:08–10:14 | $60 | $24 |
| WHC | ↓ transition | 10:15–10:42 | 58→32 | 23.2→12.8 |
| WHC | normal | 10:43–16:29 | $30 | $12 |
| WHC | ↑ transition | 16:30–16:57 | 32→58 | 12.8→23.2 |
| WHC | peak | 16:58–18:59 | $60 | $24 |
| WHC | ↓ transition | 19:00–19:37 | 58→22 | 23.2→8.8 |
| WHC | non-peak | 19:38–23:59 | $20 | $8 |
| CHT/EHC | non-peak | 00:00–07:29 | $20 | $8 |
| CHT/EHC | ↑ transition | 07:30–07:47 | 22→38 | 8.8→15.2 |
| CHT/EHC | peak | 07:48–10:14 | $40 | $16 |
| CHT/EHC | ↓ transition | 10:15–10:22 | 38→32 | 15.2→12.8 |
| CHT/EHC | normal | 10:23–16:29 | $30 | $12 |
| CHT/EHC | ↑ transition | 16:30–16:37 | 32→38 | 12.8→15.2 |
| CHT/EHC | peak | 16:38–18:59 | $40 | $16 |
| CHT/EHC | ↓ transition | 19:00–19:17 | 38→22 | 15.2→8.8 |
| CHT/EHC | non-peak | 19:18–23:59 | $20 | $8 |

**Cross-harbour weekend (Sun & public holidays), all three tunnels:**

| Segment | Time | Car | Moto |
|---|---|---|---|
| non-peak | 00:00–10:10 | $20 | $8 |
| ↑ transition | 10:11–10:12 | $21 | $8.4 |
| ↑ transition | 10:13–10:14 | $23 | $9.2 |
| normal | 10:15–19:14 | $25 | $10 |
| ↓ transition | 19:15–19:16 | $23 | $9.2 |
| ↓ transition | 19:17–19:18 | $21 | $8.4 |
| non-peak | 19:19–23:59 | $20 | $8 |

**Tai Lam weekday (Mon–Sat, non-holiday):**

| Segment | Time | Car | Moto |
|---|---|---|---|
| non-peak | 00:00–07:14 | $18 | $7.2 |
| ↑ transition | 07:15–07:40 | 19→43 (first step +1, then +2/2min) | 7.6→17.2 (+0.4, then +0.8) |
| peak | 07:41–09:44 | $45 | $18 |
| ↓ transition | 09:45–09:58 | 43→31 | 17.2→12.4 |
| normal | 09:59–17:14 | $30 | $12 |
| ↑ transition | 17:15–17:28 | 31→43 (first step +1, then +2) | 12.4→17.2 |
| peak | 17:29–18:59 | $45 | $18 |
| ↓ transition | 19:00–19:25 | 43→19 | 17.2→7.6 |
| non-peak | 19:26–23:59 | $18 | $7.2 |

**Tai Lam weekend:** flat all day — car $18, moto $7.2.

**Fixed-rate vehicle classes (all four time-varying tunnels):** taxi — cross-harbour $25, Tai Lam $28; other commercial vehicles (goods vehicles, minibuses, buses) — cross-harbour $50, Tai Lam $43. Chart shows a single `flat` bar.

**(B) Flat-rate tunnels:**

- 香港仔 / 城門 / 獅子山 / 沙田嶺+尖山+大圍: **$8 all vehicle classes**.
- 大老山隧道 (Tate's Cross): 10-row per-class table — moto $15, private car $20, taxi $20, public minibus $23, private minibus $23, light goods vehicle ≤5.5t $24, medium goods vehicle 5.5–24t $28, heavy goods vehicle >24t $28, single-deck bus $32, double-deck bus $35; extra axles beyond two free. (TD note: franchised buses excluded from listed bus rates.)
- 愉景灣隧道: class 1–7 table — $50 / $50 / $50 / $120 / $160 / $250 / $250; toll charged only toward Discovery Bay; taxis not charged.

Flat tunnels: single `flat` bar, no period chart variation, no next-transition hint.

### 4.3 Vehicle classes

Vehicle-class dropdown **depends on selected tunnel**:

- Time-varying tunnels: `私家車`, `電單車 / 機動三輪車`, `的士`, `其他商用車輛（貨車／小巴／巴士）`.
- Tate's Cross: its own 10-row class list (per table above).
- $8 tunnels: single option `所有車輛`.
- Discovery Bay: its own 7-class list.

### 4.4 Holidays

`holidays.js` exports HK general holidays for **2025, 2026, 2027** (both lunar and fixed-date). If today's date falls outside the embedded range, the UI falls back to manual day-type selection and shows a small notice that holiday data may be outdated.

Day type is auto-initialised from **today** (Sunday or public holiday → weekend mode); the segmented control overrides it manually from then on.

## 5. Engine API (`engine.js`)

```js
getToll({ tunnelId, vehicleId, dayType, minutes }) 
  → { amount, periodType }             // amount: number; periodType: 'non-peak'|'normal'|'peak'|'transition'|'flat'

getDaySegments({ tunnelId, vehicleId, dayType })
  → [{ startMin, endMin, periodType, firstAmount, lastAmount }]  // for the 24h chart

getNextTransition({ tunnelId, vehicleId, dayType, minutes })
  → { atMin, periodType, amount } | null   // null when rate is flat all day
```

- `minutes` = minutes since midnight (0–1439).
- During a transition segment, `getToll` returns the step price at `minutes` (2-minute grid; odd minute inherits previous step).
- Non-time-varying combinations return `periodType: 'flat'` and a constant amount.

## 6. UI (per reference screenshot)

Stack of rounded cards on a light background:

1. **Result card**
   - Title: tunnel name; subtitle: `車輛類別 • 日期類型`.
   - Badge (top-right): current period — `繁忙時段` (red pill), `一般時段`, `非繁忙時段`, `過渡期`, or `全日劃一`.
   - Price: `HK$` prefix + large mono-figure amount (2 decimals).
   - Hint bar (grey pill): `下一時段提示：X分鐘後 (HH:MM) 進入{時段} (收費 $Y)`. Hidden when flat.
2. **24-hour chart card**
   - Title + `當前時間 HH:MM` (blue, top-right; updates live every 30 s).
   - Horizontal bar composed of segments coloured by period type, with a vertical marker at current/slider time.
   - Axis labels 00:00 / 06:00 / 12:00 / 18:00 / 23:59.
   - Legend: ● 非繁忙 ● 一般 ● 繁忙 ● 過渡期 (adapts: `全日劃一` replaces the four when flat).
3. **Form card (grey)**
   - 選擇隧道 dropdown (grouped: 分時段收費 / 劃一收費).
   - 車輛類別 dropdown (options depend on tunnel).
   - 日期類型 segmented control: `星期一至六（非假期）` | `星期日及公眾假期`.
   - 過海／通行時間: time display pill `HH:MM` + clock icon, and a 0–1439 minute slider.

Interactions: any input change re-renders cards immediately. Slider and time pill stay in sync (editing one updates the other; invalid input reverts). Responsive down to mobile width; design follows the screenshot's iOS-like rounded, light style.

## 7. Error handling

- Unknown tunnel/vehicle combination → reset vehicle selection to first valid option.
- Holiday data out of range → manual day-type mode + stale-data notice.
- Empty/invalid time input → revert to last valid value.

## 8. Testing

- **Engine spot checks** (assert against PDF values), runnable with `node --test`:
  - WHC car @07:31 = 22; @08:06 = 58; @08:08 = 60; @19:37 = 22.
  - WHC weekend car @10:13 = 23; @19:15 = 23.
  - CHT moto @17:30 weekday = 16; CHT car @07:47 = 38; CHT moto @19:17 = 8.8.
  - TLT car @07:15 = 19; @07:40 = 43; @19:25 = 19; weekend @12:00 = 18.
  - Taxi cross-harbour @any = 25; other commercial = 50; Tate's Cross double-deck bus = 35; $8 tunnel any class = 8.
  - Segment count sanity: each day type's segments tile 00:00–1439 with no gaps/overlaps.
- **Manual QA**: screenshot side-by-side comparison; run at mobile and desktop widths; test slider extremes (00:00, 23:59).

## 9. Deployment

Vercel: import repo, no build command, no output-directory override (static root). `vercel` CLI works with defaults. No `vercel.json` needed unless cache headers later require it.

## 10. Maintenance notes

- Toll changes → update `js/data.js` from new TD PDF.
- Each year → add new year to `js/holidays.js`.
- README (both languages) note that rates reflect TD publications as of October 2026.
