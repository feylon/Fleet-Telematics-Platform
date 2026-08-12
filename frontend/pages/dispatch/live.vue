<template>
  <div class="flex h-[calc(100vh-6rem)] gap-3">
    <aside class="card flex w-72 flex-none flex-col">
      <div class="border-b border-slate-200 p-2">
        <input v-model="search" class="input" :placeholder="t('common.search')" />
        <div class="mt-2 flex flex-wrap gap-1">
          <button v-for="status in statuses" :key="status" class="rounded-full border px-2 py-0.5 text-[11px] font-medium" :class="statusFilter === status ? 'text-white' : 'bg-white text-slate-600'" :style="statusFilter === status ? { backgroundColor: statusColor(status), borderColor: statusColor(status) } : {}" @click="statusFilter = statusFilter === status ? '' : status">
            {{ t(`status.${status}`) }} {{ live.counts[status] ?? 0 }}
          </button>
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <p v-if="!ready" class="p-3 text-xs text-slate-400">{{ t('live.selectTenantHint') }}</p>
        <p v-else-if="filteredVehicles.length === 0" class="p-3 text-xs text-slate-400">{{ t('live.noVehicles') }}</p>
        <button v-for="vehicle in filteredVehicles" :key="vehicle.vehicleId" class="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50" :class="focusId === vehicle.vehicleId ? 'bg-primary-soft' : ''" @click="focusId = vehicle.vehicleId">
          <span class="h-2.5 w-2.5 flex-none rounded-full" :style="{ backgroundColor: statusColor(vehicle.status) }" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold">{{ vehicle.plateNumber ?? vehicle.vehicleId.slice(0, 8) }}</div>
            <div class="truncate text-[11px] text-slate-500">{{ vehicle.driverName || '—' }} · {{ vehicle.speed.toFixed(0) }} {{ t('live.kmh') }} · ⛽ {{ vehicle.fuelLevel.toFixed(0) }}%</div>
          </div>
          <span class="text-[10px] text-slate-400">{{ ago(vehicle.receivedAt) }}</span>
        </button>
      </div>
    </aside>
    <div class="min-w-0 flex-1">
      <ClientOnly>
        <LiveMap ref="mapRef" :vehicles="filteredVehicles" :geofences="geofences" :heat-cells="heatCells" :focus-id="focusId" :highlight="highlight" @select="focusId = $event" />
      </ClientOnly>
    </div>
    <aside class="hidden w-80 flex-none xl:block">
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

const filteredVehicles = computed(() =>
  live.vehicleList.filter((vehicle) => {
    const needle = search.value.trim().toLowerCase();
    const matches = !needle || (vehicle.plateNumber ?? '').toLowerCase().includes(needle) || (vehicle.driverName ?? '').toLowerCase().includes(needle) || vehicle.imei.includes(needle);
    return matches && (!statusFilter.value || vehicle.status === statusFilter.value);
  }),
);

const ago = (iso: string): string => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
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

onMounted(loadOverlays);
watch(organizationId, loadOverlays);
watch(() => live.lastEvent, (event) => {
  if (event?.event === 'geofence.changed') loadOverlays();
});
</script>
