<template>
  <div class="space-y-3">
    <PageHeader :title="t('admin.organizations')">
      <button class="btn-primary" @click="openCreate"><Icon name="plus" :size="16" />{{ t('admin.newOrganization') }}</button>
    </PageHeader>
    <DataTable :columns="columns" :rows="rows" :loading="loading" row-key="id" :export-title="t('admin.organizations')">
      <template #cell-isActive="{ value }"><span :class="value ? 'text-green-700' : 'text-slate-400'">{{ value ? t('common.active') : t('common.inactive') }}</span></template>
      <template #actions="{ row }">
        <button class="btn-secondary btn-xs" @click="openEdit(row)"><Icon name="pencil" :size="13" />{{ t('common.edit') }}</button>
        <ConfirmButton klass="btn-danger btn-xs" @confirm="remove(row.id)"><Icon name="trash" :size="13" />{{ t('common.delete') }}</ConfirmButton>
      </template>
    </DataTable>
    <Modal :open="modal" :title="editing ? t('common.edit') : t('admin.newOrganization')" @close="modal = false">
      <form class="grid gap-3 md:grid-cols-2" @submit.prevent="save">
        <div><label class="label">{{ t('common.name') }}</label><input v-model="form.name" class="input" required /></div>
        <div><label class="label">{{ t('admin.slug') }}</label><input v-model="form.slug" class="input" pattern="[a-z0-9-]{2,80}" :disabled="Boolean(editing)" required /></div>
        <div><label class="label">{{ t('admin.taxId') }}</label><input v-model="form.taxId" class="input" /></div>
        <div><label class="label">{{ t('common.phone') }}</label><input v-model="form.phone" class="input" /></div>
        <div class="md:col-span-2"><label class="label">{{ t('admin.address') }}</label><input v-model="form.address" class="input" /></div>
        <div><label class="label">{{ t('admin.defaultLocale') }}</label><select v-model="form.defaultLocale" class="input"><option value="uz">O'zbekcha</option><option value="ru">Русский</option></select></div>
        <div v-if="editing" class="flex items-end"><label class="flex items-center gap-2 text-sm"><input v-model="form.isActive" type="checkbox" />{{ t('common.active') }}</label></div>
        <div class="flex justify-end gap-2 md:col-span-2"><button type="button" class="btn-secondary" @click="modal = false">{{ t('common.cancel') }}</button><button class="btn-primary"><Icon name="check" :size="16" />{{ t('common.save') }}</button></div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useAdminApi } from '~/composables/useAdminApi';
import { useToastStore } from '~/stores/toast';
import { useTenantStore } from '~/stores/tenant';
import { formatDateTime } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN'], titleKey: 'admin.organizations' });
const { t } = useI18n();
useHead({ title: t('admin.organizations') });
const api = useAdminApi();
const toast = useToastStore();
const tenant = useTenantStore();
const rows = ref<Record<string, any>[]>([]);
const loading = ref(false);
const modal = ref(false);
const editing = ref<Record<string, any> | null>(null);
const form = reactive({ name: '', slug: '', taxId: '', phone: '', address: '', defaultLocale: 'uz', isActive: true });

const columns = computed(() => [
  { key: 'name', label: t('common.name') },
  { key: 'slug', label: t('admin.slug') },
  { key: 'taxId', label: t('admin.taxId') },
  { key: 'phone', label: t('common.phone') },
  { key: 'usersCount', label: t('admin.usersCount') },
  { key: 'vehiclesCount', label: t('admin.vehiclesCount') },
  { key: 'driversCount', label: t('admin.driversCount') },
  { key: 'isActive', label: t('common.status'), options: [{ value: 'true', label: t('common.active') }, { value: 'false', label: t('common.inactive') }] },
  { key: 'createdAt', label: t('common.created'), format: (value: unknown) => formatDateTime(value as string) },
]);

const load = async () => {
  loading.value = true;
  try {
    rows.value = (await api.organizations.list({ pageSize: 200 })).items;
    tenant.options = rows.value.map((row) => ({ id: row.id, name: row.name, slug: row.slug }));
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editing.value = null;
  Object.assign(form, { name: '', slug: '', taxId: '', phone: '', address: '', defaultLocale: 'uz', isActive: true });
  modal.value = true;
};

const openEdit = (row: Record<string, any>) => {
  editing.value = row;
  Object.assign(form, { name: row.name, slug: row.slug, taxId: row.taxId ?? '', phone: row.phone ?? '', address: row.address ?? '', defaultLocale: row.defaultLocale ?? 'uz', isActive: row.isActive });
  modal.value = true;
};

const save = async () => {
  try {
    const body = { name: form.name, taxId: form.taxId || undefined, phone: form.phone || undefined, address: form.address || undefined, defaultLocale: form.defaultLocale };
    if (editing.value) await api.organizations.update(editing.value.id, { ...body, isActive: form.isActive });
    else await api.organizations.create({ ...body, slug: form.slug });
    modal.value = false;
    toast.success(t('common.saved'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const remove = async (id: string) => {
  try {
    await api.organizations.remove(id);
    toast.success(t('common.deleted'));
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

onMounted(load);
</script>
