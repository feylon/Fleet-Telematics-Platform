<template>
  <div v-if="open" class="fixed inset-0 z-30 bg-black/40 lg:hidden" @click="emit('close')" />
  <aside class="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-slate-900 text-slate-200 transition-transform lg:static lg:translate-x-0" :class="open ? 'translate-x-0' : '-translate-x-full'">
    <div class="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
      <img v-if="branding.logoDataUrl" :src="branding.logoDataUrl" alt="logo" class="h-9 w-9 rounded-md object-contain bg-white/90 p-0.5" />
      <div v-else class="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">{{ initials }}</div>
      <div class="min-w-0">
        <div class="truncate text-sm font-semibold text-white">{{ branding.platformName }}</div>
        <div class="truncate text-[11px] text-slate-400">{{ branding.description }}</div>
      </div>
    </div>
    <nav class="flex-1 overflow-y-auto px-2 py-3">
      <template v-for="group in groups" :key="group.title">
        <div class="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{{ t(group.title) }}</div>
        <NuxtLink v-for="item in group.items" :key="item.to" :to="item.to" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-800" active-class="bg-slate-800 text-white font-medium" @click="emit('close')">
          <span class="w-5 text-center">{{ item.icon }}</span>
          <span>{{ t(item.label) }}</span>
          <span v-if="item.to === '/dispatch/alerts' && live.unread > 0" class="ml-auto rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{{ live.unread }}</span>
        </NuxtLink>
      </template>
    </nav>
    <div class="border-t border-slate-800 p-3 text-xs">
      <div class="truncate font-medium text-white">{{ auth.user?.fullName }}</div>
      <div class="truncate text-slate-400">{{ auth.user?.login }} · {{ roleLabel }}</div>
      <div class="mt-2 flex gap-2">
        <NuxtLink to="/profile" class="btn-secondary btn-xs flex-1 justify-center">{{ t('nav.profile') }}</NuxtLink>
        <button class="btn-danger btn-xs flex-1 justify-center" @click="logout">{{ t('nav.logout') }}</button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useBrandingStore } from '~/stores/branding';
import { useLiveStore } from '~/stores/live';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
const auth = useAuthStore();
const branding = useBrandingStore();
const live = useLiveStore();
const { logout } = useAuth();

const initials = computed(() => branding.platformName.slice(0, 2).toUpperCase());

const roleLabel = computed(() => {
  const map: Record<string, string> = { SUPERADMIN: 'nav.superadmin', DISPATCHER: 'nav.dispatcher', FLEET_MANAGER: 'nav.manager', DRIVER: 'nav.driverRole' };
  return auth.role ? t(map[auth.role] ?? auth.role) : '';
});

const dispatcherGroup = { title: 'nav.dispatcher', items: [
  { to: '/dispatch/live', label: 'nav.live', icon: '🗺' },
  { to: '/dispatch/geofences', label: 'nav.geofences', icon: '⬠' },
  { to: '/dispatch/orders', label: 'nav.orders', icon: '📦' },
  { to: '/dispatch/alerts', label: 'nav.alerts', icon: '🔔' },
  { to: '/dispatch/playback', label: 'nav.playback', icon: '⏯' },
] };

const managerGroup = { title: 'nav.manager', items: [
  { to: '/fleet/vehicles', label: 'nav.vehicles', icon: '🚚' },
  { to: '/fleet/devices', label: 'nav.devices', icon: '📡' },
  { to: '/fleet/drivers', label: 'nav.drivers', icon: '👤' },
  { to: '/fleet/maintenance', label: 'nav.maintenance', icon: '🔧' },
  { to: '/fleet/scores', label: 'nav.scores', icon: '🏁' },
  { to: '/fleet/analytics', label: 'nav.analytics', icon: '📊' },
] };

const adminGroup = { title: 'nav.superadmin', items: [
  { to: '/admin', label: 'nav.system', icon: '💡' },
  { to: '/admin/organizations', label: 'nav.organizations', icon: '🏢' },
  { to: '/admin/users', label: 'nav.users', icon: '👥' },
  { to: '/admin/audit', label: 'nav.audit', icon: '📜' },
  { to: '/admin/branding', label: 'nav.branding', icon: '🎨' },
] };

const driverGroup = { title: 'nav.driverRole', items: [{ to: '/driver', label: 'nav.driver', icon: '🧭' }] };

const groups = computed(() => {
  switch (auth.role) {
    case 'SUPERADMIN':
      return [adminGroup, dispatcherGroup, managerGroup];
    case 'DISPATCHER':
      return [dispatcherGroup, { title: 'nav.manager', items: managerGroup.items.filter((item) => ['/fleet/vehicles', '/fleet/drivers', '/fleet/analytics'].includes(item.to)) }];
    case 'FLEET_MANAGER':
      return [managerGroup, { title: 'nav.dispatcher', items: dispatcherGroup.items.filter((item) => ['/dispatch/live', '/dispatch/alerts', '/dispatch/playback'].includes(item.to)) }];
    case 'DRIVER':
      return [driverGroup];
    default:
      return [];
  }
});
</script>
