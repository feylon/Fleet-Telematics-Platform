CREATE DATABASE IF NOT EXISTS fleet;

CREATE TABLE IF NOT EXISTS fleet.vehicle_telemetry
(
    timestamp DateTime64(3, 'UTC'),
    organization_id UUID,
    vehicle_id UUID,
    imei String,
    latitude Float64,
    longitude Float64,
    speed Float32,
    altitude Float32,
    heading Float32,
    fuel_level Float32,
    engine_temp Float32,
    ignition_on UInt8,
    is_moving UInt8,
    sos UInt8
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (organization_id, vehicle_id, timestamp)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS fleet.telemetry_alerts
(
    timestamp DateTime64(3, 'UTC'),
    organization_id UUID,
    vehicle_id UUID,
    alert_type Enum8('SPEEDING' = 1, 'GEOFENCE_EXIT' = 2, 'GEOFENCE_ENTER' = 3, 'HARSH_BRAKE' = 4, 'FUEL_DROP' = 5, 'UNAUTHORIZED_STOP' = 6, 'ROUTE_DEVIATION' = 7, 'SOS' = 8, 'TIME_WINDOW_VIOLATION' = 9),
    severity Enum8('INFO' = 1, 'WARNING' = 2, 'CRITICAL' = 3),
    details String,
    latitude Float64,
    longitude Float64,
    geofence_id String DEFAULT '',
    order_id String DEFAULT ''
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (organization_id, alert_type, timestamp)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS fleet.vehicle_daily_rollup
(
    day Date,
    organization_id UUID,
    vehicle_id UUID,
    mileage_km Float64,
    moving_seconds UInt64,
    idle_seconds UInt64,
    max_speed Float32,
    avg_speed Float32,
    fuel_consumed Float32,
    harsh_events UInt32,
    speeding_events UInt32,
    pings UInt64,
    computed_at DateTime64(3, 'UTC')
)
ENGINE = ReplacingMergeTree(computed_at)
PARTITION BY toYYYYMM(day)
ORDER BY (organization_id, vehicle_id, day);
