# HK Tunnel Tolls (Live)

**English** | [繁體中文](README.zh-Hant.md)

**Live:** https://hk-toll-calculator.jeffreychuuu.com

A static website that checks Hong Kong road tunnel tolls in real time — showing the current rate, the 24-hour time-varying toll schedule, and the next rate change for any vehicle class.

## Overview

The site focuses on **fare estimation by time of day**: pick a tunnel, vehicle class, day type, and time, and the page shows the toll in effect, a coloured 24-hour distribution chart, and a hint for the next rate transition.

Data is sourced from the Transport Department (TD) published toll schedules, including the time-varying toll (分時段收費) schemes for the three cross-harbour tunnels and Tai Lam Tunnel.

## Features

- **All paid tunnels in Hong Kong**
  - Time-varying toll: Cross-Harbour Tunnel (Hung Hom), Eastern Harbour Crossing, Western Harbour Crossing, Tai Lam Tunnel
  - Flat-rate tunnels: Aberdeen, Shing Mun, Lion Rock, Sha Tin Pass / Tsuen Shin / Tai Wai, Tate's Cross, Discovery Bay Tunnel
- **The chart picks its own tunnel** — the 24-hour chart card carries its own picker, listing just the tunnels of the corridor shown above, so what it draws is never ambiguous
- **Live conditions, shown only while it is now** — the Transport Department's journey times sit beside each tunnel and free corridor, one chip per direction (往…), each naming the gantry it is measured from — the department times a route from a gantry, not from the tunnel mouth, so 大埔道 往九龍 starts on the Tsing Sha Highway and 獅子山 at Sha Tin Racecourse. The harbour crossings are timed from many points and so name none. Also the corridor's traffic news, whether the news names a tunnel or the road itself
- **A corridor at a glance** — the comparison carries the 車種 selector and lists, corridor by corridor, every tunnel and free road that serves the trip, each with its live reading and its toll (the cheapest tunnel marked 最平 in blue, the free corridors — Tuen Mun Road, Tai Po Road, Lam Kam Road / Castle Peak Road — reading 免費 in green). Picking a corridor picks its first tunnel, so the chart follows; every tunnel is a chip away, including one off the macro map
- **24-hour toll-period chart** — the current period badge, colour-coded periods, the date / day-type / clock controls, a marker labelled 現在 while the view is the present moment (or the time you picked), one pill that reads 現在 at now and becomes the 回到現在 button once you leave, and the next-period hint. A tunnel that charges one flat rate all day (and Tai Lam on a Sunday) simply shows a single band across the day, and its schedule controls step aside — there is nothing to pick
- **Flexible inputs**
  - Vehicle class selector (private car, motorcycle, taxi, goods vehicles, buses, etc.), on the comparison card because it changes every price there — and it keeps the same class of vehicle when you switch tunnels, even though each names its classes differently (a tunnel with a scheme of its own, like Discovery Bay's, hands the old class back when you leave)
  - A **date** and a **day type** (Mon–Sat non-holiday / Sunday and public holidays): the schedule follows the date, and picking a day type jumps to the next day (counted from today) that has it — or straight back to now when today already does
  - Hour and minute dropdowns for any time of day, a slider, plus a **back-to-now** button
- **One page** — the comparison and the chart sit together
- **A reference you can open, not read past** — the toll-period table for every tunnel, the FAQ and the vehicle-class notes sit folded into the footer behind one line, so the tool stays first while search engines and curious readers still get the detail. The block is in Traditional Chinese in the page itself, and follows the language picker like everything else
- **An icon of its own** — a tunnel mouth, as an SVG favicon and a 180px touch icon
- **Remembers your choice** — the last tunnel and vehicle class are restored on the next visit (localStorage)
- **Three languages** — 繁體中文 / 简体中文 / English, picked automatically from the browser language and remembered once chosen
- **Transition-aware pricing** — computes exact stepwise rates during transition windows (e.g. +$2 every 2 minutes for private cars), matching TD's minute-by-minute schedule
- **Pure static** — no backend, no build step, no runtime dependencies

## Data Sources

- [Transport Department — Time-varying toll scheme](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tvt/index.html)
- [Transport Department — Toll rates of road tunnels and Lantau Link](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/toll_matters/toll_rates_of_road_tunnels_and_lantau_link/index.html)
- [Transport Department — Tai Lam Tunnel toll scheme](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tlt/index.html)
- TD detailed toll schedule PDFs (minute-by-minute transition rates)

## Tech Stack

- HTML5 / CSS3 / vanilla JavaScript (ES modules)
- No framework, no bundler, no runtime dependencies
- One Vercel serverless function for the traffic feeds — the site itself is still static
- Data embedded as static JS modules (no fetch, no build step)

## Project Structure

```
hk-toll-calculator/
├── index.html          # single-page UI + the static SEO copy
├── favicon.svg         # the tunnel icon; apple-touch-icon.png, og-image.png
├── robots.txt          # crawl rules, and where the sitemap is
├── sitemap.xml
├── css/
│   └── styles.css      # layout & components
├── js/
│   ├── data.js         # toll schedules + vehicle classes
│   ├── holidays.js     # HK public holiday dates
│   ├── i18n.js         # UI copy + bundle language detection
│   ├── traffic.js      # TD journey-time and traffic-news parsing
│   ├── toll-tables.js  # renders the toll tables embedded in index.html
│   ├── engine.js       # pure toll calculation functions
│   └── app.js          # UI wiring & rendering
├── scripts/
│   └── print-toll-tables.mjs   # node scripts/print-toll-tables.mjs
├── api/
│   └── traffic.js      # the one serverless function (live traffic)
├── tests/              # Node test runner suites
├── package.json        # test script (type: module)
├── README.md
└── README.zh-Hant.md
```

## Run Locally

The page uses ES modules, which browsers only load over HTTP — opening `index.html`
straight from the file system shows a blank page. Serve the folder instead:

```bash
git clone https://github.com/jeffreychuuu/hk-toll-calculator.git
cd hk-toll-calculator
python3 -m http.server 8000   # then open http://localhost:8000
# live traffic needs the function: npx vercel dev
npm test                      # run the engine, schedule and UI unit tests
```

## Deploy to Vercel

Production: https://hk-toll-calculator.jeffreychuuu.com

```bash
npm i -g vercel
vercel                   # follow the prompts; default static settings work
```

Or connect the GitHub repository in the Vercel dashboard — no build command, output directory is the project root.

## Notes

- Toll rates reflect TD publications as of **October 2026**. Rates may change; always verify against official TD sources for actual tolls.
- Embedded public holiday data must be refreshed each year.
- This project is an unofficial reference tool and is not affiliated with the Transport Department.
