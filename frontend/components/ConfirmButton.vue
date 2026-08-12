<template>
  <button :class="klass" @click="confirmAndEmit">
    <slot />
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{ klass?: string; message?: string }>();
const emit = defineEmits<{ confirm: [] }>();
const { t } = useI18n();

const confirmAndEmit = () => {
  if (window.confirm(props.message ?? t('common.confirmDelete'))) emit('confirm');
};
</script>
