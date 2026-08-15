<template>
  <select class="input w-auto py-1 text-xs" :value="tenant.organizationId ?? ''" @change="onChange">
    <option value="">{{ t('common.selectOrganization') }}</option>
    <option v-for="option in tenant.options" :key="option.id" :value="option.id">{{ option.name }}</option>
  </select>
</template>

<script setup lang="ts">
import { useTenantStore } from '~/stores/tenant';

const { t } = useI18n();
const tenant = useTenantStore();

const onChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  tenant.select(value || null);
};
</script>
