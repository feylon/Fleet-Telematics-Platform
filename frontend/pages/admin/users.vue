<template>
  <div class="space-y-3">
    <PageHeader :title="t('admin.users')">
      <div class="relative"><Icon name="key" :size="15" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="lookupId" class="input w-80 !pl-8" :placeholder="t('admin.lookupHint')" /></div>
      <button class="btn-secondary" @click="lookup"><Icon name="search" :size="16" />{{ t('common.lookup') }}</button>
      <select v-model="organizationFilter" class="input w-56" @change="load">
        <option value="">{{ t('common.allOrganizations') }}</option>
        <option v-for="org in tenant.options" :key="org.id" :value="org.id">{{ org.name }}</option>
      </select>
      <button class="btn-primary" @click="openCreate"><Icon name="plus" :size="16" />{{ t('admin.newUser') }}</button>
    </PageHeader>
    <DataTable :columns="columns" :rows="rows" :loading="loading" row-key="id" :export-title="t('admin.users')">
      <template #cell-role="{ value }">{{ t(`admin.${value}`) }}</template>
      <template #cell-isActive="{ value }"><span :class="value ? 'text-green-700' : 'text-slate-400'">{{ value ? t('common.active') : t('common.inactive') }}</span></template>
      <template #actions="{ row }">
        <button class="btn-secondary btn-xs" @click="openEdit(row)"><Icon name="pencil" :size="13" />{{ t('common.edit') }}</button>
        <button class="btn-secondary btn-xs" @click="openCredentials(row)"><Icon name="key" :size="13" />{{ t('admin.credentials') }}</button>
        <button class="btn-secondary btn-xs" @click="openHistory(row)"><Icon name="history" :size="13" />{{ t('auth.loginHistory') }}</button>
        <ConfirmButton klass="btn-secondary btn-xs" :message="t('admin.terminateSessions') + '?'" @confirm="terminate(row.id)"><Icon name="power" :size="13" />{{ t('auth.terminate') }}</ConfirmButton>
        <ConfirmButton klass="btn-danger btn-xs" @confirm="remove(row.id)"><Icon name="trash" :size="13" />{{ t('common.delete') }}</ConfirmButton>
      </template>
    </DataTable>

    <Modal :open="modal === 'form'" :title="editing ? t('common.edit') : t('admin.newUser')" @close="modal = null">
      <form class="grid gap-3 md:grid-cols-2" @submit.prevent="save">
        <div v-if="!editing"><label class="label">{{ t('common.organization') }}</label>
          <select v-model="form.organizationId" class="input" :required="form.role !== 'SUPERADMIN'"><option value="">—</option><option v-for="org in tenant.options" :key="org.id" :value="org.id">{{ org.name }}</option></select>
        </div>
        <div><label class="label">{{ t('common.role') }}</label>
          <select v-model="form.role" class="input"><option v-for="role in roles" :key="role" :value="role">{{ t(`admin.${role}`) }}</option></select>
        </div>
        <div v-if="!editing"><label class="label">{{ t('common.login') }}</label><input v-model="form.login" class="input" pattern="[a-zA-Z0-9._-]{4,80}" required /></div>
        <div v-if="!editing"><label class="label">{{ t('common.password') }}</label><input v-model="form.password" type="password" class="input" minlength="8" required /></div>
        <div><label class="label">{{ t('common.fullName') }}</label><input v-model="form.fullName" class="input" required /></div>
        <div><label class="label">{{ t('common.phone') }}</label><input v-model="form.phone" class="input" /></div>
        <div><label class="label">{{ t('common.email') }}</label><input v-model="form.email" type="email" class="input" /></div>
        <div><label class="label">{{ t('common.language') }}</label><select v-model="form.locale" class="input"><option value="uz">O'zbekcha</option><option value="ru">Русский</option></select></div>
        <div v-if="editing" class="flex items-end"><label class="flex items-center gap-2 text-sm"><input v-model="form.isActive" type="checkbox" />{{ t('common.active') }}</label></div>
        <div class="flex justify-end gap-2 md:col-span-2"><button type="button" class="btn-secondary" @click="modal = null">{{ t('common.cancel') }}</button><button class="btn-primary"><Icon name="check" :size="16" />{{ t('common.save') }}</button></div>
      </form>
    </Modal>

    <Modal :open="modal === 'credentials'" :title="t('admin.setCredentials')" @close="modal = null">
      <form class="space-y-3" @submit.prevent="saveCredentials">
        <p class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{{ editing?.login }} · {{ editing?.fullName }} · <code class="text-[11px]">{{ editing?.id }}</code></p>
        <div><label class="label">{{ t('admin.newLogin') }}</label><input v-model="credentials.login" class="input" pattern="[a-zA-Z0-9._-]{4,80}" /></div>
        <div><label class="label">{{ t('admin.newPassword') }}</label><input v-model="credentials.password" type="password" class="input" minlength="8" /></div>
        <div class="flex justify-end gap-2"><button type="button" class="btn-secondary" @click="modal = null">{{ t('common.cancel') }}</button><button class="btn-primary"><Icon name="check" :size="16" />{{ t('common.save') }}</button></div>
      </form>
    </Modal>

    <Modal :open="modal === 'history'" :title="t('auth.loginHistory')" wide @close="modal = null">
      <div class="mb-3 text-xs text-slate-500">{{ editing?.login }} · {{ t('auth.sessions') }}: {{ sessions.length }}</div>
      <table class="table-dense w-full">
        <thead><tr><th>{{ t('common.time') }}</th><th>{{ t('auth.ip') }}</th><th>{{ t('auth.userAgent') }}</th><th>{{ t('auth.result') }}</th><th>{{ t('auth.reason') }}</th></tr></thead>
        <tbody>
          <tr v-for="row in history" :key="row.id"><td>{{ formatDateTime(row.createdAt) }}</td><td>{{ row.ip }}</td><td class="max-w-[260px] truncate">{{ row.userAgent }}</td><td :class="row.success ? 'text-green-700' : 'text-red-700'">{{ row.success ? t('auth.succeeded') : t('auth.failed') }}</td><td>{{ row.reason }}</td></tr>
        </tbody>
      </table>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useAdminApi } from '~/composables/useAdminApi';
