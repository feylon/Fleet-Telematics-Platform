# Security, sessions and RBAC

## Authentication

- Passwords are hashed with argon2id (memory 19 MiB, 2 iterations).
- Access tokens are HS256 JWTs (15 minutes) carrying `sub`, `login`, `role`, `organizationId`, `sessionId`.
- Refresh tokens are JWTs (7 days) bound to a `user_sessions` row; the row stores the SHA-256 of the token id. Every
  refresh rotates the id. Presenting a stale refresh token revokes the whole session (reuse detection).
- Revoked sessions are cached in Redis for the access-token lifetime so terminated sessions stop immediately.
- `login_history` records every attempt with IP, user agent, success flag and reason.
- Rate limiting: 10 logins/min, 30 refreshes/min per IP; device endpoints 600 pings/min per IP.
- `helmet` headers and an explicit CORS allow-list (`CORS_ORIGINS`).

## Session endpoints for mobile/external consumers

`GET /api/mobile/sessions`, `DELETE /api/mobile/sessions/:id`, `DELETE /api/mobile/sessions/others`,
`GET /api/mobile/login-history` — documented separately under `/docs/mobile`. Administrators can list and terminate a
user's sessions through `/api/admin/users/:id/sessions`.

## Roles

| Role | Can |
|---|---|
| SUPERADMIN | Manage organizations, any user (login/password reset by id), branding, read cross-tenant audit logs and system health; act inside any tenant with `?organizationId=` |
| DISPATCHER | Live map, geofences (create/edit), orders, routes, alerts, analytics read, fleet read |
| FLEET_MANAGER | Vehicles, trackers, drivers (profiles and DRIVER/DISPATCHER logins), maintenance, fuel norms, driver scores, analytics, reports |
| DRIVER | Read-only own profile, vehicle, orders, score and working hours; start/complete own orders and mark checkpoints; change own password; manage own sessions |

Role checks are enforced by `RolesGuard` on every controller method; tenant scoping by `resolveOrganizationId`,
which denies cross-tenant access with 403 and never leaks data (downstream services return 404 for foreign ids).

## Audit log

Every authenticated mutating request (POST/PUT/PATCH/DELETE) outside the device and auth endpoints is written to
`audit_logs` with user, organization, action, resource, resource id, method, path, status code, IP and a payload with
`password`, `newPassword`, `currentPassword`, `refreshToken`, `token` redacted. Superadmin filters it by user id,
organization and time window.

## Device credentials

Each tracker has a per-device secret token issued once at registration (hash stored). Tokens can be rotated;
deactivating a tracker blocks ingestion immediately (binding cache invalidated via `fleet.events`).
