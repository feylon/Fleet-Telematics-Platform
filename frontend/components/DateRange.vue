<template>
  <div class="flex flex-wrap items-end gap-2">
    <div>
      <label class="label">{{ t('common.from') }}</label>
      <input type="datetime-local" class="input" :value="modelValue.from" @input="update('from', $event)" />
    </div>
    <div>
      <label class="label">{{ t('common.to') }}</label>
      <input type="datetime-local" class="input" :value="modelValue.to" @input="update('to', $event)" />
    </div>
    <button class="btn-primary" @click="emit('apply')">{{ t('common.apply') }}</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { from: string; to: string } }>();
const emit = defineEmits<{ 'update:modelValue': [value: { from: string; to: string }]; apply: [] }>();
const { t } = useI18n();

const update = (key: 'from' | 'to', event: Event) => {
  emit('update:modelValue', { ...props.modelValue, [key]: (event.target as HTMLInputElement).value });
};
</script>
