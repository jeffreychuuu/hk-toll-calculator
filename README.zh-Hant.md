# 香港隧道實時收費

[英文](README.md) | **繁體中文**

**網址：** https://hk-toll-calculator.jeffreychuuu.com

即時查詢香港行車隧道收費嘅靜態網站 — 顯示現時收費、24 小時分時段收費分佈，以及下一個時段嘅收費變動。

## 概覽

網站聚焦**按時間查詢隧道收費**：選擇隧道、車輛類別、日期類型同時間，頁面即時顯示當時收費、彩色 24 小時時段分佈圖，以及下一個時段嘅收費變動提示。

數據來自運輸署公布嘅收費表，包括三條過海隧道同大欖隧道嘅「分時段收費」方案。

## 功能

- **涵蓋香港全部收費隧道**
  - 分時段收費：海底隧道（紅隧）、東區海底隧道、西區海底隧道、大欖隧道
  - 劃一收費：香港仔隧道、城門隧道、獅子山隧道、沙田嶺／尖山／大圍隧道、大老山隧道
- **圖卡自己揀隧道** — 24 小時圖卡有個選擇器，只列上面走廊嘅隧道，畫緊邊條一目了然
- **一眼睇晒一個走廊** — 行程比較卡頭有「**車種**」選擇器，逐個走廊列出同一程嘅所有隧道同免費道路，每條都帶實時讀數同隧道費（最平嘅隧道標「**最平**」紫色，免費走廊——屯門公路、大埔道、林錦公路／青山公路、薄扶林道、黃泥涌峽道——顯示青綠色「**免費**」）。揀走廊會揀埋佢第一條隧道，圖卡跟住轉；每條隧道都喺同一區塊之內，包括唔喺大地圖嘅嗰條
- **只喺「現在」顯示嘅實時路況** — 運輸署行車時間顯示喺每條隧道同免費走廊旁邊，每個方向一粒標籤（「往…」），每粒都寫明**由邊個分流點起計** —— 運輸署係由分流點量起，唔係由隧道口，所以「大埔道 往九龍」係由青沙公路起、「獅子山」係由沙田馬場起。過海隧道由好多點量起，就唔標。連同該走廊嘅交通消息 —— 唔論消息係講隧道定係條路本身
- **24 小時收費時段圖** — 現時時段標籤、按時段上色、日期／日期類型／時間控制、標記（「現在」／揀咗嘅時間）、一粒膠囊形掣（現在↔回到現在）、同下一時段提示。劃一收費嘅隧道（連大欖隧道星期日）就淨係一條帶到尾，時間／日期控制會收起 —— 冇嘢好揀
- **全網絡目錄** — 「全部隧道」分頁將所有收費隧道按走廊分組列出，每行帶隧道費同實時讀數；揀一行即開嗰個走廊嘅同程比較
- **每條隧道一版** — 每條收費隧道都有自己嘅專屬頁面（`/toll/<id>/`），三種語言齊備，有各車種收費、時段表、免費替代同該隧道嘅常見問題——直接答「紅隧收費」「西隧價錢」呢類搜尋
- **彈性輸入**
  - 車輛類別選擇器（私家車、電單車、的士、貨車、巴士等）—— 放喺行程比較卡，因為佢決定嗰度每個價；轉隧道時會保留同一類車，即使每條隧道嘅分類名唔同
  - **日期**同**日期類型**（星期一至六非假期／星期日及公眾假期）：時程跟住日期，揀日期類型會跳去由今日起下一個有嗰個時程嘅日子；如果今日已經係，就直接返去現在
  - 時／分下拉選單 + 時間滑桿，全日任一時間可查，加「回到現在」掣
- **同一頁** — 行程比較同 24 小時圖放埋一齊
- **可摺起嘅參考資料** — 摺埋喺頁尾細字度，一行一個：收費表（有隧道分頁揀單一條睇）、常見問題（跟住你喺上面揀嘅隧道）、車種說明。用戶唔覺眼，但搜尋引擎同想睇細節嘅人照攞到；網頁原始碼入面係繁體中文，揀語言時亦會跟住轉
- **公開嘅瀏覽計數** — 頁頂顯示全站累計瀏覽次數，一個 Redis 計數器（經 Vercel 儲存空間嘅 Upstash）搞掂。唔用 Cookie、唔存 IP、冇第三方指令碼——載入唔到就索性唔顯示
- **有自己嘅圖示** — 隧道口，SVG 網站圖示同 180px 觸控圖示
- **記住上次選擇** — 隧道同車輛類別存喺 localStorage，下次開頁自動還原
- **三種語言** — 繁體中文 / 简体中文 / 英文，首次跟瀏覽器語言自動揀，揀過之後記住
- **深色／淺色主題** — 預設跟隨系統設定；GitHub 掣隔離嘅月亮／太陽掣可以切換，撳過一次之後記住你嘅選擇（localStorage）
- **過渡期精準計價** — 按運輸署分鐘級收費表計算過渡時段步進收費（例如私家車每 2 分鐘 +$2）
- **純靜態** — 冇後端、冇建置步驟、冇執行時依賴

