<template>
  <div class="space-y-3">
    <PageHeader :title="t('orders.title')">
      <button class="btn-secondary" @click="load"><Icon name="refresh" :size="16" />{{ t('common.refresh') }}</button>
      <button class="btn-primary" @click="openCreate"><Icon name="plus" :size="16" />{{ t('orders.new') }}</button>
    </PageHeader>
    <DataTable :columns="columns" :rows="rows" :loading="loading" row-key="id" :export-title="t('orders.title')" @row-click="openDetail">
      <template #cell-status="{ value }"><StatusBadge :value="value" kind="order" /></template>
      <template #cell-priority="{ value }">{{ t(`orders.${value}`) }}</template>
      <template #actions="{ row }">
        <button class="btn-secondary btn-xs" @click.stop="openDetail(row)"><Icon name="route" :size="13" />{{ t('common.more') }}</button>
        <button v-if="['CREATED', 'ASSIGNED'].includes(row.status)" class="btn-secondary btn-xs" @click.stop="openAssign(row)"><Icon name="truck" :size="13" />{{ t('orders.assign') }}</button>
        <button v-if="row.status !== 'COMPLETED' && row.status !== 'CANCELLED'" class="btn-secondary btn-xs" @click.stop="openEdit(row)"><Icon name="pencil" :size="13" />{{ t('common.edit') }}</button>
        <button v-if="row.status === 'ASSIGNED'" class="btn-secondary btn-xs" @click.stop="transition(row, 'IN_PROGRESS')"><Icon name="play" :size="13" />{{ t('orders.start') }}</button>
        <button v-if="row.status === 'IN_PROGRESS'" class="btn-secondary btn-xs" @click.stop="transition(row, 'COMPLETED')"><Icon name="check" :size="13" />{{ t('orders.complete') }}</button>
        <ConfirmButton v-if="['CREATED', 'ASSIGNED', 'IN_PROGRESS'].includes(row.status)" klass="btn-danger btn-xs" :message="t('orders.cancel') + '?'" @confirm="transition(row, 'CANCELLED')">{{ t('orders.cancel') }}</ConfirmButton>
      </template>
    </DataTable>

    <Modal :open="modal === 'form'" :title="editing ? t('common.edit') : t('orders.new')" wide @close="modal = null">
      <form class="grid gap-3 md:grid-cols-3" @submit.prevent="save">
        <div><label class="label">{{ t('orders.customer') }}</label><input v-model="form.customerName" class="input" required /></div>
        <div><label class="label">{{ t('orders.priority') }}</label><select v-model="form.priority" class="input"><option v-for="p in priorities" :key="p" :value="p">{{ t(`orders.${p}`) }}</option></select></div>
        <div><label class="label">{{ t('orders.number') }}</label><input v-model="form.orderNumber" class="input" :disabled="Boolean(editing)" /></div>
        <div class="md:col-span-2"><label class="label">{{ t('orders.cargo') }}</label><input v-model="form.cargoDescription" class="input" /></div>
        <div><label class="label">{{ t('orders.weight') }}</label><input v-model.number="form.cargoWeightKg" type="number" min="0" class="input" /></div>
        <div><label class="label">{{ t('orders.origin') }}</label><input v-model="form.originAddress" class="input" required /></div>
        <div><label class="label">{{ t('common.latitude') }}</label><input v-model.number="form.originLatitude" type="number" step="0.000001" class="input" required /></div>
        <div><label class="label">{{ t('common.longitude') }}</label><input v-model.number="form.originLongitude" type="number" step="0.000001" class="input" required /></div>
        <div><label class="label">{{ t('orders.destination') }}</label><input v-model="form.destinationAddress" class="input" required /></div>
        <div><label class="label">{{ t('common.latitude') }}</label><input v-model.number="form.destinationLatitude" type="number" step="0.000001" class="input" required /></div>
        <div><label class="label">{{ t('common.longitude') }}</label><input v-model.number="form.destinationLongitude" type="number" step="0.000001" class="input" required /></div>
        <div><label class="label">{{ t('orders.plannedStart') }}</label><input v-model="form.plannedStartAt" type="datetime-local" class="input" /></div>
        <div><label class="label">{{ t('orders.plannedEnd') }}</label><input v-model="form.plannedEndAt" type="datetime-local" class="input" /></div>
        <div><label class="label">{{ t('orders.notes') }}</label><input v-model="form.notes" class="input" /></div>
        <div class="flex justify-end gap-2 md:col-span-3"><button type="button" class="btn-secondary" @click="modal = null">{{ t('common.cancel') }}</button><button class="btn-primary"><Icon name="check" :size="16" />{{ t('common.save') }}</button></div>
      </form>
    </Modal>

    <Modal :open="modal === 'assign'" :title="t('orders.assign')" @close="modal = null">
      <div class="mb-2 text-xs text-slate-500">{{ selected?.orderNumber }} · {{ selected?.originAddress }}</div>
      <div class="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Icon name="map-pin" :size="14" />{{ t('orders.nearby') }}</div>
      <table class="table-dense w-full">
        <thead><tr><th>{{ t('common.plate') }}</th><th>{{ t('common.driver') }}</th><th>{{ t('orders.distance') }}</th><th>{{ t('common.status') }}</th><th /></tr></thead>
        <tbody>
          <tr v-if="nearby.length === 0"><td colspan="5" class="text-center text-xs text-slate-400">{{ t('common.noData') }}</td></tr>
          <tr v-for="item in nearby" :key="item.vehicleId"><td>{{ item.plateNumber }}</td><td>{{ item.driverName }}</td><td>{{ item.distanceKm }}</td><td><StatusBadge :value="item.status" kind="live" /></td><td class="text-right"><button class="btn-primary btn-xs" @click="assign(item.vehicleId)"><Icon name="check" :size="13" />{{ t('orders.assign') }}</button></td></tr>
        </tbody>
      </table>
      <div class="mt-4 flex items-end gap-2">
        <div class="flex-1"><label class="label">{{ t('common.vehicle') }}</label>
          <select v-model="manualVehicle" class="input"><option value="">{{ t('common.select') }}</option><option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.plateNumber }} · {{ vehicle.driverName || '' }}</option></select>
        </div>
        <button class="btn-secondary" :disabled="!manualVehicle" @click="assign(manualVehicle)">{{ t('orders.assign') }}</button>
      </div>
    </Modal>

    <Modal :open="modal === 'detail'" :title="`${t('orders.detail')} · ${selected?.orderNumber ?? ''}`" wide @close="modal = null">
      <div v-if="selected" class="grid gap-4 lg:grid-cols-3">
        <div class="space-y-1 text-xs lg:col-span-1">
          <div><span class="label">{{ t('common.status') }}</span><StatusBadge :value="selected.status" kind="order" /></div>
          <div><span class="label">{{ t('orders.customer') }}</span>{{ selected.customerName }}</div>
          <div><span class="label">{{ t('orders.cargo') }}</span>{{ selected.cargoDescription || '—' }} ({{ selected.cargoWeightKg }} kg)</div>
          <div><span class="label">{{ t('orders.origin') }}</span>{{ selected.originAddress }}</div>
          <div><span class="label">{{ t('orders.destination') }}</span>{{ selected.destinationAddress }}</div>
          <div><span class="label">{{ t('common.vehicle') }}</span>{{ plateOf(selected.vehicleId) }}</div>
          <div><span class="label">{{ t('common.driver') }}</span>{{ driverOf(selected.driverId) }}</div>
          <div><span class="label">{{ t('orders.plannedStart') }}</span>{{ formatDateTime(selected.plannedStartAt) || '—' }}</div>
          <div><span class="label">{{ t('orders.route') }}</span>{{ selected.route ? `${Number(selected.route.distanceKm).toFixed(1)} km · ${t('orders.deviation')} ${selected.route.deviationThresholdKm}` : t('orders.noRoute') }}</div>
          <div class="pt-2">
            <div class="label">{{ t('orders.checkpoints') }}</div>
            <ul class="space-y-1">
              <li v-for="checkpoint in routeDraft.checkpoints" :key="checkpoint.sequence" class="flex items-center gap-2">
                <span class="w-5 text-center font-semibold">{{ checkpoint.sequence }}</span>
                <input v-model="checkpoint.name" class="input !py-0.5" />
                <input v-model.number="checkpoint.radiusM" type="number" class="input w-20 !py-0.5" />
                <span v-if="checkpoint.reachedAt" class="inline-flex items-center gap-1 text-green-700"><Icon name="check" :size="13" />{{ formatDateTime(checkpoint.reachedAt) }}</span>
                <button v-else-if="checkpoint.id && selected.status === 'IN_PROGRESS'" class="btn-secondary btn-xs" @click="reach(checkpoint.id)">{{ t('orders.reach') }}</button>
                <button class="btn-ghost btn-icon btn-sm text-red-600" @click="routeDraft.checkpoints.splice(routeDraft.checkpoints.indexOf(checkpoint), 1)"><Icon name="x" :size="13" /></button>
              </li>
            </ul>
          </div>
          <div class="pt-2"><label class="label">{{ t('orders.deviation') }}</label><input v-model.number="routeDraft.deviationThresholdKm" type="number" step="0.1" min="0.05" class="input w-32" /></div>
          <div class="pt-2 text-[11px] text-slate-500">{{ t('orders.distanceKm') }}: {{ draftDistance }} · {{ routeDraft.polyline.length }} pts</div>
          <button class="btn-primary mt-2" :disabled="routeDraft.polyline.length < 2 || ['COMPLETED', 'CANCELLED'].includes(selected.status)" @click="saveRoute"><Icon name="route" :size="16" />{{ t('common.save') }} {{ t('orders.route') }}</button>
        </div>
        <div class="h-[460px] lg:col-span-2">
          <ClientOnly>
            <RouteEditor v-model:polyline="routeDraft.polyline" v-model:checkpoints="routeDraft.checkpoints" :origin="{ latitude: selected.originLatitude, longitude: selected.originLongitude }" :destination="{ latitude: selected.destinationLatitude, longitude: selected.destinationLongitude }" />
          </ClientOnly>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useOrdersApi } from '~/composables/useOrdersApi';
