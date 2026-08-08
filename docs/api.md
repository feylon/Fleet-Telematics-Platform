# Gateway API surface

Base URL: `http://localhost:3001`. Every endpoint except `/api/auth/login`, `/api/auth/refresh`, `/api/public/*`,
`/api/health` and `/api/device/*` requires `Authorization: Bearer <accessToken>`.

Three Swagger documents separate audiences:

| Document | Audience | Content |
|---|---|---|
| `/docs/admin` | Internal admin web (Nuxt) | Auth, superadmin, users, fleet, geofences, orders, analytics, live |
| `/docs/mobile` | Mobile / external consumers | `/api/mobile/**` — sessions, login history, driver self-service |
| `/docs/device` | GPS trackers | `/api/device/telemetry`, `/api/device/telemetry/batch` |

## Auth

| Method | Path | Notes |
|---|---|---|
| POST | /api/auth/login | `{login,password,client?}` → access (15 min) + refresh (7 days) |
| POST | /api/auth/refresh | Rotates the refresh token; reuse of an old token revokes the session |
| POST | /api/auth/logout | Terminates the current session |
| GET | /api/auth/me | Profile |
| POST | /api/auth/change-password | Terminates other sessions |

## Superadmin

`/api/admin/organizations` (CRUD), `/api/admin/users` (list, lookup by id, create, update, `PUT :id/credentials`,
delete, `:id/login-history`, `:id/sessions`), `/api/admin/branding` (PUT), `/api/admin/audit-logs` (filters
`organizationId`, `userId`, `resource`, `from`, `to`), `/api/admin/system/health` (Kafka lag, ClickHouse, Redis,
PostgreSQL, WebSocket clients). Superadmin passes `?organizationId=` to every tenant-scoped endpoint.

## Fleet (fleet manager; dispatcher read-only)

`/api/fleet/vehicles` (CRUD, `PUT :id/status`), `/api/fleet/devices` (CRUD, `POST :id/rotate-token`),
`/api/fleet/drivers` (CRUD, `PUT :id/vehicle`), `/api/fleet/maintenance` (list, `due`, create, delete,
`fuel-norms/:vehicleId` GET/PUT).

## Dispatch (dispatcher)

`/api/geofences` (CRUD, `vehicle-state/:vehicleId`), `/api/orders` (CRUD, `nearby`, `PUT :id/assign`,
`PUT :id/status`, `PUT :id/route`, `PUT :id/checkpoints/:checkpointId/reach`), `/api/live/vehicles`,
`/api/live/vehicles/:id`, `/api/live/alerts/recent`.

## Analytics (dispatcher, fleet manager)

`/api/analytics/summary`, `/api/analytics/vehicles/:id/series`, `/api/analytics/vehicles/:id/track`,
`/api/analytics/driver-scores`, `/api/analytics/daily`, `POST /api/analytics/daily/recompute`,
`/api/analytics/alerts`, `/api/analytics/alerts/stats`, `/api/analytics/heatmap`, `POST /api/analytics/reports`,
`/api/analytics/reports`, `/api/analytics/reports/:jobId/download`.

Report types: `FLEET_SUMMARY`, `DRIVER_SCORES`, `ALERTS`, `VEHICLE_TRACK`, `DAILY_ROLLUP`; formats `pdf`, `xlsx`;
locales `uz`, `ru`. Every file starts with a generation timestamp header.

## Mobile (driver)

`/api/mobile/driver/me`, `/api/mobile/driver/orders`, `/api/mobile/driver/orders/today`,
`PUT /api/mobile/driver/orders/:id/status`, `PUT /api/mobile/driver/orders/:id/checkpoints/:checkpointId/reach`,
`/api/mobile/driver/stats`, `/api/mobile/sessions`, `DELETE /api/mobile/sessions/:id`,
`DELETE /api/mobile/sessions/others`, `/api/mobile/login-history`.

## Device

`POST /api/device/telemetry` and `POST /api/device/telemetry/batch` with headers `x-device-imei` and
`x-device-token`. Responds `202 {accepted, vehicleId}`; unknown IMEI or wrong token → 401 and nothing is published.

## WebSocket

Socket.io namespace `/live` at the gateway origin, handshake `auth: { token: <accessToken> }`.
Events from server: `ready`, `telemetry` (last ping + `status`), `alert`, `fleet.event`.
Superadmin emits `subscribe {organizationId}` to switch tenant rooms.
