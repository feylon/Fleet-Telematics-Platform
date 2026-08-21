# Operations runbook

## Health

| Check | Command / URL |
|---|---|
| Containers | `docker compose ps` (all services have health checks) |
| Gateway | `curl localhost:3001/api/health` → postgres/redis status |
| Services | `health` endpoints on 3011–3015 inside the network (`docker compose exec fleet-core wget -qO- localhost:3011/health`) |
| Platform snapshot | `GET /api/admin/system/health` with a superadmin token: Kafka end offsets and consumer lag per group, ClickHouse rows per minute/hour, Redis memory and clients, PostgreSQL connections, WebSocket clients |
| Ingest counters | `telemetry-ingest` health shows rows written since start |

## Logs

```bash
docker compose logs -f gateway
docker compose logs -f geofence-service telemetry-ingest
```

## Kafka

```bash
docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --all-groups
docker compose exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --describe
```

Reset an ingest group to replay history into ClickHouse (stop `telemetry-ingest` first):

```bash
docker compose stop telemetry-ingest
docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:9092 --group telemetry-ingest --topic telemetry.raw --reset-offsets --to-earliest --execute
docker compose start telemetry-ingest
```

## ClickHouse

```bash
docker compose exec clickhouse clickhouse-client --password "$CLICKHOUSE_PASSWORD" -q "SELECT count() FROM fleet.vehicle_telemetry"
```

Retention: drop monthly partitions (`ALTER TABLE fleet.vehicle_telemetry DROP PARTITION '202607'`). Rollups are
recomputed with `POST /api/analytics/daily/recompute?from=&to=`.

## Backups

- PostgreSQL: `docker compose exec postgres pg_dump -U fleet fleet > backup.sql`
- ClickHouse: `BACKUP TABLE fleet.vehicle_telemetry TO Disk('backups', 'telemetry.zip')` or copy the `clickhouse-data` volume
- Reports: volume `reports-data`

## Scaling

- `gateway` is horizontally scalable (each replica joins Kafka with its own live group id); put a load balancer with sticky
  sessions or enable the Socket.io Redis adapter for multi-node WebSocket fan-out.
- `telemetry-ingest` and `geofence-service` scale up to the partition count of `telemetry.raw` (12).
- Infrastructure ports (PostgreSQL, Redis, Kafka, ClickHouse) are bound to `BIND_HOST` (default `127.0.0.1`); Redis requires
  `REDIS_PASSWORD` and runs with `noeviction` because BullMQ queues live there.
- Increase `INGEST_BATCH_SIZE` for higher throughput, keep `INGEST_BATCH_MS` ≤ 1000 for freshness.
- Kafka single broker is for one node; for a cluster raise replication factors in `docker/kafka-init.sh`.

## Notifications

Set `TELEGRAM_BOT_TOKEN` (global) and either a per-organization `telegramChatId` (superadmin → organization settings) or the
fallback `TELEGRAM_CHAT_ID`; restart `geofence-service` after changing the token. Urgent alerts (CRITICAL severity,
geofence enter/exit, fuel drop, SOS) are queued in BullMQ `notifications` with three retries and exponential backoff.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `migrator` exits non-zero | PostgreSQL not ready or wrong password; `docker compose logs migrator` |
| Vehicles stay OFFLINE | Device token wrong (gateway returns 401), tracker inactive, or Kafka down; check `/api/admin/system/health` |
| Alerts not arriving | `geofence-service` lag growing or crashed; check consumer lag and logs |
| ClickHouse rows not growing | `telemetry-ingest` logs; offsets are only committed after successful inserts, so restarting replays safely |
| Reports stuck in `queued` | `analytics` worker down or Redis unavailable; check `docker compose logs analytics` |
| WebSocket not connecting from the browser | `PUBLIC_WS_URL` must be reachable from the browser and listed in `CORS_ORIGINS` |
