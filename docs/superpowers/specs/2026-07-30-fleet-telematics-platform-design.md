# Fleet Telematics Platform — Design Specification

Date: 2026-07-30
Status: Approved for implementation (autonomous build under the assumptions listed in §11)

## 1. Intent

Build a production-grade, multi-tenant Real-Time Logistics & Fleet Telematics Platform. Dispatchers watch
vehicles live on a map, draw geofences and receive instant alerts; fleet managers run vehicle life-cycle and
driver behaviour reviews; drivers see their own orders and scores; a superadmin administers tenants, branding
and audit logs. Telemetry arrives at high rate from GPS trackers, flows through Kafka, lands in ClickHouse for
analytics and is evaluated in real time for safety violations.

Success criteria:

- `docker compose up -d --build` brings up the full system with no manual steps.
- Superadmin `superadmin01` / `superadmin01` exists after first boot (seeder).
- A device ping posted to the gateway appears on the dispatcher map within one second and in ClickHouse within
  two seconds; a speeding ping produces an alert in the Alert Center and in `telemetry_alerts`.
- Every table/dashboard exports to PDF and Excel with a generation timestamp header.
- UI fully available in Uzbek and Russian.
- Source code contains no inline or block comments.

## 2. Repository layout (npm workspaces, NestJS monorepo)

```
/apps/gateway            REST + WebSocket + device ingestion, auth, RBAC, audit, branding
/apps/fleet-core         vehicles, devices, drivers, maintenance (PostgreSQL, gRPC server)
/apps/telemetry-ingest   Kafka -> ClickHouse batch writer
/apps/geofence-service   Kafka consumer, geofence CRUD (gRPC), rule engine, BullMQ notifications
/apps/dispatch-order     orders, routes, checkpoints (PostgreSQL, gRPC server)
/apps/analytics          ClickHouse analytics (gRPC), BullMQ rollups, PDF/Excel report generation
/apps/migrator           one-shot container: TypeORM migrations + superadmin seeder
/libs/common             shared config, Kafka topics, gRPC client factory, DTO types, utils
/libs/database           TypeORM entities + migrations shared by Postgres-backed services
/proto                   protobuf contracts
/frontend                Nuxt 3 application
/clickhouse/init         ClickHouse DDL executed on first boot
/docs                    documentation
/scripts                 device simulator and operational helpers
```

A single backend Docker image is built once (`nest build` for every app) and started with a different
entrypoint per service. The frontend has its own image.

## 3. Infrastructure (Docker Compose)

| Service | Image | Notes |
|---|---|---|
| kafka | apache/kafka:3.9.1 | KRaft single node, auto-create disabled, topics created by `kafka-init` |
| clickhouse | clickhouse/clickhouse-server:24.8 | DDL from `/docker-entrypoint-initdb.d` |
| postgres | postgres:16-alpine | database `fleet` |
| redis | redis:7-alpine | AOF persistence |
| migrator | backend image | runs migrations and seeder, exits 0 |
| gateway, fleet-core, telemetry-ingest, geofence-service, dispatch-order, analytics | backend image | wait for migrator |
| frontend | frontend image | Nuxt SSR, proxies `/api` and `/socket.io` to gateway |

Exposed ports: frontend 3000, gateway 3001 (REST, Swagger, Socket.io), ClickHouse 8123, Postgres 5432,
Kafka 29092 (host listener, internal listener 9092), Redis 6379.

## 4. Kafka topology

| Topic | Partitions | Key | Producer | Consumers |
|---|---|---|---|---|
| `telemetry.raw` | 12 | vehicleId | gateway | telemetry-ingest (group `telemetry-ingest`), geofence-service (group `geofence-safety`), gateway (group `gateway-live`) for live fan-out |
| `fleet.alerts` | 6 | vehicleId | geofence-service | telemetry-ingest (ClickHouse `telemetry_alerts`), gateway (WebSocket push) |
| `fleet.events` | 3 | organizationId | fleet-core, geofence-service, dispatch-order | geofence-service (cache invalidation), gateway |

Telemetry message (JSON):

```
{ organizationId, vehicleId, imei, timestamp, latitude, longitude, speed, altitude, heading,
  fuelLevel, engineTemp, ignitionOn, isMoving, sos }
```

Alert message (JSON):

```
{ organizationId, vehicleId, timestamp, alertType, severity, details, latitude, longitude }
```

`alertType` ∈ SPEEDING, GEOFENCE_EXIT, GEOFENCE_ENTER, HARSH_BRAKE, FUEL_DROP, UNAUTHORIZED_STOP,
ROUTE_DEVIATION, SOS. `severity` ∈ INFO, WARNING, CRITICAL.

## 5. Data model

### PostgreSQL (TypeORM, migrations, no synchronize)

organizations, platform_settings, users (role enum SUPERADMIN | DISPATCHER | FLEET_MANAGER | DRIVER),
user_sessions (hashed refresh token, ip, user agent, revokedAt), login_history, audit_logs, vehicles,
devices_imei, drivers, geofences (GeoJSON polygon jsonb, speedLimit, allowedFrom, allowedTo, active),
orders, routes, route_checkpoints, maintenance_logs, fuel_norms.

### ClickHouse

`vehicle_telemetry` MergeTree, partition `toYYYYMM(timestamp)`, order `(organization_id, vehicle_id, timestamp)`,
columns exactly as specified plus `organization_id UUID`, `sos UInt8`.

`telemetry_alerts` MergeTree, order `(organization_id, alert_type, timestamp)`, `alert_type Enum8` (spec types plus
GEOFENCE_ENTER, UNAUTHORIZED_STOP, ROUTE_DEVIATION, SOS, TIME_WINDOW_VIOLATION), `severity Enum8`, `details String`,
`latitude`, `longitude`, `geofence_id`, `order_id`.

