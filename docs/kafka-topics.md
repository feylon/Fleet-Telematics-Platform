# Kafka topology

Kafka runs in KRaft mode (no ZooKeeper) as a single broker (`apache/kafka:3.9.1`). Topics are created by the
`kafka-init` container (`docker/kafka-init.sh`); automatic topic creation is disabled.

| Topic | Partitions | Retention | Key | Producers | Consumers (group) |
|---|---|---|---|---|---|
| `telemetry.raw` | 12 | 7 days | `vehicleId` | gateway | telemetry-ingest (`telemetry-ingest`), geofence-service (`geofence-safety`), gateway live fan-out (`gateway-live-<hostname>`) |
| `fleet.alerts` | 6 | 30 days | `vehicleId` | geofence-service | telemetry-ingest (`alerts-ingest`), gateway live fan-out |
| `fleet.events` | 3 | 7 days | `organizationId` | fleet-core, geofence-service, dispatch-order | geofence-service (`geofence-events`), gateway live fan-out |

Keying by `vehicleId` keeps every vehicle's pings ordered inside one partition, which the rule engine relies on.

## Messages

### `telemetry.raw`

```json
{
  "organizationId": "uuid", "vehicleId": "uuid", "imei": "860000000000001",
  "timestamp": "2026-08-01T10:00:00.000Z",
  "latitude": 41.3111, "longitude": 69.2797, "speed": 54.5, "altitude": 455, "heading": 180,
  "fuelLevel": 63.2, "engineTemp": 88, "ignitionOn": true, "isMoving": true, "sos": false
}
```

### `fleet.alerts`

```json
{
  "organizationId": "uuid", "vehicleId": "uuid", "timestamp": "2026-08-01T10:00:00.000Z",
  "alertType": "SPEEDING", "severity": "WARNING", "details": "01A123BC at 72 km/h, limit 60 km/h",
  "latitude": 41.31, "longitude": 69.28, "geofenceId": "uuid?", "orderId": "uuid?"
}
```

`alertType` ∈ `SPEEDING | GEOFENCE_EXIT | GEOFENCE_ENTER | HARSH_BRAKE | FUEL_DROP | UNAUTHORIZED_STOP | ROUTE_DEVIATION | SOS | TIME_WINDOW_VIOLATION`, `severity` ∈ `INFO | WARNING | CRITICAL`.

### `fleet.events`

```json
{ "organizationId": "uuid", "event": "geofence.changed", "entityId": "uuid", "timestamp": "...", "payload": { } }
```

`event` ∈ `geofence.changed | vehicle.changed | device.changed | driver.changed | order.changed | route.changed | branding.changed`.
Consumers use these to invalidate caches (device bindings in the gateway, geofence/vehicle/route caches in geofence-service).

## Batching and delivery guarantees

- Gateway producer: `kafkajs` producer with `allowAutoTopicCreation=false`; batch endpoints send up to 500 pings in one `send`.
- telemetry-ingest: `eachBatch` consumer with `autoCommit=false` and `eachBatchAutoResolve=false`. Rows are pushed into a `BatchBuffer` (max 1000 rows or 1000 ms, both configurable with `INGEST_BATCH_SIZE` / `INGEST_BATCH_MS`). When the buffer flushes, rows are inserted with `JSONEachRow`, then the offsets are committed. If ClickHouse fails, the error propagates, no offset is committed, and the consumer restarts from the last committed offset (at-least-once).
- geofence-service: `eachMessage` consumer with four partitions processed concurrently; state is kept in Redis so evaluation is stateless across restarts.
- Gateway live consumer uses a per-instance group id so every gateway replica receives every message.

## Observability

`GET /api/admin/system/health` (superadmin) reports end offsets per topic and the lag of every consumer group.
