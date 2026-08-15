import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Socket } from 'socket.io-client';
import { playAlertSound } from '~/utils/beep';
import { useAuthStore } from './auth';
import { useToastStore } from './toast';

export interface LiveVehicle {
  vehicleId: string;
  organizationId: string;
  imei: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  altitude: number;
  fuelLevel: number;
  engineTemp: number;
  ignitionOn: boolean;
  isMoving: boolean;
  sos: boolean;
  receivedAt: string;
  status: string;
  plateNumber?: string;
  driverName?: string;
}

export interface LiveAlert {
  organizationId: string;
  vehicleId: string;
  timestamp: string;
  alertType: string;
  severity: string;
  details: string;
  latitude: number;
  longitude: number;
  geofenceId?: string;
  orderId?: string;
}

export interface FleetEvent {
  organizationId: string;
  event: string;
  entityId: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export const useLiveStore = defineStore('live', () => {
  const vehicles = ref<Record<string, LiveVehicle>>({});
  const alerts = ref<LiveAlert[]>([]);
  const unread = ref(0);
  const soundEnabled = ref(true);
  const connected = ref(false);
  const subscribedOrganization = ref<string | null>(null);
  const lastEvent = ref<FleetEvent | null>(null);
  let socket: Socket | null = null;

  const vehicleList = computed(() => Object.values(vehicles.value).sort((a, b) => (a.plateNumber ?? a.vehicleId).localeCompare(b.plateNumber ?? b.vehicleId)));
  const counts = computed(() => {
    const result: Record<string, number> = { MOVING: 0, IDLE: 0, OFFLINE: 0, EMERGENCY: 0 };
    for (const vehicle of Object.values(vehicles.value)) result[vehicle.status] = (result[vehicle.status] ?? 0) + 1;
    return result;
  });

  const upsert = (vehicle: LiveVehicle) => {
    const previous = vehicles.value[vehicle.vehicleId];
    vehicles.value = { ...vehicles.value, [vehicle.vehicleId]: { ...previous, ...vehicle, plateNumber: vehicle.plateNumber ?? previous?.plateNumber, driverName: vehicle.driverName ?? previous?.driverName } };
  };

  const setVehicles = (list: LiveVehicle[]) => {
    const next: Record<string, LiveVehicle> = {};
    for (const vehicle of list) next[vehicle.vehicleId] = { ...vehicles.value[vehicle.vehicleId], ...vehicle };
    vehicles.value = next;
  };

  const labelVehicles = (labels: Array<{ id: string; plateNumber: string; driverName?: string }>) => {
    const next = { ...vehicles.value };
    for (const label of labels) {
      if (next[label.id]) next[label.id] = { ...next[label.id], plateNumber: label.plateNumber, driverName: label.driverName };
    }
    vehicles.value = next;
  };

  const setAlerts = (list: LiveAlert[]) => {
    alerts.value = list;
  };

  const pushAlert = (alert: LiveAlert) => {
    alerts.value = [alert, ...alerts.value].slice(0, 300);
    unread.value += 1;
    if (soundEnabled.value) playAlertSound(alert.severity);
    const toast = useToastStore();
    toast.push(alert.details, alert.severity === 'CRITICAL' ? 'error' : alert.severity === 'WARNING' ? 'warning' : 'info', alert.alertType, alert.severity === 'CRITICAL' ? 12000 : 6000);
  };

  const markRead = () => {
    unread.value = 0;
  };

  const connect = async () => {
    if (socket || typeof window === 'undefined') return;
    const auth = useAuthStore();
    if (!auth.accessToken) return;
    const config = useRuntimeConfig();
    const { io } = await import('socket.io-client');
    socket = io(`${config.public.wsUrl}/live`, { auth: { token: auth.accessToken }, transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 2000 });
    socket.on('connect', () => {
      connected.value = true;
      if (subscribedOrganization.value) socket?.emit('subscribe', { organizationId: subscribedOrganization.value });
    });
    socket.on('disconnect', () => {
      connected.value = false;
    });
    socket.on('ready', () => {
      connected.value = true;
    });
    socket.on('telemetry', (event: LiveVehicle) => upsert(event));
    socket.on('alert', (alert: LiveAlert) => pushAlert(alert));
    socket.on('fleet.event', (event: FleetEvent) => {
      lastEvent.value = event;
    });
  };

  const disconnect = () => {
    socket?.disconnect();
    socket = null;
    connected.value = false;
  };

  const subscribe = (organizationId: string | null) => {
    subscribedOrganization.value = organizationId;
    if (socket && organizationId) socket.emit('subscribe', { organizationId });
  };

  const reset = () => {
    vehicles.value = {};
    alerts.value = [];
    unread.value = 0;
  };

  return { vehicles, vehicleList, counts, alerts, unread, soundEnabled, connected, lastEvent, subscribedOrganization, upsert, setVehicles, labelVehicles, setAlerts, pushAlert, markRead, connect, disconnect, subscribe, reset };
});
