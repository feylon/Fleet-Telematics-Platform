<template>
  <div class="space-y-3">
    <PageHeader :title="t('alerts.history')">
      <DateRange v-model="range" @apply="load" />
    </PageHeader>
    <div class="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
      <KpiCard v-for="stat in stats" :key="stat.alertType" :label="t(`alerts.${stat.alertType}`)" :value="stat.count" />
    </div>
    <DataTable :columns="columns" :rows="rows" :loading="loading" :export-title="t('alerts.history')" :initial-page-size="50">
      <template #cell-alertType="{ value }"><StatusBadge :value="value" kind="severity" /></template>
      <template #cell-severity="{ value }"><StatusBadge :value="value" kind="severity" /></template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAnalyticsApi } from '~/composables/useAnalyticsApi';
import { useFleetApi } from '~/composables/useFleetApi';
import { useToastStore } from '~/stores/toast';
import { defaultRange, formatDateTime, toIso } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN', 'DISPATCHER', 'FLEET_MANAGER'], titleKey: 'alerts.history' });
const { t } = useI18n();
useHead({ title: t('alerts.history') });
const analytics = useAnalyticsApi();
const fleet = useFleetApi();
const toast = useToastStore();
const range = ref(defaultRange(24));
const rows = ref<Record<string, any>[]>([]);
const stats = ref<Array<{ alertType: string; count: number }>>([]);
const loading = ref(false);
const plates = ref<Record<string, string>>({});
const alertTypes = ['SPEEDING', 'GEOFENCE_EXIT', 'GEOFENCE_ENTER', 'HARSH_BRAKE', 'FUEL_DROP', 'UNAUTHORIZED_STOP', 'ROUTE_DEVIATION', 'SOS', 'TIME_WINDOW_VIOLATION'];

const columns = computed(() => [
  { key: 'timestamp', label: t('common.time'), format: (value: unknown) => formatDateTime(value as string) },
  { key: 'plate', label: t('common.plate') },
  { key: 'alertType', label: t('common.type'), options: alertTypes.map((type) => ({ value: type, label: t(`alerts.${type}`) })) },
  { key: 'severity', label: t('common.severity'), options: ['INFO', 'WARNING', 'CRITICAL'].map((level) => ({ value: level, label: t(`alerts.${level}`) })) },
  { key: 'details', label: t('common.details') },
  { key: 'latitude', label: t('common.latitude'), format: (value: unknown) => Number(value).toFixed(5) },
  { key: 'longitude', label: t('common.longitude'), format: (value: unknown) => Number(value).toFixed(5) },
]);

const load = async () => {
  loading.value = true;
  try {
    const query = { from: toIso(range.value.from), to: toIso(range.value.to) };
    const [alerts, counts, vehicles] = await Promise.all([analytics.alerts({ ...query, pageSize: 500 }), analytics.alertStats(query), fleet.vehicles.list({ pageSize: 200 })]);
    plates.value = Object.fromEntries(vehicles.items.map((vehicle) => [vehicle.id, vehicle.plateNumber]));
    rows.value = alerts.items.map((item) => ({ ...item, plate: plates.value[item.vehicleId] ?? item.vehicleId.slice(0, 8) }));
    stats.value = counts.items;
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>
