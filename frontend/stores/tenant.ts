import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

export const TENANT_STORAGE_KEY = 'fleet.tenant';

export const useTenantStore = defineStore('tenant', () => {
  const organizationId = ref<string | null>(null);
  const options = ref<TenantOption[]>([]);

  const hydrate = () => {
    if (typeof localStorage === 'undefined') return;
    try {
      organizationId.value = localStorage.getItem(TENANT_STORAGE_KEY);
    } catch {
      return;
    }
  };

  const select = (id: string | null) => {
    organizationId.value = id;
    if (typeof localStorage === 'undefined') return;
    try {
      if (id) localStorage.setItem(TENANT_STORAGE_KEY, id);
      else localStorage.removeItem(TENANT_STORAGE_KEY);
    } catch {
      return;
    }
  };

  return { organizationId, options, hydrate, select };
});
