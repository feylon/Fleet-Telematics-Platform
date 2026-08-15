<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[900] flex items-start justify-center overflow-y-auto bg-black/50 p-4" @click.self="emit('close')">
      <div class="card my-6 w-full" :class="wide ? 'max-w-5xl' : 'max-w-2xl'">
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 class="text-sm font-semibold">{{ title }}</h3>
          <button class="text-slate-400 hover:text-slate-700" @click="emit('close')">✕</button>
        </div>
        <div class="card-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ open: boolean; title: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();
</script>
