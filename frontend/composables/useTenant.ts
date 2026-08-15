import { computed } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';

export const useTenant = () => {
  const auth = useAuthStore();
  const tenant = useTenantStore();

  const isSuperadmin = computed(() => auth.role === 'SUPERADMIN');
  const organizationId = computed(() => (isSuperadmin.value ? tenant.organizationId : auth.user?.organizationId ?? null));
  const query = computed(() => {
    const result: Record<string, string> = {};
    if (isSuperadmin.value && tenant.organizationId) result.organizationId = tenant.organizationId;
    return result;
  });
  const ready = computed(() => !isSuperadmin.value || Boolean(tenant.organizationId));

  const withTenant = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({ ...query.value, ...extra });

  return { isSuperadmin, organizationId, query, ready, withTenant };
};
