<template>
  <div class="h-full">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { useBrandingStore } from '~/stores/branding';

const branding = useBrandingStore();
const { locale } = useI18n();

await useAsyncData('branding', () => branding.load().then(() => true));

useHead({
  htmlAttrs: { lang: locale },
  titleTemplate: (chunk) => (chunk ? `${chunk} · ${branding.platformName}` : branding.platformName),
  style: [{ innerHTML: () => `:root{--color-primary:${branding.primaryColor};--color-primary-soft:${branding.primaryColor}1a;}` }],
});
</script>
