<template>
  <div class="space-y-3">
    <PageHeader :title="t('vehicles.title')">
      <button v-if="canEdit" class="btn-primary" @click="openCreate"><Icon name="plus" :size="16" />{{ t('vehicles.new') }}</button>
    </PageHeader>
    <DataTable :columns="columns" :rows="rows" :loading="loading" row-key="id" :export-title="t('vehicles.title')">
      <template #cell-status="{ value }"><StatusBadge :value="value" kind="vehicle" /></template>
      <template #cell-fuelType="{ value }">{{ t(`vehicles.${value}`) }}</template>
      <template #actions="{ row }">
        <NuxtLink class="btn-secondary btn-icon btn-xs" :title="t('nav.playback')" :to="{ path: '/dispatch/playback', query: { vehicleId: row.id } }"><Icon name="play" :size="13" /></NuxtLink>
        <template v-if="canEdit">
          <button class="btn-secondary btn-xs" @click="openEdit(row)"><Icon name="pencil" :size="13" />{{ t('common.edit') }}</button>
          <button class="btn-secondary btn-icon btn-xs" :title="t('vehicles.fuelNorm')" @click="openFuel(row)"><Icon name="fuel" :size="13" /></button>
          <button v-if="row.status !== 'ACTIVE'" class="btn-secondary btn-icon btn-xs text-emerald-600" :title="t('vehicles.markActive')" @click="setStatus(row, 'ACTIVE')"><Icon name="check-circle" :size="13" /></button>
          <button v-if="row.status !== 'MAINTENANCE'" class="btn-secondary btn-icon btn-xs text-amber-600" :title="t('vehicles.markMaintenance')" @click="setStatus(row, 'MAINTENANCE')"><Icon name="wrench" :size="13" /></button>
          <button v-if="row.status !== 'OUT_OF_SERVICE'" class="btn-secondary btn-icon btn-xs text-slate-500" :title="t('vehicles.markOut')" @click="setStatus(row, 'OUT_OF_SERVICE')"><Icon name="power" :size="13" /></button>
          <ConfirmButton klass="btn-danger btn-xs" @confirm="remove(row.id)"><Icon name="trash" :size="13" />{{ t('common.delete') }}</ConfirmButton>
        </template>
      </template>
    </DataTable>

    <Modal :open="modal === 'form'" :title="editing ? t('common.edit') : t('vehicles.new')" wide @close="modal = null">
      <form class="grid gap-3 md:grid-cols-3" @submit.prevent="save">
        <div><label class="label">{{ t('common.plate') }}</label><input v-model="form.plateNumber" class="input" required /></div>
        <div><label class="label">{{ t('vehicles.brand') }}</label><input v-model="form.brand" class="input" required /></div>
        <div><label class="label">{{ t('vehicles.model') }}</label><input v-model="form.model" class="input" required /></div>
        <div><label class="label">{{ t('vehicles.vin') }}</label><input v-model="form.vin" class="input" maxlength="32" /></div>
        <div><label class="label">{{ t('vehicles.year') }}</label><input v-model.number="form.year" type="number" min="1950" max="2100" class="input" /></div>
        <div><label class="label">{{ t('vehicles.fuelType') }}</label><select v-model="form.fuelType" class="input"><option v-for="f in fuelTypes" :key="f" :value="f">{{ t(`vehicles.${f}`) }}</option></select></div>
        <div><label class="label">{{ t('vehicles.tank') }}</label><input v-model.number="form.fuelTankCapacity" type="number" min="0" class="input" /></div>
        <div><label class="label">{{ t('vehicles.odometer') }}</label><input v-model.number="form.odometerKm" type="number" min="0" class="input" /></div>
        <div><label class="label">{{ t('vehicles.maxSpeed') }}</label><input v-model.number="form.maxSpeedKmh" type="number" min="10" max="250" class="input" /></div>
        <div><label class="label">{{ t('vehicles.interval') }}</label><input v-model.number="form.maintenanceIntervalKm" type="number" min="100" class="input" /></div>
        <div><label class="label">{{ t('vehicles.nextInspection') }}</label><input v-model="form.nextInspectionAt" type="date" class="input" /></div>
        <div><label class="label">{{ t('vehicles.nextInspectionKm') }}</label><input v-model.number="form.nextInspectionOdometerKm" type="number" min="0" class="input" /></div>
        <div><label class="label">{{ t('vehicles.color') }}</label><input v-model="form.color" class="input" /></div>
        <div><label class="label">{{ t('vehicles.icon') }}</label><select v-model="form.iconType" class="input"><option v-for="icon in ['truck', 'van', 'car', 'bus', 'tractor']" :key="icon" :value="icon">{{ icon }}</option></select></div>
        <div><label class="label">{{ t('common.status') }}</label><select v-model="form.status" class="input"><option v-for="s in ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE']" :key="s" :value="s">{{ t(`status.${s}`) }}</option></select></div>
        <div class="flex justify-end gap-2 md:col-span-3"><button type="button" class="btn-secondary" @click="modal = null">{{ t('common.cancel') }}</button><button class="btn-primary"><Icon name="check" :size="16" />{{ t('common.save') }}</button></div>
      </form>
    </Modal>

    <Modal :open="modal === 'fuel'" :title="`${t('vehicles.fuelNorm')} · ${editing?.plateNumber ?? ''}`" @close="modal = null">
      <form class="grid gap-3 md:grid-cols-2" @submit.prevent="saveFuel">
        <div><label class="label">{{ t('vehicles.litersPer100') }}</label><input v-model.number="fuel.litersPer100km" type="number" step="0.1" min="0.1" class="input" required /></div>
        <div><label class="label">{{ t('vehicles.winter') }}</label><input v-model.number="fuel.winterCoefficient" type="number" step="0.01" min="0.5" max="2" class="input" /></div>
        <div><label class="label">{{ t('vehicles.city') }}</label><input v-model.number="fuel.cityCoefficient" type="number" step="0.01" min="0.5" max="2" class="input" /></div>
        <div><label class="label">{{ t('vehicles.fuelDrop') }}</label><input v-model.number="fuel.fuelDropAlertFraction" type="number" step="0.01" min="0.01" max="1" class="input" /></div>
        <div class="flex justify-end gap-2 md:col-span-2"><button type="button" class="btn-secondary" @click="modal = null">{{ t('common.cancel') }}</button><button class="btn-primary"><Icon name="check" :size="16" />{{ t('common.save') }}</button></div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useFleetApi } from '~/composables/useFleetApi';
