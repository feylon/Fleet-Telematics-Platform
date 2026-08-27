<template>
  <ClientOnly>
    <div class="flex h-full min-h-screen">
      <AppSidebar />
      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur">
          <button class="btn-ghost btn-icon lg:hidden" @click="ui.drawerOpen = true"><Icon name="menu" /></button>
          <button class="btn-ghost btn-icon hidden lg:inline-flex" :title="ui.collapsed ? 'Expand' : 'Collapse'" @click="ui.toggleCollapsed()"><Icon name="panel-left" /></button>
          <div class="min-w-0">
            <h1 class="truncate text-[15px] font-semibold text-slate-900">{{ pageTitle }}</h1>
            <p v-if="pageSubtitle" class="truncate text-[11px] text-slate-500">{{ pageSubtitle }}</p>
          </div>
          <div class="ml-auto flex items-center gap-2">
            <TenantSelect v-if="isSuperadmin" />
            <span v-if="auth.role !== 'DRIVER'" class="hidden items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium md:inline-flex" :class="live.connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'">
              <span class="live-dot" :class="live.connected ? 'bg-emerald-500' : 'bg-slate-400'" />
              {{ live.connected ? t('common.connected') : t('common.disconnected') }}
            </span>
            <NuxtLink v-if="canSeeAlerts" to="/dispatch/alerts" class="btn-ghost btn-icon relative" :title="t('alerts.center')">
              <Icon name="bell" />
              <span v-if="live.unread > 0" class="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">{{ live.unread > 99 ? '99+' : live.unread }}</span>
            </NuxtLink>
            <LanguageSwitch />
          </div>
        </header>
        <main class="min-h-0 flex-1 overflow-auto p-4 lg:p-5">
          <div class="page">
            <slot />
          </div>
        </main>
      </div>
    </div>
    <template #fallback>
      <div class="flex h-screen">
        <div class="hidden w-[264px] bg-[#0b1220] lg:block" />
        <div class="flex-1 space-y-4 p-6">
          <div class="skeleton h-8 w-64" />
          <div class="grid gap-4 md:grid-cols-4"><div v-for="i in 4" :key="i" class="skeleton h-24" /></div>
          <div class="skeleton h-96" />
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useLiveStore } from '~/stores/live';
import { useTenantStore } from '~/stores/tenant';
import { useUiStore } from '~/stores/ui';
import { useFleetApi } from '~/composables/useFleetApi';
import { useAdminApi } from '~/composables/useAdminApi';
import { useTenant } from '~/composables/useTenant';

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();
const live = useLiveStore();
const tenant = useTenantStore();
const ui = useUiStore();
const { isSuperadmin, ready } = useTenant();

const pageTitle = computed(() => (route.meta.titleKey ? t(route.meta.titleKey as string) : ''));
const pageSubtitle = computed(() => (route.meta.subtitleKey ? t(route.meta.subtitleKey as string) : ''));
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
