# HK Toll Calculator

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
- **Real-time toll card** — current period badge (peak / normal / non-peak / transition), price, and next-period hint
- **24-hour distribution chart** — colour-coded periods with a live date/time label and a current-time marker
- **Flexible inputs**
  - Tunnel selector
  - Vehicle class selector (private car, motorcycle, taxi, goods vehicles, buses, etc.)
  - Date mode switch — pick a **specific date** (the weekday / Sun-and-public-holiday schedule follows it automatically) or a **date type** for a general rate; each mode remembers its own value
  - Hour and minute dropdowns for any time of day, a slider, plus a **back-to-now** button
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
- No framework, no bundler, no dependencies
- Data embedded as static JS modules (no fetch, no build step)

## Project Structure

```
hk-toll-calculator/
├── index.html          # single-page UI
├── css/
│   └── styles.css      # layout & components
├── js/
│   ├── data.js         # toll schedules + vehicle classes
│   ├── holidays.js     # HK public holiday dates
│   ├── i18n.js         # UI copy + bundle language detection
│   ├── engine.js       # pure toll calculation functions
│   └── app.js          # UI wiring & rendering
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
