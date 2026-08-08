# Setup and execution

## Requirements

Docker 24+ with Compose v2, about 6 GB of free RAM and free ports 3000, 3001, 5432, 6379, 8123, 29092.

## Start

```bash
cp .env.example .env     # optional: override secrets and public URLs
docker compose up -d --build
docker compose ps
curl http://localhost:3001/api/health
```

Boot order is enforced with health checks: databases → `kafka-init` (topics) → `backend-image` (single build) →
`migrator` (migrations + seeder, exits 0) → application services → frontend.

Default credentials seeded by the migrator: **superadmin01 / superadmin01**.

| URL | Purpose |
|---|---|
| http://localhost:3000 | Nuxt 3 dashboard |
| http://localhost:3001/docs/admin | Swagger: internal admin web API |
| http://localhost:3001/docs/mobile | Swagger: mobile / external consumer API (sessions, driver self-service) |
| http://localhost:3001/docs/device | Swagger: device telemetry API |
| http://localhost:3001/api/health | Gateway liveness |

## Demo traffic

```bash
docker compose --profile simulator up -d simulator
```

The simulator provisions a `demo-logistics` tenant (users `demo.dispatcher`, `demo.manager`, `driver01`…, vehicles,
trackers, geofences) and streams realistic pings. Stop it with `docker compose --profile simulator stop simulator`.

## Configuration

All variables have defaults inside `docker-compose.yml`; `.env.example` lists them. For production change
`POSTGRES_PASSWORD`, `CLICKHOUSE_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `PUBLIC_WS_URL`
and optionally `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`.

## Local development without Docker for the backend

```bash
npm install
npm run build            # or npm run build:gateway etc.
npm test
npm run lint:comments
```

Run infrastructure with `docker compose up -d postgres redis kafka kafka-init clickhouse`, then start services with
`POSTGRES_HOST=127.0.0.1 KAFKA_BROKERS=127.0.0.1:29092 CLICKHOUSE_URL=http://127.0.0.1:8123 ... node dist/apps/<app>/main.js`
(see `.env.example`). Frontend: `cd frontend && npm install && npm run dev` (proxies `/api` to `http://localhost:3001`).

## Updating

```bash
git pull
docker compose build
docker compose up -d
```

Migrations run automatically through the `migrator` container on every start.
