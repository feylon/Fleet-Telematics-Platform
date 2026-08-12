<template>
  <div class="space-y-4">
    <PageHeader :title="t('driver.title')" :subtitle="t('driver.readOnly')" />
    <div class="grid gap-4 lg:grid-cols-3">
      <div class="card card-body space-y-1 text-sm">
        <div class="text-xs font-semibold uppercase text-slate-500">{{ t('driver.profile') }}</div>
        <div><span class="label">{{ t('common.fullName') }}</span>{{ data?.driver?.fullName }}</div>
        <div><span class="label">{{ t('common.phone') }}</span>{{ data?.driver?.phone || '—' }}</div>
        <div><span class="label">{{ t('drivers.license') }}</span>{{ data?.driver?.licenseNumber || '—' }} ({{ (data?.driver?.licenseCategories ?? []).join(', ') }})</div>
        <div><span class="label">{{ t('drivers.shiftStart') }} / {{ t('drivers.shiftEnd') }}</span>{{ (data?.driver?.shiftStart || '').slice(0, 5) || '—' }} – {{ (data?.driver?.shiftEnd || '').slice(0, 5) || '—' }}</div>
      </div>
      <div class="card card-body space-y-1 text-sm">
        <div class="text-xs font-semibold uppercase text-slate-500">{{ t('driver.vehicle') }}</div>
        <template v-if="data?.vehicle">
          <div class="text-lg font-bold">{{ data.vehicle.plateNumber }}</div>
          <div>{{ data.vehicle.brand }} {{ data.vehicle.model }} · {{ data.vehicle.year || '' }}</div>
          <div><StatusBadge :value="data.vehicle.status" kind="vehicle" /> <StatusBadge :value="data.live?.status ?? 'OFFLINE'" kind="live" /></div>
          <div v-if="data.live?.speed !== undefined" class="text-xs text-slate-500">{{ t('live.speed') }}: {{ Number(data.live.speed).toFixed(0) }} {{ t('live.kmh') }} · ⛽ {{ Number(data.live.fuelLevel ?? 0).toFixed(0) }}% · {{ formatDateTime(data.live.receivedAt) }}</div>
        </template>
        <p v-else class="text-slate-400">{{ t('driver.noVehicle') }}</p>
      </div>
      <div class="card card-body text-sm">
        <div class="text-xs font-semibold uppercase text-slate-500">{{ t('driver.score') }}</div>
        <div class="mt-1 text-4xl font-bold" :class="scoreClass">{{ stats?.score?.score ?? '—' }}</div>
        <div v-if="stats?.score" class="mt-1 text-xs text-slate-500">{{ t('scores.mileage') }}: {{ stats.score.mileageKm }} · {{ t('scores.harsh') }}: {{ stats.score.harshBrakes }} · {{ t('scores.speeding') }}: {{ stats.score.speedingEvents }}</div>
        <div class="mt-2 text-xs text-slate-500">{{ t('driver.workingHours') }}: <b>{{ workingHours }}</b> {{ t('analytics.hours') }}</div>
      </div>
    </div>

    <div class="card">
      <div class="border-b border-slate-200 px-3 py-2 text-sm font-semibold">{{ t('orders.today') }}</div>
      <div v-if="today.length === 0" class="p-4 text-xs text-slate-400">{{ t('driver.noOrders') }}</div>
      <div v-for="order in today" :key="order.id" class="border-b border-slate-100 p-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-semibold">{{ order.orderNumber }}</span>
          <StatusBadge :value="order.status" kind="order" />
          <span class="text-xs text-slate-500">{{ order.customerName }} · {{ t(`orders.${order.priority}`) }}</span>
          <div class="ml-auto flex gap-1">
            <button v-if="order.status === 'ASSIGNED'" class="btn-primary btn-xs" @click="transition(order, 'IN_PROGRESS')">{{ t('orders.start') }}</button>
            <button v-if="order.status === 'IN_PROGRESS'" class="btn-primary btn-xs" @click="transition(order, 'COMPLETED')">{{ t('orders.complete') }}</button>
          </div>
        </div>
        <div class="mt-1 text-xs text-slate-600">A: {{ order.originAddress }} → B: {{ order.destinationAddress }}</div>
        <ul v-if="order.route?.checkpoints?.length" class="mt-2 space-y-1 text-xs">
          <li v-for="checkpoint in order.route.checkpoints" :key="checkpoint.id" class="flex items-center gap-2">
            <span class="w-5 text-center font-semibold">{{ checkpoint.sequence }}</span>
            <span class="flex-1">{{ checkpoint.name }}</span>
            <span v-if="checkpoint.reachedAt" class="text-green-700">✓ {{ formatDateTime(checkpoint.reachedAt) }}</span>
            <button v-else-if="order.status === 'IN_PROGRESS'" class="btn-secondary btn-xs" @click="reach(order, checkpoint.id)">{{ t('orders.reach') }}</button>
            <span v-else class="text-slate-400">{{ t('orders.notReached') }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <DataTable :columns="orderColumns" :rows="orders" :title="t('orders.myOrders')" :export-title="t('orders.myOrders')" :initial-page-size="10">
        <template #cell-status="{ value }"><StatusBadge :value="value" kind="order" /></template>
      </DataTable>
      <DataTable :columns="dailyColumns" :rows="stats?.daily ?? []" :title="t('driver.history')" :export-title="t('driver.history')" :initial-page-size="10" />
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <ChangePasswordForm />
      <div />
    </div>
    <SessionsPanel />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useOrdersApi } from '~/composables/useOrdersApi';
