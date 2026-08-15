import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';

export default defineNuxtPlugin(() => {
  useAuthStore().hydrate();
  useTenantStore().hydrate();
});
