<template>
  <div class="space-y-4">
    <PageHeader :title="t('analytics.title')">
      <DateRange v-model="range" @apply="loadAll" />
    </PageHeader>
    <div class="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard icon="route" :label="t('analytics.mileage')" :value="formatNumber(summary.totalMileageKm)" :unit="t('analytics.km')" />
      <KpiCard icon="fuel" color="#f59e0b" :label="t('analytics.fuel')" :value="formatNumber(summary.totalFuelConsumed)" :unit="t('analytics.liters')" />
      <KpiCard icon="gauge" color="#10b981" :label="t('analytics.avgSpeed')" :value="formatNumber(summary.avgSpeed)" :unit="t('live.kmh')" :hint="`${t('analytics.maxSpeed')}: ${formatNumber(summary.maxSpeed, 0)}`" />
      <KpiCard icon="clock" color="#8b5cf6" :label="t('analytics.moving')" :value="formatHours(summary.movingSeconds)" :unit="t('analytics.hours')" :hint="`${t('analytics.idle')}: ${formatHours(summary.idleSeconds)} ${t('analytics.hours')}`" />
      <KpiCard icon="bell" color="#ef4444" :label="t('analytics.alerts')" :value="summary.alerts ?? 0" :hint="`${t('analytics.activeVehicles')}: ${summary.activeVehicles ?? 0} · ${t('analytics.pings')}: ${summary.pings ?? 0}`" />
    </div>

    <div class="card card-body space-y-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="card-title inline-flex items-center gap-2"><Icon name="activity" :size="16" class="text-[var(--color-primary)]" />{{ t('analytics.series') }}</span>
        <select v-model="vehicleId" class="input w-56" @change="loadSeries"><option value="">{{ t('analytics.selectVehicle') }}</option><option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.plateNumber }}</option></select>
        <label class="text-xs text-slate-500">{{ t('analytics.bucket') }}</label>
        <select v-model.number="bucket" class="input w-24" @change="loadSeries"><option v-for="b in [30, 60, 300, 900, 3600]" :key="b" :value="b">{{ b }}</option></select>
      </div>
      <TelemetryCharts :points="points" />
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="space-y-2">
        <div class="flex items-center gap-2"><span class="card-title inline-flex items-center gap-2"><Icon name="calendar" :size="16" class="text-[var(--color-primary)]" />{{ t('analytics.daily') }}</span><button class="btn-secondary btn-xs ml-auto" @click="recompute"><Icon name="refresh" :size="13" />{{ t('analytics.recompute') }}</button></div>
        <ClientOnly>
          <div class="card card-body"><apexchart type="bar" height="220" :options="dailyOptions" :series="dailySeries" /></div>
        </ClientOnly>
        <DataTable :columns="dailyColumns" :rows="daily" :export-title="t('analytics.daily')" :initial-page-size="10" />
      </div>
      <div class="card">
        <div class="card-header"><Icon name="file-text" :size="17" class="text-[var(--color-primary)]" /><span class="card-title">{{ t('analytics.reports') }}</span></div>
        <form class="grid gap-2 border-b border-slate-100 p-4 md:grid-cols-4" @submit.prevent="requestReport">
          <select v-model="report.reportType" class="input"><option v-for="type in reportTypes" :key="type" :value="type">{{ t(`analytics.${type}`) }}</option></select>
          <select v-model="report.format" class="input"><option value="pdf">PDF</option><option value="xlsx">Excel</option></select>
          <select v-model="report.locale" class="input"><option value="uz">O'zbekcha</option><option value="ru">Русский</option></select>
          <button class="btn-primary justify-center"><Icon name="file-text" :size="16" />{{ t('analytics.requestReport') }}</button>
          <select v-if="report.reportType === 'VEHICLE_TRACK'" v-model="report.vehicleId" class="input md:col-span-4" required><option value="">{{ t('analytics.selectVehicle') }}</option><option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.plateNumber }}</option></select>
        </form>
        <table class="table-dense w-full">
          <thead><tr><th>{{ t('common.created') }}</th><th>{{ t('analytics.reportType') }}</th><th>{{ t('analytics.format') }}</th><th>{{ t('common.status') }}</th><th /></tr></thead>
          <tbody>
            <tr v-if="reports.length === 0"><td colspan="5" class="text-center text-xs text-slate-400">{{ t('common.noData') }}</td></tr>
            <tr v-for="job in reports" :key="job.jobId">
              <td>{{ formatDateTime(job.createdAt) }}</td><td>{{ t(`analytics.${job.reportType}`) }}</td><td class="uppercase">{{ job.format }}</td>
              <td><StatusBadge :value="job.status" kind="report" /><span v-if="job.error" class="ml-1 text-xs text-red-600">{{ job.error }}</span></td>
              <td class="text-right"><button v-if="job.status === 'ready'" class="btn-secondary btn-xs" @click="download(job)"><Icon name="download" :size="13" />{{ t('common.download') }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useAnalyticsApi, type SeriesPoint } from '~/composables/useAnalyticsApi';
