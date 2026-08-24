<template>
  <form class="card card-body space-y-3" @submit.prevent="submit">
    <h3 class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><Icon name="key" :size="14" />{{ t('auth.changePassword') }}</h3>
    <p v-if="auth.user?.mustChangePassword" class="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700"><Icon name="alert-triangle" :size="14" />{{ t('auth.mustChange') }}</p>
    <div>
      <label class="label">{{ t('auth.currentPassword') }}</label>
      <input v-model="form.current" type="password" class="input" required autocomplete="current-password" />
    </div>
    <div>
      <label class="label">{{ t('auth.newPassword') }}</label>
      <input v-model="form.next" type="password" class="input" required minlength="8" autocomplete="new-password" />
    </div>
    <button class="btn-primary" :disabled="busy"><Icon name="check" :size="16" />{{ t('common.save') }}</button>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useToastStore } from '~/stores/toast';

const { t } = useI18n();
const auth = useAuthStore();
const toast = useToastStore();
const { changePassword, fetchMe } = useAuth();
const form = reactive({ current: '', next: '' });
const busy = ref(false);

const submit = async () => {
  busy.value = true;
  try {
    await changePassword(form.current, form.next);
    form.current = '';
    form.next = '';
    toast.success(t('auth.passwordChanged'));
    await fetchMe();
  } catch (error) {
    toast.error((error as Error).message);
  } finally {
    busy.value = false;
  }
};
</script>
