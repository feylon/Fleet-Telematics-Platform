<template>
  <div class="grid gap-4 lg:grid-cols-2">
    <div class="card">
      <div class="card-header">
        <Icon name="shield" :size="17" class="text-[var(--color-primary)]" /><span class="card-title">{{ t('auth.sessions') }}</span>
        <button class="btn-danger btn-xs ml-auto" @click="terminateOthers"><Icon name="power" :size="13" />{{ t('auth.terminateOthers') }}</button>
      </div>
      <table class="table-dense w-full">
        <thead><tr><th>{{ t('auth.client') }}</th><th>{{ t('auth.ip') }}</th><th>{{ t('auth.userAgent') }}</th><th>{{ t('auth.lastUsedAt') }}</th><th /></tr></thead>
        <tbody>
          <tr v-for="session in sessions" :key="session.id">
            <td>{{ session.client }} <span v-if="session.current" class="badge ml-1 bg-emerald-100 text-emerald-700">{{ t('auth.current') }}</span></td>
            <td>{{ session.ip }}</td>
            <td class="max-w-[220px] truncate" :title="session.userAgent">{{ session.userAgent }}</td>
            <td>{{ formatDateTime(session.lastUsedAt) }}</td>
            <td class="text-right"><button v-if="!session.current" class="btn-secondary btn-xs" @click="terminate(session.id)"><Icon name="x" :size="13" />{{ t('auth.terminate') }}</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-header"><Icon name="history" :size="17" class="text-[var(--color-primary)]" /><span class="card-title">{{ t('auth.loginHistory') }}</span></div>
      <table class="table-dense w-full">
        <thead><tr><th>{{ t('common.time') }}</th><th>{{ t('auth.ip') }}</th><th>{{ t('auth.result') }}</th><th>{{ t('auth.reason') }}</th></tr></thead>
        <tbody>
          <tr v-for="row in history" :key="row.id">
            <td>{{ formatDateTime(row.createdAt) }}</td>
            <td>{{ row.ip }}</td>
            <td><span class="badge" :class="row.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"><Icon :name="row.success ? 'check' : 'x'" :size="11" />{{ row.success ? t('auth.succeeded') : t('auth.failed') }}</span></td>
            <td>{{ row.reason || '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAdminApi } from '~/composables/useAdminApi';
import { useToastStore } from '~/stores/toast';
import { formatDateTime } from '~/utils/format';

const { t } = useI18n();
const api = useAdminApi();
const toast = useToastStore();
const sessions = ref<Record<string, any>[]>([]);
const history = ref<Record<string, any>[]>([]);

const load = async () => {
  try {
    sessions.value = await api.sessions.mine();
    history.value = (await api.sessions.loginHistory({ pageSize: 20 })).items;
  } catch (error) {
    toast.error((error as Error).message);
  }
};

const terminate = async (id: string) => {
  await api.sessions.terminate(id);
  await load();
};

const terminateOthers = async () => {
  await api.sessions.terminateOthers();
  await load();
};

onMounted(load);
</script>
