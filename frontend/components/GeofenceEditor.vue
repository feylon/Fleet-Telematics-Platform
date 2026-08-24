<template>
  <div class="relative h-full w-full overflow-hidden rounded-xl border border-slate-200 shadow-card">
    <div ref="container" class="h-full w-full rounded-xl" :class="drawing ? 'cursor-crosshair' : ''" />
    <div class="absolute left-12 top-2 z-[500] flex gap-1">
      <button v-if="!drawing" class="btn-primary btn-sm" @click="startDrawing"><Icon name="pencil" :size="14" />{{ t('geofence.draw') }}</button>
      <button v-else class="btn-primary btn-sm" @click="finishDrawing"><Icon name="check" :size="14" />{{ t('geofence.finish') }} ({{ modelValue.length }})</button>
      <button class="btn-secondary btn-sm" @click="clearDrawing"><Icon name="trash" :size="14" />{{ t('geofence.clear') }}</button>
    </div>
    <div v-if="drawing" class="absolute bottom-3 left-3 z-[500] rounded-lg bg-white/90 px-3 py-1.5 text-xs text-slate-700 shadow-card backdrop-blur">{{ t('geofence.hint') }}</div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Map as LeafletMap, LayerGroup, Polygon } from 'leaflet';
import { loadLeaflet, TASHKENT, tileLayerOptions, type LeafletModule } from '~/composables/useLeaflet';

const props = defineProps<{
  modelValue: Array<[number, number]>;
  geofences: Array<{ id: string; name: string; color: string; polygon: { coordinates: number[][][] } }>;
  activeId?: string | null;
  color?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: Array<[number, number]>]; finished: []; pick: [id: string] }>();
const { t } = useI18n();

const container = ref<HTMLDivElement | null>(null);
const drawing = ref(false);
let L: LeafletModule | null = null;
let map: LeafletMap | null = null;
let existingLayer: LayerGroup | null = null;
let draftLayer: LayerGroup | null = null;
let draftPolygon: Polygon | null = null;

const renderExisting = () => {
  if (!L || !existingLayer) return;
  existingLayer.clearLayers();
  for (const geofence of props.geofences) {
    if (geofence.id === props.activeId) continue;
    const ring = geofence.polygon.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
    L.polygon(ring, { color: geofence.color, weight: 2, fillOpacity: 0.1 })
      .bindTooltip(geofence.name, { sticky: true })
      .on('click', () => emit('pick', geofence.id))
      .addTo(existingLayer);
  }
};

const renderDraft = () => {
  if (!L || !draftLayer) return;
  draftLayer.clearLayers();
  draftPolygon = null;
  const color = props.color ?? '#2563eb';
  for (const vertex of props.modelValue) L.circleMarker(vertex, { radius: 5, color, fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(draftLayer);
  if (props.modelValue.length >= 2) {
    draftPolygon = L.polygon(props.modelValue, { color, weight: 2, dashArray: drawing.value ? '6 4' : undefined, fillOpacity: 0.2 }).addTo(draftLayer);
  }
};

const startDrawing = () => {
  drawing.value = true;
  renderDraft();
};

const finishDrawing = () => {
  drawing.value = false;
  renderDraft();
  emit('finished');
};

const clearDrawing = () => {
  emit('update:modelValue', []);
};

const fitTo = (ring: Array<[number, number]>) => {
  if (!L || !map || ring.length === 0) return;
  map.fitBounds(L.latLngBounds(ring).pad(0.3));
};

onMounted(async () => {
  L = await loadLeaflet();
  if (!container.value) return;
  map = L.map(container.value).setView(TASHKENT, 11);
  L.tileLayer(tileLayerOptions.url, { attribution: tileLayerOptions.attribution, maxZoom: tileLayerOptions.maxZoom, subdomains: tileLayerOptions.subdomains }).addTo(map);
  existingLayer = L.layerGroup().addTo(map);
  draftLayer = L.layerGroup().addTo(map);
  map.on('click', (event) => {
    if (!drawing.value) return;
    emit('update:modelValue', [...props.modelValue, [event.latlng.lat, event.latlng.lng]]);
  });
  renderExisting();
  renderDraft();
  setTimeout(() => map?.invalidateSize(), 200);
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

watch(() => props.geofences, renderExisting, { deep: true });
watch(() => props.activeId, renderExisting);
watch(() => props.modelValue, (value, previous) => {
  renderDraft();
  if (value.length > 0 && (previous?.length ?? 0) === 0 && !drawing.value) fitTo(value);
}, { deep: true });
watch(() => props.color, renderDraft);

defineExpose({ fitTo, startDrawing });
</script>
