# Testing and workflow

## Suites

| Suite | Command | Covers |
|---|---|---|
| Backend unit tests (Jest, 28 suites, 108 tests) | `npm test` | geo math (point-in-polygon incl. vertices/edges, haversine, polyline distance), mapping helpers, entity/migration consistency, proto loading, superadmin seeder idempotency, auth token rotation and reuse detection, role guard, tenant resolver, audit redaction, device ingestion (unknown IMEI rejected before publish), live status derivation, fleet tenant scoping, maintenance due rules, ClickHouse batch buffer (size/time flush, failure discards and rewinds to the first unwritten offset), ClickHouse row mapping, geofence rule engine (all alert types, edge no-flap, cooldowns), polygon validation, notifications, order status machine and daily numbering, nearby ranking, eco-score, report builders (timestamp header in Excel, Cyrillic PDF), rollup helpers, analytics range limits, session-derived principals and organization deactivation, out-of-order ping rejection |
| No-comments linter | `npm run lint:comments` | Fails on any `//`, `/* */` or `<!-- -->` in source |
| Frontend (Vitest) | `cd frontend && npm test` | export header/timestamp, status colour mapping and icon rotation, auth store |

## Branch workflow

Every change is developed on a `feature/<name>` branch, tests are run, and only a green branch is merged into `main`
with a `--no-ff` merge commit. The git history shows one feature branch per task of the implementation plan.

## Live verification performed during development

Each service was smoke-tested against real PostgreSQL, Redis, Kafka (KRaft) and ClickHouse containers: login/refresh
rotation/revocation, audit with redaction, device ingestion → Kafka → WebSocket, ClickHouse exact row counts with zero
consumer lag, all alert types reaching the Alert Center cache and `telemetry_alerts`, BullMQ notification worker,
order lifecycle with driver actions and route deviation, analytics metrics, rollups and PDF/Excel report generation
in both languages.
