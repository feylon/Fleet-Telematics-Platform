# ClickHouse schema

Database `fleet`, created by `clickhouse/init/001_schema.sql` on the first start of the `clickhouse` container.

## `vehicle_telemetry`

| Column | Type |
|---|---|
| timestamp | DateTime64(3, 'UTC') |
| organization_id | UUID |
| vehicle_id | UUID |
| imei | String |
| latitude | Float64 |
| longitude | Float64 |
| speed | Float32 |
| altitude | Float32 |
| heading | Float32 |
| fuel_level | Float32 |
| engine_temp | Float32 |
| ignition_on | UInt8 |
| is_moving | UInt8 |
| sos | UInt8 |

`ENGINE = MergeTree() PARTITION BY toYYYYMM(timestamp) ORDER BY (organization_id, vehicle_id, timestamp)`.

The sorting key makes "one vehicle over a time range" a contiguous scan; monthly partitions make retention a `DROP PARTITION`.

## `telemetry_alerts`

| Column | Type |
|---|---|
| timestamp | DateTime64(3, 'UTC') |
| organization_id | UUID |
| vehicle_id | UUID |
| alert_type | Enum8(SPEEDING=1, GEOFENCE_EXIT=2, GEOFENCE_ENTER=3, HARSH_BRAKE=4, FUEL_DROP=5, UNAUTHORIZED_STOP=6, ROUTE_DEVIATION=7, SOS=8, TIME_WINDOW_VIOLATION=9) |
| severity | Enum8(INFO=1, WARNING=2, CRITICAL=3) |
| details | String |
| latitude, longitude | Float64 |
| geofence_id, order_id | String (empty when not applicable) |

`ENGINE = MergeTree() PARTITION BY toYYYYMM(timestamp) ORDER BY (organization_id, alert_type, timestamp)`.

## `vehicle_daily_rollup`

Pre-aggregated day/vehicle statistics written by the analytics nightly job (01:15 Asia/Tashkent) and by
`POST /api/analytics/daily/recompute`.

| Column | Type |
|---|---|
| day | Date |
| organization_id, vehicle_id | UUID |
| mileage_km | Float64 |
| moving_seconds, idle_seconds | UInt64 |
| max_speed, avg_speed, fuel_consumed | Float32 |
| harsh_events, speeding_events | UInt32 |
| pings | UInt64 |
| computed_at | DateTime64(3, 'UTC') |

`ENGINE = ReplacingMergeTree(computed_at) PARTITION BY toYYYYMM(day) ORDER BY (organization_id, vehicle_id, day)` — recomputing a day
replaces the previous row; readers use `FINAL`.

## Analytical queries used by the analytics service

Mileage is computed inside ClickHouse with window functions and `geoDistance`:

```sql
WITH steps AS (
  SELECT vehicle_id, timestamp, latitude, longitude, speed, fuel_level, engine_temp, is_moving, ignition_on,
    lagInFrame(latitude) OVER w AS plat, lagInFrame(longitude) OVER w AS plon, lagInFrame(timestamp) OVER w AS pts,
    lagInFrame(fuel_level) OVER w AS pfuel
  FROM vehicle_telemetry
  WHERE organization_id = {organizationId:UUID} AND timestamp >= {from:DateTime64(3)} AND timestamp < {to:DateTime64(3)}
  WINDOW w AS (PARTITION BY vehicle_id ORDER BY timestamp ROWS BETWEEN 1 PRECEDING AND CURRENT ROW)
)
SELECT vehicle_id,
  sum(if(pts = toDateTime64('1970-01-01 00:00:00.000', 3, 'UTC') OR dateDiff('second', pts, timestamp) > 300, 0,
         least(geoDistance(plon, plat, longitude, latitude), 5000))) / 1000 AS mileage_km,
  sumIf(least(dateDiff('second', pts, timestamp), 300), is_moving = 1) AS moving_seconds,
  sumIf(least(dateDiff('second', pts, timestamp), 300), is_moving = 0 AND ignition_on = 1) AS idle_seconds,
  max(speed) AS max_speed, avgIf(speed, is_moving = 1) AS avg_speed,
  sumIf(pfuel - fuel_level, pfuel > fuel_level AND is_moving = 1 AND pfuel - fuel_level < 15) AS fuel_drop_points,
  countIf(engine_temp > 105) AS over_rev_events, count() AS pings
FROM steps GROUP BY vehicle_id
```

Gaps over five minutes and jumps over five kilometres are ignored to filter GPS noise. Fuel consumption in litres is
`fuel_drop_points / 100 × fuelTankCapacity` (capacity comes from PostgreSQL).

Other queries: bucketed series (`toStartOfInterval`), raw track for playback, alert history with pagination, alert
counts by type, and a heatmap built from `round(latitude, p), round(longitude, p)` cells.

## Retention

Drop old partitions when needed:

```sql
ALTER TABLE fleet.vehicle_telemetry DROP PARTITION '202607';
```
