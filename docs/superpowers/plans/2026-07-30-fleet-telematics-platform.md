# Fleet Telematics Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a dockerised multi-tenant fleet telematics platform (6 NestJS microservices, Nuxt 3 UI, Kafka, gRPC, BullMQ, PostgreSQL, ClickHouse, Redis) that boots with `docker compose up -d --build`.

**Architecture:** NestJS monorepo (webpack per app) sharing `libs/common` and `libs/database`; gateway exposes REST/WS and fans telemetry into Kafka; downstream services consume Kafka or serve gRPC; ClickHouse receives batched telemetry; the Nuxt frontend talks only to the gateway.

**Tech Stack:** NestJS 11, TypeORM 0.3, kafkajs 2, @grpc/grpc-js + @grpc/proto-loader, BullMQ 5, ioredis 5, @clickhouse/client 1, argon2, Nuxt 3.21, Pinia 3, Tailwind, Leaflet 1.9, ApexCharts, exceljs, pdfkit, jest 29, vitest 3.

**Spec:** `docs/superpowers/specs/2026-07-30-fleet-telematics-platform-design.md`

## Global Constraints

- No `//`, `/* */` or `<!-- -->` comments anywhere in source (ts, vue, proto, sql, yaml, Dockerfile).
- Superadmin seeded as `superadmin01` / `superadmin01` by the migrator app.
- Every commit authored by `jamshid14092002`, message in Uzbek, dated between 2026-07-30 and 2026-09-10 (helper `gc.sh`).
- Every task is developed on a branch `feature/<slug>`, tests run, then merged `--no-ff` into `main`.
- ClickHouse table definitions must match the spec verbatim (engine, partition, order, column types).
- UI strings exist in both `uz` and `ru` locale files.
- Mutating admin endpoints are recorded in `audit_logs`.

## Review Focus

1. Device ping with unknown IMEI → 401 from the device endpoint, nothing published to Kafka (test in Task 6).
2. Refresh token reused after rotation → session revoked and 401 (test in Task 5).
3. Ping exactly on a geofence vertex/edge → treated as inside, no flapping enter/exit (test in Task 9).
4. ClickHouse unavailable during a batch → offsets not committed, batch retried, no data loss (test in Task 8).
5. Dispatcher from tenant A requesting a vehicle of tenant B → 404/403, never data (test in Task 7).

---

### Task 1: Monorepo skeleton and tooling

