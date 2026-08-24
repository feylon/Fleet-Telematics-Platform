<template>
  <div class="flex h-[calc(100vh-7.5rem)] gap-4">
    <aside class="card flex w-[300px] flex-none flex-col overflow-hidden">
      <div class="space-y-2 border-b border-slate-100 p-3">
        <div class="relative">
          <Icon name="search" :size="15" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="search" class="input !pl-8" :placeholder="t('common.search')" />
        </div>
        <div class="flex flex-wrap gap-1">
          <button v-for="status in statuses" :key="status" class="badge border transition-all" :class="statusFilter === status ? 'text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'" :style="statusFilter === status ? { backgroundColor: statusColor(status), borderColor: statusColor(status) } : {}" @click="statusFilter = statusFilter === status ? '' : status">
            <span v-if="statusFilter !== status" class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: statusColor(status) }" />
            {{ t(`status.${status}`) }} <span class="tabular opacity-80">{{ live.counts[status] ?? 0 }}</span>
          </button>
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto p-2">
        <p v-if="!ready" class="p-3 text-xs text-slate-400">{{ t('live.selectTenantHint') }}</p>
        <div v-else-if="filteredVehicles.length === 0" class="flex flex-col items-center gap-2 p-8 text-center text-xs text-slate-400"><span class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Icon name="truck" :size="18" /></span>{{ t('live.noVehicles') }}</div>
        <button v-for="vehicle in filteredVehicles" :key="vehicle.vehicleId" class="mb-1 flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all" :class="focusId === vehicle.vehicleId ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'" @click="focusId = vehicle.vehicleId">
          <span class="h-2.5 w-2.5 flex-none rounded-full" :class="vehicle.status === 'EMERGENCY' ? 'pulse-emergency' : ''" :style="{ backgroundColor: statusColor(vehicle.status) }" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-[13px] font-bold text-slate-900">{{ vehicle.plateNumber ?? vehicle.vehicleId.slice(0, 8) }}</span>
              <span class="tabular ml-auto flex-none text-[10px] text-slate-400">{{ ago(vehicle.receivedAt) }}</span>
            </div>
            <div class="truncate text-[11px] text-slate-500">{{ vehicle.driverName || '—' }}</div>
            <div class="mt-0.5 flex items-center gap-3 text-[11px] text-slate-500">
              <span class="tabular inline-flex items-center gap-1"><Icon name="gauge" :size="12" />{{ vehicle.speed.toFixed(0) }} {{ t('live.kmh') }}</span>
              <span class="tabular inline-flex items-center gap-1"><Icon name="fuel" :size="12" />{{ vehicle.fuelLevel.toFixed(0) }}%</span>
            </div>
          </div>
        </button>
      </div>
    </aside>
    <div class="min-w-0 flex-1">
      <ClientOnly>
        <LiveMap ref="mapRef" :vehicles="filteredVehicles" :geofences="geofences" :heat-cells="heatCells" :focus-id="focusId" :highlight="highlight" @select="focusId = $event" />
      </ClientOnly>
    </div>
    <aside class="hidden w-[320px] flex-none xl:block">
      <AlertCenter @focus="onAlertFocus" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useLiveStore, type LiveAlert } from '~/stores/live';
import { useFleetApi, type GeofenceItem } from '~/composables/useFleetApi';
import { useAnalyticsApi } from '~/composables/useAnalyticsApi';
import { useTenant } from '~/composables/useTenant';
import { statusColor } from '~/utils/status';

definePageMeta({ roles: ['SUPERADMIN', 'DISPATCHER', 'FLEET_MANAGER'], titleKey: 'live.title' });
const { t } = useI18n();
useHead({ title: t('live.title') });
const live = useLiveStore();
const fleet = useFleetApi();
const analytics = useAnalyticsApi();
const { ready, organizationId } = useTenant();
const search = ref('');
const statusFilter = ref('');
const focusId = ref<string | null>(null);
const highlight = ref<{ latitude: number; longitude: number } | null>(null);
const geofences = ref<GeofenceItem[]>([]);
const heatCells = ref<Array<{ latitude: number; longitude: number; weight: number }>>([]);
const statuses = ['MOVING', 'IDLE', 'OFFLINE', 'EMERGENCY'];
const now = ref(Date.now());

const filteredVehicles = computed(() =>
  live.vehicleList.filter((vehicle) => {
    const needle = search.value.trim().toLowerCase();
    const matches = !needle || (vehicle.plateNumber ?? '').toLowerCase().includes(needle) || (vehicle.driverName ?? '').toLowerCase().includes(needle) || vehicle.imei.includes(needle);
    return matches && (!statusFilter.value || vehicle.status === statusFilter.value);
  }),
);

const ago = (iso: string): string => {
  const seconds = Math.max(0, Math.round((now.value - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
};

const loadOverlays = async () => {
  if (!ready.value) return;
  try {
    geofences.value = (await fleet.geofences.list(true)).items;
    heatCells.value = (await analytics.heatmap({ from: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), precision: 3 })).cells;
  } catch {
    return;
  }
};

const onAlertFocus = (alert: LiveAlert) => {
  highlight.value = { latitude: alert.latitude, longitude: alert.longitude };
};

onMounted(() => {
  loadOverlays();
  setInterval(() => {
    now.value = Date.now();
  }, 5000);
});
watch(organizationId, loadOverlays);
watch(() => live.lastEvent, (event) => {
  if (event?.event === 'geofence.changed') loadOverlays();
});
</script>
