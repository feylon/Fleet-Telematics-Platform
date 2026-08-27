<template>
  <div class="relative h-full w-full overflow-hidden rounded-xl border border-slate-200 shadow-card">
    <div ref="container" class="h-full w-full cursor-crosshair rounded-xl" />
    <div class="absolute left-12 top-2 z-[500] flex gap-1">
      <button class="btn-secondary btn-sm" :class="mode === 'route' ? '!border-[var(--color-primary)] !text-[var(--color-primary)]' : ''" @click="mode = 'route'"><Icon name="route" :size="14" />{{ t('orders.route') }}</button>
      <button class="btn-secondary btn-sm" :class="mode === 'checkpoint' ? '!border-[var(--color-primary)] !text-[var(--color-primary)]' : ''" @click="mode = 'checkpoint'"><Icon name="map-pin" :size="14" />{{ t('orders.addCheckpoint') }}</button>
      <button class="btn-secondary btn-sm" @click="emit('update:polyline', [])"><Icon name="trash" :size="14" />{{ t('geofence.clear') }}</button>
    </div>
    <div class="absolute bottom-3 left-3 z-[500] rounded-lg bg-white/90 px-3 py-1.5 text-xs text-slate-700 shadow-card backdrop-blur">{{ t('orders.routeHint') }}</div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import { loadLeaflet, TASHKENT, tileLayerOptions, type LeafletModule } from '~/composables/useLeaflet';

export interface CheckpointDraft {
  sequence: number;
  name: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  reachedAt?: string;
}

const props = defineProps<{
  polyline: Array<{ latitude: number; longitude: number }>;
  checkpoints: CheckpointDraft[];
  origin?: { latitude: number; longitude: number } | null;
  destination?: { latitude: number; longitude: number } | null;
}>();
const emit = defineEmits<{ 'update:polyline': [value: Array<{ latitude: number; longitude: number }>]; 'update:checkpoints': [value: CheckpointDraft[]] }>();
const { t } = useI18n();

const container = ref<HTMLDivElement | null>(null);
const mode = ref<'route' | 'checkpoint'>('route');
let L: LeafletModule | null = null;
let map: LeafletMap | null = null;
let layer: LayerGroup | null = null;

const render = () => {
  if (!L || !layer) return;
  layer.clearLayers();
  if (props.origin) L.circleMarker([props.origin.latitude, props.origin.longitude], { radius: 7, color: '#16a34a', fillOpacity: 0.9 }).bindTooltip('A').addTo(layer);
  if (props.destination) L.circleMarker([props.destination.latitude, props.destination.longitude], { radius: 7, color: '#dc2626', fillOpacity: 0.9 }).bindTooltip('B').addTo(layer);
  const line = props.polyline.map((point) => [point.latitude, point.longitude] as [number, number]);
  if (line.length > 0) {
    L.polyline(line, { color: '#2563eb', weight: 4 }).addTo(layer);
    for (const point of line) L.circleMarker(point, { radius: 3, color: '#2563eb', fillColor: '#fff', fillOpacity: 1 }).addTo(layer);
  }
  for (const checkpoint of props.checkpoints) {
    L.circle([checkpoint.latitude, checkpoint.longitude], { radius: checkpoint.radiusM, color: checkpoint.reachedAt ? '#16a34a' : '#f59e0b', fillOpacity: 0.2 })
      .bindTooltip(`${checkpoint.sequence}. ${checkpoint.name}`)
      .addTo(layer);
  }
};

const fit = () => {
  if (!L || !map) return;
  const points = [...props.polyline.map((p) => [p.latitude, p.longitude] as [number, number])];
  if (props.origin) points.push([props.origin.latitude, props.origin.longitude]);
  if (props.destination) points.push([props.destination.latitude, props.destination.longitude]);
  if (points.length > 0) map.fitBounds(L.latLngBounds(points).pad(0.3));
};

onMounted(async () => {
  L = await loadLeaflet();
  if (!container.value) return;
  map = L.map(container.value).setView(TASHKENT, 10);
  L.tileLayer(tileLayerOptions.url, { attribution: tileLayerOptions.attribution, maxZoom: tileLayerOptions.maxZoom, subdomains: tileLayerOptions.subdomains }).addTo(map);
  layer = L.layerGroup().addTo(map);
  map.on('click', (event) => {
    if (mode.value === 'route') emit('update:polyline', [...props.polyline, { latitude: event.latlng.lat, longitude: event.latlng.lng }]);
    else emit('update:checkpoints', [...props.checkpoints, { sequence: props.checkpoints.length + 1, name: `CP${props.checkpoints.length + 1}`, latitude: event.latlng.lat, longitude: event.latlng.lng, radiusM: 300 }]);
  });
  render();
  fit();
  setTimeout(() => map?.invalidateSize(), 200);
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

watch(() => [props.polyline, props.checkpoints, props.origin, props.destination], render, { deep: true });
defineExpose({ fit });
</script>
