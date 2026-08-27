<template>
  <div class="relative hidden items-center md:flex">
    <Icon name="building" :size="15" class="pointer-events-none absolute left-2.5 text-slate-400" />
    <select class="input h-8 w-auto !pl-8 text-xs" :value="tenant.organizationId ?? ''" @change="onChange">
      <option value="">{{ t('common.selectOrganization') }}</option>
      <option v-for="option in tenant.options" :key="option.id" :value="option.id">{{ option.name }}</option>
    </select>
  </div>
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
