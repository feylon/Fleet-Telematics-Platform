# FleetView — Real-Time Logistics & Fleet Telematics Platform

Multi-tenant fleet telematics: live vehicle tracking, geofencing and safety alerts, dispatch orders with route
adherence, maintenance management, ClickHouse analytics with PDF/Excel reports, Uzbek and Russian UI.

Stack: NestJS microservices (gateway, fleet-core, telemetry-ingest, geofence-service, dispatch-order, analytics),
Nuxt 3 dashboard, Apache Kafka (KRaft), gRPC, BullMQ, PostgreSQL, ClickHouse, Redis, Docker Compose.

## Quick start

```bash
docker compose up -d --build
docker compose --profile simulator up -d simulator
```

Dashboard: http://localhost:3000 — login `superadmin01` / `superadmin01`.
Swagger: http://localhost:3001/docs/admin · /docs/mobile · /docs/device.

Full documentation: [docs/README.md](docs/README.md) (o'zbekcha ishga tushirish qo'llanmasi: [docs/ishga-tushirish.md](docs/ishga-tushirish.md)).
