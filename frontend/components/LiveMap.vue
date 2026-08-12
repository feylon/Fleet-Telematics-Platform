<template>
  <div class="relative h-full w-full">
    <div ref="container" class="h-full w-full rounded-lg" />
    <div class="absolute right-2 top-2 z-[500] flex flex-col gap-1">
      <button class="btn-secondary btn-xs" @click="fitAll">{{ t('live.fitAll') }}</button>
      <label class="btn-secondary btn-xs cursor-pointer"><input v-model="showGeofences" type="checkbox" class="mr-1" />{{ t('live.geofences') }}</label>
      <label class="btn-secondary btn-xs cursor-pointer"><input v-model="showHeat" type="checkbox" class="mr-1" />{{ t('live.heatmap') }}</label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Map as LeafletMap, LayerGroup, Marker, MarkerClusterGroup, Layer } from 'leaflet';
import type { LiveVehicle } from '~/stores/live';
import { loadLeaflet, TASHKENT, tileLayerOptions, type LeafletModule } from '~/composables/useLeaflet';
import { vehicleIconSvg } from '~/utils/status';
import { formatDateTime } from '~/utils/format';

const props = defineProps<{
  vehicles: LiveVehicle[];
  geofences?: Array<{ id: string; name: string; color: string; polygon: { coordinates: number[][][] } }>;
  heatCells?: Array<{ latitude: number; longitude: number; weight: number }>;
  focusId?: string | null;
  highlight?: { latitude: number; longitude: number } | null;
}>();
const emit = defineEmits<{ select: [vehicleId: string] }>();
const { t } = useI18n();

const container = ref<HTMLDivElement | null>(null);
const showGeofences = ref(true);
const showHeat = ref(false);
let L: LeafletModule | null = null;
let map: LeafletMap | null = null;
let cluster: MarkerClusterGroup | null = null;
let geofenceLayer: LayerGroup | null = null;
let heatLayer: Layer | null = null;
let highlightLayer: Marker | null = null;
const markers = new Map<string, Marker>();
let fitted = false;

const popupHtml = (vehicle: LiveVehicle): string => `
  <div class="text-xs leading-5">
    <div class="font-semibold">${vehicle.plateNumber ?? vehicle.vehicleId.slice(0, 8)}</div>
    <div>${vehicle.driverName ?? ''}</div>
    <div>${t('live.speed')}: <b>${vehicle.speed.toFixed(0)} ${t('live.kmh')}</b></div>
    <div>${t('live.fuel')}: ${vehicle.fuelLevel.toFixed(0)}%</div>
    <div>${t('live.engineTemp')}: ${vehicle.engineTemp.toFixed(0)}°</div>
    <div>${t('live.lastSeen')}: ${formatDateTime(vehicle.receivedAt)}</div>
    <div>${t('common.status')}: <b>${t(`status.${vehicle.status}`)}</b></div>
  </div>`;

const iconFor = (vehicle: LiveVehicle) => L!.divIcon({ className: 'leaflet-vehicle-icon', html: vehicleIconSvg(vehicle.status, vehicle.heading), iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -16] });

const syncVehicles = () => {
  if (!L || !map || !cluster) return;
  const seen = new Set<string>();
  for (const vehicle of props.vehicles) {
    seen.add(vehicle.vehicleId);
    const position: [number, number] = [vehicle.latitude, vehicle.longitude];
    const existing = markers.get(vehicle.vehicleId);
    if (existing) {
      existing.setLatLng(position);
      existing.setIcon(iconFor(vehicle));
      existing.setPopupContent(popupHtml(vehicle));
    } else {
      const marker = L.marker(position, { icon: iconFor(vehicle), title: vehicle.plateNumber ?? vehicle.vehicleId });
      marker.bindPopup(popupHtml(vehicle));
      marker.on('click', () => emit('select', vehicle.vehicleId));
      markers.set(vehicle.vehicleId, marker);
      cluster.addLayer(marker);
    }
  }
  for (const [id, marker] of markers) {
    if (!seen.has(id)) {
      cluster.removeLayer(marker);
      markers.delete(id);
    }
  }
  if (!fitted && markers.size > 0) {
    fitAll();
    fitted = true;
  }
};

