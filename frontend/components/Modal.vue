<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-[900] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm" @click.self="emit('close')">
        <div class="modal-panel card my-8 w-full rounded-xl shadow-pop" :class="wide ? 'max-w-5xl' : 'max-w-2xl'">
          <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 class="text-[15px] font-semibold text-slate-900">{{ title }}</h3>
              <p v-if="subtitle" class="text-xs text-slate-500">{{ subtitle }}</p>
            </div>
            <button class="btn-ghost btn-icon btn-sm" @click="emit('close')"><Icon name="x" :size="16" /></button>
          </div>
          <div class="px-5 py-4">
            <slot />
          </div>
          <div v-if="$slots.footer" class="card-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ open: boolean; title: string; subtitle?: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();
</script>