import { useTenant } from '~/composables/useTenant';
import { useAuthStore } from '~/stores/auth';
import { useToastStore } from '~/stores/toast';
import { formatDate, formatDateTime } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN', 'DISPATCHER', 'FLEET_MANAGER'], titleKey: 'vehicles.title' });
const { t } = useI18n();
useHead({ title: t('vehicles.title') });
const fleet = useFleetApi();
const auth = useAuthStore();
const toast = useToastStore();
const { organizationId } = useTenant();
const canEdit = computed(() => auth.role === 'SUPERADMIN' || auth.role === 'FLEET_MANAGER');
const rows = ref<Record<string, any>[]>([]);
const loading = ref(false);
const modal = ref<'form' | 'fuel' | null>(null);
const editing = ref<Record<string, any> | null>(null);
const fuelTypes = ['PETROL', 'DIESEL', 'GAS', 'ELECTRIC', 'HYBRID'];
const blank = () => ({ plateNumber: '', brand: '', model: '', vin: '', year: null as number | null, fuelType: 'DIESEL', fuelTankCapacity: null as number | null, odometerKm: 0, maxSpeedKmh: 90, maintenanceIntervalKm: 10000, nextInspectionAt: '', nextInspectionOdometerKm: null as number | null, color: '', iconType: 'truck', status: 'ACTIVE' });
const form = reactive(blank());
const fuel = reactive({ litersPer100km: 0, winterCoefficient: 1.1, cityCoefficient: 1.15, fuelDropAlertFraction: 0.2 });

