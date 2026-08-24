<template>
  <Transition name="modal">
    <div v-if="ui.drawerOpen" class="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden" @click="ui.drawerOpen = false" />
  </Transition>
  <aside
    class="fixed inset-y-0 left-0 z-40 flex flex-col text-slate-300 transition-[transform,width] duration-200 lg:static lg:translate-x-0"
    :class="[ui.drawerOpen ? 'translate-x-0' : '-translate-x-full', ui.collapsed ? 'lg:w-[72px]' : 'w-[264px]']"
    style="background: linear-gradient(180deg, #0b1220 0%, #121b30 100%)"
  >
    <div class="flex items-center gap-3 border-b border-white/5 px-4 py-4" :class="ui.collapsed ? 'lg:justify-center lg:px-2' : ''">
      <div class="relative flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white" :style="tileStyle">
        <img v-if="branding.logoDataUrl" :src="branding.logoDataUrl" alt="logo" class="h-full w-full bg-white object-contain p-1" />
        <span v-else>{{ initials }}</span>
      </div>
      <div v-if="!ui.collapsed" class="min-w-0">
        <div class="truncate text-[15px] font-bold tracking-tight text-white">{{ branding.platformName }}</div>
        <div class="truncate text-[11px] text-slate-400">{{ branding.description }}</div>
      </div>
    </div>
    <nav class="flex-1 overflow-y-auto px-3 py-3">
      <template v-for="group in groups" :key="group.title">
        <div v-if="!ui.collapsed" class="px-2 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{{ t(group.title) }}</div>
        <div v-else class="mx-2 my-3 border-t border-white/5" />
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="group relative mb-0.5 flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          :class="ui.collapsed ? 'lg:justify-center lg:px-0' : ''"
          :title="t(item.label)"
          active-class="is-active bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] !text-white"
          @click="ui.drawerOpen = false"
        >
          <span class="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-[var(--color-primary)] opacity-0 transition-opacity group-[.is-active]:opacity-100" />
          <Icon :name="item.icon" :size="19" class="text-slate-400 transition-colors group-hover:text-white group-[.is-active]:text-[var(--color-primary)]" />
          <span v-if="!ui.collapsed" class="truncate">{{ t(item.label) }}</span>
          <span v-if="item.to === '/dispatch/alerts' && live.unread > 0 && !ui.collapsed" class="ml-auto rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{{ live.unread }}</span>
        </NuxtLink>
      </template>
    </nav>
    <div class="border-t border-white/5 p-3">
      <div class="flex items-center gap-3 rounded-xl bg-white/5 p-2.5" :class="ui.collapsed ? 'lg:justify-center lg:p-1.5' : ''">
        <div class="flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-bold text-white" :style="avatarStyle">{{ userInitials }}</div>
        <div v-if="!ui.collapsed" class="min-w-0 flex-1">
          <div class="truncate text-[13px] font-semibold text-white">{{ auth.user?.fullName }}</div>
          <span class="inline-flex rounded-full bg-white/10 px-1.5 py-px text-[10px] font-medium text-slate-300">{{ roleLabel }}</span>
        </div>
        <div v-if="!ui.collapsed" class="flex flex-none gap-0.5">
          <NuxtLink to="/profile" class="btn-ghost btn-icon btn-sm !text-slate-300 hover:!bg-white/10 hover:!text-white" :title="t('nav.profile')"><Icon name="user" :size="16" /></NuxtLink>
          <button class="btn-ghost btn-icon btn-sm !text-slate-300 hover:!bg-red-500/20 hover:!text-red-300" :title="t('nav.logout')" @click="logout"><Icon name="log-out" :size="16" /></button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useBrandingStore } from '~/stores/branding';
import { useLiveStore } from '~/stores/live';
import { useUiStore } from '~/stores/ui';

const { t } = useI18n();
const auth = useAuthStore();
const branding = useBrandingStore();
const live = useLiveStore();
const ui = useUiStore();
const { logout } = useAuth();

const initials = computed(() => branding.platformName.slice(0, 2).toUpperCase());
const userInitials = computed(() => (auth.user?.fullName ?? '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(''));
const tileStyle = computed(() => ({ background: `linear-gradient(135deg, ${branding.primaryColor}, color-mix(in srgb, ${branding.primaryColor} 60%, #1e293b))`, boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 8px 20px -6px ${branding.primaryColor}` }));
const avatarStyle = computed(() => ({ background: `linear-gradient(135deg, ${branding.primaryColor}, #6366f1)` }));

const roleLabel = computed(() => {
  const map: Record<string, string> = { SUPERADMIN: 'nav.superadmin', DISPATCHER: 'nav.dispatcher', FLEET_MANAGER: 'nav.manager', DRIVER: 'nav.driverRole' };
  return auth.role ? t(map[auth.role] ?? auth.role) : '';
});

const dispatcherGroup = { title: 'nav.dispatcher', items: [
  { to: '/dispatch/live', label: 'nav.live', icon: 'map' },
  { to: '/dispatch/geofences', label: 'nav.geofences', icon: 'hexagon' },
  { to: '/dispatch/orders', label: 'nav.orders', icon: 'package' },
  { to: '/dispatch/alerts', label: 'nav.alerts', icon: 'bell' },
  { to: '/dispatch/playback', label: 'nav.playback', icon: 'play' },
] };

const managerGroup = { title: 'nav.manager', items: [
  { to: '/fleet/vehicles', label: 'nav.vehicles', icon: 'truck' },
  { to: '/fleet/devices', label: 'nav.devices', icon: 'radio' },
  { to: '/fleet/drivers', label: 'nav.drivers', icon: 'users' },
  { to: '/fleet/maintenance', label: 'nav.maintenance', icon: 'wrench' },
  { to: '/fleet/scores', label: 'nav.scores', icon: 'flag' },
  { to: '/fleet/analytics', label: 'nav.analytics', icon: 'bar-chart' },
] };

const adminGroup = { title: 'nav.superadmin', items: [
  { to: '/admin', label: 'nav.system', icon: 'activity' },
  { to: '/admin/organizations', label: 'nav.organizations', icon: 'building' },
  { to: '/admin/users', label: 'nav.users', icon: 'users' },
  { to: '/admin/audit', label: 'nav.audit', icon: 'scroll' },
  { to: '/admin/branding', label: 'nav.branding', icon: 'palette' },
] };

const driverGroup = { title: 'nav.driverRole', items: [{ to: '/driver', label: 'nav.driver', icon: 'compass' }] };

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