import { useFleetApi } from '~/composables/useFleetApi';
import { useTenant } from '~/composables/useTenant';
import { useToastStore } from '~/stores/toast';
import { formatDateTime, isoLocal, toIso } from '~/utils/format';
import type { CheckpointDraft } from '~/components/RouteEditor.vue';

definePageMeta({ roles: ['SUPERADMIN', 'DISPATCHER', 'FLEET_MANAGER'], titleKey: 'orders.title' });
const { t } = useI18n();
useHead({ title: t('orders.title') });
const orders = useOrdersApi();
const fleet = useFleetApi();
const toast = useToastStore();
const { organizationId } = useTenant();
const rows = ref<Record<string, any>[]>([]);
const vehicles = ref<Record<string, any>[]>([]);
const drivers = ref<Record<string, any>[]>([]);
const nearby = ref<Record<string, any>[]>([]);
const loading = ref(false);
const modal = ref<'form' | 'assign' | 'detail' | null>(null);
const editing = ref<Record<string, any> | null>(null);
const selected = ref<Record<string, any> | null>(null);
const manualVehicle = ref('');
const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const statuses = ['CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const blank = () => ({ customerName: '', priority: 'NORMAL', orderNumber: '', cargoDescription: '', cargoWeightKg: null as number | null, originAddress: '', originLatitude: 41.3111, originLongitude: 69.2797, destinationAddress: '', destinationLatitude: 39.6547, destinationLongitude: 66.9758, plannedStartAt: '', plannedEndAt: '', notes: '' });
const form = reactive(blank());
const routeDraft = reactive<{ polyline: Array<{ latitude: number; longitude: number }>; checkpoints: Array<CheckpointDraft & { id?: string }>; deviationThresholdKm: number }>({ polyline: [], checkpoints: [], deviationThresholdKm: 0.5 });

const plateOf = (id: string) => vehicles.value.find((vehicle) => vehicle.id === id)?.plateNumber ?? (id ? id.slice(0, 8) : '—');
const driverOf = (id: string) => drivers.value.find((driver) => driver.id === id)?.fullName ?? (id ? id.slice(0, 8) : '—');

const columns = computed(() => [
  { key: 'orderNumber', label: t('orders.number') },
  { key: 'customerName', label: t('orders.customer') },
  { key: 'status', label: t('common.status'), options: statuses.map((status) => ({ value: status, label: t(`status.${status}`) })) },
  { key: 'priority', label: t('orders.priority'), options: priorities.map((priority) => ({ value: priority, label: t(`orders.${priority}`) })) },
  { key: 'originAddress', label: t('orders.origin') },
  { key: 'destinationAddress', label: t('orders.destination') },
  { key: 'vehicleId', label: t('common.vehicle'), format: (value: unknown) => plateOf(value as string) },
  { key: 'driverId', label: t('common.driver'), format: (value: unknown) => driverOf(value as string) },
  { key: 'plannedStartAt', label: t('orders.plannedStart'), format: (value: unknown) => formatDateTime(value as string) },
  { key: 'createdAt', label: t('common.created'), format: (value: unknown) => formatDateTime(value as string) },
]);

const draftDistance = computed(() => {
  let total = 0;
  for (let i = 0; i < routeDraft.polyline.length - 1; i++) {
    const a = routeDraft.polyline[i];
    const b = routeDraft.polyline[i + 1];
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    total += 2 * 6371 * Math.asin(Math.sqrt(h));
  }
  return total.toFixed(1);
});

const load = async () => {
  loading.value = true;
  try {
    const [orderList, vehicleList, driverList] = await Promise.all([orders.list({ pageSize: 200 }), fleet.vehicles.list({ pageSize: 200 }), fleet.drivers.list({ pageSize: 200 })]);
    rows.value = orderList.items;
    vehicles.value = vehicleList.items;
    drivers.value = driverList.items;
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editing.value = null;
  Object.assign(form, blank());
  modal.value = 'form';
};

const openEdit = (row: Record<string, any>) => {
  editing.value = row;
  Object.assign(form, { customerName: row.customerName, priority: row.priority, orderNumber: row.orderNumber, cargoDescription: row.cargoDescription, cargoWeightKg: row.cargoWeightKg || null, originAddress: row.originAddress, originLatitude: row.originLatitude, originLongitude: row.originLongitude, destinationAddress: row.destinationAddress, destinationLatitude: row.destinationLatitude, destinationLongitude: row.destinationLongitude, plannedStartAt: row.plannedStartAt ? isoLocal(new Date(row.plannedStartAt)) : '', plannedEndAt: row.plannedEndAt ? isoLocal(new Date(row.plannedEndAt)) : '', notes: row.notes });
  modal.value = 'form';
};

const save = async () => {
  const body = { ...form, orderNumber: form.orderNumber || undefined, cargoDescription: form.cargoDescription || undefined, cargoWeightKg: form.cargoWeightKg || undefined, notes: form.notes || undefined, plannedStartAt: form.plannedStartAt ? toIso(form.plannedStartAt) : undefined, plannedEndAt: form.plannedEndAt ? toIso(form.plannedEndAt) : undefined };
  try {
    if (editing.value) await orders.update(editing.value.id, body);
    else await orders.create(body);
    modal.value = null;
    toast.success(t('common.saved'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const openAssign = async (row: Record<string, any>) => {
  selected.value = row;
  manualVehicle.value = '';
  modal.value = 'assign';
  try {
    nearby.value = (await orders.nearby(row.originLatitude, row.originLongitude, 50, 10)).items;
  } catch {
    nearby.value = [];
  }
};

const assign = async (vehicleId: string) => {
  if (!selected.value) return;
  try {
    await orders.assign(selected.value.id, vehicleId);
    modal.value = null;
    toast.success(t('common.saved'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const transition = async (row: Record<string, any>, status: string) => {
  try {
    await orders.transition(row.id, status);
    toast.success(t('common.saved'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const openDetail = async (row: Record<string, any>) => {
  try {
    selected.value = await orders.get(row.id);
  } catch (error) {
    toast.error((error as Error).message);
    return;
  }
  const route = selected.value?.route;
  routeDraft.polyline = route ? route.polyline.map((p: { latitude: number; longitude: number }) => ({ latitude: p.latitude, longitude: p.longitude })) : [];
  routeDraft.checkpoints = route ? route.checkpoints.map((c: Record<string, any>) => ({ id: c.id, sequence: c.sequence, name: c.name, latitude: c.latitude, longitude: c.longitude, radiusM: c.radiusM, reachedAt: c.reachedAt || undefined })) : [];
  routeDraft.deviationThresholdKm = route?.deviationThresholdKm || 0.5;
  modal.value = 'detail';
};

const saveRoute = async () => {
  if (!selected.value) return;
  try {
    await orders.setRoute(selected.value.id, { polyline: routeDraft.polyline, deviationThresholdKm: routeDraft.deviationThresholdKm, checkpoints: routeDraft.checkpoints.map((c, index) => ({ sequence: index + 1, name: c.name, latitude: c.latitude, longitude: c.longitude, radiusM: c.radiusM })) });
    toast.success(t('common.saved'));
    await openDetail(selected.value);
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const reach = async (checkpointId: string) => {
  if (!selected.value) return;
  try {
    await orders.reach(selected.value.id, checkpointId);
    await openDetail(selected.value);
  } catch (error) {
    toast.error((error as Error).message);
  }
};

onMounted(load);
watch(organizationId, load);
</script>
