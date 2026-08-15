<template>
  <div class="space-y-3">
    <PageHeader :title="t('admin.audit')" />
    <div class="card card-body grid gap-2 md:grid-cols-6">
      <div><label class="label">{{ t('admin.userId') }}</label><input v-model="filters.userId" class="input" /></div>
      <div><label class="label">{{ t('common.organization') }}</label>
        <select v-model="filters.organizationId" class="input"><option value="">{{ t('common.all') }}</option><option v-for="org in tenant.options" :key="org.id" :value="org.id">{{ org.name }}</option></select>
      </div>
      <div><label class="label">{{ t('admin.resource') }}</label><input v-model="filters.resource" class="input" placeholder="admin.users" /></div>
      <div><label class="label">{{ t('common.from') }}</label><input v-model="filters.from" type="datetime-local" class="input" /></div>
      <div><label class="label">{{ t('common.to') }}</label><input v-model="filters.to" type="datetime-local" class="input" /></div>
      <div class="flex items-end gap-2"><button class="btn-primary" @click="load(1)">{{ t('common.apply') }}</button></div>
    </div>
    <DataTable :columns="columns" :rows="rows" :loading="loading" row-key="id" :filterable="false" :export-title="t('admin.audit')" :initial-page-size="50">
      <template #cell-payload="{ value }"><code class="block max-w-[320px] truncate text-[11px]" :title="JSON.stringify(value)">{{ value ? JSON.stringify(value) : '' }}</code></template>
    </DataTable>
    <div class="flex items-center justify-end gap-2 text-xs">
      <button class="btn-secondary btn-xs" :disabled="page <= 1" @click="load(page - 1)">‹</button>
      <span>{{ t('common.page') }} {{ page }} · {{ t('common.total') }}: {{ total }}</span>
      <button class="btn-secondary btn-xs" :disabled="page * 100 >= total" @click="load(page + 1)">›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useAdminApi } from '~/composables/useAdminApi';
import { useToastStore } from '~/stores/toast';
import { useTenantStore } from '~/stores/tenant';
import { formatDateTime, toIso } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN'], titleKey: 'admin.audit' });
const { t } = useI18n();
useHead({ title: t('admin.audit') });
const api = useAdminApi();
const toast = useToastStore();
const tenant = useTenantStore();
const rows = ref<Record<string, any>[]>([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const filters = reactive({ userId: '', organizationId: '', resource: '', from: '', to: '' });

const columns = computed(() => [
  { key: 'createdAt', label: t('common.time'), format: (value: unknown) => formatDateTime(value as string) },
  { key: 'userLogin', label: t('common.login') },
  { key: 'organizationId', label: t('admin.organizationId'), format: (value: unknown) => tenant.options.find((org) => org.id === value)?.name ?? ((value as string) ?? '').slice(0, 8) },
  { key: 'action', label: t('admin.action') },
  { key: 'resourceId', label: t('admin.resourceId') },
  { key: 'statusCode', label: t('admin.statusCode') },
  { key: 'ip', label: t('auth.ip') },
  { key: 'payload', label: t('admin.payload'), format: (value: unknown) => (value ? JSON.stringify(value) : '') },
]);

const load = async (target = 1) => {
  loading.value = true;
  page.value = target;
  try {
    const response = await api.audit({ userId: filters.userId || undefined, organizationId: filters.organizationId || undefined, resource: filters.resource || undefined, from: filters.from ? toIso(filters.from) : undefined, to: filters.to ? toIso(filters.to) : undefined, page: target, pageSize: 100 });
    rows.value = response.items;
    total.value = response.meta.total;
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

onMounted(() => load(1));
</script>