const columns = computed(() => [
  { key: 'plateNumber', label: t('common.plate') },
  { key: 'brand', label: t('vehicles.brand') },
  { key: 'model', label: t('vehicles.model') },
  { key: 'year', label: t('vehicles.year') },
  { key: 'fuelType', label: t('vehicles.fuelType'), options: fuelTypes.map((f) => ({ value: f, label: t(`vehicles.${f}`) })) },
  { key: 'status', label: t('common.status'), options: ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'].map((s) => ({ value: s, label: t(`status.${s}`) })) },
  { key: 'odometerKm', label: t('vehicles.odometer') },
  { key: 'maxSpeedKmh', label: t('vehicles.maxSpeed') },
  { key: 'imei', label: t('vehicles.imei') },
  { key: 'driverName', label: t('common.driver') },
  { key: 'nextInspectionAt', label: t('vehicles.nextInspection'), format: (value: unknown) => formatDate(value as string) },
  { key: 'updatedAt', label: t('common.updated'), format: (value: unknown) => formatDateTime(value as string) },
]);

const load = async () => {
  loading.value = true;
  try {
    rows.value = (await fleet.vehicles.list({ pageSize: 200 })).items;
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
  Object.assign(form, { plateNumber: row.plateNumber, brand: row.brand, model: row.model, vin: row.vin, year: row.year || null, fuelType: row.fuelType, fuelTankCapacity: row.fuelTankCapacity || null, odometerKm: row.odometerKm, maxSpeedKmh: row.maxSpeedKmh, maintenanceIntervalKm: row.maintenanceIntervalKm, nextInspectionAt: row.nextInspectionAt ? row.nextInspectionAt.slice(0, 10) : '', nextInspectionOdometerKm: row.nextInspectionOdometerKm || null, color: row.color, iconType: row.iconType, status: row.status });
  modal.value = 'form';
};

const save = async () => {
  const body = { ...form, vin: form.vin || undefined, year: form.year || undefined, fuelTankCapacity: form.fuelTankCapacity || undefined, nextInspectionAt: form.nextInspectionAt ? new Date(form.nextInspectionAt).toISOString() : undefined, nextInspectionOdometerKm: form.nextInspectionOdometerKm || undefined, color: form.color || undefined };
  try {
    if (editing.value) await fleet.vehicles.update(editing.value.id, body);
    else await fleet.vehicles.create(body);
    modal.value = null;
    toast.success(t('common.saved'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const setStatus = async (row: Record<string, any>, status: string) => {
  try {
    await fleet.vehicles.setStatus(row.id, status);
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const openFuel = async (row: Record<string, any>) => {
  editing.value = row;
  try {
    const norm = await fleet.maintenance.fuelNorm(row.id);
    Object.assign(fuel, { litersPer100km: norm.litersPer100km || 0, winterCoefficient: norm.winterCoefficient || 1.1, cityCoefficient: norm.cityCoefficient || 1.15, fuelDropAlertFraction: norm.fuelDropAlertFraction || 0.2 });
  } catch {
    Object.assign(fuel, { litersPer100km: 0, winterCoefficient: 1.1, cityCoefficient: 1.15, fuelDropAlertFraction: 0.2 });
  }
  modal.value = 'fuel';
};

const saveFuel = async () => {
  if (!editing.value) return;
  try {
    await fleet.maintenance.setFuelNorm(editing.value.id, { ...fuel });
    modal.value = null;
    toast.success(t('common.saved'));
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const remove = async (id: string) => {
  try {
    await fleet.vehicles.remove(id);
    toast.success(t('common.deleted'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

onMounted(load);
watch(organizationId, load);
</script>
