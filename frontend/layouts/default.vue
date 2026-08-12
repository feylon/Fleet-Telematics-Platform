<template>
  <div class="flex h-full min-h-screen">
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-12 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <button class="btn-secondary btn-xs lg:hidden" @click="sidebarOpen = true">☰</button>
        <h1 class="truncate text-sm font-semibold text-slate-700">{{ pageTitle }}</h1>
        <div class="ml-auto flex items-center gap-2">
          <TenantSelect v-if="isSuperadmin" />
          <span class="hidden items-center gap-1 text-xs text-slate-500 md:flex">
            <span class="h-2 w-2 rounded-full" :class="live.connected ? 'bg-green-500' : 'bg-slate-300'" />
            {{ live.connected ? t('common.connected') : t('common.disconnected') }}
          </span>
          <NuxtLink v-if="canSeeAlerts" to="/dispatch/alerts" class="relative rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100" :title="t('alerts.center')">
            🔔
            <span v-if="live.unread > 0" class="absolute -right-1 -top-1 rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{{ live.unread > 99 ? '99+' : live.unread }}</span>
          </NuxtLink>
          <LanguageSwitch />
        </div>
      </header>
      <main class="min-h-0 flex-1 overflow-auto p-4">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useLiveStore } from '~/stores/live';
import { useTenantStore } from '~/stores/tenant';
import { useFleetApi } from '~/composables/useFleetApi';
import { useAdminApi } from '~/composables/useAdminApi';
import { useTenant } from '~/composables/useTenant';

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();
const live = useLiveStore();
const tenant = useTenantStore();
const { isSuperadmin, ready } = useTenant();
const sidebarOpen = ref(false);

const pageTitle = computed(() => (route.meta.titleKey ? t(route.meta.titleKey as string) : ''));
const canSeeAlerts = computed(() => auth.role !== 'DRIVER');

const loadLive = async () => {
  if (auth.role === 'DRIVER' || !ready.value) return;
  const fleet = useFleetApi();
  try {
    const [vehicles, alerts] = await Promise.all([fleet.live.vehicles(), fleet.live.recentAlerts(100)]);
    live.setVehicles(vehicles as never);
    live.setAlerts(alerts as never);
    const labels = await fleet.vehicles.list({ pageSize: 200 });
    live.labelVehicles(labels.items.map((item) => ({ id: item.id, plateNumber: item.plateNumber, driverName: item.driverName })));
  } catch {
    return;
  }
};

onMounted(async () => {
  if (!auth.user && auth.accessToken) {
    try {
      await useAuth().fetchMe();
    } catch {
      return;
    }
  }
  if (isSuperadmin.value && tenant.options.length === 0) {
    try {
      const response = await useAdminApi().organizations.list({ pageSize: 200 });
      tenant.options = response.items.map((item) => ({ id: item.id, name: item.name, slug: item.slug }));
      if (!tenant.organizationId && tenant.options[0]) tenant.select(tenant.options[0].id);
    } catch {
      return;
    }
  }
  if (auth.role !== 'DRIVER') {
    await live.connect();
    if (isSuperadmin.value && tenant.organizationId) live.subscribe(tenant.organizationId);
    await loadLive();
  }
});

watch(
  () => tenant.organizationId,
  async (value) => {
    if (!isSuperadmin.value) return;
    live.reset();
    live.subscribe(value);
    await loadLive();
  },
);
</script>
