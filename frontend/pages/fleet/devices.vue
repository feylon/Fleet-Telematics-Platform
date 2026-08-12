<template>
  <div class="space-y-3">
    <PageHeader :title="t('devices.title')">
      <button class="btn-primary" @click="openCreate">{{ t('devices.new') }}</button>
    </PageHeader>
    <div v-if="token" class="card card-body border-amber-300 bg-amber-50">
      <div class="text-xs font-semibold uppercase text-amber-700">{{ t('devices.token') }}</div>
      <div class="mt-1 flex items-center gap-2"><code class="flex-1 break-all rounded bg-white px-2 py-1 text-sm">{{ token }}</code><button class="btn-secondary btn-xs" @click="copyToken">{{ copied ? t('common.copied') : t('common.copy') }}</button><button class="btn-secondary btn-xs" @click="token = ''">{{ t('common.close') }}</button></div>
      <p class="mt-1 text-xs text-amber-700">{{ t('devices.tokenHint') }}</p>
    </div>
    <DataTable :columns="columns" :rows="rows" :loading="loading" row-key="id" :export-title="t('devices.title')">
      <template #cell-isActive="{ value }"><span :class="value ? 'text-green-700' : 'text-slate-400'">{{ value ? t('common.active') : t('common.inactive') }}</span></template>
      <template #actions="{ row }">
        <button class="btn-secondary btn-xs" @click="openEdit(row)">{{ t('common.edit') }}</button>
        <ConfirmButton klass="btn-secondary btn-xs ml-1" :message="t('devices.rotate') + '?'" @confirm="rotate(row.id)">{{ t('devices.rotate') }}</ConfirmButton>
        <ConfirmButton klass="btn-danger btn-xs ml-1" @confirm="remove(row.id)">{{ t('common.delete') }}</ConfirmButton>
      </template>
    </DataTable>
    <Modal :open="modal" :title="editing ? t('common.edit') : t('devices.new')" @close="modal = false">
      <form class="grid gap-3 md:grid-cols-2" @submit.prevent="save">
        <div><label class="label">{{ t('devices.imei') }}</label><input v-model="form.imei" class="input" pattern="\d{8,20}" required /></div>
        <div><label class="label">{{ t('devices.vehicle') }}</label>
          <select v-model="form.vehicleId" class="input"><option value="">{{ t('devices.unbound') }}</option><option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.plateNumber }}</option></select>
        </div>
        <div><label class="label">{{ t('devices.model') }}</label><input v-model="form.model" class="input" /></div>
        <div><label class="label">{{ t('devices.sim') }}</label><input v-model="form.simNumber" class="input" /></div>
        <div class="flex items-end"><label class="flex items-center gap-2 text-sm"><input v-model="form.isActive" type="checkbox" />{{ t('common.active') }}</label></div>
        <div class="flex justify-end gap-2 md:col-span-2"><button type="button" class="btn-secondary" @click="modal = false">{{ t('common.cancel') }}</button><button class="btn-primary">{{ t('common.save') }}</button></div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useFleetApi } from '~/composables/useFleetApi';
import { useTenant } from '~/composables/useTenant';
import { useToastStore } from '~/stores/toast';
import { formatDateTime } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN', 'FLEET_MANAGER'], titleKey: 'devices.title' });
const { t } = useI18n();
useHead({ title: t('devices.title') });
const fleet = useFleetApi();
const toast = useToastStore();
const { organizationId } = useTenant();
const rows = ref<Record<string, any>[]>([]);
const vehicles = ref<Record<string, any>[]>([]);
const loading = ref(false);
const modal = ref(false);
const editing = ref<Record<string, any> | null>(null);
const token = ref('');
const copied = ref(false);
const form = reactive({ imei: '', vehicleId: '', model: '', simNumber: '', isActive: true });

const columns = computed(() => [
  { key: 'imei', label: t('devices.imei') },
  { key: 'plateNumber', label: t('devices.vehicle') },
  { key: 'model', label: t('devices.model') },
  { key: 'simNumber', label: t('devices.sim') },
  { key: 'isActive', label: t('common.status'), options: [{ value: 'true', label: t('common.active') }, { value: 'false', label: t('common.inactive') }] },
  { key: 'lastSeenAt', label: t('devices.lastSeen'), format: (value: unknown) => formatDateTime(value as string) },
  { key: 'createdAt', label: t('common.created'), format: (value: unknown) => formatDateTime(value as string) },
]);

const load = async () => {
  loading.value = true;
  try {
    const [devices, vehicleList] = await Promise.all([fleet.devices.list({ pageSize: 200 }), fleet.vehicles.list({ pageSize: 200 })]);
    rows.value = devices.items;
    vehicles.value = vehicleList.items;
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editing.value = null;
  Object.assign(form, { imei: '', vehicleId: '', model: '', simNumber: '', isActive: true });
  modal.value = true;
};

const openEdit = (row: Record<string, any>) => {
  editing.value = row;
  Object.assign(form, { imei: row.imei, vehicleId: row.vehicleId ?? '', model: row.model ?? '', simNumber: row.simNumber ?? '', isActive: row.isActive });
  modal.value = true;
};

const save = async () => {
  const body = { imei: form.imei, vehicleId: form.vehicleId || undefined, model: form.model || undefined, simNumber: form.simNumber || undefined, isActive: form.isActive };
  try {
    if (editing.value) await fleet.devices.update(editing.value.id, body);
    else token.value = (await fleet.devices.create(body)).token;
    modal.value = false;
    toast.success(t('common.saved'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const rotate = async (id: string) => {
  try {
    token.value = (await fleet.devices.rotate(id)).token;
    copied.value = false;
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const copyToken = async () => {
  try {
    await navigator.clipboard.writeText(token.value);
    copied.value = true;
  } catch {
    copied.value = false;
  }
};

const remove = async (id: string) => {
  try {
    await fleet.devices.remove(id);
    toast.success(t('common.deleted'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

onMounted(load);
watch(organizationId, load);
</script>