const syncGeofences = () => {
  if (!L || !map || !geofenceLayer) return;
  geofenceLayer.clearLayers();
  if (!showGeofences.value) return;
  for (const geofence of props.geofences ?? []) {
    const ring = geofence.polygon.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
    L.polygon(ring, { color: geofence.color, weight: 2, fillOpacity: 0.12 }).bindTooltip(geofence.name, { sticky: true }).addTo(geofenceLayer);
  }
};

const syncHeat = () => {
  if (!L || !map) return;
  if (heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
  }
  if (!showHeat.value || !props.heatCells || props.heatCells.length === 0) return;
  const heat = (L as unknown as { heatLayer?: (points: number[][], options: Record<string, unknown>) => Layer }).heatLayer;
  const max = Math.max(...props.heatCells.map((cell) => cell.weight));
  if (heat) {
    heatLayer = heat(props.heatCells.map((cell) => [cell.latitude, cell.longitude, cell.weight / max]), { radius: 25, blur: 18, maxZoom: 16 });
  } else {
    const group = L.layerGroup();
    for (const cell of props.heatCells) L.circleMarker([cell.latitude, cell.longitude], { radius: 4 + (cell.weight / max) * 12, color: '#ef4444', stroke: false, fillOpacity: 0.35 }).addTo(group);
    heatLayer = group;
  }
  heatLayer.addTo(map);
};

const fitAll = () => {
  if (!map || markers.size === 0 || !L) return;
  const bounds = L.latLngBounds([...markers.values()].map((marker) => marker.getLatLng()));
  map.fitBounds(bounds.pad(0.2), { maxZoom: 15 });
};

const focus = (vehicleId: string) => {
  const marker = markers.get(vehicleId);
  if (!marker || !map || !cluster) return;
  cluster.zoomToShowLayer(marker, () => {
    map?.setView(marker.getLatLng(), Math.max(map.getZoom(), 15));
    marker.openPopup();
  });
};

onMounted(async () => {
  L = await loadLeaflet();
  if (!container.value) return;
  map = L.map(container.value, { zoomControl: true, preferCanvas: true }).setView(TASHKENT, 11);
  L.tileLayer(tileLayerOptions.url, { attribution: tileLayerOptions.attribution, maxZoom: tileLayerOptions.maxZoom }).addTo(map);
  cluster = L.markerClusterGroup({
    maxClusterRadius: 50,
    disableClusteringAtZoom: 15,
    iconCreateFunction: (group) => L!.divIcon({ html: `<div class="marker-cluster-custom">${group.getChildCount()}</div>`, className: '', iconSize: [36, 36] }),
  });
  map.addLayer(cluster);
  geofenceLayer = L.layerGroup().addTo(map);
  syncVehicles();
  syncGeofences();
  syncHeat();
  setTimeout(() => map?.invalidateSize(), 200);
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

watch(() => props.vehicles, syncVehicles, { deep: true });
watch(() => props.geofences, syncGeofences, { deep: true });
watch(showGeofences, syncGeofences);
watch([showHeat, () => props.heatCells], syncHeat, { deep: true });
watch(() => props.focusId, (id) => id && focus(id));
watch(
  () => props.highlight,
  (point) => {
    if (!L || !map) return;
    if (highlightLayer) map.removeLayer(highlightLayer);
    highlightLayer = null;
    if (!point) return;
    highlightLayer = L.marker([point.latitude, point.longitude], { icon: L.divIcon({ className: 'leaflet-vehicle-icon', html: '<div style="width:18px;height:18px;border-radius:50%;background:#dc2626;border:3px solid #fff;box-shadow:0 0 0 4px rgba(220,38,38,.35)"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map);
    map.setView([point.latitude, point.longitude], Math.max(map.getZoom(), 14));
  },
);

defineExpose({ focus, fitAll });
</script>
