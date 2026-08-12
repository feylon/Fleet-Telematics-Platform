<template>
  <div class="space-y-3">
    <PageHeader :title="t('maintenance.title')">
      <button class="btn-primary" @click="openCreate">{{ t('maintenance.new') }}</button>
    </PageHeader>
    <div class="card">
      <div class="border-b border-slate-200 px-3 py-2 text-sm font-semibold">{{ t('maintenance.due') }}</div>
      <table class="table-dense w-full">
        <thead><tr><th>{{ t('common.plate') }}</th><th>{{ t('maintenance.reason') }}</th><th>{{ t('maintenance.dueAt') }}</th><th>{{ t('maintenance.dueKm') }}</th><th>{{ t('vehicles.odometer') }}</th></tr></thead>
        <tbody>
          <tr v-if="due.length === 0"><td colspan="5" class="text-center text-xs text-slate-400">{{ t('maintenance.nothingDue') }}</td></tr>
          <tr v-for="item in due" :key="`${item.vehicleId}-${item.reason}`"><td>{{ item.plateNumber }}</td><td><span class="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">{{ t(`maintenance.${item.reason}`) }}</span></td><td>{{ formatDate(item.dueAt) }}</td><td>{{ item.dueOdometerKm || '' }}</td><td>{{ item.odometerKm }}</td></tr>
        </tbody>
      </table>
    </div>
    <DataTable :columns="columns" :rows="rows" :loading="loading" row-key="id" :export-title="t('maintenance.history')">
      <template #cell-type="{ value }">{{ t(`maintenance.${value}`) }}</template>
      <template #actions="{ row }"><ConfirmButton klass="btn-danger btn-xs" @confirm="remove(row.id)">{{ t('common.delete') }}</ConfirmButton></template>
    </DataTable>
    <Modal :open="modal" :title="t('maintenance.new')" wide @close="modal = false">
      <form class="grid gap-3 md:grid-cols-3" @submit.prevent="save">
        <div><label class="label">{{ t('common.vehicle') }}</label><select v-model="form.vehicleId" class="input" required><option value="">{{ t('common.select') }}</option><option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.plateNumber }}</option></select></div>
        <div><label class="label">{{ t('maintenance.typeLabel') }}</label><select v-model="form.type" class="input"><option v-for="type in types" :key="type" :value="type">{{ t(`maintenance.${type}`) }}</option></select></div>
        <div><label class="label">{{ t('maintenance.cost') }}</label><input v-model="form.costAmount" class="input" pattern="\d{1,12}(\.\d{1,2})?" /></div>
        <div class="md:col-span-3"><label class="label">{{ t('common.description') }}</label><input v-model="form.description" class="input" required minlength="3" /></div>
        <div><label class="label">{{ t('vehicles.odometer') }}</label><input v-model.number="form.odometerKm" type="number" min="0" class="input" /></div>
        <div><label class="label">{{ t('maintenance.performedAt') }}</label><input v-model="form.performedAt" type="datetime-local" class="input" /></div>
        <div><label class="label">{{ t('maintenance.nextDueAt') }}</label><input v-model="form.nextDueAt" type="date" class="input" /></div>
        <div><label class="label">{{ t('maintenance.nextDueKm') }}</label><input v-model.number="form.nextDueOdometerKm" type="number" min="0" class="input" /></div>
        <div><label class="label">{{ t('maintenance.downtimeFrom') }}</label><input v-model="form.downtimeFrom" type="datetime-local" class="input" /></div>
        <div><label class="label">{{ t('maintenance.downtimeTo') }}</label><input v-model="form.downtimeTo" type="datetime-local" class="input" /></div>
        <div class="flex items-end md:col-span-3"><label class="flex items-center gap-2 text-sm"><input v-model="form.markOutOfService" type="checkbox" />{{ t('maintenance.markOut') }}</label></div>
        <div class="flex justify-end gap-2 md:col-span-3"><button type="button" class="btn-secondary" @click="modal = false">{{ t('common.cancel') }}</button><button class="btn-primary">{{ t('common.save') }}</button></div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useFleetApi } from '~/composables/useFleetApi';
import { useTenant } from '~/composables/useTenant';
import { useToastStore } from '~/stores/toast';
import { formatDate, formatDateTime, toIso } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN', 'FLEET_MANAGER', 'DISPATCHER'], titleKey: 'maintenance.title' });
const { t } = useI18n();
useHead({ title: t('maintenance.title') });
const fleet = useFleetApi();
const toast = useToastStore();
const { organizationId } = useTenant();
const rows = ref<Record<string, any>[]>([]);
const due = ref<Record<string, any>[]>([]);
const vehicles = ref<Record<string, any>[]>([]);
const loading = ref(false);
const modal = ref(false);
const types = ['INSPECTION', 'REPAIR', 'OIL_CHANGE', 'TIRES', 'OTHER'];
const blank = () => ({ vehicleId: '', type: 'INSPECTION', description: '', costAmount: '', odometerKm: null as number | null, performedAt: '', nextDueAt: '', nextDueOdometerKm: null as number | null, downtimeFrom: '', downtimeTo: '', markOutOfService: false });
const form = reactive(blank());

const columns = computed(() => [
  { key: 'performedAt', label: t('maintenance.performedAt'), format: (value: unknown) => formatDateTime(value as string) },
  { key: 'plateNumber', label: t('common.plate') },
  { key: 'type', label: t('maintenance.typeLabel'), options: types.map((type) => ({ value: type, label: t(`maintenance.${type}`) })) },
  { key: 'description', label: t('common.description') },
  { key: 'costAmount', label: t('maintenance.cost') },
  { key: 'odometerKm', label: t('vehicles.odometer') },
  { key: 'nextDueAt', label: t('maintenance.nextDueAt'), format: (value: unknown) => formatDate(value as string) },
  { key: 'nextDueOdometerKm', label: t('maintenance.nextDueKm') },
  { key: 'downtimeFrom', label: t('maintenance.downtimeFrom'), format: (value: unknown) => formatDateTime(value as string) },
  { key: 'downtimeTo', label: t('maintenance.downtimeTo'), format: (value: unknown) => formatDateTime(value as string) },
]);

const load = async () => {
  loading.value = true;
  try {
    const [history, dueList, vehicleList] = await Promise.all([fleet.maintenance.list({ pageSize: 200 }), fleet.maintenance.due(), fleet.vehicles.list({ pageSize: 200 })]);
    rows.value = history.items;
    due.value = dueList.items;
    vehicles.value = vehicleList.items;
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  Object.assign(form, blank());
  modal.value = true;
};

const save = async () => {
  try {
    await fleet.maintenance.create({ vehicleId: form.vehicleId, type: form.type, description: form.description, costAmount: form.costAmount || undefined, odometerKm: form.odometerKm || undefined, performedAt: form.performedAt ? toIso(form.performedAt) : undefined, nextDueAt: form.nextDueAt ? new Date(form.nextDueAt).toISOString() : undefined, nextDueOdometerKm: form.nextDueOdometerKm || undefined, downtimeFrom: form.downtimeFrom ? toIso(form.downtimeFrom) : undefined, downtimeTo: form.downtimeTo ? toIso(form.downtimeTo) : undefined, markOutOfService: form.markOutOfService });
    modal.value = false;
    toast.success(t('common.saved'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const remove = async (id: string) => {
  try {
    await fleet.maintenance.remove(id);
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

onMounted(load);
watch(organizationId, load);
</script>