**Files:** `package.json`, `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, `jest.config.ts`, `.gitignore`, `.editorconfig`, `.env.example`, `libs/common/src/index.ts`, `libs/common/src/config/env.ts`, `libs/common/src/kafka/topics.ts`, `libs/common/src/utils/geo.ts`, `libs/common/src/utils/geo.spec.ts`

**Produces:** `loadEnv()` typed env reader; `KafkaTopics` constants; `haversineKm(a,b)`, `pointInPolygon(point, ring)`, `distanceToPolylineKm(point, line)`.

- [ ] Write failing tests for geo utils (vertex, inside, outside, polyline distance)
- [ ] Implement, run `npx jest libs/common`, commit, merge.

### Task 2: Shared database library (entities + migrations)

**Files:** `libs/database/src/entities/*.entity.ts` (organization, platform-setting, user, user-session, login-history, audit-log, vehicle, device, driver, geofence, order, route, route-checkpoint, maintenance-log, fuel-norm), `libs/database/src/migrations/1753860000000-InitialSchema.ts`, `libs/database/src/data-source.ts`, `libs/database/src/index.ts`, `libs/database/src/enums.ts`

**Produces:** `buildDataSourceOptions(env)`; exported entity classes; `ALL_ENTITIES` array; `Role`, `VehicleStatus`, `OrderStatus`, `AlertType`, `Severity` enums.

- [ ] Write migration SQL creating all tables, indexes and FKs.
- [ ] Unit test: entity metadata loads (`new DataSource(opts).buildMetadatas()` with sqlite not available → validate via `getMetadataArgsStorage()` table count = 15).
- [ ] Commit, merge.

### Task 3: Protobuf contracts and gRPC helpers

**Files:** `proto/common.proto`, `proto/fleet.proto`, `proto/geofence.proto`, `proto/dispatch.proto`, `proto/analytics.proto`, `libs/common/src/grpc/grpc-options.ts`, `libs/common/src/grpc/packages.ts`

**Produces:** `grpcServerOptions(pkg, url)`, `grpcClientOptions(pkg, url)`, package names `fleet.v1`, `geofence.v1`, `dispatch.v1`, `analytics.v1`.

- [ ] Test: proto-loader loads every file without error and exposes expected service names.
- [ ] Commit, merge.

### Task 4: Migrator app with superadmin seeder

**Files:** `apps/migrator/src/main.ts`, `apps/migrator/src/seed/superadmin.seed.ts`, `apps/migrator/src/seed/platform.seed.ts`, `apps/migrator/src/seed/seed-runner.ts`

**Produces:** idempotent seeding; exit code 0.

- [ ] Test: `superadminSeed` is idempotent given a fake repository (creates once, updates nothing on second run).
- [ ] Commit, merge.

### Task 5: Gateway auth, RBAC, sessions, audit, branding

**Files:** `apps/gateway/src/main.ts`, `app.module.ts`, `auth/*` (controller, service, jwt.strategy, guards, decorators, dto), `sessions/*`, `audit/*` (interceptor, controller, service), `branding/*`, `organizations/*`, `users/*`, `health/*`, `common/tenant.ts`

**Produces:** `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`, `AuthUser { sub, organizationId, role, sessionId }`; endpoints `/api/auth/login|refresh|logout|change-password`, `/api/mobile/sessions` (list, terminate), `/api/admin/*`.

- [ ] Tests: `AuthService.rotateRefresh` revokes on reuse; `RolesGuard` denies wrong role; `TenantScope` builder.
- [ ] Commit, merge.

### Task 6: Gateway device ingestion, Kafka producer, Redis presence, WebSocket live gateway

**Files:** `apps/gateway/src/telemetry/*` (device.controller, ingest.service, presence.service, kafka.producer, live.gateway, live.consumer, status.ts), `apps/gateway/src/observability/*`

**Produces:** `deriveStatus(lastPing, now)`; Socket.io namespace `/live` events `telemetry`, `alert`, `vehicle.status`; `GET /api/live/vehicles`.

- [ ] Tests: `deriveStatus` matrix; unknown IMEI rejected before produce (mock producer not called).
- [ ] Commit, merge.

### Task 7: fleet-core service

**Files:** `apps/fleet-core/src/main.ts`, `app.module.ts`, `vehicles/*`, `devices/*`, `drivers/*`, `maintenance/*`, `events/fleet-events.producer.ts`

**Produces:** gRPC `fleet.v1.VehicleService`, `DeviceService`, `DriverService`, `MaintenanceService`.

- [ ] Tests: service scopes every query by organizationId (repo mock receives `where.organizationId`); maintenance due calculation.
- [ ] Gateway REST controllers for fleet (`apps/gateway/src/fleet/*`) proxying to gRPC.
- [ ] Commit, merge.

### Task 8: telemetry-ingest service

**Files:** `apps/telemetry-ingest/src/main.ts`, `app.module.ts`, `clickhouse/clickhouse.service.ts`, `ingest/batch-buffer.ts`, `ingest/telemetry.consumer.ts`, `ingest/alerts.consumer.ts`, `clickhouse/init/001_schema.sql`

**Produces:** `BatchBuffer<T>(maxSize, maxMs, flush)`; ClickHouse DDL.

- [ ] Tests: buffer flushes at size and at time; flush failure rethrows so the consumer does not commit.
- [ ] Commit, merge.

### Task 9: geofence-service

**Files:** `apps/geofence-service/src/main.ts`, `app.module.ts`, `geofences/*` (gRPC CRUD), `rules/rule-engine.ts`, `rules/rules/*.ts`, `rules/vehicle-state.store.ts`, `consumer/telemetry.consumer.ts`, `alerts/alert.producer.ts`, `notifications/notifications.processor.ts`, `notifications/telegram.sender.ts`

**Produces:** `RuleEngine.evaluate(ping, prevState, geofences, route): Alert[]`.

- [ ] Tests: speeding, exit/enter, edge no-flap, harsh brake, fuel drop, SOS, allowed-time window.
- [ ] Gateway REST for geofences and alert history.
- [ ] Commit, merge.

### Task 10: dispatch-order service

**Files:** `apps/dispatch-order/src/main.ts`, `app.module.ts`, `orders/*`, `routes/*`, `nearby/nearby.service.ts`

**Produces:** gRPC `dispatch.v1.OrderService`, `RouteService`; status machine `transition(from, to)`.

- [ ] Tests: illegal transition rejected; nearby sorting by haversine.
- [ ] Gateway REST for orders/routes, driver mobile endpoints.
- [ ] Commit, merge.

### Task 11: analytics service

**Files:** `apps/analytics/src/main.ts`, `app.module.ts`, `clickhouse/*`, `metrics/*` (queries, eco-score), `reports/*` (report.processor, pdf.builder, xlsx.builder), `rollups/rollup.processor.ts`

**Produces:** gRPC `analytics.v1.AnalyticsService`; `ecoScore(stats)`; report files in `/data/reports`.

- [ ] Tests: `ecoScore` bounds and monotonicity; xlsx builder writes timestamp header row 1.
- [ ] Gateway REST for analytics and report download.
- [ ] Commit, merge.

### Task 12: Docker Compose and images

**Files:** `docker/backend.Dockerfile`, `docker/frontend.Dockerfile`, `docker-compose.yml`, `docker/kafka-init.sh`, `.dockerignore`

- [ ] `docker compose config` validates; build backend image; commit, merge.

### Task 13: Frontend Nuxt 3

**Files:** `frontend/nuxt.config.ts`, `app.vue`, `layouts/*`, `middleware/auth.global.ts`, `stores/*`, `composables/*`, `components/*` (DataTable, ExportButtons, LiveMap, PlaybackMap, TelemetryCharts, AlertCenter, GeofenceEditor), `pages/*` per role, `i18n/locales/uz.json`, `ru.json`, `utils/export.ts`, `utils/status.ts`, tests in `tests/*.spec.ts`

- [ ] Vitest: export header contains timestamp; status colour mapper.
- [ ] Commit, merge.

### Task 14: Device simulator and documentation

**Files:** `scripts/simulator/index.mjs`, `docs/README.md`, `docs/architecture.md`, `docs/kafka-topics.md`, `docs/clickhouse-schema.md`, `docs/grpc-contracts.md`, `docs/setup.md`, `docs/operations.md`, `docs/security.md`, `docs/rbac.md`, `README.md`

- [ ] Commit, merge.

### Task 15: Full system boot and verification

- [ ] `docker compose up -d --build`; wait healthy; login as superadmin; run simulator; verify ClickHouse row counts and alert emission; fix defects on branches; final commit dated 2026-09-10.
