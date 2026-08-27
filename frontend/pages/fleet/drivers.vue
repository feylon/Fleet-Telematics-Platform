<template>
  <div class="space-y-3">
    <PageHeader :title="t('drivers.title')">
      <button v-if="canEdit" class="btn-primary" @click="openCreate"><Icon name="plus" :size="16" />{{ t('drivers.new') }}</button>
    </PageHeader>
    <DataTable :columns="columns" :rows="rows" :loading="loading" row-key="id" :export-title="t('drivers.title')">
      <template #cell-licenseCategories="{ value }">{{ (value as string[]).join(', ') }}</template>
      <template #cell-isActive="{ value }"><span :class="value ? 'text-green-700' : 'text-slate-400'">{{ value ? t('common.active') : t('common.inactive') }}</span></template>
      <template #actions="{ row }">
        <template v-if="canEdit">
          <button class="btn-secondary btn-xs" @click="openEdit(row)"><Icon name="pencil" :size="13" />{{ t('common.edit') }}</button>
          <ConfirmButton klass="btn-danger btn-xs" @confirm="remove(row.id)"><Icon name="trash" :size="13" />{{ t('common.delete') }}</ConfirmButton>
        </template>
        <button class="btn-secondary btn-xs" @click="openAssign(row)"><Icon name="truck" :size="13" />{{ t('drivers.assignVehicle') }}</button>
      </template>
    </DataTable>

    <Modal :open="modal === 'form'" :title="editing ? t('common.edit') : t('drivers.new')" wide @close="modal = null">
      <form class="grid gap-3 md:grid-cols-3" @submit.prevent="save">
        <div><label class="label">{{ t('common.fullName') }}</label><input v-model="form.fullName" class="input" required /></div>
        <div><label class="label">{{ t('common.phone') }}</label><input v-model="form.phone" class="input" /></div>
        <div><label class="label">{{ t('drivers.license') }}</label><input v-model="form.licenseNumber" class="input" /></div>
        <div><label class="label">{{ t('drivers.categories') }}</label>
          <div class="flex flex-wrap gap-2 pt-1">
            <label v-for="cat in categories" :key="cat" class="flex items-center gap-1 text-xs"><input v-model="form.licenseCategories" type="checkbox" :value="cat" />{{ cat }}</label>
          </div>
        </div>
        <div><label class="label">{{ t('drivers.licenseExpires') }}</label><input v-model="form.licenseExpiresAt" type="date" class="input" /></div>
        <div><label class="label">{{ t('drivers.birthDate') }}</label><input v-model="form.birthDate" type="date" class="input" /></div>
        <div><label class="label">{{ t('drivers.shiftStart') }}</label><input v-model="form.shiftStart" type="time" class="input" /></div>
        <div><label class="label">{{ t('drivers.shiftEnd') }}</label><input v-model="form.shiftEnd" type="time" class="input" /></div>
        <div><label class="label">{{ t('drivers.hiredAt') }}</label><input v-model="form.hiredAt" type="date" class="input" /></div>
        <div><label class="label">{{ t('common.vehicle') }}</label>
          <select v-model="form.vehicleId" class="input"><option value="">{{ t('common.none') }}</option><option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.plateNumber }}</option></select>
        </div>
        <div class="md:col-span-2">
          <label class="label">{{ t('drivers.user') }}</label>
          <div class="flex gap-2">
            <select v-model="form.userId" class="input"><option value="">{{ t('drivers.noUser') }}</option><option v-for="user in driverUsers" :key="user.id" :value="user.id">{{ user.login }} · {{ user.fullName }}</option></select>
            <button type="button" class="btn-secondary whitespace-nowrap" @click="userForm.open = !userForm.open"><Icon name="plus" :size="14" />{{ t('drivers.createUser') }}</button>
          </div>
          <div v-if="userForm.open" class="mt-2 grid gap-2 rounded border border-slate-200 bg-slate-50 p-2 md:grid-cols-3">
            <input v-model="userForm.login" class="input" :placeholder="t('common.login')" pattern="[a-zA-Z0-9._-]{4,80}" />
            <input v-model="userForm.password" type="password" class="input" :placeholder="t('common.password')" minlength="8" />
            <button type="button" class="btn-primary" @click="createUser">{{ t('common.create') }}</button>
          </div>
        </div>
        <div class="flex items-end"><label class="flex items-center gap-2 text-sm"><input v-model="form.isActive" type="checkbox" />{{ t('common.active') }}</label></div>
        <div class="flex justify-end gap-2 md:col-span-3"><button type="button" class="btn-secondary" @click="modal = null">{{ t('common.cancel') }}</button><button class="btn-primary"><Icon name="check" :size="16" />{{ t('common.save') }}</button></div>
      </form>
    </Modal>

    <Modal :open="modal === 'assign'" :title="`${t('drivers.assignVehicle')} · ${editing?.fullName ?? ''}`" @close="modal = null">
      <div class="flex items-end gap-2">
        <div class="flex-1"><label class="label">{{ t('common.vehicle') }}</label>
          <select v-model="assignVehicle" class="input"><option value="">{{ t('common.none') }}</option><option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.plateNumber }} {{ vehicle.driverName ? `(${vehicle.driverName})` : '' }}</option></select>
        </div>
        <button class="btn-primary" @click="assign">{{ t('common.save') }}</button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useFleetApi } from '~/composables/useFleetApi';
