const gatewayUrl = process.env.GATEWAY_URL ?? 'http://localhost:3001';
const login = process.env.SIM_LOGIN ?? 'superadmin01';
const password = process.env.SIM_PASSWORD ?? 'superadmin01';
const vehicleCount = Number.parseInt(process.env.SIM_VEHICLES ?? '8', 10);
const intervalMs = Number.parseInt(process.env.SIM_INTERVAL_MS ?? '2000', 10);
const organizationSlug = process.env.SIM_ORG_SLUG ?? 'demo-logistics';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message) => process.stdout.write(`[simulator ${new Date().toISOString()}] ${message}\n`);

const tashkentRoutes = [
  [[41.2995, 69.2401], [41.3111, 69.2797], [41.3275, 69.3350], [41.3522, 69.3490], [41.3300, 69.2500]],
  [[41.2646, 69.2163], [41.2900, 69.1800], [41.3300, 69.1700], [41.3500, 69.2100], [41.3200, 69.2600]],
  [[41.3100, 69.2800], [41.2800, 69.3200], [41.2500, 69.2900], [41.2400, 69.2300], [41.2800, 69.2000]],
  [[41.3400, 69.2000], [41.3700, 69.2300], [41.3800, 69.2900], [41.3600, 69.3300], [41.3300, 69.3000]],
];

let accessToken = '';

const api = async (method, path, body, auth = true) => {
  const headers = { 'content-type': 'application/json' };
  if (auth) headers.authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${gatewayUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 200)}`);
  return data;
};

const waitForGateway = async () => {
  for (let attempt = 1; attempt <= 60; attempt++) {
    try {
      const response = await fetch(`${gatewayUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await sleep(2000);
      continue;
    }
    await sleep(2000);
  }
  throw new Error('gateway not reachable');
};

const authenticate = async () => {
  const pair = await api('POST', '/api/auth/login', { login, password, client: 'device' }, false);
  accessToken = pair.accessToken;
};

const ensureOrganization = async () => {
  const list = await api('GET', `/api/admin/organizations?search=${organizationSlug}&pageSize=50`);
  const existing = list.items.find((item) => item.slug === organizationSlug);
  if (existing) return existing;
  return api('POST', '/api/admin/organizations', { name: 'Demo Logistics', slug: organizationSlug, address: 'Toshkent, Sergeli', phone: '+998712000000' });
};

const ensureUser = async (organizationId, userLogin, role, fullName) => {
  const list = await api('GET', `/api/admin/users?organizationId=${organizationId}&search=${userLogin}&pageSize=50`);
  const existing = list.items.find((item) => item.login === userLogin);
  if (existing) return existing;
  return api('POST', '/api/admin/users', { organizationId, login: userLogin, password: `${userLogin}pass`, role, fullName });
};

const ensureVehicle = async (organizationId, index) => {
  const plate = `01D${String(100 + index).padStart(3, '0')}SM`;
  const list = await api('GET', `/api/fleet/vehicles?organizationId=${organizationId}&search=${plate}`);
  const existing = list.items.find((item) => item.plateNumber === plate);
  if (existing) return existing;
  const brands = [['Isuzu', 'NQR 71'], ['MAN', 'TGS 18.440'], ['Hyundai', 'HD78'], ['Chevrolet', 'Damas'], ['Mercedes', 'Sprinter']];
  const [brand, model] = brands[index % brands.length];
  return api('POST', `/api/fleet/vehicles?organizationId=${organizationId}`, { plateNumber: plate, brand, model, year: 2018 + (index % 6), fuelType: index % 3 === 0 ? 'PETROL' : 'DIESEL', fuelTankCapacity: 150 + (index % 3) * 50, odometerKm: 50000 + index * 7310, maxSpeedKmh: 90, iconType: index % 4 === 3 ? 'van' : 'truck' });
};

const ensureDriver = async (organizationId, vehicleId, index) => {
  const fullName = ['Akmal Karimov', 'Bobur Rashidov', 'Dilshod Tursunov', 'Eldor Yusupov', 'Farrux Nazarov', 'Gʻayrat Saidov', 'Jasur Umarov', 'Kamol Ergashev', 'Lochin Abdullayev', 'Mirzo Olimov'][index % 10];
  const list = await api('GET', `/api/fleet/drivers?organizationId=${organizationId}&search=${encodeURIComponent(fullName)}`);
  const existing = list.items.find((item) => item.fullName === fullName);
  if (existing) return existing;
  const user = await ensureUser(organizationId, `driver${String(index + 1).padStart(2, '0')}`, 'DRIVER', fullName);
  return api('POST', `/api/fleet/drivers?organizationId=${organizationId}`, { userId: user.id, fullName, phone: `+99890${String(1000000 + index * 1111).slice(0, 7)}`, licenseNumber: `AA${1000000 + index * 37}`, licenseCategories: ['B', 'C'], vehicleId, shiftStart: '08:00', shiftEnd: '18:00' });
};

const ensureDevice = async (organizationId, vehicle, index) => {
  const imei = `86000000000${String(1000 + index).slice(1)}`;
  const list = await api('GET', `/api/fleet/devices?organizationId=${organizationId}&search=${imei}`);
  const existing = list.items.find((item) => item.imei === imei);
  if (existing) {
    const rotated = await api('POST', `/api/fleet/devices/${existing.id}/rotate-token?organizationId=${organizationId}`);
    return { imei, token: rotated.token };
  }
  const created = await api('POST', `/api/fleet/devices?organizationId=${organizationId}`, { imei, vehicleId: vehicle.id, model: 'Teltonika FMB920', simNumber: `+99899${String(2000000 + index)}` });
  return { imei, token: created.token };
};

