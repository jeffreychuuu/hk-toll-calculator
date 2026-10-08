# 香港隧道收費計算器

[English](README.md) | **繁體中文**

**網址：** https://hk-toll-calculator.jeffreychuuu.com

即時查詢香港行車隧道收費嘅靜態網站 — 顯示現時收費、24 小時分時段收費分佈，以及下一個時段嘅收費變動。

## 概覽

網站聚焦**按時間查詢隧道收費**：選擇隧道、車輛類別、日期類型同時間，頁面即時顯示當時收費、彩色 24 小時時段分佈圖，以及下一個時段嘅收費變動提示。

數據來自運輸署公布嘅收費表，包括三條過海隧道同大欖隧道嘅「分時段收費」方案。

## 功能

- **涵蓋香港全部收費隧道**
  - 分時段收費：海底隧道（紅隧）、東區海底隧道、西區海底隧道、大欖隧道
  - 劃一收費：香港仔隧道、城門隧道、獅子山隧道、沙田嶺／尖山／大圍隧道、大老山隧道、愉景灣隧道
- **即時收費卡片** — 顯示現時時段 badge（繁忙／一般／非繁忙／過渡期）、收費，同下一时段提示
- **24 小時分佈圖** — 按時段上色，附即時日期時間同當前時間指標
- **彈性輸入**
  - 隧道選擇器
  - 車輛類別選擇器（私家車、電單車、的士、貨車、巴士等）
  - 日期模式切換 — 揀**指定日期**（自動跟隨平日／星期日及公眾假期收費表）或**日期類型**查一般價；兩個模式各自記住自己嘅值
  - 時／分下拉選單 + 時間滑桿，全日任一時間可查，加「回到現在」掣
- **最平過海選擇** — 即時比較紅隧／東隧／西隧，按當前車種同時間列價，同價會標明；撳一行即切換隧道
- **行程建議** — 揀起點同終點地區，睇邊條過海隧道較順路（有排序、同分會如實並列，唔會砌一個偏好出嚟）
- **分區顯示** — 收費比較／行程建議／時間表係 tabs，一次只顯示你揀嘅嗰區
- **記住上次選擇** — 隧道同車輛類別存喺 localStorage，下次開頁自動還原
- **三種語言** — 繁體中文 / 简体中文 / English，首次跟瀏覽器語言自動揀，揀過之後記住
- **過渡期精準計價** — 按運輸署分鐘級收費表計算過渡時段步進收費（例如私家車每 2 分鐘 +$2）
- **純靜態** — 後端、build step、runtime 依賴通通冇

## 資料來源

- [運輸署 — 過海隧道分時段收費](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tvt/index.html)
- [運輸署 — 行車隧道嘅收費](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/toll_matters/toll_rates_of_road_tunnels_and_lantau_link/index.html)
- [運輸署 — 大欖隧道收費方案](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tlt/index.html)
- 運輸署詳細收費表 PDF（分鐘級過渡收費）

## 技術棧

- HTML5 / CSS3 / vanilla JavaScript（ES modules）
- 冇框架、冇 bundler、冇依賴
- 數據內嵌為靜態 JS module（冇 fetch、冇 build step）

## 專案結構

```
hk-toll-calculator/
├── index.html          # 單頁 UI
├── css/
│   └── styles.css      # 佈局同組件
├── js/
│   ├── data.js         # 收費表 + 車輛類別
│   ├── holidays.js     # 香港公眾假期日期
│   ├── i18n.js         # 三語文案 + 瀏覽器語言偵測
│   ├── engine.js       # 純收費計算函數
│   └── app.js          # UI 綁定同渲染
├── tests/              # Node 測試套件
├── package.json        # test script（type: module）
├── README.md
└── README.zh-Hant.md
```

## 本地執行

頁面用 ES module，瀏覽器只會經 HTTP 載入 — 直接開 `index.html` 會白畫面，要起個 server：

```bash
git clone https://github.com/jeffreychuuu/hk-toll-calculator.git
cd hk-toll-calculator
python3 -m http.server 8000   # 然後開 http://localhost:8000
npm test                      # 跑 engine、收費表同 UI 單元測試
```

## 部署到 Vercel

正式網址：https://hk-toll-calculator.jeffreychuuu.com

```bash
npm i -g vercel
vercel                   # 跟提示做；靜態站用預設設定就得
```

或者喺 Vercel dashboard 連接 GitHub repo — build command 留空，output directory 用專案根目錄。

## 注意

- 收費按運輸署 **2026 年 10 月**公布資料編製。收費可能調整，實際收費請以運輸署官方資料為準。
- 內嵌公眾假期資料需每年更新。
- 本專案為非官方參考工具，與運輸署無關。
