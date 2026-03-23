# Skyline Weather

A full-stack weather application built with **Next.js**, **React**, **Tailwind CSS**, and **shadcn/ui**. It pulls forecast, air quality, and geocoding data from **[Open-Meteo](https://open-meteo.com/)** (no API key required) and can **persist snapshots** to a local **SQLite** database with a full **REST CRUD** API.

---

## Features

### Weather experience

- Search by **city, postal code, or region** with **debounced autocomplete** (geocoding API).
- **GPS / current location** via the browser Geolocation API.
- **Current conditions**: temperature, feels-like, humidity, wind (speed + compass), precipitation, today’s rain probability.
- **5-day outlook**: daily codes, highs/lows, rain chance, Lucide icons + gradient styling.
- **Unit toggle**: °C / °F.
- **Insights**: contextual “sky tips”, 5-day temperature strip, **sunrise/sunset**, **UV index**, **EU/US AQI** and PM2.5/PM10 when available.
- **Export current view** as JSON from the header.

### Backend & data

- **REST API** for weather, geocode, air quality, saved records, and exports.
- **SQLite** (`data/weather.db`) via **Drizzle ORM** with lazy DB init (safe for `next build`).
- **CRUD** on saved weather snapshots: location + **validated date range** + embedded forecast payload.
- **Bulk export** of saved records: **JSON**, **CSV**, **PDF** (`pdf-lib`).

---

## Tech stack

| Area | Choices |
|------|---------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix Nova), Lucide icons |
| Validation | Zod |
| Database | SQLite + Drizzle ORM + `better-sqlite3` |
| PDF | `pdf-lib` |

External data: **Open-Meteo** (forecast, geocoding, air quality).

---

## Prerequisites

- **Node.js** 20+ (see `package.json` / your environment)
- **npm** (or pnpm/yarn with equivalent commands)

---

## Getting started

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build
npm start
```

No `.env` file is required for the default Open-Meteo integration.

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Production build |
| `npm start` | Run production server (after `build`) |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync Drizzle schema to SQLite (`drizzle-kit push`) |

The app also **creates** `data/weather.db` and the `weather_records` table on first DB access if missing.

---

## API reference

Base URL: same origin as the app (e.g. `http://localhost:3000`).

### Weather (main UI)

| Method | Path | Query / body | Description |
|--------|------|----------------|-------------|
| `GET` | `/api/weather` | `q=` *or* `lat=` + `lon=`; optional `name`, `subtitle` with lat/lon for labels | Forecast + extended daily (sunrise/sunset/UV) + current-hour air quality when available |

### Geocoding & air quality

| Method | Path | Query | Description |
|--------|------|--------|-------------|
| `GET` | `/api/geocode` | `q=` | Autocomplete-style place search (JSON `results[]`) |
| `GET` | `/api/air-quality` | `lat=`, `lon=` | Standalone current air quality |

### Saved records (CRUD)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/records` | List all records (newest first) |
| `POST` | `/api/records` | Create: JSON body with location + date range (see validation below) |
| `GET` | `/api/records/[id]` | Read one record |
| `PATCH` | `/api/records/[id]` | Update (same shape as create) |
| `DELETE` | `/api/records/[id]` | Delete |

**Create / update body** (validated server-side):

- **Location**: either `locationQuery` (non-empty string) **or** both `latitude` and `longitude`.
- **Dates**: `startDate`, `endDate` as `YYYY-MM-DD`, `endDate ≥ startDate`, inclusive range **≤ 14 days**, and within the server’s allowed **UTC** window (roughly **7 days past → 16 days ahead** relative to “today” UTC).

### Export saved records

| Method | Path | Query | Description |
|--------|------|--------|-------------|
| `GET` | `/api/export/records` | `format=json` \| `csv` \| `pdf` | Download all saved rows |

---

## Database

- **File**: `data/weather.db` (directory `data/` is gitignored).
- **ORM**: Drizzle (`lib/db/schema.ts`, `lib/db/index.ts`).
- **Table**: `weather_records` — id, location fields, date range, JSON snapshot (`weather_json`), timestamps.

For schema tweaks after changing `schema.ts`, you can run `npm run db:push` or rely on the runtime `CREATE TABLE IF NOT EXISTS` used on first connection.

---

## Project structure (high level)

```
app/
  api/           # Route handlers (weather, geocode, air-quality, records, export)
  layout.tsx     # Root layout, fonts
  page.tsx       # Home → WeatherApp
  globals.css    # Tailwind + theme
components/
  weather-app.tsx
  weather-insights.tsx
  saved-weather-records.tsx
  ui/            # shadcn components
lib/
  open-meteo.ts           # Forecast, geocode, air quality, date-range filtering
  db/                     # SQLite + schema
  weather-record-*.ts     # Validation + service layer
  export-records.ts       # JSON / CSV / PDF helpers
  sky-tip.ts
```

---

## Deployment notes

- **SQLite on local disk** works well for **local** or **single-server** deployments with a writable filesystem.
- **Serverless** hosts (e.g. Vercel) typically **cannot** rely on a persistent local SQLite file. For production there, use a hosted database (e.g. **Turso**, **Neon**, **PlanetScale**) and swap the Drizzle driver / connection string accordingly.

---

## Credits

- Weather, geocoding, and air quality: **[Open-Meteo](https://open-meteo.com/)**
- UI primitives: **[shadcn/ui](https://ui.shadcn.com/)**

---

## License

Private project (`"private": true` in `package.json`). Adjust licensing as needed for your org.
