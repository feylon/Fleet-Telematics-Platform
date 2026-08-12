<template>
  <div class="w-full max-w-sm">
    <div class="card overflow-hidden">
      <div class="flex flex-col items-center gap-2 border-b border-slate-200 px-6 py-6 text-center" :style="{ background: `linear-gradient(135deg, ${branding.primaryColor}22, transparent)` }">
        <img v-if="branding.logoDataUrl" :src="branding.logoDataUrl" alt="logo" class="h-16 w-16 rounded-lg object-contain" />
        <div v-else class="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-white">{{ branding.platformName.slice(0, 2).toUpperCase() }}</div>
        <h1 class="text-xl font-bold text-slate-900">{{ branding.platformName }}</h1>
        <p class="text-xs text-slate-500">{{ branding.description }}</p>
      </div>
      <form class="card-body space-y-3" @submit.prevent="submit">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold">{{ t('auth.signIn') }}</h2>
          <LanguageSwitch />
        </div>
        <div>
          <label class="label">{{ t('common.login') }}</label>
          <input v-model="form.login" class="input" autocomplete="username" required />
        </div>
        <div>
          <label class="label">{{ t('common.password') }}</label>
          <input v-model="form.password" type="password" class="input" autocomplete="current-password" required />
        </div>
        <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{{ error }}</p>
        <button class="btn-primary w-full justify-center" :disabled="busy">{{ busy ? t('common.loading') : t('auth.signIn') }}</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useBrandingStore } from '~/stores/branding';

definePageMeta({ layout: 'auth' });

const { t } = useI18n();
const branding = useBrandingStore();
const { login, home } = useAuth();
const route = useRoute();
const form = reactive({ login: '', password: '' });
const error = ref('');
const busy = ref(false);

useHead({ title: t('auth.signIn') });

const submit = async () => {
  busy.value = true;
  error.value = '';
  try {
    await login(form.login.trim(), form.password);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : home();
    await navigateTo(redirect);
  } catch (err) {
    error.value = (err as { status?: number }).status === 401 ? t('auth.invalid') : (err as Error).message;
  } finally {
    busy.value = false;
  }
};
</script>
