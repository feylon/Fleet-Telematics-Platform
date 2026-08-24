<template>
  <div class="inline-flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-semibold" :class="dark ? '!bg-white/10' : ''">
    <button v-for="option in locales" :key="option.code" class="rounded-md px-2.5 py-1 transition-all" :class="option.code === locale ? (dark ? 'bg-white text-slate-900 shadow' : 'bg-white text-slate-900 shadow-sm') : dark ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-800'" @click="switchTo(option.code)">
      {{ option.code.toUpperCase() }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ dark?: boolean }>();
const { locale, locales, setLocale } = useI18n();

const switchTo = (code: string) => {
  setLocale(code as 'uz' | 'ru');
};
</script>
