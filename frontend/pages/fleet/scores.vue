<template>
  <div class="space-y-3">
    <PageHeader :title="t('scores.title')">
      <DateRange v-model="range" @apply="load" />
    </PageHeader>
    <div class="card card-body">
      <div class="mb-1 text-xs font-semibold uppercase text-slate-500">{{ t('scores.chart') }}</div>
      <ClientOnly>
        <apexchart type="bar" height="260" :options="chartOptions" :series="chartSeries" />
      </ClientOnly>
    </div>
    <DataTable :columns="columns" :rows="rows" :loading="loading" row-key="vehicleId" :export-title="t('scores.title')">
      <template #cell-score="{ value }"><span class="rounded px-2 py-0.5 text-xs font-bold" :class="Number(value) >= 80 ? 'bg-green-100 text-green-800' : Number(value) >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'">{{ value }}</span></template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAnalyticsApi } from '~/composables/useAnalyticsApi';
import { useTenant } from '~/composables/useTenant';
import { useToastStore } from '~/stores/toast';
import { defaultRange, toIso } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN', 'FLEET_MANAGER', 'DISPATCHER'], titleKey: 'scores.title' });
const { t } = useI18n();
useHead({ title: t('scores.title') });
const analytics = useAnalyticsApi();
const toast = useToastStore();
const { organizationId } = useTenant();
const range = ref(defaultRange(24 * 7));
const rows = ref<Record<string, any>[]>([]);
const loading = ref(false);

const columns = computed(() => [
  { key: 'plateNumber', label: t('common.plate') },
  { key: 'driverName', label: t('common.driver') },
  { key: 'mileageKm', label: t('scores.mileage') },
  { key: 'harshBrakes', label: t('scores.harsh') },
  { key: 'speedingEvents', label: t('scores.speeding') },
  { key: 'overRevEvents', label: t('scores.overRev') },
  { key: 'score', label: t('scores.score') },
]);

const chartOptions = computed(() => ({ chart: { toolbar: { show: false } }, plotOptions: { bar: { borderRadius: 4, distributed: true } }, colors: rows.value.map((row) => (row.score >= 80 ? '#16a34a' : row.score >= 60 ? '#f59e0b' : '#dc2626')), legend: { show: false }, xaxis: { categories: rows.value.map((row) => row.plateNumber || row.vehicleId.slice(0, 8)) }, yaxis: { min: 0, max: 100 }, dataLabels: { enabled: true } }));
const chartSeries = computed(() => [{ name: t('scores.score'), data: rows.value.map((row) => row.score) }]);

const load = async () => {
  loading.value = true;
  try {
    rows.value = (await analytics.driverScores({ from: toIso(range.value.from), to: toIso(range.value.to) })).items;
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

onMounted(load);
watch(organizationId, load);
</script>
