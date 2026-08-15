<template>
  <div class="space-y-3">
    <PageHeader :title="t('playback.title')">
      <select v-model="vehicleId" class="input w-56">
        <option value="">{{ t('analytics.selectVehicle') }}</option>
        <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.plateNumber }} · {{ vehicle.driverName || '' }}</option>
      </select>
      <DateRange v-model="range" @apply="load" />
    </PageHeader>
    <div class="grid gap-3 lg:grid-cols-3">
      <div class="card h-[420px] lg:col-span-2">
        <ClientOnly>
          <PlaybackMap :points="points" :index="index" />
        </ClientOnly>
      </div>
      <div class="card card-body space-y-3">
        <div class="text-sm font-semibold">{{ t('playback.position') }}</div>
        <div v-if="current" class="grid grid-cols-2 gap-y-1 text-xs">
          <span class="text-slate-500">{{ t('common.time') }}</span><span>{{ formatDateTime(current.timestamp) }}</span>
          <span class="text-slate-500">{{ t('live.speed') }}</span><span>{{ current.speed.toFixed(1) }} {{ t('live.kmh') }}</span>
          <span class="text-slate-500">{{ t('live.fuel') }}</span><span>{{ current.fuelLevel.toFixed(1) }}%</span>
          <span class="text-slate-500">{{ t('live.engineTemp') }}</span><span>{{ current.engineTemp.toFixed(0) }}°</span>
          <span class="text-slate-500">{{ t('live.heading') }}</span><span>{{ current.heading.toFixed(0) }}°</span>
          <span class="text-slate-500">{{ t('common.latitude') }}</span><span>{{ current.latitude.toFixed(5) }}</span>
          <span class="text-slate-500">{{ t('common.longitude') }}</span><span>{{ current.longitude.toFixed(5) }}</span>
        </div>
        <p v-else class="text-xs text-slate-400">{{ t('playback.noTrack') }}</p>
        <div class="flex items-center gap-2">
          <button class="btn-primary" :disabled="points.length === 0" @click="toggle">{{ playing ? t('playback.pause') : t('playback.play') }}</button>
          <label class="text-xs text-slate-500">{{ t('playback.speed') }}</label>
          <select v-model.number="speed" class="input w-20"><option v-for="s in [1, 2, 5, 10, 25]" :key="s" :value="s">{{ s }}x</option></select>
          <span class="ml-auto text-xs text-slate-500">{{ index + 1 }} / {{ points.length }} {{ t('playback.points') }}</span>
        </div>
        <input v-model.number="index" type="range" min="0" :max="Math.max(0, points.length - 1)" class="w-full" :disabled="points.length === 0" />
      </div>
    </div>
    <TelemetryCharts :points="points" :cursor-index="index" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAnalyticsApi, type SeriesPoint } from '~/composables/useAnalyticsApi';
import { useFleetApi } from '~/composables/useFleetApi';
import { useToastStore } from '~/stores/toast';
import { defaultRange, formatDateTime, toIso } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN', 'DISPATCHER', 'FLEET_MANAGER'], titleKey: 'playback.title' });
const { t } = useI18n();
useHead({ title: t('playback.title') });
const analytics = useAnalyticsApi();
const fleet = useFleetApi();
const toast = useToastStore();
const route = useRoute();
const vehicles = ref<Record<string, any>[]>([]);
const vehicleId = ref(typeof route.query.vehicleId === 'string' ? route.query.vehicleId : '');
const range = ref(defaultRange(24));
const points = ref<SeriesPoint[]>([]);
const index = ref(0);
const playing = ref(false);
const speed = ref(5);
let timer: ReturnType<typeof setInterval> | null = null;

const current = computed(() => points.value[index.value] ?? null);

const load = async () => {
  if (!vehicleId.value) return;
  stop();
  try {
    points.value = (await analytics.track(vehicleId.value, { from: toIso(range.value.from), to: toIso(range.value.to), limit: 10000 })).points;
    index.value = 0;
    if (points.value.length === 0) toast.push(t('playback.noTrack'), 'warning');
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const stop = () => {
  playing.value = false;
  if (timer) clearInterval(timer);
  timer = null;
};

const toggle = () => {
  if (playing.value) return stop();
  if (index.value >= points.value.length - 1) index.value = 0;
  playing.value = true;
  timer = setInterval(() => {
    if (index.value >= points.value.length - 1) return stop();
    index.value += 1;
  }, Math.max(40, 1000 / speed.value));
};

watch(speed, () => {
  if (playing.value) {
    stop();
    toggle();
  }
});

onMounted(async () => {
  try {
    vehicles.value = (await fleet.vehicles.list({ pageSize: 200 })).items;
    if (vehicleId.value) await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
});
onBeforeUnmount(stop);
</script>
