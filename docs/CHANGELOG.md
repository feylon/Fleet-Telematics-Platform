# Changelog

## 1.0.0 — 2026-09-10

Birinchi ishlab chiqarish relizi / First production release.

- Monorepo: 6 NestJS microservices (gateway, fleet-core, telemetry-ingest, geofence-service, dispatch-order, analytics) + migrator, shared `libs/common` and `libs/database`, gRPC contracts in `proto/`.
- Infrastructure: Apache Kafka (KRaft), ClickHouse, PostgreSQL, Redis, BullMQ, Docker Compose with health-checked boot order and single backend image.
- Security: argon2id, rotating refresh tokens with reuse detection, session-derived principals, per-user login history, audit log, RBAC for SUPERADMIN / DISPATCHER / FLEET_MANAGER / DRIVER, tenant isolation, device tokens, rate limiting.
- Telemetry: device ingestion → Kafka → ClickHouse (batched, at-least-once), Redis presence, Socket.io live fan-out.
- Safety: geofence rule engine (speeding, geofence enter/exit, allowed hours, harsh brake, fuel drop, unauthorized stop, route deviation, SOS) with Kafka alerts and BullMQ Telegram notifications per organization.
- Dispatch: orders with status machine, nearby vehicle lookup, routes with checkpoints and route-adherence alerts, driver mobile endpoints.
- Analytics: ClickHouse KPIs, series, tracks, eco-driving scores, heatmap, nightly rollups, PDF/Excel reports in Uzbek and Russian with generation timestamps.
- Frontend: Nuxt 3 dashboard per role with live clustered map, geofence and route editors, playback with timeline, charts, exportable tables, uz/ru i18n, dynamic branding.
- Seeder: `superadmin01 / superadmin01`.
- Documentation in `docs/` (architecture, Kafka, ClickHouse, gRPC, API, security, operations, setup in Uzbek and English, frontend, testing).
