<template>
  <div class="flex h-[calc(100vh-6rem)] gap-3">
    <aside class="card flex w-80 flex-none flex-col">
      <div class="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        <span class="text-sm font-semibold">{{ t('geofence.title') }}</span>
        <button class="btn-primary btn-xs ml-auto" @click="startNew">{{ t('geofence.new') }}</button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <button v-for="item in geofences" :key="item.id" class="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50" :class="form.id === item.id ? 'bg-primary-soft' : ''" @click="edit(item)">
          <span class="h-3 w-3 flex-none rounded-sm" :style="{ backgroundColor: item.color }" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{{ item.name }}</div>
            <div class="text-[11px] text-slate-500">{{ item.speedLimitKmh ? `${item.speedLimitKmh} ${t('live.kmh')}` : '' }} {{ item.allowedFrom ? `· ${item.allowedFrom.slice(0, 5)}–${item.allowedTo.slice(0, 5)}` : '' }} {{ item.isActive ? '' : `· ${t('common.inactive')}` }}</div>
          </div>
        </button>
      </div>
      <form class="space-y-2 border-t border-slate-200 p-3" @submit.prevent="save">
        <div class="text-xs font-semibold text-slate-500">{{ form.id ? t('geofence.editing') : t('geofence.new') }} · {{ t('geofence.vertices') }}: {{ vertices.length }}</div>
        <div><label class="label">{{ t('common.name') }}</label><input v-model="form.name" class="input" required /></div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="label">{{ t('geofence.speedLimit') }}</label><input v-model.number="form.speedLimitKmh" type="number" min="5" max="200" class="input" /></div>
          <div><label class="label">{{ t('geofence.color') }}</label><input v-model="form.color" type="color" class="h-9 w-full rounded border" /></div>
          <div><label class="label">{{ t('geofence.allowedFrom') }}</label><input v-model="form.allowedFrom" type="time" class="input" /></div>
          <div><label class="label">{{ t('geofence.allowedTo') }}</label><input v-model="form.allowedTo" type="time" class="input" /></div>
        </div>
        <div class="flex flex-wrap gap-3 text-xs">
          <label class="flex items-center gap-1"><input v-model="form.alertOnEnter" type="checkbox" />{{ t('geofence.alertOnEnter') }}</label>
          <label class="flex items-center gap-1"><input v-model="form.alertOnExit" type="checkbox" />{{ t('geofence.alertOnExit') }}</label>
          <label class="flex items-center gap-1"><input v-model="form.isActive" type="checkbox" />{{ t('common.active') }}</label>
        </div>
        <div><label class="label">{{ t('common.description') }}</label><input v-model="form.description" class="input" /></div>
        <div class="flex gap-2">
          <button class="btn-primary flex-1 justify-center" :disabled="vertices.length < 3">{{ t('common.save') }}</button>
          <ConfirmButton v-if="form.id" klass="btn-danger" @confirm="remove">{{ t('common.delete') }}</ConfirmButton>
        </div>
      </form>
    </aside>
    <div class="min-w-0 flex-1">
      <ClientOnly>
        <GeofenceEditor ref="editorRef" v-model="vertices" :geofences="geofences" :active-id="form.id" :color="form.color" @pick="pick" />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { useFleetApi, type GeofenceItem } from '~/composables/useFleetApi';
import { useTenant } from '~/composables/useTenant';
import { useToastStore } from '~/stores/toast';

definePageMeta({ roles: ['SUPERADMIN', 'DISPATCHER', 'FLEET_MANAGER'], titleKey: 'geofence.title' });
const { t } = useI18n();
useHead({ title: t('geofence.title') });
const fleet = useFleetApi();
const toast = useToastStore();
const { organizationId } = useTenant();
const geofences = ref<GeofenceItem[]>([]);
const vertices = ref<Array<[number, number]>>([]);
const editorRef = ref<{ fitTo: (ring: Array<[number, number]>) => void; startDrawing: () => void } | null>(null);
const blank = () => ({ id: null as string | null, name: '', description: '', speedLimitKmh: null as number | null, allowedFrom: '', allowedTo: '', alertOnEnter: true, alertOnExit: true, color: '#2563eb', isActive: true });
const form = reactive(blank());

const load = async () => {
  try {
    geofences.value = (await fleet.geofences.list(false)).items;
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const startNew = () => {
  Object.assign(form, blank());
  vertices.value = [];
  editorRef.value?.startDrawing();
};

const edit = (item: GeofenceItem) => {
  Object.assign(form, { id: item.id, name: item.name, description: item.description ?? '', speedLimitKmh: item.speedLimitKmh || null, allowedFrom: item.allowedFrom ? item.allowedFrom.slice(0, 5) : '', allowedTo: item.allowedTo ? item.allowedTo.slice(0, 5) : '', alertOnEnter: item.alertOnEnter, alertOnExit: item.alertOnExit, color: item.color, isActive: item.isActive });
  const ring = item.polygon.coordinates[0] as number[][];
  vertices.value = ring.slice(0, -1).map(([lng, lat]) => [lat, lng] as [number, number]);
  editorRef.value?.fitTo(vertices.value);
};

const pick = (id: string) => {
  const item = geofences.value.find((geofence) => geofence.id === id);
  if (item) edit(item);
};

const save = async () => {
  if (vertices.value.length < 3) {
    toast.error(t('geofence.polygonRequired'));
    return;
  }
  const ring = [...vertices.value.map(([lat, lng]) => [lng, lat]), [vertices.value[0][1], vertices.value[0][0]]];
  const body = { name: form.name, description: form.description || undefined, polygon: { type: 'Polygon', coordinates: [ring] }, speedLimitKmh: form.speedLimitKmh || undefined, allowedFrom: form.allowedFrom || undefined, allowedTo: form.allowedTo || undefined, alertOnEnter: form.alertOnEnter, alertOnExit: form.alertOnExit, color: form.color, isActive: form.isActive };
  try {
    if (form.id) await fleet.geofences.update(form.id, body);
    else await fleet.geofences.create(body);
    toast.success(t('common.saved'));
    await load();
    if (!form.id) startNew();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const remove = async () => {
  if (!form.id) return;
  try {
    await fleet.geofences.remove(form.id);
    toast.success(t('common.deleted'));
    startNew();
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

onMounted(load);
watch(organizationId, load);
</script>