import { useAdminApi } from '~/composables/useAdminApi';
import { useTenant } from '~/composables/useTenant';
import { useAuthStore } from '~/stores/auth';
import { useToastStore } from '~/stores/toast';
import { formatDate } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN', 'DISPATCHER', 'FLEET_MANAGER'], titleKey: 'drivers.title' });
const { t } = useI18n();
useHead({ title: t('drivers.title') });
const fleet = useFleetApi();
const admin = useAdminApi();
const auth = useAuthStore();
const toast = useToastStore();
const { organizationId, withTenant } = useTenant();
const canEdit = computed(() => auth.role === 'SUPERADMIN' || auth.role === 'FLEET_MANAGER');
const rows = ref<Record<string, any>[]>([]);
const vehicles = ref<Record<string, any>[]>([]);
const driverUsers = ref<Record<string, any>[]>([]);
const loading = ref(false);
const modal = ref<'form' | 'assign' | null>(null);
const editing = ref<Record<string, any> | null>(null);
const assignVehicle = ref('');
const categories = ['A', 'B', 'BE', 'C', 'CE', 'D', 'DE'];
const blank = () => ({ fullName: '', phone: '', licenseNumber: '', licenseCategories: [] as string[], licenseExpiresAt: '', birthDate: '', shiftStart: '', shiftEnd: '', hiredAt: '', vehicleId: '', userId: '', isActive: true });
const form = reactive(blank());
const userForm = reactive({ open: false, login: '', password: '' });

const columns = computed(() => [
  { key: 'fullName', label: t('common.fullName') },
  { key: 'phone', label: t('common.phone') },
  { key: 'licenseNumber', label: t('drivers.license') },
  { key: 'licenseCategories', label: t('drivers.categories'), format: (value: unknown) => ((value as string[]) ?? []).join(', ') },
  { key: 'licenseExpiresAt', label: t('drivers.licenseExpires'), format: (value: unknown) => formatDate(value as string) },
  { key: 'plateNumber', label: t('common.vehicle') },
  { key: 'login', label: t('drivers.user') },
  { key: 'shiftStart', label: t('drivers.shiftStart'), format: (value: unknown) => ((value as string) ?? '').slice(0, 5) },
  { key: 'shiftEnd', label: t('drivers.shiftEnd'), format: (value: unknown) => ((value as string) ?? '').slice(0, 5) },
  { key: 'isActive', label: t('common.status'), options: [{ value: 'true', label: t('common.active') }, { value: 'false', label: t('common.inactive') }] },
]);

const load = async () => {
  loading.value = true;
  try {
    const [driverList, vehicleList] = await Promise.all([fleet.drivers.list({ pageSize: 200 }), fleet.vehicles.list({ pageSize: 200 })]);
    rows.value = driverList.items;
    vehicles.value = vehicleList.items;
    if (canEdit.value) driverUsers.value = (await admin.users.list(withTenant({ role: 'DRIVER', pageSize: 200 }))).items;
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editing.value = null;
  Object.assign(form, blank());
  userForm.open = false;
  modal.value = 'form';
};

const openEdit = (row: Record<string, any>) => {
  editing.value = row;
  Object.assign(form, { fullName: row.fullName, phone: row.phone, licenseNumber: row.licenseNumber, licenseCategories: [...(row.licenseCategories ?? [])], licenseExpiresAt: row.licenseExpiresAt, birthDate: row.birthDate, shiftStart: (row.shiftStart ?? '').slice(0, 5), shiftEnd: (row.shiftEnd ?? '').slice(0, 5), hiredAt: row.hiredAt, vehicleId: row.vehicleId ?? '', userId: row.userId ?? '', isActive: row.isActive });
  userForm.open = false;
  modal.value = 'form';
};

const createUser = async () => {
  try {
    const user = await admin.users.create(withTenant({ login: userForm.login, password: userForm.password, role: 'DRIVER', fullName: form.fullName || userForm.login }));
    driverUsers.value = [...driverUsers.value, user];
    form.userId = user.id;
    userForm.open = false;
    toast.success(t('common.saved'));
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const save = async () => {
  const body = { fullName: form.fullName, phone: form.phone || undefined, licenseNumber: form.licenseNumber || undefined, licenseCategories: form.licenseCategories, licenseExpiresAt: form.licenseExpiresAt || undefined, birthDate: form.birthDate || undefined, shiftStart: form.shiftStart || undefined, shiftEnd: form.shiftEnd || undefined, hiredAt: form.hiredAt || undefined, vehicleId: form.vehicleId || undefined, userId: form.userId || undefined, isActive: form.isActive };
  try {
    if (editing.value) await fleet.drivers.update(editing.value.id, body);
    else await fleet.drivers.create(body);
    modal.value = null;
    toast.success(t('common.saved'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const openAssign = (row: Record<string, any>) => {
  editing.value = row;
  assignVehicle.value = row.vehicleId ?? '';
  modal.value = 'assign';
};

const assign = async () => {
  if (!editing.value) return;
  try {
    await fleet.drivers.assign(editing.value.id, assignVehicle.value || null);
    modal.value = null;
    toast.success(t('common.saved'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const remove = async (id: string) => {
  try {
    await fleet.drivers.remove(id);
    toast.success(t('common.deleted'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

onMounted(load);
watch(organizationId, load);
</script>
