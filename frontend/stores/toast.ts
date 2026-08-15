import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ToastMessage {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error' | 'warning';
  title?: string;
}

let counter = 0;

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastMessage[]>([]);

  const push = (text: string, kind: ToastMessage['kind'] = 'info', title?: string, ttl = 5000) => {
    const id = ++counter;
    items.value.push({ id, text, kind, title });
    setTimeout(() => dismiss(id), ttl);
  };

  const dismiss = (id: number) => {
    items.value = items.value.filter((item) => item.id !== id);
  };

  return { items, push, dismiss, success: (text: string) => push(text, 'success'), error: (text: string) => push(text, 'error', undefined, 7000) };
});
