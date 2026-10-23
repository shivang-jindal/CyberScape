# CyberScape

> **Deterministic internet infrastructure twin — from cable landing to IXP.**

[![CI](https://github.com/shivang-jindal/CyberScape/actions/workflows/ci.yml/badge.svg)](https://github.com/shivang-jindal/CyberScape/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4-lightgrey)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff)](https://vite.dev/)

---

## What it is

CyberScape is a deterministic digital twin for internet infrastructure that you
can browse, compare, and stress-test. Every asset is a pure function of its
seed: topology, capacity, latency, peering, redundancy, exposure, and failure
domains all derive from the same 32-bit value. Share the seed and anyone
reconstructs the same network.

The repository is a complete open-source product:

- **Client** — React 18, Vite 6, TypeScript, Tailwind v4, React Router, TanStack Query
- **Server** — Express 4, Zod-validated API, structured logging, security middleware
- **Shared** — one Zod schema and constant catalogue for runtime and types
- **Engine** — pure functions, no database required, fully reproducible

---

## Features

### Infrastructure atlas
1. **Asset catalogue** — 14 infrastructure assets, from subsea systems and IXPs to data centres and access gateways.
2. **Search and filters** — by free text, category, region, and lifecycle status.
3. **Risk ranking** — deterministic risk score derived from status and seed.
4. **Asset dossier** — summary, six metrics, a 12-point history, and related assets.
5. **Analytics overview** — totals by status and category, average risk, top five exposures.
6. **Shareable views** — encode the current asset and filters into a URL-safe token.

### Deterministic topology
7. **Seeded PRNG** — FNV-1a seed derivation plus Mulberry32, identical on every platform.
8. **Infrastructure archetypes** — backbone, subsea, metro, edge, satellite, exchange, data centre, access, and transit.
9. **Status model** — nominal, degraded, and critical assets with distinct risk behaviour.
10. **History series** — a comparable 12-period resilience trend per asset.
11. **Related-asset graph** — category neighbours plus cross-category discovery.
12. **Seed explanation** — the assistant describes exactly how the seed propagates.

### Simulation lab
13. **Six intervention scenarios** — cable cut, DDoS surge, BGP hijack, IXP outage, data centre failure, and traffic reroute.
14. **Intensity and horizon controls** — 0–1 intensity over 1–72 simulated hours.
15. **Impact scoring** — severity-weighted, bounded 0–100.
16. **Timeline projection** — availability, load, and risk at seven checkpoints.
17. **Cascade analysis** — affected assets with per-entity severity.
18. **Actionable recommendations** — three targeted steps per scenario.

### Assistant and integrations
19. **Intent-aware architect** — focuses assets, opens pages, and queues simulations from natural language.
20. **Structured API** — every capability is available headlessly under `/api/v1`.

---

## Quick start

Prerequisites: **Node 20.11+**, **npm 10+**.

```bash
git clone https://github.com/shivang-jindal/CyberScape.git
cd CyberScape
npm install
npm run dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:4000/health>

Copy `.env.example` to `.env` to change ports, CORS origins, or logging.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | API + web with prefixed output |
| `npm run dev:server` | API only (tsx watch) |
| `npm run dev:client` | Vite dev server only |
| `npm run typecheck` | Shared build, then server and client type-checks |
| `npm run lint` | ESLint over the whole workspace |
| `npm test` | Vitest unit + integration suite |
| `npm run build` | Production build for shared, server, and client |
| `npm run verify` | The full gate: typecheck → lint → test → build |
| `npm run smoke` | Post-deployment smoke test against a running API |

---

## API

All endpoints are under `/api/v1` and validate input with Zod.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness/uptime probe |
| `GET` | `/api/v1/version` | Service name and API version |
| `GET` | `/api/v1/capabilities` | Categories, regions, metrics, actions |
| `GET` | `/api/v1/catalog` | Search and filter assets |
| `GET` | `/api/v1/catalog/:id` | Detail with history and related assets |
| `GET` | `/api/v1/analytics/summary` | Portfolio analytics |
| `POST` | `/api/v1/simulate` | Run a deterministic intervention |
| `POST` | `/api/v1/ai/chat` | Architect reply plus actions |
| `POST` | `/api/v1/share-links` | Encode a shareable view |
| `GET` | `/api/v1/share-links/:token` | Decode a shareable view |

Validation failures return `400` with a machine-readable `issues` array.
Unknown routes return a structured `404`, and unexpected failures never leak
internals.

---

## Architecture

```
CyberScape/
├── client/                 # React 18 + Vite 6 + Tailwind v4
│   └── src/
│       ├── components/     # shell, network globe, sparkline, toasts
│       ├── pages/          # overview, atlas, simulator, architect, settings
│       └── store/          # Zustand filters and selection
├── server/
│   └── src/
│       ├── domain/engine.ts  # deterministic topology + simulation
│       ├── http/             # routes and middleware
│       └── app.ts            # testable Express factory
├── shared/                 # Zod schemas, catalogue, derived types
└── scripts/                # dev launcher, verify pipeline, smoke test
```

`createApp({ config, logger })` keeps the HTTP layer testable without binding a
port; the engine has no I/O and can be imported anywhere.

---

## Testing

The suite covers deterministic generation, filtering, pagination, risk scoring,
simulation bounds, share-link round-trips, assistant intents, validation, and
every public endpoint:

```bash
npm test
```

---

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and
the [Code of Conduct](CODE_OF_CONDUCT.md). Security reports go through
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 Shivang Jindal
