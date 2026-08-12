<template>
  <div class="space-y-4">
    <PageHeader :title="t('admin.system')" :subtitle="snapshot?.timestamp ? formatDateTime(snapshot.timestamp) : ''">
      <button class="btn-secondary btn-xs" @click="load">{{ t('common.refresh') }}</button>
    </PageHeader>
    <div v-if="snapshot" class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard :label="t('admin.kafka')" :value="t(`status.${snapshot.kafka.status}`)" :hint="`${snapshot.kafka.topics.length} ${t('admin.topic')}`" />
      <KpiCard :label="t('admin.clickhouse')" :value="t(`status.${snapshot.clickhouse.status}`)" :hint="`${t('admin.rowsLastMinute')}: ${snapshot.clickhouse.rows_last_minute ?? 0}`" />
      <KpiCard :label="t('admin.redis')" :value="t(`status.${snapshot.redis.status}`)" :hint="`${t('admin.memory')}: ${snapshot.redis.usedMemory ?? '-'} · ${t('admin.clients')}: ${snapshot.redis.connectedClients ?? '-'}`" />
      <KpiCard :label="t('admin.postgres')" :value="t(`status.${snapshot.postgres.status}`)" :hint="`${t('admin.connections')}: ${snapshot.postgres.connections ?? 0} · ${t('admin.dbSize')}: ${((snapshot.postgres.sizeBytes ?? 0) / 1048576).toFixed(1)} MB`" />
    </div>
    <div v-if="snapshot" class="grid gap-4 lg:grid-cols-2">
      <div class="card">
        <div class="border-b border-slate-200 px-3 py-2 text-sm font-semibold">{{ t('admin.kafka') }} · {{ t('admin.topic') }}</div>
        <table class="table-dense w-full">
          <thead><tr><th>{{ t('admin.topic') }}</th><th>{{ t('admin.partitions') }}</th><th>{{ t('admin.endOffset') }}</th></tr></thead>
          <tbody><tr v-for="topic in snapshot.kafka.topics" :key="topic.topic"><td>{{ topic.topic }}</td><td>{{ topic.partitions }}</td><td>{{ topic.endOffset }}</td></tr></tbody>
        </table>
        <div class="border-y border-slate-200 px-3 py-2 text-sm font-semibold">{{ t('admin.group') }} · {{ t('admin.lag') }}</div>
        <table class="table-dense w-full">
          <thead><tr><th>{{ t('admin.group') }}</th><th>{{ t('admin.topic') }}</th><th>{{ t('admin.lag') }}</th></tr></thead>
          <tbody>
            <tr v-if="snapshot.kafka.groups.length === 0"><td colspan="3" class="text-center text-slate-400">{{ t('common.noData') }}</td></tr>
            <tr v-for="group in snapshot.kafka.groups" :key="`${group.groupId}-${group.topic}`"><td>{{ group.groupId }}</td><td>{{ group.topic }}</td><td :class="group.lag > 1000 ? 'text-red-600 font-semibold' : ''">{{ group.lag }}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="space-y-4">
        <div class="card card-body text-sm">
          <div class="mb-2 font-semibold">{{ t('admin.clickhouse') }}</div>
          <dl class="grid grid-cols-2 gap-y-1 text-xs">
            <dt class="text-slate-500">{{ t('admin.rowsLastMinute') }}</dt><dd>{{ snapshot.clickhouse.rows_last_minute ?? 0 }}</dd>
            <dt class="text-slate-500">{{ t('admin.rowsLastHour') }}</dt><dd>{{ snapshot.clickhouse.rows_last_hour ?? 0 }}</dd>
            <dt class="text-slate-500">{{ t('admin.alertsLastHour') }}</dt><dd>{{ snapshot.clickhouse.alerts_last_hour ?? 0 }}</dd>
            <dt class="text-slate-500">{{ t('admin.totalRows') }}</dt><dd>{{ snapshot.clickhouse.total_rows ?? 0 }}</dd>
            <dt class="text-slate-500">{{ t('admin.latest') }}</dt><dd>{{ snapshot.clickhouse.latest ?? '-' }}</dd>
          </dl>
        </div>
        <div class="card card-body text-sm">
          <div class="mb-2 font-semibold">{{ t('admin.redis') }} / {{ t('admin.websocket') }}</div>
          <dl class="grid grid-cols-2 gap-y-1 text-xs">
            <dt class="text-slate-500">{{ t('admin.ops') }}</dt><dd>{{ snapshot.redis.opsPerSec ?? '-' }}</dd>
            <dt class="text-slate-500">{{ t('admin.memory') }}</dt><dd>{{ snapshot.redis.usedMemory ?? '-' }}</dd>
            <dt class="text-slate-500">{{ t('admin.websocket') }}</dt><dd>{{ snapshot.websocket.connectedClients }}</dd>
          </dl>
        </div>
      </div>
    </div>
    <div v-else class="text-sm text-slate-400">{{ t('common.loading') }}</div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useAdminApi } from '~/composables/useAdminApi';
import { formatDateTime } from '~/utils/format';

definePageMeta({ roles: ['SUPERADMIN'], titleKey: 'admin.system' });
const { t } = useI18n();
useHead({ title: t('admin.system') });
const api = useAdminApi();
const snapshot = ref<Record<string, any> | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;

const load = async () => {
  try {
    snapshot.value = await api.health();
  } catch {
    return;
  }
};

onMounted(() => {
  load();
  timer = setInterval(load, 10000);
});
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>
