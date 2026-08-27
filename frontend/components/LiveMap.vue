<template>
  <div class="relative h-full w-full overflow-hidden rounded-xl border border-slate-200 shadow-card">
    <div ref="container" class="h-full w-full" />
    <div class="absolute right-3 top-3 z-[500] flex flex-col gap-1.5">
      <button class="btn-secondary btn-sm gap-1.5" @click="fitAll"><Icon name="maximize" :size="14" />{{ t('live.fitAll') }}</button>
      <button class="btn-secondary btn-sm gap-1.5" :class="showGeofences ? '!border-[var(--color-primary)] !text-[var(--color-primary)]' : ''" @click="showGeofences = !showGeofences"><Icon name="hexagon" :size="14" />{{ t('live.geofences') }}</button>
      <button class="btn-secondary btn-sm gap-1.5" :class="showHeat ? '!border-[var(--color-primary)] !text-[var(--color-primary)]' : ''" @click="showHeat = !showHeat"><Icon name="layers" :size="14" />{{ t('live.heatmap') }}</button>
    </div>
    <div class="absolute bottom-3 left-3 z-[500] flex gap-1.5 rounded-lg bg-white/90 px-2 py-1.5 text-[11px] font-medium shadow-card backdrop-blur">
      <span v-for="status in ['MOVING', 'IDLE', 'OFFLINE', 'EMERGENCY']" :key="status" class="inline-flex items-center gap-1 px-1"><span class="h-2 w-2 rounded-full" :style="{ backgroundColor: statusColor(status) }" />{{ t(`status.${status}`) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Map as LeafletMap, LayerGroup, Marker, MarkerClusterGroup, Layer } from 'leaflet';
import type { LiveVehicle } from '~/stores/live';
import { loadLeaflet, TASHKENT, tileLayerOptions, type LeafletModule } from '~/composables/useLeaflet';
import { statusColor, vehiclePillHtml } from '~/utils/status';
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
  <div style="font-size:12px;line-height:1.5;min-width:180px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${statusColor(vehicle.status)}"></span>
      <b style="font-size:14px">${vehicle.plateNumber ?? vehicle.vehicleId.slice(0, 8)}</b>
      <span style="margin-left:auto;font-size:11px;color:#64748b">${t(`status.${vehicle.status}`)}</span>
    </div>
    <div style="color:#475569">${vehicle.driverName ?? '—'}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;margin-top:6px;color:#334155">
      <span>${t('live.speed')}</span><b style="text-align:right">${vehicle.speed.toFixed(0)} ${t('live.kmh')}</b>
      <span>${t('live.fuel')}</span><b style="text-align:right">${vehicle.fuelLevel.toFixed(0)}%</b>
      <span>${t('live.engineTemp')}</span><b style="text-align:right">${vehicle.engineTemp.toFixed(0)}°</b>
      <span>${t('live.heading')}</span><b style="text-align:right">${vehicle.heading.toFixed(0)}°</b>
    </div>
    <div style="margin-top:6px;font-size:11px;color:#94a3b8">${t('live.lastSeen')}: ${formatDateTime(vehicle.receivedAt)}</div>
  </div>`;

const iconFor = (vehicle: LiveVehicle) => L!.divIcon({ className: 'leaflet-vehicle-icon', html: vehiclePillHtml(vehicle.status, vehicle.heading, vehicle.plateNumber ?? vehicle.vehicleId.slice(0, 6), vehicle.vehicleId === props.focusId), iconSize: [0, 0], iconAnchor: [0, 0], popupAnchor: [30, -14] });

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
      marker.bindPopup(popupHtml(vehicle), { closeButton: false, offset: [0, -4] });
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
    L.polygon(ring, { color: geofence.color, weight: 2, fillColor: geofence.color, fillOpacity: 0.15 }).bindTooltip(geofence.name, { sticky: true, className: 'rounded-md' }).addTo(geofenceLayer);
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
  map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
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
  map = L.map(container.value, { zoomControl: false, preferCanvas: true }).setView(TASHKENT, 11);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer(tileLayerOptions.url, { attribution: tileLayerOptions.attribution, maxZoom: tileLayerOptions.maxZoom, subdomains: tileLayerOptions.subdomains }).addTo(map);
  cluster = L.markerClusterGroup({
    maxClusterRadius: 50,
    disableClusteringAtZoom: 15,
    showCoverageOnHover: false,
    iconCreateFunction: (group) => L!.divIcon({ html: `<div class="marker-cluster-custom">${group.getChildCount()}</div>`, className: '', iconSize: [38, 38] }),
  });
  map.addLayer(cluster);
  geofenceLayer = L.layerGroup().addTo(map);
  syncVehicles();
  syncGeofences();
  syncHeat();
  setTimeout(() => {
    map?.invalidateSize();
    if (!fitted && markers.size > 0) {
      fitAll();
      fitted = true;
    }
  }, 250);
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

watch(() => props.vehicles, syncVehicles, { deep: true });
watch(() => props.geofences, syncGeofences, { deep: true });
watch(showGeofences, syncGeofences);
watch([showHeat, () => props.heatCells], syncHeat, { deep: true });
watch(() => props.focusId, (id) => {
  syncVehicles();
  if (id) focus(id);
});
watch(
  () => props.highlight,
  (point) => {
    if (!L || !map) return;
    if (highlightLayer) map.removeLayer(highlightLayer);
    highlightLayer = null;
    if (!point) return;
    highlightLayer = L.marker([point.latitude, point.longitude], { icon: L.divIcon({ className: 'leaflet-vehicle-icon', html: '<span class="vehicle-ring" style="border-color:#dc2626"></span><div style="width:16px;height:16px;border-radius:50%;background:#dc2626;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);transform:translate(-8px,-8px)"></div>', iconSize: [0, 0], iconAnchor: [0, 0] }) }).addTo(map);
    map.setView([point.latitude, point.longitude], Math.max(map.getZoom(), 14));
  },
);

defineExpose({ focus, fitAll });
</script>
