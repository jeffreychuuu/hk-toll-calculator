# HK Toll Calculator ／ 香港隧道收費計算器

**English** | [繁體中文](#繁體中文)

A static website that checks Hong Kong road tunnel tolls in real time — showing the current rate, the 24-hour time-varying toll schedule, and the next rate change for any vehicle class.

即時查詢香港行車隧道收費嘅靜態網站 — 顯示現時收費、24 小時分時段收費分佈，以及下一個時段嘅收費變動。

---

## English

### Overview

The site focuses on **fare estimation by time of day**: pick a tunnel, vehicle class, day type, and time, and the page shows the toll in effect, a coloured 24-hour distribution chart, and a hint for the next rate transition.

Data is sourced from the Transport Department (TD) published toll schedules, including the time-varying toll (分時段收費) schemes for the three cross-harbour tunnels and Tai Lam Tunnel.

### Features

- **All paid tunnels in Hong Kong**
  - Time-varying toll: Cross-Harbour Tunnel (Hung Hom), Eastern Harbour Crossing, Western Harbour Crossing, Tai Lam Tunnel
  - Flat-rate tunnels: Aberdeen, Shing Mun, Lion Rock, Sha Tin Pass / Tsuen Shin / Tai Wai, Tate's Cross, Discovery Bay Tunnel
- **Real-time toll card** — current period badge (peak / normal / non-peak / transition), price, and next-period hint
- **24-hour distribution chart** — colour-coded periods with a current-time marker and legend
- **Flexible inputs**
  - Tunnel selector
  - Vehicle class selector (private car, motorcycle, taxi, goods vehicles, buses, etc.)
  - Day type: auto-detects Hong Kong public holidays, with manual override (Mon–Sat vs Sun & public holiday)
  - Time picker + slider for any time of day
- **Transition-aware pricing** — computes exact stepwise rates during transition windows (e.g. +$2 every 2 minutes for private cars), matching TD's minute-by-minute schedule
- **Pure static** — no backend, no build step, no runtime dependencies

### Data Sources

- [Transport Department — Time-varying toll scheme](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tvt/index.html)
- [Transport Department — Toll rates of road tunnels and Lantau Link](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/toll_matters/toll_rates_of_road_tunnels_and_lantau_link/index.html)
- [Transport Department — Tai Lam Tunnel toll scheme](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tlt/index.html)
- TD detailed toll schedule PDFs (minute-by-minute transition rates)

### Tech Stack

- HTML5 / CSS3 / vanilla JavaScript (ES modules)
- No framework, no bundler, no dependencies
- Data embedded as static JS modules (works when opened directly from disk)

### Project Structure

```
hk-toll-calculator/
├── index.html          # single-page UI
├── css/
│   └── styles.css      # layout & components
├── js/
│   ├── data.js         # toll schedules + vehicle classes
│   ├── holidays.js     # HK public holiday dates
│   ├── engine.js       # pure toll calculation functions
│   └── app.js          # UI wiring & rendering
└── README.md
```

### Run Locally

```bash
git clone https://github.com/jeffreychuuu/hk-toll-calculator.git
cd hk-toll-calculator
open index.html          # or: python3 -m http.server 8000
```

### Deploy to Vercel

```bash
npm i -g vercel
vercel                   # follow the prompts; default static settings work
```

Or connect the GitHub repository in the Vercel dashboard — no build command, output directory is the project root.

### Notes

- Toll rates reflect TD publications as of **October 2026**. Rates may change; always verify against official TD sources for actual tolls.
- Embedded public holiday data must be refreshed each year.
- This project is an unofficial reference tool and is not affiliated with the Transport Department.

---

## 繁體中文

### 概覽

網站聚焦**按時間查詢隧道收費**：選擇隧道、車輛類別、日期類型同時間，頁面即時顯示當時收費、彩色 24 小時時段分佈圖，以及下一個時段嘅收費變動提示。

數據來自運輸署 published 嘅收費表，包括三條過海隧道同大欖隧道嘅「分時段收費」方案。

### 功能

- **涵蓋香港全部收費隧道**
  - 分時段收費：海底隧道（紅隧）、東區海底隧道、西區海底隧道、大欖隧道
  - 劃一收費：香港仔隧道、城門隧道、獅子山隧道、沙田嶺／尖山／大圍隧道、大老山隧道、愉景灣隧道
- **即時收費卡片** — 顯示現時時段 badge（繁忙／一般／非繁忙／過渡期）、收費，同下一时段提示
- **24 小時分佈圖** — 按時段上色，附當前時間指標同圖例
- **彈性輸入**
  - 隧道選擇器
  - 車輛類別選擇器（私家車、電單車、的士、貨車、巴士等）
  - 日期類型：自動判斷香港公眾假期，可手動切換（星期一至六 / 星期日及公眾假期）
  - 時間選擇器 + 時間 slider，全日任一時間可查
- **過渡期精準計價** — 按運輸署分鐘級收費表計算過渡時段步進收費（例如私家車每 2 分鐘 +$2）
- **純靜態** — 後端、build step、runtime 依賴统统冇

### 資料來源

- [運輸署 — 過海隧道分時段收費](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tvt/index.html)
- [運輸署 — 行車隧道嘅收費](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/toll_matters/toll_rates_of_road_tunnels_and_lantau_link/index.html)
- [運輸署 — 大欖隧道收費方案](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tlt/index.html)
- 運輸署詳細收費表 PDF（分鐘級過渡收費）

### 技術棧

- HTML5 / CSS3 / vanilla JavaScript（ES modules）
- 冇框架、冇 bundler、冇依賴
- 數據內嵌為靜態 JS module（直接開檔案都用到）

### 專案結構

```
hk-toll-calculator/
├── index.html          # 單頁 UI
├── css/
│   └── styles.css      # 佈局同組件
├── js/
│   ├── data.js         # 收費表 + 車輛類別
│   ├── holidays.js     # 香港公眾假期日期
│   ├── engine.js       # 純收費計算函數
│   └── app.js          # UI 綁定同渲染
└── README.md
```

### 本地執行

```bash
git clone https://github.com/jeffreychuuu/hk-toll-calculator.git
cd hk-toll-calculator
open index.html          # 或：python3 -m http.server 8000
```

### 部署到 Vercel

```bash
npm i -g vercel
vercel                   # 跟提示做；靜態站用預設設定就得
```

或者喺 Vercel dashboard 連接 GitHub repo — build command 留空，output directory 用專案根目錄。

### 注意

- 收費按運輸署 **2026 年 10 月**公布資料編製。收費可能調整，實際收費請以運輸署官方資料為準。
- 內嵌公眾假期資料需每年更新。
- 本專案為非官方參考工具，與運輸署無關。
