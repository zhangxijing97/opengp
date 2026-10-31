# OpenGP

**OpenGP** is an Automotive Discovery Platform, starting with multi-series motorsport tracking. The current development focus is making racing schedules, events, sessions, and results easier to explore across championships. Automotive event discovery is a later product direction.

> **Project status:** Early development. Features and data quality vary by series; code presence does not mean a feature has been verified end to end.
>
> **Repository name:** `motorsport-tracker` is a historical technical identifier. The product name is **OpenGP**.

## 1. Tech Stack

| Part | Technology | Purpose |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS | Web interface |
| Backend | NestJS, TypeScript | OpenGP API and data integration |
| External data | Racing data APIs | Schedules, sessions, and results |

The backend currently contains OpenF1, Sportradar, and NASCAR adapters for the original `/events` routes, and a versioned F1 API (`/api/v1`) built on Jolpica-F1 and OpenF1.

## 2. Project Structure

```text
opengp/
├── frontend/             # Next.js web application
├── backend/              # NestJS API application
├── docs/
│   ├── api-guide.md      # How to use /api/v1, with clickable examples
│   ├── architecture.md   # System structure and request flow
│   ├── api-contract.md   # Current API and proposed data model
│   ├── data-providers.md # Provider integration notes (being developed)
│   └── product-strategy.md # Product vision and priorities
└── README.md             # This developer entry point
```

The frontend calls the OpenGP backend; the backend retrieves and normalizes data from external providers. See [Architecture](docs/architecture.md) for the details.

## 3. Getting Started

**Prerequisites:** Node.js and npm compatible with the versions in `frontend/package.json` and `backend/package.json`.

Clone the repository:

```bash
git clone git@github.com:zhangxijing97/opengp.git
cd opengp
```

**Terminal 1 — Backend** (from the repository root):

```bash
cd backend
npm ci
npm run start:dev
```

Backend default: `http://localhost:3001`

**Terminal 2 — Frontend** (from the repository root):

```bash
cd frontend
npm ci
npm run dev
```

Frontend default: `http://localhost:3000`

**Why `npm ci`?** It installs dependencies from `package-lock.json` without changing the lockfile and rebuilds `node_modules/`. Use it for a clean project setup. Use `npm install <package>` when adding or updating dependencies; that command can update `package.json` and `package-lock.json`.

### Environment Variables

| File / variable | When needed | Purpose |
| --- | --- | --- |
| `frontend/.env.local` → `NEXT_PUBLIC_API_BASE_URL` | Optional for local development | Backend URL; defaults to `http://localhost:3001` |
| `backend/.env` → `SPORTRADAR_API_KEY` | Needed for current Sportradar-backed requests, including NASCAR | API access key |

Example `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

Do not commit API keys or other secrets. Some integrations may return empty data or fail without valid provider access.

## 4. Current Implementation

**Present in source code:**

- A Next.js frontend that requests event and session data from the backend.
- NestJS routes for today's, upcoming, live, and past events; event details; and session details.
- A versioned F1 API under `/api/v1`: series, seasons, sessions for a date range in the user's time zone, and Round/Session details. See the [API Guide](docs/api-guide.md).
- A provider interface and registry with OpenF1, Sportradar, and NASCAR adapters.
- Basic in-memory caching and provider-specific data mapping.

**Not yet established:**

- Reliable end-to-end coverage across all target championships.
- Final API provider choices and a completed canonical racing data model.
- Dependable official race classifications and standings across series.
- Consistent upstream error reporting: some failures currently appear as empty responses.

These statements reflect **source inspection**, not a successful build, live deployment check, or end-to-end test.

## 5. Useful Commands

Run these inside the appropriate directory:

| Directory | Command | Purpose |
| --- | --- | --- |
| `frontend/` | `npm run dev` | Start local web app |
| `frontend/` | `npm run build` | Build frontend |
| `frontend/` | `npm run lint` | Run ESLint |
| `backend/` | `npm run start:dev` | Start API in watch mode |
| `backend/` | `npm run build` | Build backend |
| `backend/` | `npm run test` | Run unit tests |
| `backend/` | `npm run test:e2e` | Run end-to-end tests |

`npm run lint` inside `backend/` applies automatic fixes; review changes before committing. Tests and builds have not been run as part of this README review.

## 6. Deployment

The following deployment addresses were documented in the previous README. **Their current availability has not been verified.** Existing service names and URLs are kept unchanged.

| Service | Platform | Documented URL |
| --- | --- | --- |
| Frontend | Netlify | [motorsporttracker.netlify.app](https://motorsporttracker.netlify.app) |
| Backend | Render | [motorsport-tracker-backend.onrender.com](https://motorsport-tracker-backend.onrender.com) |

**How it works:** The hosted frontend calls the hosted NestJS backend, which uses the configured racing data providers. This is **not** an OpenF1-only architecture. `NEXT_PUBLIC_API_BASE_URL` should point to the backend URL in the deployed frontend environment; browser access also depends on the backend CORS configuration.

## 7. Quick Test Endpoints

These paths are defined in the backend source. Run the backend locally, or use the documented hosted addresses above **if they are currently available**.

| Purpose | Local URL | Hosted URL (unverified) |
| --- | --- | --- |
| Today's F1 events | [localhost:3001/events/today?series=f1](http://localhost:3001/events/today?series=f1) | [Render: today's F1 events](https://motorsport-tracker-backend.onrender.com/events/today?series=f1) |
| Session detail (historical example ID) | [localhost:3001/sessions/openf1-session-9134/detail](http://localhost:3001/sessions/openf1-session-9134/detail) | [Render: example session detail](https://motorsport-tracker-backend.onrender.com/sessions/openf1-session-9134/detail) |

The historical session ID `openf1-session-9134` may no longer resolve. For a current test, obtain a session ID from an event response. Endpoints may return empty data or errors if upstream sources are unavailable; an empty response is not proof that no event exists.

For all routes and response types, see [API Contract](docs/api-contract.md).

## 8. Documentation

| Document | Read it when you need to... |
| --- | --- |
| [Architecture](docs/architecture.md) | Understand the frontend/backend structure and NestJS request flow |
| [API Contract](docs/api-contract.md) | Understand HTTP endpoints, response types, and proposed canonical entities |
| [Data Providers](docs/data-providers.md) | Review provider integrations and selection status (documentation in progress) |
| [Product Strategy](docs/product-strategy.md) | Understand product direction, priorities, and open decisions |
| [API Guide](docs/api-guide.md) | Try the `/api/v1` endpoints with clickable examples |

**Documentation rule:** Distinguish **Current** (in source code), **Confirmed** (approved product direction), and **Proposed** (not yet approved or implemented). The repository and verified test results remain the engineering source of truth.