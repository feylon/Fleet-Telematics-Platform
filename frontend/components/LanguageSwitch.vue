<template>
  <div class="flex overflow-hidden rounded-md border border-slate-300 text-xs">
    <button v-for="option in locales" :key="option.code" class="px-2 py-1" :class="option.code === locale ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50'" @click="switchTo(option.code)">
      {{ option.code.toUpperCase() }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { locale, locales, setLocale } = useI18n();

const switchTo = (code: string) => {
  setLocale(code as 'uz' | 'ru');
};
</script>