`vehicle_daily_rollup` ReplacingMergeTree(computed_at) built nightly (recomputing a day replaces it; chosen over SummingMergeTree so recomputes stay idempotent) by the analytics BullMQ job (mileage, moving/idle seconds,
max speed, fuel consumed, harsh events) to make dashboards cheap.

### Redis

`vehicle:last:{vehicleId}` JSON (last ping, TTL 7 days so the last known position survives long offline periods; OFFLINE status is derived after 5 minutes), `org:vehicles:{orgId}` set, `geofence:state:{vehicleId}`
set of geofence ids the vehicle is inside, `device:{imei}` cached vehicle binding, rate-limit buckets,
BullMQ queues `notifications`, `reports`, `rollups`.

## 6. gRPC contracts (`/proto`)

- `fleet.proto` — VehicleService, DeviceService, DriverService, MaintenanceService
- `geofence.proto` — GeofenceService (CRUD, list active by organization)
- `dispatch.proto` — OrderService, RouteService, nearby vehicle lookup (calls fleet-core)
- `analytics.proto` — AnalyticsService (fleet summary, vehicle series, driver scores, report job control)

Messages carry `organization_id` for tenant scoping. Gateway maps REST DTOs to gRPC calls with the
`@nestjs/microservices` gRPC client.

## 7. Service responsibilities

**gateway**: JWT access (15 min) and refresh (7 days, rotated, stored hashed in `user_sessions`), argon2,
RBAC guard with role decorators, tenant guard, audit interceptor, login history, session termination endpoints
tagged `Mobile`. Two Swagger documents: `/docs/admin` and `/docs/mobile`. Device ingestion
`POST /api/device/telemetry` and `/api/device/telemetry/batch` authenticated by per-device token
(`devices_imei.token`), resolves IMEI → vehicle via Redis cache / fleet-core gRPC, publishes to `telemetry.raw`,
updates Redis presence. Socket.io namespace `/live` with JWT handshake, rooms per organization; emits
`telemetry`, `alert`, `vehicle.status`. Consumes `telemetry.raw` and `fleet.alerts` to broadcast.
Observability endpoints for superadmin: Kafka consumer lag (admin API), ClickHouse ingest rate, Redis info.

**fleet-core**: owns vehicles, devices, drivers, maintenance, fuel norms. Publishes `fleet.events`.

**telemetry-ingest**: eachBatch consumer; buffers up to 1000 rows or 1 second, inserts with JSONEachRow;
commits offsets after successful insert; alerts topic → `telemetry_alerts`.

**geofence-service**: geofence CRUD over gRPC; in-memory geofence cache per organization refreshed on
`fleet.events`; rule engine per ping with previous-state from Redis: speeding (geofence limit or vehicle max),
geofence enter/exit, allowed-time window violation, harsh brake (speed delta over interval), fuel drop (level
drop > threshold while not moving), unauthorized stop (ignition on, speed 0, outside geofence for > N min),
SOS flag, route deviation (distance from active route polyline > threshold, route fetched from dispatch gRPC).
Emits to `fleet.alerts` and enqueues BullMQ `notifications` jobs (Telegram Bot API when configured).

**dispatch-order**: orders with checkpoints and status machine (CREATED → ASSIGNED → IN_PROGRESS →
COMPLETED | CANCELLED), route polyline, nearby vehicles via fleet-core + Redis presence.

**analytics**: ClickHouse queries for fleet summary, per-vehicle series, idle time, fuel curves, driver
eco-score (harsh events per 100 km, over-speed ratio, over-rev proxy from engine temp/speed), report jobs
producing PDF (pdfkit) and XLSX (exceljs) stored on a shared volume, downloadable through gateway. Nightly
rollup cron job via BullMQ repeatable job.

**migrator**: runs TypeORM migrations, seeds platform settings and `superadmin01`.

## 8. Frontend (Nuxt 3)

Pinia stores (auth, branding, live, alerts, i18n), Tailwind, Leaflet with marker clustering and heading-rotated
vehicle icons, status colours (Moving green, Idle amber, Offline grey, Emergency red), heatmap layer,
route playback with timeline slider from ClickHouse history, ApexCharts speed/fuel curves, generic DataTable
component with sorting, multi-filter, PDF/Excel export with timestamp header, Alert Center with sound.
Role-based layouts: superadmin (tenants, admins, branding, audit, health), dispatcher (live map, geofences,
orders, alerts), fleet manager (vehicles, drivers, maintenance, scores), driver (my orders, my vehicle, my score,
password change). Languages uz (default) and ru.

## 9. Security

argon2id hashing, JWT RS/HS256 with rotating refresh tokens, per-session revocation, login history (ip, UA,
success/failure), rate limiting on auth and device endpoints, helmet, CORS allow-list, tenant isolation
enforced in every query by organizationId from the token, audit log of all mutating admin requests.

## 10. Testing

Jest unit tests in each service for pure logic: geometry (point-in-polygon, haversine), rule engine, batch
buffer, status derivation, eco-score, auth token rotation. Frontend Vitest for export header and status mapper.
Every change is developed on a feature branch, tests run, and only passing branches are merged into `main`.

## 11. Assumptions

- Leaflet with OpenStreetMap tiles is used (no Mapbox token required); the UI is designed so a Mapbox tile
  layer can be substituted via env.
- Push notifications beyond WebSocket and Telegram are out of scope (no FCM credentials available).
- Point-in-polygon is computed in the service from GeoJSON stored in PostgreSQL jsonb (no PostGIS).
- A device simulator (`scripts/simulator`) is shipped to produce realistic traffic for demonstration; it is an
  operational tool, not a mock inside the services.
