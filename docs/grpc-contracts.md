# gRPC contracts

All inter-service synchronous calls use gRPC with Protocol Buffers from `/proto`. Services load the `.proto` files at
runtime with `@grpc/proto-loader` (`keepCase=false`, so field names are camelCase in TypeScript). Every request carries
`organization_id` for tenant scoping; services return `NOT_FOUND` for entities outside the caller's tenant.

| File | Package | Services | Served by | Called by |
|---|---|---|---|---|
| `common.proto` | `common.v1` | — (Empty, IdRequest, Pagination, PageMeta, DeleteResponse, GeoPoint) | — | all |
| `fleet.proto` | `fleet.v1` | `VehicleService`, `DeviceService`, `DriverService`, `MaintenanceService` | fleet-core:50051 | gateway, dispatch-order |
| `geofence.proto` | `geofence.v1` | `GeofenceService` | geofence-service:50052 | gateway |
| `dispatch.proto` | `dispatch.v1` | `OrderService`, `RouteService` | dispatch-order:50053 | gateway, geofence-service (`RouteService.ActiveRouteForVehicle`) |
| `analytics.proto` | `analytics.v1` | `AnalyticsService` | analytics:50054 | gateway |

## Method map

### fleet.v1

- `VehicleService`: Create, Update, Get, List (search/status/pagination), GetMany, Delete, SetStatus
- `DeviceService`: Create (returns the device token once), Update, Get, List, Delete, RotateToken, Resolve (IMEI + token → binding), Touch
- `DriverService`: Create, Update, Get, GetByUser, List, Delete, AssignVehicle
- `MaintenanceService`: Create (can mark the vehicle out of service and update inspection schedule), List, Delete, Due, UpsertFuelNorm, GetFuelNorm

### geofence.v1

- `GeofenceService`: Create, Update, Get, List (`only_active`), Delete, VehicleState (geofences a vehicle is inside)

Polygons travel as `polygon_geojson` (a GeoJSON `Polygon` string); the service validates rings and closes them.

### dispatch.v1

- `OrderService`: Create, Update, Get, List, Delete, Assign (vehicle + driver, validates through fleet-core), Transition (status machine, driver-restricted when `actor_driver_id` is set), DriverOrders, Nearby
- `RouteService`: SetRoute (polyline + checkpoints + deviation threshold), ActiveRouteForVehicle, ReachCheckpoint

Order status machine: `CREATED → ASSIGNED → IN_PROGRESS → COMPLETED`, with `CANCELLED` reachable from any open state and
`ASSIGNED → CREATED` to unassign. Drivers may only start (`ASSIGNED → IN_PROGRESS`) and complete (`IN_PROGRESS → COMPLETED`).

### analytics.v1

- `AnalyticsService`: Summary, VehicleSeries, Track, DriverScores, DailyRollups, RunRollup, Alerts, AlertStats, Heatmap, RequestReport, ListReports, GetReportFile, Ingest

## Presence of optional booleans

Fields whose absence must be distinguishable from `false` are declared `optional` (`DeviceInput.is_active`,
`DriverInput.is_active`, `GeofenceInput.alert_on_enter/alert_on_exit/is_active`). With `oneofs=true` in the loader,
absent values decode as `undefined` and service defaults apply.

## Error mapping

Services throw `RpcException` with gRPC status codes (`NOT_FOUND`, `INVALID_ARGUMENT`, `ALREADY_EXISTS`,
`PERMISSION_DENIED`, `FAILED_PRECONDITION`). The gateway maps them to HTTP 404 / 400 / 409 / 403 / 422 through
`grpcErrorToHttp` in `libs/common`.

## Regenerating

No code generation step is required; the protos are loaded at runtime. Keep `proto/` copied into the backend image
(`docker/backend.Dockerfile`) and set `PROTO_DIR` if the files live elsewhere.
