# HK Toll Calculator

**English** | [繁體中文](README.zh-Hant.md)

A static website that checks Hong Kong road tunnel tolls in real time — showing the current rate, the 24-hour time-varying toll schedule, and the next rate change for any vehicle class.

## Overview

The site focuses on **fare estimation by time of day**: pick a tunnel, vehicle class, day type, and time, and the page shows the toll in effect, a coloured 24-hour distribution chart, and a hint for the next rate transition.

Data is sourced from the Transport Department (TD) published toll schedules, including the time-varying toll (分時段收費) schemes for the three cross-harbour tunnels and Tai Lam Tunnel.

## Features

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

## Data Sources

- [Transport Department — Time-varying toll scheme](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tvt/index.html)
- [Transport Department — Toll rates of road tunnels and Lantau Link](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/toll_matters/toll_rates_of_road_tunnels_and_lantau_link/index.html)
- [Transport Department — Tai Lam Tunnel toll scheme](https://www.td.gov.hk/tc/transport_in_hong_kong/tunnels_and_bridges_n/tlt/index.html)
- TD detailed toll schedule PDFs (minute-by-minute transition rates)

## Tech Stack

- HTML5 / CSS3 / vanilla JavaScript (ES modules)
- No framework, no bundler, no dependencies
- Data embedded as static JS modules (works when opened directly from disk)

## Project Structure

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

## Run Locally

```bash
git clone https://github.com/jeffreychuuu/hk-toll-calculator.git
cd hk-toll-calculator
open index.html          # or: python3 -m http.server 8000
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel                   # follow the prompts; default static settings work
```

Or connect the GitHub repository in the Vercel dashboard — no build command, output directory is the project root.

## Notes

- Toll rates reflect TD publications as of **October 2026**. Rates may change; always verify against official TD sources for actual tolls.
- Embedded public holiday data must be refreshed each year.
- This project is an unofficial reference tool and is not affiliated with the Transport Department.
