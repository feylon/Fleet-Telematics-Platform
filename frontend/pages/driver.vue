<template>
  <div class="mx-auto max-w-5xl space-y-4">
    <PageHeader :title="t('driver.title')" :subtitle="t('driver.readOnly')" />
    <div class="grid gap-4 md:grid-cols-3">
      <div class="card card-body md:col-span-2">
        <div class="flex flex-wrap items-start gap-4">
          <span class="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon name="truck" :size="28" /></span>
          <div class="min-w-0 flex-1">
            <div class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t('driver.vehicle') }}</div>
            <template v-if="data?.vehicle">
              <div class="text-2xl font-extrabold tracking-tight text-slate-900">{{ data.vehicle.plateNumber }}</div>
              <div class="text-sm text-slate-500">{{ data.vehicle.brand }} {{ data.vehicle.model }} {{ data.vehicle.year || '' }}</div>
              <div class="mt-2 flex flex-wrap items-center gap-2"><StatusBadge :value="data.vehicle.status" kind="vehicle" /><StatusBadge :value="data.live?.status ?? 'OFFLINE'" kind="live" /></div>
            </template>
            <p v-else class="text-slate-400">{{ t('driver.noVehicle') }}</p>
          </div>
          <div v-if="data?.live?.speed !== undefined" class="grid grid-cols-2 gap-3 text-center">
            <div class="rounded-xl bg-slate-50 px-4 py-2"><div class="tabular text-xl font-bold">{{ Number(data.live.speed).toFixed(0) }}</div><div class="flex items-center justify-center gap-1 text-[10px] uppercase text-slate-500"><Icon name="gauge" :size="12" />{{ t('live.kmh') }}</div></div>
            <div class="rounded-xl bg-slate-50 px-4 py-2"><div class="tabular text-xl font-bold">{{ Number(data.live.fuelLevel ?? 0).toFixed(0) }}%</div><div class="flex items-center justify-center gap-1 text-[10px] uppercase text-slate-500"><Icon name="fuel" :size="12" />{{ t('live.fuel') }}</div></div>
          </div>
        </div>
        <div v-if="data?.live?.receivedAt" class="mt-3 flex items-center gap-1 text-[11px] text-slate-400"><Icon name="clock" :size="12" />{{ t('live.lastSeen') }}: {{ formatDateTime(data.live.receivedAt) }}</div>
      </div>
      <div class="card card-body flex items-center gap-4">
        <ScoreRing :score="stats?.score?.score" :label="t('scores.score')" :size="130" />
        <div class="space-y-1 text-xs text-slate-500">
          <div class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t('driver.score') }}</div>
          <div v-if="stats?.score" class="space-y-0.5">
            <div class="tabular">{{ t('scores.mileage') }}: <b class="text-slate-800">{{ stats.score.mileageKm }}</b></div>
            <div class="tabular">{{ t('scores.harsh') }}: <b class="text-slate-800">{{ stats.score.harshBrakes }}</b></div>
            <div class="tabular">{{ t('scores.speeding') }}: <b class="text-slate-800">{{ stats.score.speedingEvents }}</b></div>
          </div>
          <div class="tabular pt-1">{{ t('driver.workingHours') }}: <b class="text-slate-800">{{ workingHours }}</b> {{ t('analytics.hours') }}</div>
        </div>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div class="card-header"><Icon name="map-pin" :size="17" class="text-[var(--color-primary)]" /><span class="card-title">{{ t('orders.today') }}</span></div>
      <div v-if="today.length === 0" class="flex flex-col items-center gap-2 p-8 text-center text-xs text-slate-400"><span class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Icon name="inbox" :size="18" /></span>{{ t('driver.noOrders') }}</div>
      <div v-for="order in today" :key="order.id" class="border-b border-slate-100 p-4 last:border-b-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-bold text-slate-900">{{ order.orderNumber }}</span>
          <StatusBadge :value="order.status" kind="order" />
          <span class="text-xs text-slate-500">{{ order.customerName }} · {{ t(`orders.${order.priority}`) }}</span>
          <div class="ml-auto flex gap-1">
            <button v-if="order.status === 'ASSIGNED'" class="btn-primary btn-sm" @click="transition(order, 'IN_PROGRESS')"><Icon name="play" :size="14" />{{ t('orders.start') }}</button>
            <button v-if="order.status === 'IN_PROGRESS'" class="btn-primary btn-sm" @click="transition(order, 'COMPLETED')"><Icon name="check" :size="14" />{{ t('orders.complete') }}</button>
          </div>
        </div>
        <ol class="mt-3 space-y-0">
          <li class="flex items-center gap-3 text-sm"><span class="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">A</span><span class="text-slate-700">{{ order.originAddress }}</span></li>
          <li v-for="checkpoint in order.route?.checkpoints ?? []" :key="checkpoint.id" class="relative flex items-center gap-3 py-1.5 text-sm">
            <span class="absolute left-3 -top-2 h-3 w-px bg-slate-200" />
            <span class="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold" :class="checkpoint.reachedAt ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'"><Icon v-if="checkpoint.reachedAt" name="check" :size="13" /><span v-else>{{ checkpoint.sequence }}</span></span>
            <span class="flex-1 text-slate-700">{{ checkpoint.name }}</span>
            <span v-if="checkpoint.reachedAt" class="tabular text-xs text-emerald-700">{{ formatDateTime(checkpoint.reachedAt) }}</span>
            <button v-else-if="order.status === 'IN_PROGRESS'" class="btn-secondary btn-sm" @click="reach(order, checkpoint.id)"><Icon name="map-pin" :size="13" />{{ t('orders.reach') }}</button>
            <span v-else class="text-xs text-slate-400">{{ t('orders.notReached') }}</span>
          </li>
          <li class="relative flex items-center gap-3 pt-1.5 text-sm"><span class="absolute left-3 -top-2 h-3 w-px bg-slate-200" /><span class="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-700">B</span><span class="text-slate-700">{{ order.destinationAddress }}</span></li>
        </ol>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <DataTable :columns="orderColumns" :rows="orders" :title="t('orders.myOrders')" :export-title="t('orders.myOrders')" :initial-page-size="10" :filterable="false">
        <template #cell-status="{ value }"><StatusBadge :value="value" kind="order" /></template>
      </DataTable>
      <div class="card overflow-hidden">
        <div class="card-header"><Icon name="clock" :size="17" class="text-[var(--color-primary)]" /><span class="card-title">{{ t('driver.workingHours') }}</span></div>
        <div v-if="(stats?.daily ?? []).length === 0" class="p-6 text-center text-xs text-slate-400">{{ t('common.noData') }}</div>
        <ul class="divide-y divide-slate-100">
          <li v-for="row in stats?.daily ?? []" :key="row.day" class="px-4 py-2.5">
            <div class="flex items-center justify-between text-xs"><span class="font-semibold text-slate-700">{{ row.day }}</span><span class="tabular text-slate-500">{{ formatHours(Number(row.movingSeconds) + Number(row.idleSeconds)) }} {{ t('analytics.hours') }} · {{ formatNumber(row.mileageKm) }} km</span></div>
            <div class="mt-1.5 flex h-2 overflow-hidden rounded-full bg-slate-100">
              <span class="bg-emerald-500" :style="{ width: `${barWidth(row.movingSeconds)}%` }" />
              <span class="bg-amber-400" :style="{ width: `${barWidth(row.idleSeconds)}%` }" />
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <ChangePasswordForm />
      <div class="card card-body text-sm">
        <div class="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Icon name="user" :size="14" />{{ t('driver.profile') }}</div>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          <dt class="text-slate-500">{{ t('common.fullName') }}</dt><dd class="font-medium">{{ data?.driver?.fullName }}</dd>
          <dt class="text-slate-500">{{ t('common.phone') }}</dt><dd>{{ data?.driver?.phone || '—' }}</dd>
          <dt class="text-slate-500">{{ t('drivers.license') }}</dt><dd>{{ data?.driver?.licenseNumber || '—' }} <span class="text-slate-400">{{ (data?.driver?.licenseCategories ?? []).join(', ') }}</span></dd>
          <dt class="text-slate-500">{{ t('drivers.shiftStart') }}</dt><dd>{{ (data?.driver?.shiftStart || '').slice(0, 5) || '—' }} – {{ (data?.driver?.shiftEnd || '').slice(0, 5) || '—' }}</dd>
        </dl>
      </div>
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

const workingHours = computed(() => formatHours((stats.value?.daily ?? []).reduce((sum: number, row: Record<string, any>) => sum + Number(row.movingSeconds) + Number(row.idleSeconds), 0)));
const barWidth = (seconds: number) => Math.min(100, (Number(seconds) / (12 * 3600)) * 100);

const orderColumns = computed(() => [
  { key: 'orderNumber', label: t('orders.number') },
  { key: 'customerName', label: t('orders.customer') },
  { key: 'status', label: t('common.status') },
  { key: 'destinationAddress', label: t('orders.destination') },
  { key: 'completedAt', label: t('orders.complete'), format: (value: unknown) => formatDateTime(value as string) },
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
