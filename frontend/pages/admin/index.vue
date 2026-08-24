<template>
  <div class="space-y-4">
    <PageHeader :title="t('admin.system')" :subtitle="snapshot?.timestamp ? formatDateTime(snapshot.timestamp) : ''">
      <span class="inline-flex items-center gap-2 text-xs text-slate-500"><span class="live-dot bg-emerald-500" />{{ t('admin.autoRefresh') }}</span>
      <button class="btn-secondary" @click="load"><Icon name="refresh" :size="16" />{{ t('common.refresh') }}</button>
    </PageHeader>
    <div v-if="snapshot" class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <DependencyCard icon="activity" :title="t('admin.kafka')" :status="snapshot.kafka.status" :rows="[[t('admin.topic'), snapshot.kafka.topics.length], [t('admin.group'), snapshot.kafka.groups.length]]" />
      <DependencyCard icon="database" :title="t('admin.clickhouse')" :status="snapshot.clickhouse.status" :rows="[[t('admin.rowsLastMinute'), snapshot.clickhouse.rows_last_minute ?? 0], [t('admin.totalRows'), snapshot.clickhouse.total_rows ?? 0]]" />
      <DependencyCard icon="zap" :title="t('admin.redis')" :status="snapshot.redis.status" :rows="[[t('admin.memory'), snapshot.redis.usedMemory ?? '-'], [t('admin.clients'), snapshot.redis.connectedClients ?? '-']]" />
      <DependencyCard icon="server" :title="t('admin.postgres')" :status="snapshot.postgres.status" :rows="[[t('admin.connections'), snapshot.postgres.connections ?? 0], [t('admin.dbSize'), `${((snapshot.postgres.sizeBytes ?? 0) / 1048576).toFixed(1)} MB`]]" />
      <DependencyCard icon="wifi" :title="t('admin.websocket')" status="up" :rows="[[t('admin.clients'), snapshot.websocket.connectedClients]]" />
    </div>
    <div v-if="snapshot" class="grid gap-4 lg:grid-cols-5">
      <div class="card overflow-hidden lg:col-span-3">
        <div class="card-header"><Icon name="activity" :size="17" class="text-[var(--color-primary)]" /><span class="card-title">{{ t('admin.kafka') }} · {{ t('admin.topic') }}</span></div>
        <table class="table-dense w-full">
          <thead><tr><th>{{ t('admin.topic') }}</th><th class="text-right">{{ t('admin.partitions') }}</th><th class="text-right">{{ t('admin.endOffset') }}</th></tr></thead>
          <tbody><tr v-for="topic in snapshot.kafka.topics" :key="topic.topic"><td class="font-medium">{{ topic.topic }}</td><td class="tabular text-right">{{ topic.partitions }}</td><td class="tabular text-right">{{ topic.endOffset }}</td></tr></tbody>
        </table>
        <div class="card-header border-t"><Icon name="layers" :size="17" class="text-[var(--color-primary)]" /><span class="card-title">{{ t('admin.group') }} · {{ t('admin.lag') }}</span></div>
        <table class="table-dense w-full">
          <thead><tr><th>{{ t('admin.group') }}</th><th>{{ t('admin.topic') }}</th><th class="text-right">{{ t('admin.lag') }}</th></tr></thead>
          <tbody>
            <tr v-if="snapshot.kafka.groups.length === 0"><td colspan="3" class="py-6 text-center text-slate-400">{{ t('common.noData') }}</td></tr>
            <tr v-for="group in snapshot.kafka.groups" :key="`${group.groupId}-${group.topic}`"><td class="font-medium">{{ group.groupId }}</td><td>{{ group.topic }}</td><td class="tabular text-right"><span class="badge" :class="group.lag > 1000 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'">{{ group.lag }}</span></td></tr>
          </tbody>
        </table>
      </div>
      <div class="space-y-4 lg:col-span-2">
        <div class="card card-body">
          <div class="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Icon name="database" :size="14" />{{ t('admin.clickhouse') }}</div>
          <dl class="grid grid-cols-[1fr_auto] gap-y-1.5 text-[13px]">
            <dt class="text-slate-500">{{ t('admin.rowsLastMinute') }}</dt><dd class="tabular font-semibold">{{ snapshot.clickhouse.rows_last_minute ?? 0 }}</dd>
            <dt class="text-slate-500">{{ t('admin.rowsLastHour') }}</dt><dd class="tabular font-semibold">{{ snapshot.clickhouse.rows_last_hour ?? 0 }}</dd>
            <dt class="text-slate-500">{{ t('admin.alertsLastHour') }}</dt><dd class="tabular font-semibold">{{ snapshot.clickhouse.alerts_last_hour ?? 0 }}</dd>
            <dt class="text-slate-500">{{ t('admin.totalRows') }}</dt><dd class="tabular font-semibold">{{ snapshot.clickhouse.total_rows ?? 0 }}</dd>
            <dt class="text-slate-500">{{ t('admin.latest') }}</dt><dd class="tabular font-semibold">{{ snapshot.clickhouse.latest ?? '-' }}</dd>
          </dl>
        </div>
        <div class="card card-body">
          <div class="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Icon name="zap" :size="14" />{{ t('admin.redis') }}</div>
          <dl class="grid grid-cols-[1fr_auto] gap-y-1.5 text-[13px]">
            <dt class="text-slate-500">{{ t('admin.ops') }}</dt><dd class="tabular font-semibold">{{ snapshot.redis.opsPerSec ?? '-' }}</dd>
            <dt class="text-slate-500">{{ t('admin.memory') }}</dt><dd class="tabular font-semibold">{{ snapshot.redis.usedMemory ?? '-' }}</dd>
            <dt class="text-slate-500">{{ t('admin.clients') }}</dt><dd class="tabular font-semibold">{{ snapshot.redis.connectedClients ?? '-' }}</dd>
          </dl>
        </div>
      </div>
    </div>
    <div v-else class="grid gap-3 md:grid-cols-5"><div v-for="i in 5" :key="i" class="skeleton h-28" /></div>
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