import { useToastStore } from '~/stores/toast';
import { formatDateTime, formatHours, formatNumber } from '~/utils/format';

definePageMeta({ roles: ['DRIVER'], titleKey: 'driver.title' });
const { t } = useI18n();
useHead({ title: t('driver.title') });
const ordersApi = useOrdersApi();
const toast = useToastStore();
const data = ref<Record<string, any> | null>(null);
const stats = ref<Record<string, any> | null>(null);
const today = ref<Record<string, any>[]>([]);
const orders = ref<Record<string, any>[]>([]);

const scoreClass = computed(() => {
  const score = Number(stats.value?.score?.score ?? 0);
  return score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
});
const workingHours = computed(() => formatHours((stats.value?.daily ?? []).reduce((sum: number, row: Record<string, any>) => sum + Number(row.movingSeconds) + Number(row.idleSeconds), 0)));

const orderColumns = computed(() => [
  { key: 'orderNumber', label: t('orders.number') },
  { key: 'customerName', label: t('orders.customer') },
  { key: 'status', label: t('common.status') },
  { key: 'destinationAddress', label: t('orders.destination') },
  { key: 'completedAt', label: t('orders.complete'), format: (value: unknown) => formatDateTime(value as string) },
]);
const dailyColumns = computed(() => [
  { key: 'day', label: t('common.day') },
  { key: 'mileageKm', label: t('scores.mileage'), format: (value: unknown) => formatNumber(value as number) },
  { key: 'movingSeconds', label: t('driver.movingHours'), format: (value: unknown) => formatHours(value as number) },
  { key: 'idleSeconds', label: t('driver.idleHours'), format: (value: unknown) => formatHours(value as number) },
  { key: 'maxSpeed', label: t('analytics.maxSpeed'), format: (value: unknown) => formatNumber(value as number, 0) },
  { key: 'speedingEvents', label: t('scores.speeding') },
]);

const load = async () => {
  try {
    const [me, todayList, allOrders, statsData] = await Promise.all([ordersApi.driver.me(), ordersApi.driver.today(), ordersApi.driver.orders(), ordersApi.driver.stats()]);
    data.value = me;
    today.value = todayList.items;
    orders.value = allOrders.items;
    stats.value = statsData;
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const transition = async (order: Record<string, any>, status: string) => {
  try {
    await ordersApi.driver.transition(order.id, status);
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const reach = async (order: Record<string, any>, checkpointId: string) => {
  try {
    await ordersApi.driver.reach(order.id, checkpointId);
    await load();
  } catch (error) {
    toast.error((error as Error).message);
  }
};

onMounted(load);
</script>
