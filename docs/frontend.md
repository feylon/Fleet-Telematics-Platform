# Frontend (Nuxt 3)

Location: `frontend/`. Nuxt 3 with Vue 3, Pinia, Tailwind CSS, `@nuxtjs/i18n` (uz default, ru), Leaflet with marker
clustering and heat layer, ApexCharts, Socket.io client, pdfmake and exceljs for client-side exports.

## Runtime configuration

| Variable | Purpose | Default |
|---|---|---|
| `NUXT_API_PROXY_TARGET` | Gateway URL the Nitro server proxies `/api/**` and `/docs/**` to | `http://localhost:3001` |
| `NUXT_PUBLIC_WS_URL` | Gateway URL the browser uses for Socket.io (`/live` namespace) | `http://localhost:3001` |
| `NUXT_PUBLIC_API_BASE` | Base for API calls from the browser; empty keeps same-origin through the proxy | `` |

The proxy is implemented as Nitro server handlers (`server/api/[...].ts`, `server/routes/docs/[...].ts`) reading
`runtimeConfig.apiProxyTarget`, so the target can change at container start without rebuilding.

## Structure

- `stores/` — `auth` (tokens persisted in localStorage, refresh-and-retry), `branding` (platform name, description, logo, primary colour as CSS variable), `live` (Socket.io connection, vehicles, alerts, unread counter, sound), `tenant` (superadmin organization selector), `toast`.
- `composables/` — `useApi` (Bearer header, 401 refresh, blob download), `useFleetApi`, `useOrdersApi`, `useAnalyticsApi`, `useAdminApi`, `useTenant`, `useLeaflet` (client-only loader).
- `middleware/auth.global.ts` — redirects unauthenticated users to `/login`, sends each role to its home and enforces `definePageMeta({ roles })`.
- `components/` — `DataTable` (sorting, per-column filters, pagination, actions slot, export buttons), `LiveMap`, `PlaybackMap`, `GeofenceEditor`, `RouteEditor`, `TelemetryCharts`, `AlertCenter`, `AppSidebar`, `KpiCard`, `Modal`, `Toast`, `StatusBadge`, `LanguageSwitch`, `TenantSelect`, `SessionsPanel`, `ChangePasswordForm`, `Icon`.
- `utils/export.ts` — `buildExportRows`, `exportToPdf`, `exportToExcel`; both outputs begin with a generation timestamp header (`Shakllantirilgan vaqt: …` / `Сформировано: …`), the PDF repeats it as a footer watermark on every page.
- `i18n/locales/uz.json`, `ru.json` — identical key sets.

## Pages by role

| Role | Pages |
|---|---|
| SUPERADMIN | `/admin` system health (Kafka lag, ClickHouse ingestion, Redis, PostgreSQL, WebSocket clients), `/admin/organizations`, `/admin/users` (lookup by id, credentials reset, sessions, login history), `/admin/audit`, `/admin/branding`; plus every dispatcher and manager page through the tenant selector |
| DISPATCHER | `/dispatch/live` (clustered live map with heading-rotated icons and status colours, geofence overlay, heatmap toggle, Alert Center with sound), `/dispatch/geofences` (draw polygons, speed limit, allowed hours), `/dispatch/orders` (create, nearby vehicles, assign, routes with checkpoints, status), `/dispatch/alerts` (history, filters, export), `/dispatch/playback` (track playback with timeline slider and synced speed/fuel charts) |
| FLEET_MANAGER | `/fleet/vehicles` (life-cycle, status, fuel norms), `/fleet/devices` (tracker tokens), `/fleet/drivers`, `/fleet/maintenance` (due list, history, downtime), `/fleet/scores` (eco-driving scores), `/fleet/analytics` (KPIs, daily rollups, series, PDF/Excel report requests and downloads) |
| DRIVER | `/driver` read-only dashboard: assigned vehicle and live status, today's checklist with start/complete and checkpoint actions, orders, safety score and working hours, password change and sessions |
| All | `/login`, `/profile` |

## Development

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000, proxies to http://localhost:3001
npm test           # vitest
npx nuxi typecheck
npm run build      # .output/server/index.mjs
```