const ensureGeofence = async (organizationId) => {
  const list = await api('GET', `/api/geofences?organizationId=${organizationId}`);
  if (list.items.length > 0) return;
  await api('POST', `/api/geofences?organizationId=${organizationId}`, { name: 'Sergeli ombor', polygon: { type: 'Polygon', coordinates: [[[69.20, 41.22], [69.26, 41.22], [69.26, 41.26], [69.20, 41.26], [69.20, 41.22]]] }, speedLimitKmh: 40, color: '#ef4444' });
  await api('POST', `/api/geofences?organizationId=${organizationId}`, { name: 'Shahar markazi', polygon: { type: 'Polygon', coordinates: [[[69.24, 41.29], [69.30, 41.29], [69.30, 41.33], [69.24, 41.33], [69.24, 41.29]]] }, speedLimitKmh: 60, allowedFrom: '06:00', allowedTo: '23:00', color: '#2563eb' });
};

const interpolate = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const bearing = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]));
  const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const createMover = (index) => {
  const route = tashkentRoutes[index % tashkentRoutes.length];
  return {
    route,
    segment: index % route.length,
    progress: Math.random(),
    speed: 30 + Math.random() * 30,
    fuel: 40 + Math.random() * 55,
    engineTemp: 82 + Math.random() * 8,
    stoppedTicks: 0,
    direction: 1,
  };
};

const step = (mover, tick, index) => {
  if (mover.stoppedTicks > 0) {
    mover.stoppedTicks -= 1;
    mover.speed = 0;
  } else {
    const roll = Math.random();
    if (roll < 0.015) mover.stoppedTicks = 5 + Math.floor(Math.random() * 20);
    else if (roll < 0.022) mover.speed = Math.max(0, mover.speed - 35);
    else if (roll < 0.04) mover.speed = 95 + Math.random() * 20;
    else mover.speed = Math.max(0, Math.min(85, mover.speed + (Math.random() - 0.5) * 12));
  }
  const from = mover.route[mover.segment];
  const to = mover.route[(mover.segment + 1) % mover.route.length];
  const segmentKm = Math.hypot((to[0] - from[0]) * 111, (to[1] - from[1]) * 83);
  const advanceKm = (mover.speed * intervalMs) / 3600000;
  mover.progress += segmentKm > 0 ? advanceKm / segmentKm : 1;
  if (mover.progress >= 1) {
    mover.progress = 0;
    mover.segment = (mover.segment + 1) % mover.route.length;
  }
  const [latitude, longitude] = interpolate(from, to, mover.progress);
  mover.fuel = Math.max(3, mover.fuel - (mover.speed > 0 ? 0.015 + Math.random() * 0.01 : 0.001));
  if (tick % 400 === 200 && mover.speed === 0) mover.fuel = Math.max(3, mover.fuel - 30);
  if (mover.fuel < 6) mover.fuel = 95;
  mover.engineTemp = Math.max(70, Math.min(112, mover.engineTemp + (Math.random() - 0.5) * 3 + (mover.speed > 80 ? 0.6 : -0.2)));
  return {
    timestamp: new Date().toISOString(),
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    speed: Number(mover.speed.toFixed(1)),
    altitude: 430 + Math.round(Math.random() * 20),
    heading: Number(bearing(from, to).toFixed(1)),
    fuelLevel: Number(mover.fuel.toFixed(1)),
    engineTemp: Number(mover.engineTemp.toFixed(1)),
    ignitionOn: true,
    isMoving: mover.speed > 3,
    sos: index === 0 && tick % 900 === 450,
  };
};

const sendPing = async (device, ping) => {
  const response = await fetch(`${gatewayUrl}/api/device/telemetry`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-device-imei': device.imei, 'x-device-token': device.token },
    body: JSON.stringify(ping),
  });
  if (!response.ok) throw new Error(`telemetry ${device.imei} -> ${response.status}`);
};

const main = async () => {
  await waitForGateway();
  await authenticate();
  const organization = await ensureOrganization();
  await ensureUser(organization.id, 'demo.dispatcher', 'DISPATCHER', 'Demo Dispetcher');
  await ensureUser(organization.id, 'demo.manager', 'FLEET_MANAGER', 'Demo Avtopark boshligʻi');
  await ensureGeofence(organization.id);
  const fleet = [];
  for (let index = 0; index < vehicleCount; index++) {
    const vehicle = await ensureVehicle(organization.id, index);
    await ensureDriver(organization.id, vehicle.id, index);
    const device = await ensureDevice(organization.id, vehicle, index);
    fleet.push({ vehicle, device, mover: createMover(index) });
  }
  log(`simulating ${fleet.length} vehicles for organization ${organization.slug} (${organization.id})`);
  log('logins: demo.dispatcher / demo.dispatcherpass, demo.manager / demo.managerpass, driver01 / driver01pass');
  let tick = 0;
  for (;;) {
    tick += 1;
    await Promise.all(
      fleet.map(async (entry, index) => {
        const ping = step(entry.mover, tick + index * 17, index);
        try {
          await sendPing(entry.device, ping);
        } catch (error) {
          log(error.message);
        }
      }),
    );
    if (tick % 30 === 0) log(`tick ${tick}: ${fleet.length} pings sent`);
    await sleep(intervalMs);
  }
};

main().catch((error) => {
  log(`fatal: ${error.message}`);
  process.exit(1);
});