## 資料來源

- [運輸署 — 過海隧道分時段收費](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tvt/index.html)
- [運輸署 — 行車隧道嘅收費](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/toll_matters/toll_rates_of_road_tunnels_and_lantau_link/index.html)
- [運輸署 — 大欖隧道收費方案](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tlt/index.html)
- 運輸署詳細收費表 PDF（分鐘級過渡收費）

## 技術棧

- HTML5 / CSS3 / 純 JavaScript（ES modules）
- 冇框架、冇打包工具、冇執行時依賴
- 一個 Vercel 無伺服器函數用嚟抓運輸署交通數據 —— 網站本身仍然係靜態
- 數據內嵌為靜態 JS 模組（冇 fetch、冇建置步驟）

## 專案結構

```
hk-toll-calculator/
├── index.html          # 單頁介面 ＋ 靜態 SEO 文案
├── favicon.svg         # 隧道 icon；apple-touch-icon.png、og-image.png
├── robots.txt          # 爬蟲規則同站點地圖位置
├── sitemap.xml
├── css/
│   └── styles.css      # 佈局同組件
├── js/
│   ├── data.js         # 收費表 + 車輛類別
│   ├── holidays.js     # 香港公眾假期日期
│   ├── i18n.js         # 三語文案 + 瀏覽器語言偵測
│   ├── traffic.js      # 運輸署行車時間／交通消息解析
│   ├── toll-tables.js  # 產生嵌入 index.html 嘅收費表
│   ├── tunnel-pages.js # 隧道專屬頁面嘅內容同模板
│   ├── paths.js        # /toll/<id>/ URL 方案，單一來源
│   ├── engine.js       # 純收費計算函數
│   └── app.js          # 介面綁定同渲染
├── toll/               # 生成物：每條隧道每種語言一版
├── scripts/
│   ├── print-toll-tables.mjs   # node scripts/print-toll-tables.mjs
│   └── build-tunnel-pages.mjs  # npm run build:pages（寫 toll/ + sitemap.xml）
├── api/
│   ├── traffic.js      # 實時路況代理
│   └── hit.js          # 每頁一次瀏覽計數，寫入 Redis
├── tests/              # Node 測試套件
├── package.json        # test script（type: module）
├── README.md
└── README.zh-Hant.md
```

## 本地執行

頁面用 ES module，瀏覽器只會經 HTTP 載入 — 直接開 `index.html` 會白畫面，要起個伺服器：

```bash
git clone https://github.com/jeffreychuuu/hk-toll-calculator.git
cd hk-toll-calculator
python3 -m http.server 8000   # 然後開 http://localhost:8000
# 實時路況需要無伺服器函數：npx vercel dev
npm test                      # 跑計算引擎、收費表同介面單元測試
```

## 部署到 Vercel

正式網址：https://hk-toll-calculator.jeffreychuuu.com

```bash
npm i -g vercel
vercel                   # 跟提示做；靜態站用預設設定就得
```

或者喺 Vercel 控制台連接 GitHub repo——建置指令留空，輸出目錄用專案根目錄。

頁頂個瀏覽計數需要喺 Vercel 儲存市集開一個 **Upstash Redis**：控制台 → Storage → 建立／連接 Upstash Redis → 專案會自動有 `KV_REST_API_URL` 同 `KV_REST_API_TOKEN` 兩個環境變數。冇呢兩個環境變數（包括本地開發）計數會靜靜地關咗——`api/hit.js` 只會答 `{ views: null }`。預覽部署會自動計落 `hk-tolls:views:preview`（用 Vercel 嘅 `VERCEL_ENV`），測試流量唔會入到公開數字。

## 注意

- 收費按運輸署 **2026 年 10 月**公布資料編製。收費可能調整，實際收費請以運輸署官方資料為準。
- 改咗收費數據之後，兩個生成物都要重跑——`node scripts/print-toll-tables.mjs`（貼返入 `index.html`）同 `npm run build:pages`（`/toll/` 頁面同 `sitemap.xml`）；`npm test` 唔跑齊會失敗。
- 專屬頁面標題帶年份，所以每年更新時 `npm run build:pages` 亦係例行步驟。
- 內嵌公眾假期資料需每年更新。
- 本專案為非官方參考工具，與運輸署無關。
