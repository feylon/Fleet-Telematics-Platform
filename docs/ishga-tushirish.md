# Tizimni ishga tushirish (Docker)

## Talablar

- Docker 24+ va Docker Compose v2 (`docker compose version`)
- Kamida 6 GB bo'sh RAM (Kafka, ClickHouse, PostgreSQL, Redis, 6 ta NestJS xizmat va Nuxt)
- Bo'sh portlar: 3000 (frontend), 3001 (gateway), 5432, 6379, 8123, 29092

## 1. Sozlamalar

Loyiha ildizida `.env` fayli bo'lmasa ham tizim standart qiymatlar bilan ishga tushadi. Ishlab chiqarish (production)
uchun maxfiy kalitlarni o'zgartiring:

```bash
cp .env.example .env
```

Muhim o'zgaruvchilar (`docker-compose.yml` ichida `${...:-default}` ko'rinishida):

| O'zgaruvchi | Vazifasi |
|---|---|
| `POSTGRES_PASSWORD`, `CLICKHOUSE_PASSWORD` | Ma'lumotlar bazalari parollari |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | JWT imzolash kalitlari (kamida 64 ta tasodifiy belgi) |
| `CORS_ORIGINS` | Frontend manzili, masalan `https://fleet.example.uz` |
| `PUBLIC_WS_URL` | Brauzer uchun Socket.io manzili (gateway tashqi manzili, masalan `https://api.fleet.example.uz`) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Telegram bildirishnomalari (bo'sh bo'lsa faqat logga yoziladi) |
| `KAFKA_EXTERNAL_HOST` | Kafka'ga tashqaridan ulanish uchun host nomi (standart `localhost`) |
| `REDIS_PASSWORD` | Redis paroli (BullMQ navbatlari shu yerda) |
| `BIND_HOST` | Infratuzilma portlari (5432, 6379, 8123, 29092) qaysi interfeysga ochilishi; standart `127.0.0.1` |
| `TRUST_PROXY` | `X-Forwarded-For` sarlavhasiga ishoniladigan manzillar (standart ichki tarmoq `172.28.0.0/16`) |

## 2. Ishga tushirish

```bash
docker compose up -d --build
```

Nima bo'ladi:

1. `postgres`, `redis`, `kafka`, `clickhouse` ko'tariladi va healthcheck'dan o'tadi.
2. `kafka-init` `telemetry.raw` (12 bo'lim), `fleet.alerts` (6), `fleet.events` (3) topiklarini yaratadi.
3. `backend-image` bitta Docker obrazini quradi (`fleet-telematics/backend`).
4. `migrator` TypeORM migratsiyalarini bajaradi va **superadmin01 / superadmin01** foydalanuvchisini hamda platforma brendingini seed qiladi, so'ng to'xtaydi.
5. `gateway`, `fleet-core`, `telemetry-ingest`, `geofence-service`, `dispatch-order`, `analytics` ishga tushadi.
6. `frontend` (Nuxt 3) quriladi va 3000-portda ishlaydi.

Holatni tekshirish:

```bash
docker compose ps
curl http://localhost:3001/api/health
```

## 3. Kirish

- Boshqaruv paneli: http://localhost:3000
- Login: `superadmin01`, parol: `superadmin01` (birinchi kirishdan so'ng parolni almashtiring)
- Swagger: http://localhost:3001/docs/admin (ichki admin API), http://localhost:3001/docs/mobile (mobil/tashqi), http://localhost:3001/docs/device (qurilma)

## 4. Demo ma'lumotlar va simulyator

Jonli xaritani ko'rish uchun simulyatorni yoqing. U `demo-logistics` tashkilotini, foydalanuvchilarni, 8 ta transport,
trekerlar va geofence'larni yaratadi, so'ng Toshkent bo'ylab harakatlanuvchi transportlar telemetriyasini yuboradi:

```bash
docker compose --profile simulator up -d simulator
docker compose logs -f simulator
```

Demo loginlar: `demo.dispatcher / demo.dispatcherpass` (dispetcher), `demo.manager / demo.managerpass` (avtopark
boshlig'i), `driver01 / driver01pass` (haydovchi). Simulyator transportlar soni `SIM_VEHICLES`, yuborish davri `SIM_INTERVAL_MS` bilan boshqariladi.

Simulyatorni to'xtatish: `docker compose --profile simulator stop simulator`.

## 5. Haqiqiy trekerni ulash

1. Avtopark boshlig'i sifatida transport yarating (`POST /api/fleet/vehicles`).
2. Trekerni ro'yxatdan o'tkazing (`POST /api/fleet/devices`, `imei` + `vehicleId`). Javobdagi `token` faqat bir marta ko'rsatiladi.
3. Qurilma quyidagicha yuboradi:

```bash
curl -X POST http://localhost:3001/api/device/telemetry \
  -H 'x-device-imei: 860000000000001' -H 'x-device-token: <token>' -H 'content-type: application/json' \
  -d '{"latitude":41.3111,"longitude":69.2797,"speed":54.5,"heading":180,"fuelLevel":63,"engineTemp":88}'
```

Paketli yuborish: `POST /api/device/telemetry/batch` (`{"pings":[...]}`, 500 tagacha).

## 6. Yangilash, to'xtatish, tozalash

```bash
docker compose build && docker compose up -d        # kodni yangilash
docker compose logs -f gateway geofence-service      # loglar
docker compose stop                                  # to'xtatish (ma'lumotlar saqlanadi)
docker compose down -v                               # to'liq o'chirish (hajmlar bilan)
```

## 7. Lokal ishlab chiqish (Docker'siz backend)

```bash
npm install
npm run build                   # barcha xizmatlar dist/ ga
npm test                        # jest
npm run lint:comments           # kodda izoh yo'qligini tekshirish
POSTGRES_HOST=127.0.0.1 ... node dist/apps/gateway/main.js
cd frontend && npm install && npm run dev
```

Muhit o'zgaruvchilari `.env.example` faylida izohlangan.
