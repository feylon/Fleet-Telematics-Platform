import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { useUiStore } from '~/stores/ui';

export default defineNuxtPlugin(() => {
  useAuthStore().hydrate();
  useTenantStore().hydrate();
  useUiStore().hydrate();
});