import { useToastStore } from '~/stores/toast';
import { useTenantStore } from '~/stores/tenant';
import { formatDateTime } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN', 'FLEET_MANAGER'], titleKey: 'admin.users' });
const { t } = useI18n();
useHead({ title: t('admin.users') });
const api = useAdminApi();
const toast = useToastStore();
const tenant = useTenantStore();
const roles = ['SUPERADMIN', 'DISPATCHER', 'FLEET_MANAGER', 'DRIVER'];
const rows = ref<Record<string, any>[]>([]);
const loading = ref(false);
const modal = ref<'form' | 'credentials' | 'history' | null>(null);
const editing = ref<Record<string, any> | null>(null);
const organizationFilter = ref('');
const lookupId = ref('');
const history = ref<Record<string, any>[]>([]);
const sessions = ref<Record<string, any>[]>([]);
const form = reactive({ organizationId: '', role: 'DISPATCHER', login: '', password: '', fullName: '', phone: '', email: '', locale: 'uz', isActive: true });
const credentials = reactive({ login: '', password: '' });

const orgName = (id: string | null) => tenant.options.find((org) => org.id === id)?.name ?? (id ? id.slice(0, 8) : '—');

const columns = computed(() => [
  { key: 'login', label: t('common.login') },
  { key: 'fullName', label: t('common.fullName') },
  { key: 'role', label: t('common.role'), options: roles.map((role) => ({ value: role, label: t(`admin.${role}`) })) },
  { key: 'organizationId', label: t('common.organization'), format: (value: unknown) => orgName(value as string | null) },
  { key: 'phone', label: t('common.phone') },
  { key: 'isActive', label: t('common.status'), options: [{ value: 'true', label: t('common.active') }, { value: 'false', label: t('common.inactive') }] },
  { key: 'lastLoginAt', label: t('admin.lastLogin'), format: (value: unknown) => formatDateTime(value as string) },
  { key: 'id', label: t('common.id'), filter: false },
]);

const load = async () => {
  loading.value = true;
  try {
    rows.value = (await api.users.list({ pageSize: 200, organizationId: organizationFilter.value || undefined })).items;
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const lookup = async () => {
  if (!lookupId.value.trim()) return load();
  loading.value = true;
  try {
    rows.value = [await api.users.get(lookupId.value.trim())];
  } catch {
    rows.value = [];
    toast.error(t('common.notFound'));
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editing.value = null;
  Object.assign(form, { organizationId: organizationFilter.value, role: 'DISPATCHER', login: '', password: '', fullName: '', phone: '', email: '', locale: 'uz', isActive: true });
  modal.value = 'form';
};

const openEdit = (row: Record<string, any>) => {
  editing.value = row;
  Object.assign(form, { organizationId: row.organizationId ?? '', role: row.role, login: row.login, password: '', fullName: row.fullName, phone: row.phone ?? '', email: row.email ?? '', locale: row.locale ?? 'uz', isActive: row.isActive });
  modal.value = 'form';
};

const openCredentials = (row: Record<string, any>) => {
  editing.value = row;
  Object.assign(credentials, { login: row.login, password: '' });
  modal.value = 'credentials';
};

const openHistory = async (row: Record<string, any>) => {
  editing.value = row;
  modal.value = 'history';
  try {
    history.value = (await api.users.loginHistory(row.id, { pageSize: 50 })).items;
    sessions.value = await api.users.sessions(row.id);
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const save = async () => {
  try {
    if (editing.value) {
      await api.users.update(editing.value.id, { fullName: form.fullName, phone: form.phone || undefined, email: form.email || undefined, locale: form.locale, isActive: form.isActive, role: form.role });
    } else {
      await api.users.create({ organizationId: form.organizationId || undefined, login: form.login, password: form.password, role: form.role, fullName: form.fullName, phone: form.phone || undefined, email: form.email || undefined, locale: form.locale });
    }
    modal.value = null;
    toast.success(t('common.saved'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const saveCredentials = async () => {
  if (!editing.value) return;
  try {
    await api.users.credentials(editing.value.id, { login: credentials.login !== editing.value.login ? credentials.login : undefined, password: credentials.password || undefined });
    modal.value = null;
    toast.success(t('common.saved'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const terminate = async (id: string) => {
  try {
    await api.users.terminate(id);
    toast.success(t('common.saved'));
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const remove = async (id: string) => {
  try {
    await api.users.remove(id);
    toast.success(t('common.deleted'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

onMounted(async () => {
  if (tenant.options.length === 0) {
    try {
      tenant.options = (await api.organizations.list({ pageSize: 200 })).items.map((item) => ({ id: item.id, name: item.name, slug: item.slug }));
    } catch {
      tenant.options = [];
    }
  }
  await load();
});
</script>
