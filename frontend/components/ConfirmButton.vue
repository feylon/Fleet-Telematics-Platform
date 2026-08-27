<template>
  <button :class="klass" :title="title" @click="confirmAndEmit">
    <slot />
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{ klass?: string; message?: string; title?: string }>();
const emit = defineEmits<{ confirm: [] }>();
const { t } = useI18n();

const confirmAndEmit = () => {
  if (window.confirm(props.message ?? t('common.confirmDelete'))) emit('confirm');
};
</script>
