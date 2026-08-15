<template>
  <div class="space-y-3">
    <PageHeader :title="t('admin.branding')" />
    <div class="grid gap-4 lg:grid-cols-2">
      <form class="card card-body space-y-3" @submit.prevent="save">
        <div><label class="label">{{ t('admin.platformName') }}</label><input v-model="form.platformName" class="input" required maxlength="120" /></div>
        <div><label class="label">{{ t('common.description') }}</label><textarea v-model="form.description" class="input" rows="2" maxlength="500" /></div>
        <div><label class="label">{{ t('admin.primaryColor') }}</label><div class="flex items-center gap-2"><input v-model="form.primaryColor" type="color" class="h-9 w-14 rounded border" /><input v-model="form.primaryColor" class="input w-32" pattern="#[0-9a-fA-F]{6}" /></div></div>
        <div><label class="label">{{ t('admin.supportEmail') }}</label><input v-model="form.supportEmail" type="email" class="input" /></div>
        <div>
          <label class="label">{{ t('admin.logo') }}</label>
          <div class="flex items-center gap-3">
            <label class="btn-secondary cursor-pointer">{{ t('admin.uploadLogo') }}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="hidden" @change="onFile" /></label>
            <button v-if="form.logoDataUrl" type="button" class="btn-secondary" @click="form.logoDataUrl = ''">{{ t('admin.removeLogo') }}</button>
          </div>
        </div>
        <button class="btn-primary" :disabled="busy">{{ t('common.save') }}</button>
      </form>
      <div class="card card-body">
        <div class="label">{{ t('admin.preview') }}</div>
        <div class="rounded-lg bg-slate-900 p-4 text-white">
          <div class="flex items-center gap-3">
            <img v-if="form.logoDataUrl" :src="form.logoDataUrl" class="h-12 w-12 rounded-md bg-white/90 object-contain p-1" alt="logo" />
            <div v-else class="flex h-12 w-12 items-center justify-center rounded-md text-lg font-bold" :style="{ backgroundColor: form.primaryColor }">{{ form.platformName.slice(0, 2).toUpperCase() }}</div>
            <div><div class="font-semibold">{{ form.platformName }}</div><div class="text-xs text-slate-300">{{ form.description }}</div></div>
          </div>
          <button class="mt-4 rounded px-3 py-1.5 text-sm font-medium" :style="{ backgroundColor: form.primaryColor }">{{ t('auth.signIn') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useAdminApi } from '~/composables/useAdminApi';
import { useBrandingStore } from '~/stores/branding';
import { useToastStore } from '~/stores/toast';

definePageMeta({ roles: ['SUPERADMIN'], titleKey: 'admin.branding' });
const { t } = useI18n();
useHead({ title: t('admin.branding') });
const api = useAdminApi();
const branding = useBrandingStore();
const toast = useToastStore();
const busy = ref(false);
const form = reactive({ platformName: branding.platformName, description: branding.description ?? '', primaryColor: branding.primaryColor, supportEmail: branding.supportEmail ?? '', logoDataUrl: branding.logoDataUrl ?? '' });

const onFile = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 300 * 1024) {
    toast.error('Logo must be smaller than 300 KB');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    form.logoDataUrl = String(reader.result);
  };
  reader.readAsDataURL(file);
};

const save = async () => {
  busy.value = true;
  try {
    const saved = await api.branding.update({ platformName: form.platformName, description: form.description || undefined, primaryColor: form.primaryColor, supportEmail: form.supportEmail || undefined, logoDataUrl: form.logoDataUrl || null });
    branding.apply(saved as never);
    toast.success(t('common.saved'));
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    busy.value = false;
  }
};
</script>
