# Architecture

## Overview

FleetView is a multi-tenant telematics platform built as a set of NestJS microservices behind a single HTTP/WebSocket
gateway, a Nuxt 3 dashboard, Apache Kafka as the event backbone, PostgreSQL for transactional data, ClickHouse for
time-series analytics, Redis for presence/cache/queues and BullMQ for asynchronous jobs.

```
                 ┌────────────┐   REST / Socket.io    ┌──────────────────────────┐
  GPS trackers ─▶│            │◀─────────────────────▶│  Nuxt 3 dashboard (3000) │
  (HTTP device  │  gateway   │                       └──────────────────────────┘
   token)       │   (3001)   │── gRPC ──▶ fleet-core (50051)      ── PostgreSQL
                │            │── gRPC ──▶ geofence-service (50052) ── PostgreSQL, Redis, BullMQ
                │            │── gRPC ──▶ dispatch-order (50053)   ── PostgreSQL, Redis
                │            │── gRPC ──▶ analytics (50054)        ── ClickHouse, PostgreSQL, BullMQ
                └─────┬──────┘
                      │ produce telemetry.raw / consume telemetry.raw, fleet.alerts, fleet.events
                      ▼
               ┌────────────┐      telemetry.raw      ┌──────────────────┐   bulk insert   ┌────────────┐
               │   Kafka    │────────────────────────▶│ telemetry-ingest │───────────────▶│ ClickHouse │
               │  (KRaft)   │────────────────────────▶│ geofence-service │──fleet.alerts─▶│            │
               └────────────┘                         └──────────────────┘                 └────────────┘
```

## Services

| Service | Port(s) | Storage | Responsibility |
|---|---|---|---|
| gateway | 3001 HTTP + Socket.io `/live` | PostgreSQL (auth, audit, branding), Redis | JWT auth, RBAC, sessions, audit log, branding, device ingestion → Kafka, live fan-out, REST → gRPC proxy, Swagger (`/docs/admin`, `/docs/mobile`, `/docs/device`), observability |
| fleet-core | gRPC 50051, health 3011 | PostgreSQL | Vehicles, trackers (IMEI + token), drivers, maintenance logs, fuel norms, maintenance due calculation; emits `fleet.events` |
| telemetry-ingest | health 3012 | ClickHouse | Consumes `telemetry.raw` and `fleet.alerts` in batched micro-windows (1000 rows / 1 s) and bulk-inserts into ClickHouse with manual offset commits after a successful insert |
| geofence-service | gRPC 50052, health 3013 | PostgreSQL, Redis, BullMQ | Geofence CRUD, per-ping rule engine (speeding, geofence enter/exit, allowed hours, harsh brake, fuel drop, unauthorized stop, route deviation, SOS), emits `fleet.alerts`, queues urgent notifications (Telegram) |
| dispatch-order | gRPC 50053, health 3014 | PostgreSQL, Redis | Orders with status machine, routes (polyline + checkpoints), nearby vehicle lookup (Redis presence + fleet-core gRPC) |
| analytics | gRPC 50054, health 3015 | ClickHouse, PostgreSQL, BullMQ | KPIs, series, tracks, driver eco-scores, alert history, heatmap, nightly rollups, PDF/Excel report generation |
| migrator | one-shot | PostgreSQL | Runs TypeORM migrations and seeds `superadmin01` / platform settings, then exits |
| frontend | 3000 | — | Nuxt 3 SSR dashboard, proxies `/api/**` to the gateway |

## Data flow for one GPS ping

1. Tracker posts `POST /api/device/telemetry` with headers `x-device-imei` and `x-device-token`.
2. Gateway resolves the binding (Redis cache → PostgreSQL `devices_imei` + `vehicles`), validates the token hash, normalises the ping and produces it to Kafka `telemetry.raw` keyed by `vehicleId`; it also stores the last ping in Redis (`vehicle:last:{vehicleId}`).
3. `telemetry-ingest` buffers pings and bulk-inserts into `fleet.vehicle_telemetry`.
4. `geofence-service` evaluates the ping against the tenant's active geofences, the vehicle's limits, the previous state (Redis `geofence:state:{vehicleId}`) and the active route (dispatch gRPC), then publishes any alerts to `fleet.alerts` and queues urgent ones in BullMQ `notifications`.
5. Gateway's live consumer broadcasts `telemetry` and `alert` events to Socket.io room `org:{organizationId}`; `telemetry-ingest` persists alerts to `fleet.telemetry_alerts`.
6. The dashboard updates the marker and the Alert Center immediately.

## Repository layout

```
apps/gateway, apps/fleet-core, apps/telemetry-ingest, apps/geofence-service, apps/dispatch-order, apps/analytics, apps/migrator
libs/common      env loader, Kafka client/topics, gRPC helpers, geo math, time formatting, password hashing, contracts
libs/database    TypeORM entities, migrations, enums, data source factory
proto            common.proto, fleet.proto, geofence.proto, dispatch.proto, analytics.proto
clickhouse/init  DDL executed by the ClickHouse container on first boot
frontend         Nuxt 3 application
docker           Dockerfiles and Kafka topic init script
scripts          device simulator and the no-comments linter
docs             this documentation
```

## Design principles

- One backend Docker image (`fleet-telematics/backend`) built once with `nest build` for every app; each container starts a different entry file.
- Tenant isolation: every query is scoped by `organizationId` taken from the JWT; superadmin must pass `organizationId` explicitly.
- Idempotent provisioning: migrations and seeds run on every boot of the `migrator` container and are no-ops when already applied.
- At-least-once processing: Kafka offsets are committed only after ClickHouse confirms the insert.
- No comments in source code: names, types and tests carry the intent.
