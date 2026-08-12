import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Branding {
  platformName: string;
  description: string | null;
  logoDataUrl: string | null;
  primaryColor: string;
  supportEmail: string | null;
}

const fallback: Branding = { platformName: 'FleetView', description: null, logoDataUrl: null, primaryColor: '#0ea5e9', supportEmail: null };

export const useBrandingStore = defineStore('branding', () => {
  const platformName = ref(fallback.platformName);
  const description = ref<string | null>(fallback.description);
  const logoDataUrl = ref<string | null>(fallback.logoDataUrl);
  const primaryColor = ref(fallback.primaryColor);
  const supportEmail = ref<string | null>(fallback.supportEmail);
  const loaded = ref(false);

  const apply = (value: Partial<Branding>) => {
    platformName.value = value.platformName || fallback.platformName;
    description.value = value.description ?? null;
    logoDataUrl.value = value.logoDataUrl ?? null;
    primaryColor.value = value.primaryColor || fallback.primaryColor;
    supportEmail.value = value.supportEmail ?? null;
    loaded.value = true;
  };

  const load = async () => {
    const config = useRuntimeConfig();
    try {
      const data = await $fetch<Branding>(`${config.public.apiBase}/api/public/branding`);
      apply(data);
    } catch {
      loaded.value = true;
    }
  };

  return { platformName, description, logoDataUrl, primaryColor, supportEmail, loaded, apply, load };
});
