# Paint Shop Digital Twin

A web-based digital twin for a paint shop production line, designed to show the process flow, simulate stage timing, and track production performance with KPI-driven analytics.

The project combines a React + Vite frontend with a Node.js/Express backend and a PostgreSQL database to store runs, stage metadata, and component definitions.

## What’s included

- 3D digital twin layout of the paint line
- 14-stage process representation from component input to final good
- KPI tracking for OEE, availability, performance, quality, and downtime
- Production run history and daily aggregated reporting
- Component type management with shape-based definitions
- Interactive booth overlay and dashboard updates for operational monitoring

## Tech stack

- Frontend: React, Vite, Three.js
- Backend: Express, PostgreSQL, pg
- Runtime: Node.js

## Prerequisites

- Node.js 18+
- PostgreSQL 13+
- npm

## 1. Clone the project

```bash
git clone <repository-url>
cd PAINTSHOP-DT
```

## 2. Install dependencies

```bash
npm install
```

## 3. Set up PostgreSQL

Create a database named `system_ps_test`:

```sql
CREATE DATABASE system_ps_test;
```

If needed, make sure your PostgreSQL user has access to the database. The app defaults to the local PostgreSQL user `postgres`.

The backend automatically initializes the required tables when it starts:

- `production`
- `stages`
- `components`

## 4. Configure environment variables

Create a `.env` file in the project root:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=system_ps_test
DB_PASSWORD=your_postgres_password
DB_PORT=5432
PORT=3001
```

Only `DB_PASSWORD` is required if the other values match the defaults above.

## 5. Run the backend

In one terminal:

```bash
node server.js
```

Expected startup message:

```bash
Database initialized: production, stages, and components tables exist.
Backend server running on http://localhost:3001
```

## 6. Run the frontend

Open a second terminal and start the app:

```bash
npm run dev
```

Then open the local Vite URL shown in the console, typically:

```bash
http://localhost:5173/
```

## Available scripts

```bash
npm run dev     # start Vite dev server
npm run build   # build production bundle
npm run preview # preview production build
node server.js  # start backend API server
```

## Project structure

```text
PAINTSHOP-DT/
├── src/
│   ├── App.jsx                 # React entry point and legacy dashboard hookup
│   ├── legacyMarkup.js         # HTML dashboard markup
│   ├── paintShopSimulation.js  # Three.js digital twin and process logic
│   ├── PaintingBoothOverlay.jsx # Booth overlay UI
│   ├── main.jsx                # Vite bootstrap
│   ├── styles.css              # Frontend styling
│   └── ...
├── public/
├── index.html
├── server.js                   # Express API + PostgreSQL integration
├── vite.config.js
├── package.json
├── .env
├── README.md
└── node_modules/
```

## API overview

The backend listens on `http://localhost:3001`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stages` | Fetch all configured paint shop stages |
| `GET` | `/api/component-types` | Get the available component types |
| `POST` | `/api/component-types` | Create a new component definition |
| `GET` | `/api/runs` | Get production run history and total counts |
| `POST` | `/api/runs/start` | Start a new production run |
| `PATCH` | `/api/runs/:id/status` | Update a run status (`Running`, `Paused`, `Cancelled`) |
| `PUT` | `/api/runs/:id` | Complete a run with final KPI values |
| `GET` | `/api/production/daily?date=YYYY-MM-DD` | Fetch daily production aggregates |

## Database model

### `production`
Stores the execution record for each production run, including run status, start/end time, downtime, OEE values, and piece counts.

### `stages`
Stores the paint shop stage sequence, stage names, descriptions, order, and duration minutes.

### `components`
Stores component definitions via:

- `component_id`
- `component_type`
- `shape`

## Notes

- The app uses a local PostgreSQL connection; ensure the database is running before starting the backend.
- Frontend and backend should run in separate terminals.
- If port `3001` is unavailable, change `PORT` in `.env` and restart the backend.
- If port `5173` is unavailable, Vite will usually choose the next available local port automatically.

## Troubleshooting

| Issue | Fix |
|---|---|
| `node server.js` fails | Confirm PostgreSQL is running and `.env` values are correct |
| Database connection error | Check `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` |
| Frontend cannot reach backend | Make sure the Express server is running on port `3001` |
| Port conflict on `3001` | Change `PORT` in `.env` |
| Port conflict on `5173` | Vite will automatically retry on another free port |

## Recent updates

This version includes the following changes from the current implementation:

- Integrated 3D paint-shop digital twin with interactive stage navigation
- Added component-type CRUD support with validation
- Added automatic database schema initialization for `production`, `stages`, and `components`
- Added run lifecycle endpoints for start, pause/cancel, and completion
- Added daily KPI aggregation and historical run reporting
- Refined stage metadata to match the current process model used in the simulation
