<template>
  <div class="space-y-3">
    <PageHeader :title="t('scores.title')">
      <DateRange v-model="range" @apply="load" />
    </PageHeader>
    <div class="card card-body">
      <div class="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Icon name="bar-chart" :size="14" />{{ t('scores.chart') }}</div>
      <ClientOnly>
        <apexchart type="bar" height="260" :options="chartOptions" :series="chartSeries" />
      </ClientOnly>
    </div>
    <DataTable :columns="columns" :rows="rows" :loading="loading" row-key="vehicleId" :export-title="t('scores.title')">
      <template #cell-driverName="{ row }"><span class="inline-flex items-center gap-2"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary)]">{{ (row.driverName || '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() }}</span>{{ row.driverName || '—' }}</span></template>
      <template #cell-score="{ value }"><span class="rounded px-2 py-0.5 text-xs font-bold" :class="Number(value) >= 80 ? 'bg-green-100 text-green-800' : Number(value) >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'">{{ value }}</span></template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAnalyticsApi } from '~/composables/useAnalyticsApi';
import { useTenant } from '~/composables/useTenant';
import { useToastStore } from '~/stores/toast';
import { useChartTheme } from '~/composables/useChartTheme';
import { defaultRange, toIso } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN', 'FLEET_MANAGER', 'DISPATCHER'], titleKey: 'scores.title' });
const { t } = useI18n();
useHead({ title: t('scores.title') });
const analytics = useAnalyticsApi();
const toast = useToastStore();
const { base } = useChartTheme();
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

const chartOptions = computed(() => base({ plotOptions: { bar: { borderRadius: 6, distributed: true, columnWidth: '45%' } }, colors: rows.value.map((row) => (row.score >= 80 ? '#10b981' : row.score >= 60 ? '#f59e0b' : '#ef4444')), legend: { show: false }, fill: { type: 'solid' }, xaxis: { categories: rows.value.map((row) => row.plateNumber || row.vehicleId.slice(0, 8)), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '11px' } } }, yaxis: { min: 0, max: 100, labels: { style: { fontSize: '11px' } } }, dataLabels: { enabled: true, style: { fontSize: '11px', colors: ['#334155'] }, offsetY: -18 }, }));
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
