<template>
  <div class="flex min-h-screen w-full">
    <section class="relative hidden w-[52%] flex-col justify-between overflow-hidden p-10 text-white lg:flex" style="background: linear-gradient(160deg, #0b1220 0%, #101a30 55%, #0f172a 100%)">
      <div class="hero-grid absolute inset-0 opacity-60" />
      <div class="absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl" :style="{ background: `${branding.primaryColor}33` }" />
      <div class="absolute -bottom-32 right-0 h-96 w-96 rounded-full blur-3xl" :style="{ background: `${branding.primaryColor}22` }" />
      <div class="relative flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl text-base font-bold" :style="{ background: `linear-gradient(135deg, ${branding.primaryColor}, #6366f1)`, boxShadow: `0 10px 30px -8px ${branding.primaryColor}` }">
            <img v-if="branding.logoDataUrl" :src="branding.logoDataUrl" alt="logo" class="h-full w-full bg-white object-contain p-1" />
            <span v-else>{{ branding.platformName.slice(0, 2).toUpperCase() }}</span>
          </div>
          <span class="text-lg font-bold tracking-tight">{{ branding.platformName }}</span>
        </div>
        <LanguageSwitch dark />
      </div>
      <div class="relative max-w-lg">
        <h1 class="text-4xl font-extrabold leading-tight tracking-tight">{{ branding.platformName }}</h1>
        <p class="mt-3 text-base text-slate-300">{{ branding.description }}</p>
        <ul class="mt-10 space-y-5">
          <li v-for="feature in features" :key="feature.icon" class="flex items-start gap-4">
            <span class="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10" :style="{ color: branding.primaryColor }"><Icon :name="feature.icon" :size="22" /></span>
            <div>
              <div class="font-semibold">{{ t(feature.title) }}</div>
              <div class="text-sm text-slate-400">{{ t(feature.text) }}</div>
            </div>
          </li>
        </ul>
      </div>
      <div class="relative text-xs text-slate-500">© {{ year }} {{ branding.platformName }}</div>
    </section>
    <section class="flex flex-1 items-center justify-center bg-slate-50 p-6">
      <div class="w-full max-w-sm">
        <div class="mb-6 flex items-center justify-between lg:hidden">
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" :style="{ background: branding.primaryColor }">{{ branding.platformName.slice(0, 2).toUpperCase() }}</div>
            <span class="font-bold">{{ branding.platformName }}</span>
          </div>
          <LanguageSwitch />
        </div>
        <div class="card rounded-2xl p-7 shadow-float">
          <h2 class="text-xl font-bold tracking-tight text-slate-900">{{ t('auth.signIn') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('auth.welcome') }}</p>
          <form class="mt-6 space-y-4" @submit.prevent="submit">
            <div>
              <label class="label">{{ t('common.login') }}</label>
              <div class="relative"><Icon name="user" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="form.login" class="input h-10 !pl-9" autocomplete="username" required /></div>
            </div>
            <div>
              <label class="label">{{ t('common.password') }}</label>
              <div class="relative"><Icon name="lock" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input v-model="form.password" :type="reveal ? 'text' : 'password'" class="input h-10 !pl-9 !pr-10" autocomplete="current-password" required /><span role="button" tabindex="0" class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600" @click="reveal = !reveal"><Icon name="eye" :size="16" /></span></div>
            </div>
            <p v-if="error" class="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><Icon name="alert-circle" :size="14" />{{ error }}</p>
            <button type="submit" class="btn-primary h-10 w-full" :disabled="busy"><Icon name="log-in" :size="16" />{{ busy ? t('common.loading') : t('auth.signIn') }}</button>
          </form>
        </div>
        <p class="mt-6 text-center text-xs text-slate-400">{{ branding.description }}</p>
      </div>
    </section>
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
const reveal = ref(false);
const year = new Date().getFullYear();
const features = [
  { icon: 'map-pin', title: 'login.liveTitle', text: 'login.liveText' },
  { icon: 'shield', title: 'login.safetyTitle', text: 'login.safetyText' },
  { icon: 'bar-chart', title: 'login.analyticsTitle', text: 'login.analyticsText' },
];

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
