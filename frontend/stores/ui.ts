import { defineStore } from 'pinia';
import { ref } from 'vue';

export const SIDEBAR_STORAGE_KEY = 'fleet.sidebar';

export const useUiStore = defineStore('ui', () => {
  const collapsed = ref(false);
  const drawerOpen = ref(false);

  const hydrate = () => {
    if (typeof localStorage === 'undefined') return;
    try {
      collapsed.value = localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'collapsed';
    } catch {
      return;
    }
  };

  const toggleCollapsed = () => {
    collapsed.value = !collapsed.value;
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed.value ? 'collapsed' : 'expanded');
    } catch {
      return;
    }
  };

  return { collapsed, drawerOpen, hydrate, toggleCollapsed };
});
