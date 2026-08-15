<template>
  <div ref="container" class="h-full w-full rounded-lg" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Map as LeafletMap, Marker, Polyline } from 'leaflet';
import { loadLeaflet, TASHKENT, tileLayerOptions, type LeafletModule } from '~/composables/useLeaflet';
import type { SeriesPoint } from '~/composables/useAnalyticsApi';
import { vehicleIconSvg } from '~/utils/status';

const props = defineProps<{ points: SeriesPoint[]; index: number }>();

const container = ref<HTMLDivElement | null>(null);
let L: LeafletModule | null = null;
let map: LeafletMap | null = null;
let line: Polyline | null = null;
let progress: Polyline | null = null;
let marker: Marker | null = null;

const drawTrack = () => {
  if (!L || !map) return;
  line?.remove();
  progress?.remove();
  marker?.remove();
  line = null;
  progress = null;
  marker = null;
  if (props.points.length === 0) return;
  const coords = props.points.map((point) => [point.latitude, point.longitude] as [number, number]);
  line = L.polyline(coords, { color: '#94a3b8', weight: 3 }).addTo(map);
  progress = L.polyline([], { color: '#2563eb', weight: 4 }).addTo(map);
  marker = L.marker(coords[0], { icon: L.divIcon({ className: 'leaflet-vehicle-icon', html: vehicleIconSvg('MOVING', props.points[0].heading), iconSize: [34, 34], iconAnchor: [17, 17] }) }).addTo(map);
  map.fitBounds(line.getBounds().pad(0.2));
  moveTo(props.index);
};

const moveTo = (index: number) => {
  if (!L || !map || !marker || !progress || props.points.length === 0) return;
  const clamped = Math.max(0, Math.min(index, props.points.length - 1));
  const point = props.points[clamped];
  marker.setLatLng([point.latitude, point.longitude]);
  marker.setIcon(L.divIcon({ className: 'leaflet-vehicle-icon', html: vehicleIconSvg(point.isMoving ? 'MOVING' : 'IDLE', point.heading), iconSize: [34, 34], iconAnchor: [17, 17] }));
  progress.setLatLngs(props.points.slice(0, clamped + 1).map((p) => [p.latitude, p.longitude] as [number, number]));
  if (!map.getBounds().contains(marker.getLatLng())) map.panTo(marker.getLatLng());
};

onMounted(async () => {
  L = await loadLeaflet();
  if (!container.value) return;
  map = L.map(container.value).setView(TASHKENT, 11);
  L.tileLayer(tileLayerOptions.url, { attribution: tileLayerOptions.attribution, maxZoom: tileLayerOptions.maxZoom }).addTo(map);
  drawTrack();
  setTimeout(() => map?.invalidateSize(), 200);
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

watch(() => props.points, drawTrack);
watch(() => props.index, moveTo);
</script>
