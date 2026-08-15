<template>
  <div class="space-y-4">
    <PageHeader :title="t('nav.profile')" />
    <div class="grid gap-4 lg:grid-cols-2">
      <div class="card card-body space-y-2 text-sm">
        <div><span class="label">{{ t('common.fullName') }}</span>{{ auth.user?.fullName }}</div>
        <div><span class="label">{{ t('common.login') }}</span>{{ auth.user?.login }}</div>
        <div><span class="label">{{ t('common.role') }}</span>{{ t(`admin.${auth.user?.role}`) }}</div>
        <div><span class="label">{{ t('common.phone') }}</span>{{ auth.user?.phone || '—' }}</div>
        <div><span class="label">{{ t('common.email') }}</span>{{ auth.user?.email || '—' }}</div>
      </div>
      <ChangePasswordForm />
    </div>
    <SessionsPanel />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({ titleKey: 'nav.profile' });
const { t } = useI18n();
const auth = useAuthStore();
useHead({ title: t('nav.profile') });
</script>