import { useFleetApi } from '~/composables/useFleetApi';
import { useTenant } from '~/composables/useTenant';
import { useToastStore } from '~/stores/toast';
import { useChartTheme } from '~/composables/useChartTheme';
import { defaultRange, formatDateTime, formatHours, formatNumber, toIso } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN', 'FLEET_MANAGER', 'DISPATCHER'], titleKey: 'analytics.title' });
const { t, locale } = useI18n();
useHead({ title: t('analytics.title') });
const analytics = useAnalyticsApi();
const fleet = useFleetApi();
const toast = useToastStore();
const { base } = useChartTheme();
const { organizationId } = useTenant();
const range = ref(defaultRange(24 * 7));
const summary = ref<Record<string, number>>({});
const vehicles = ref<Record<string, any>[]>([]);
const vehicleId = ref('');
const bucket = ref(60);
const points = ref<SeriesPoint[]>([]);
const daily = ref<Record<string, any>[]>([]);
const reports = ref<Record<string, any>[]>([]);
const reportTypes = ['FLEET_SUMMARY', 'DRIVER_SCORES', 'ALERTS', 'VEHICLE_TRACK', 'DAILY_ROLLUP'];
const report = reactive({ reportType: 'FLEET_SUMMARY', format: 'pdf', locale: locale.value, vehicleId: '' });
let poll: ReturnType<typeof setInterval> | null = null;

const plateOf = (id: string) => vehicles.value.find((vehicle) => vehicle.id === id)?.plateNumber ?? id.slice(0, 8);
const query = () => ({ from: toIso(range.value.from), to: toIso(range.value.to) });

const dailyColumns = computed(() => [
  { key: 'day', label: t('common.day') },
  { key: 'plate', label: t('common.plate') },
  { key: 'mileageKm', label: t('scores.mileage'), format: (value: unknown) => formatNumber(value as number) },
  { key: 'movingSeconds', label: t('analytics.moving'), format: (value: unknown) => formatHours(value as number) },
  { key: 'idleSeconds', label: t('analytics.idle'), format: (value: unknown) => formatHours(value as number) },
  { key: 'maxSpeed', label: t('analytics.maxSpeed'), format: (value: unknown) => formatNumber(value as number, 0) },
  { key: 'fuelConsumed', label: t('analytics.fuelConsumed'), format: (value: unknown) => formatNumber(value as number) },
  { key: 'harshEvents', label: t('scores.harsh') },
  { key: 'speedingEvents', label: t('scores.speeding') },
]);

const dailyTotals = computed(() => {
  const map = new Map<string, number>();
  for (const row of daily.value) map.set(row.day, (map.get(row.day) ?? 0) + Number(row.mileageKm));
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
});
const dailyOptions = computed(() => base({ fill: { type: 'solid' }, xaxis: { categories: dailyTotals.value.map(([day]) => day.slice(5)), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '11px' } } }, plotOptions: { bar: { borderRadius: 5, columnWidth: '50%' } }, legend: { show: false } }));
const dailySeries = computed(() => [{ name: t('analytics.mileage'), data: dailyTotals.value.map(([, km]) => Number(km.toFixed(1))) }]);

const loadAll = async () => {
  try {
    const [sum, vehicleList, dailyRows] = await Promise.all([analytics.summary(query()), fleet.vehicles.list({ pageSize: 200 }), analytics.daily(query())]);
    summary.value = sum;
    vehicles.value = vehicleList.items;
    daily.value = dailyRows.items.map((row) => ({ ...row, plate: plateOf(row.vehicleId) }));
    if (!vehicleId.value && vehicles.value[0]) vehicleId.value = vehicles.value[0].id;
    await Promise.all([loadSeries(), loadReports()]);
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const loadSeries = async () => {
  if (!vehicleId.value) return;
  try {
    points.value = (await analytics.series(vehicleId.value, { ...query(), bucketSeconds: bucket.value })).points;
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const loadReports = async () => {
  try {
    reports.value = (await analytics.reports.list()).items;
  } catch {
    return;
  }
};

const recompute = async () => {
  try {
    daily.value = (await analytics.recompute(query())).items.map((row) => ({ ...row, plate: plateOf(row.vehicleId) }));
    toast.success(t('common.saved'));
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const requestReport = async () => {
  try {
    await analytics.reports.request({ reportType: report.reportType, format: report.format, locale: report.locale, ...query(), vehicleId: report.reportType === 'VEHICLE_TRACK' ? report.vehicleId : undefined });
    toast.success(t('analytics.requested'));
    await loadReports();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const download = async (job: Record<string, any>) => {
  try {
    const { blob, fileName } = await analytics.reports.download(job.jobId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName || job.fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    toast.error((error as Error).message);
  }
};

onMounted(() => {
  loadAll();
  poll = setInterval(loadReports, 5000);
});
onBeforeUnmount(() => {
  if (poll) clearInterval(poll);
});
watch(organizationId, loadAll);
</script>
